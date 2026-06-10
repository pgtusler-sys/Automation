---
name: ghl-n8n-pipedrive-disposition
description: High-level patterns and hard-won gotchas for building a GoHighLevel → n8n → Pipedrive disposition/sync automation. Use when building or debugging an n8n workflow that takes an AI call/CRM disposition from GHL and updates deals across one or more Pipedrive pipelines (stage moves, owner assignment, notes, create-or-update). Covers GHL webhook payload shape, the normalizer pattern, multi-pipeline routing, and the n8n footguns that waste the most time.
---

# GHL → n8n → Pipedrive Disposition Automation

Field guide distilled from building the SayVo/Kingsmen disposition sync. Read this before touching the workflow; most "bugs" here are config/data-shape issues, not logic.

## Architecture (3 phases)
1. **Intake** — Web/CRM lead → n8n AI agent extracts fields (name, notes, intro, **deal_id**, **person_id**) → upsert into a **GHL contact** (cache deal_id + person_id as custom fields).
2. **Call** — GHL hands the lead to the AI voice agent → a **disposition** is chosen (Voicemail, Busy, Not Interested, Qualified-Booked, …).
3. **Disposition sync** — GHL fires a webhook → n8n **Normalize** → fan-out gates → Pipedrive (stage move, note, owner, create-or-update sibling deal).

## The Normalizer pattern (keep it)
A single Code node at the top of the disposition flow that:
- Un-nests GHL's `body.customData`.
- Coerces strings → numbers (GHL sends everything as strings; Pipedrive wants numeric IDs).
- Resolves owner email/name → numeric Pipedrive user id via a prefilled map.
- Sets config (base URLs, default pipeline). Output a clean flat object the rest of the workflow reads.

Don't delete it — it's the only place strings become the numeric IDs Pipedrive needs.

## GHL webhook payload shape (critical, non-obvious)
- Custom-data you configure in the GHL webhook action lands under **`body.customData.*`**.
- Contact fields (the contact's own custom fields like `person_id`, `Deal ID`) land at the **top level `body.*`** — NOT in customData.
- So a normalizer reading only `customData` will miss `person_id`/`owner_email` if they're contact fields. **Read both:** `c.person_id || body.person_id`.
- GHL sends all values as **strings**; numbers too.
- "Custom data" vs "Headers" in the GHL webhook action are different — custom data → body, headers → HTTP headers. Putting key/values in Headers is a common mistake (and proxies like Caddy silently drop headers containing underscores).
- The AI extraction node's output keys are usually **Title Case** (`'First Name'`, `'Deal ID'`) — match exactly; don't assume snake_case.

## Multi-pipeline routing pattern
When one disposition must touch two pipelines (e.g. an "AI working" pipeline + the real sales pipeline):
- **Fetch the sent deal** (Get Deal) to get its `person_id` and current `pipeline_id`.
- **List the person's open deals** (`/deals?person_id=…&status=open`) to find the sibling deal in the other pipeline.
- **Always include the sent deal** in the resolve set (combine Get Deal + List, dedup by id) so the primary deal is never missed if the person lookup is flaky.
- Emit per-deal instructions tagged `action: "update" | "create"`, then split with an IF → update node (PATCH) vs create node (POST).
- For "create if no sibling exists": only create when the lookup **succeeded and found none** — a failed/empty lookup must not spawn a duplicate.

## Stage-name matching (make it forgiving)
Map disposition names → numeric stage ids per pipeline. Normalize both sides with a `clean()` that: lowercases, strips apostrophes (`Didn't`/`Didnt`/curly all match), treats hyphens and spaces the same, collapses whitespace. Anything unmapped = silently skipped (no error) — so verify the GHL value is the **full** disposition name, not a truncation ("Qualified" alone is ambiguous and won't map).

## Owner / Pipedrive visibility gotcha
- Setting `owner_id` on a deal in a pipeline the owner **can't see** → `422 "Pipeline is not visible to the owner"` — and it **rejects the whole PATCH**, including the stage change bundled with it.
- Fix: **decouple owner from stage** (send `{stage_id}` alone where the owner lacks visibility), and only attach owner on pipelines/deals the rep can actually see. Or fix pipeline visibility in Pipedrive settings.

## n8n footguns (these waste the most time)
- **Credential links break on import.** Every imported workflow shows the credential name but the binding is stale — re-select it on each node. A webhook path can only be active on ONE workflow; consolidate duplicates.
- **`continueOnFail` hides errors.** A failed Pipedrive call still shows "green" and the workflow returns success. Always read the actual node *output* (look for an `error` field), not just the run status.
- **Fixed vs Expression mode** on JSON Body: paste `{{ … }}` in **Expression** mode (no leading `=`; n8n stores the `=` itself). Pasting `={{…}}` into a Fixed field → "Unexpected token '='".
- **Build JSON bodies with `JSON.stringify(...)`** of a JS object, not hand-typed JSON — it auto-escapes quotes/newlines and avoids trailing-comma errors.
- **Omit empty fields GHL validates** (e.g. `email`): GHL rejects `email: ""` with `422 "email must be an email"`. Only include the field when it's non-empty/valid (`Object.assign(base, valid ? {email} : {})`).

## Debugging method that works
The data tells the truth. When something "doesn't work": open the execution and read, in order, **Normalize output** (did the field resolve? what's the exact value?) → **lookup nodes** (Get Deal / List Person Deals — success or empty/error?) → **Resolve/decision node** (what items did it emit?) → **the write node's response** (`success:true` + data, or an error message?). Nine times out of ten the answer is a wrong/missing input value or a stale workflow version — not the logic.
