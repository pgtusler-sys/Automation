# SayVo Voice-Agent Automations — Full Handoff

Context transfer for a fresh agent/session. Read this first, then the referenced files.
Repo branch: `claude/affectionate-mendel-nw7BV` · all work lives under `n8n/sayvo/`.

---

## 1. What this project is
SayVo builds AI voice-agent call automations for lending clients. Each client follows the
same shape: an AI voice agent (SynthFlow) calls leads, and n8n glues the CRM(s) together —
intake, mid-call context, and disposition write-back. Three clients exist at different stages:

| Client | System of record | Middle CRM | Disposition target | Status |
|---|---|---|---|---|
| **Kingsmen Capital** | — | GHL | **Pipedrive** | WORKING (final config) |
| **Independent Home Lending (IHL)** | **LeadMailbox** (IHLI01) | GHL | LeadMailbox + GHL | Dry-run green; near live |
| **Advantage Lending** | **Bonzo** | GHL | Bonzo + GHL | Scaffolds only (new) |

## 2. The architecture (same for every client)
```
Lead source → [n8n INTAKE] → GHL contact (+ external lead id in a dedicated field)
   → GHL pipeline "Call Trigger" stage → SynthFlow outbound dial
   → (mid-call) SynthFlow → [n8n INBOUND CALL CONTEXT] → GHL lookup by phone → agent variables
   → disposition chosen → [n8n WRITE-BACK] → system-of-record CRM (+ GHL stage/tags/notes)
```
Four building blocks per client: **Intake, Outbound trigger (GHL-native), Inbound call
context, Disposition write-back.** GHL is always the automation hub; the "system of record"
(LeadMailbox / Bonzo / Pipedrive) is the CRM we write dispositions back to.

## 3. Reusable n8n patterns (apply to every build)
- **Normalize node** (Code): un-nest webhook payload, coerce strings→IDs, resolve owner
  email→id, set config. GHL payload splits: custom data → `body.customData.*`, contact
  fields → top-level `body.*` — read both.
- **Disposition → stage/status map** + **round-robin** assignment (static data counter),
  LO assigned only on `Qualified Booked`.
- **Inbound call context:** look up GHL custom fields **BY ID** (`customFields.find(f => f.id===…)`),
  NEVER by array position — GHL field order isn't stable (this caused real bugs, see §6).
- **Auth:** use n8n **Custom Auth / Header Auth credentials**, never `$env` (blocked on this
  instance — `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`) and never hardcoded keys.
- Build JSON bodies with `JSON.stringify(...)` in Expression mode.

## 4. Per-client state

### Kingsmen Capital (GHL → Pipedrive) — WORKING
- `kingsmen-pipedrive-disposition.json` (57-node, two-pipeline: Online Leads + Term Loans).
- Remaining: GHL must send FULL stage_name per branch; production webhook URL.
- See `pipedrive-api-connection` + `ghl-n8n-pipedrive-disposition` skills.

### IHL (LeadMailbox IHLI01 → GHL) — dry-run green
- GHL location: **`dVtkyM31aGC8IWAKrcvW`** (Independent Lending).
- GHL field IDs: `leadid_leadmailbox`=`ULqBh4WhEnOVUzXQjVIF`, `lead_notes`=`IjxjwllVSYwz7opJCuVp`,
  `custom_introduction`=`vadHuBnrarRKLvfcndG8`, `call_counter`=`infbSmh6IPfWwaVdwkeH` (full map in spec).
- LMB API: `PATCH https://api.leadmailbox.com/v2/leads/{leadid}`; auth `api-account=IHLI01`
  + `api-key` **in body** (Custom Auth credential). Outcome key = **`call_status`** (Dan's doc,
  example value "No Answer") — NOT `status`.
- Two-bucket model: every disposition → `Qualified Booked` or `Contacted Not Booked`; granular
  disposition kept in `field_121`. Round-robin LO: David Milo 100173 / Mike Colapinto 107230.
- Voice branding: "Sam from Independent Lending" (hard money).
- Files: `leadmailbox-intake.json`, `leadmailbox-disposition.json`, `ihl-inbound-call-context.json`,
  `leadmailbox-spec.md`, `QUESTIONS_FOR_DAN.md`.
- OPEN (Dan): full valid `call_status` value list + whether it's the bucket field or separate;
  intake Service token syntax (`#{LeadID}`) + which status fires it (leads arrive as
  `Future Contact`, not `New`); rotate the LMB api-key + GHL PIT (both were screenshotted).
- NOTE: there are DUPLICATE live "IHL (inbound call context)" workflows (`aDARPYddFhBZQ6mO` and
  `543Im9yiemVmSLfD`), different locations/webhook paths — consolidate. `aDARPYddFhBZQ6mO`
  is actually the West Capital subaccount (`Hy1eXgYUx0d48bNZTEfZ`), had an `email""` syntax typo
  + positional-field bug in its Respond node.

### Advantage Lending (Bonzo → GHL) — scaffolds only
- Bonzo is the system of record; GHL does all workflows (mirrors the IHL/LeadMailbox pattern).
- Bonzo API docs (bot-protected 403): https://docs.getbonzo.com/api/public-api ; Postman:
  https://www.postman.com/getbonzo/bonzo-api/collection/6wn9x5w/bonzo-public-api
- n8n location: Personal project `W1gpseFM145ooTaW` → folder **SayVo Folder** (`PEyuvSvIpfEgiCSx`)
  → subfolder **Advantage Lending** (created by user).
- Scaffolds in `n8n/sayvo/advantage/` (import-ready, all values are `REPLACE_*` placeholders):
  `advantage-bonzo-intake.json`, `advantage-disposition-to-bonzo.json`,
  `advantage-inbound-call-context.json`.
- NEEDED to finish: Bonzo auth + endpoints (upsert contact, search by phone, update status,
  add tag/note, assign user, webhook events); new GHL subaccount location ID + field IDs;
  SynthFlow agent id/number; user roster; voice branding company name.

## 5. n8n access
- Personal project: `W1gpseFM145ooTaW` (Deniz Kekec). SayVo Folder: `PEyuvSvIpfEgiCSx`.
- Instance-level MCP is enabled but the connection is FLAKY (drops on idle). Streamable-HTTP
  endpoint: `https://n8n.quetalk.ai/mcp-server/http` (+ Bearer token from Connection details).
- Workflows must be individually "Made available in MCP" to be readable/editable via MCP.
- MCP has NO create-folder tool and NO import-JSON tool: create via `create_workflow_from_code`
  (SDK) into a folderId, or hand the user import-file JSON.
- RESILIENT WORKFLOW: use MCP for reads/verify, import-file JSON for create/edit.

## 6. Hard-won gotchas
- **Inbound context field lookup by ID, not position** — positional `[1]`/`[3]` grabbed the
  lead id + call counter, and crashed to `undefined` on contacts with fewer fields.
- **`$env` is blocked at runtime** (`N8N_BLOCK_ENV_ACCESS_IN_NODE`) → Custom Auth credentials.
- **Webhook "not registered" 404** → workflow inactive / using test URL / trailing space in URL /
  duplicate workflows sharing a path. Use production URL on an Active workflow, no duplicates.
- **GHL 422 email** → omit `email` when empty/invalid.
- **Owner without pipeline visibility** → 403 rejects the whole PATCH; decouple owner from stage.
- **Credentials re-bind on every import** — re-select on each node.
- **Per-subaccount everything** — location ID, field IDs, pipeline/stage IDs, credentials differ.

## 7. GHL opportunities review (IHL, 105 opps) — findings to action
- Stage routing within the pipeline is correct, but nothing is promoted to a sales pipeline;
  the only hard LO assignment was on an Unqualified lead (inverted); `Voicemail` (72, no notes,
  answering-machine) vs `AI Voicemail` (19, transcript) split; 1 ERROR fallthrough to fix.
- Decision pending: should Qualified-Booked promote to a sales-rep pipeline + get an LO owner?

## 8. Security
- Rotate the LeadMailbox api-key and the GHL Private Integration Token — both were shown in
  plaintext/screenshots. Store secrets only as n8n credentials, never committed.

## 9. File index (n8n/sayvo/)
- `kingsmen-pipedrive-disposition.json` — Kingsmen (WORKING)
- `leadmailbox-intake.json` / `leadmailbox-disposition.json` / `ihl-inbound-call-context.json` — IHL
- `leadmailbox-spec.md` — IHL/LMB API + field/config reference
- `QUESTIONS_FOR_DAN.md` — IHL blockers for Dan English
- `advantage/*.json` — Advantage Lending scaffolds (Bonzo)
- `CLIENT_ONBOARDING_RUNBOOK.md` — front-to-back per-client checklist
- `CODEX_REVIEW.md` / `PROJECT_STATUS.md` / `WORK_SUMMARY.md` — reviews/status
- `HANDOFF.md` — this file
- PR: pgtusler-sys/automation #2

## 10. Immediate next steps
1. Harden MCP (streamable-HTTP endpoint + long-lived token + always-on n8n) → fresh session.
2. Get Bonzo API details + Advantage GHL IDs → fill the Advantage scaffolds (create into the
   Advantage Lending folder).
3. IHL: get Dan's `call_status` enum → finalize write-back → go live; rotate keys.
4. Fix/consolidate the duplicate IHL/West-Capital inbound-context workflows (by-ID + email typo).
