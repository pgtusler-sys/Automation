# Voice Agent Client Onboarding — Front-to-Back Runbook

Reusable checklist for standing up a new SayVo voice-agent client (GHL + SynthFlow + n8n,
optional external CRM). Built from the Kingsmen (Pipedrive) and IHL/West Capital (LeadMailbox)
deployments. Walk it top to bottom per new subaccount.

## 0. Foundation / prerequisites (do FIRST — everything downstream reads these)
- [ ] **GHL subaccount created** → record the **Location ID** (e.g. IHL = `dVtkyM31aGC8IWAKrcvW`).
      Every n8n node that touches this client is location-scoped.
- [ ] **GHL Private Integration Token (PIT)** created → store as an n8n **Header Auth / Bearer
      credential** named for the subaccount. NEVER hardcode in a node body. Rotate if exposed.
- [ ] **GHL custom fields** created on Contact (the workflows read these BY ID — record each ID):
      external lead id (e.g. `leadid_leadmailbox`), `lead_notes` (AI context blob),
      `custom_introduction` (AI first line), `cf_disposition`, `status`, `add_label_id`,
      `remove_label_id`, `call_counter`, `state_id`, `lost_reason`, plus `person_id`/`deal_id`
      if an external CRM (Pipedrive) is in play.
      ⚠️ Field IDs are DIFFERENT per subaccount — never reuse another client's IDs.
- [ ] **GHL pipeline + stages** created. Standard disposition stages:
      `Call Trigger` (outbound entry), `Voicemail`, `AI Voicemail`, `Wrong Contact`, `Busy`,
      `Not Interested`, `Unqualified`, `Qualified - Didn't Book`, `Qualified - Booked`.
      (Eliminate any `ERROR` fallthrough — see §3.)
- [ ] **SynthFlow agent created** → record the **agent ID** and assigned phone number / number pool.
- [ ] **External CRM creds** (if used): LeadMailbox api-account/api-key, Pipedrive token, etc.,
      each stored as an n8n credential (Custom Auth for body-auth APIs like LeadMailbox).

## 1. Create new subaccounts (GHL + SynthFlow)
- [ ] GHL subaccount (see §0 — location ID, PIT, fields, pipeline, stages).
- [ ] SynthFlow workspace/agent (see §0 — agent ID, number).
- [ ] Confirm the GHL↔SynthFlow link (which agent dials for this subaccount).

## 2. Outbound trigger automation (GHL → SynthFlow dial)
- [ ] **Pipeline outbound trigger** mapped to the new **`Call Trigger`** stage
      (contact enters Call Trigger → fire the dial).
- [ ] **Telephony node** mapped to the **new SynthFlow agent**.
- [ ] Verify the call passes the contact's **phone + contact id** so the inbound-context
      lookup (§6) can resolve the lead.
- [ ] Confirm business-hours / number-pool routing if used.

## 3. Post-outbound webhook (disposition write-back)
- [ ] **Inbound webhook trigger** mapped from the **new SynthFlow agent** (the disposition POST).
- [ ] Walk EACH node top to bottom:
  - [ ] **Normalize** — set location ID, owner/email→id map, field keys, and the
        disposition→stage map for THIS subaccount.
  - [ ] **Assign correct user** — round-robin LO / owner ONLY on the right dispositions
        (typically `Qualified - Booked`). Don't assign LOs to Unqualified/Busy/etc.
  - [ ] **Verbiage** — update text + email copy and any branding ("Sam from <Company>").
  - [ ] **Stage move + tags + note** per disposition; log transcript/recording links.
  - [ ] **External CRM write-back** (optional) — e.g. LeadMailbox PATCH `call_status` +
        field_121.. + userid; or Pipedrive. Use the right per-CRM key names.
- [ ] ⚠️ Gotchas:
  - GHL payload split: custom data → `body.customData.*`, contact fields → top-level `body.*`.
    Read both.
  - Omit `email` when empty (GHL 422 "email must be an email").
  - Send the FULL disposition/stage name (not a truncation) so the map resolves.
  - Owner must have pipeline visibility or the whole PATCH 403s — decouple owner from stage.
  - Re-select every credential after import (bindings break).
  - `continueOnFail` hides errors — read the actual node output.

## 4. Callback sequence (GHL)
- [ ] Each **text** reviewed for verbiage + **GPT prompting** updated for this client.
- [ ] All **call nodes** mapped to the correct SynthFlow agent.
- [ ] Timing/delays, business hours, and opt-out / STOP handling confirmed.

## 5. No-show callback sequence (SynthFlow)
- [ ] Verbiage on each step reviewed; call nodes mapped to the correct agent.
- [ ] **Information extractors** added (disposition classifier w/ priority-ordered rules).
- [ ] **Call transfer** added (warm transfer to LO).
- [ ] **Real-time booking** added (calendar integration).
- [ ] **Custom inbound-context action** added (points the agent at the §6 webhook).

## 6. n8n inbound call context (SynthFlow ↔ GHL)
Webhook ← agent (POST phone) → GHL contact lookup by phone → respond with custom_variables.
- [ ] HTTP node: correct **location ID** + Version `2021-07-28` + subaccount Bearer credential.
- [ ] Respond node returns `call_inbound.custom_variables` (full name, Introduction, Notes,
      Last Name, Email).
- [ ] ⚠️ Resolve custom fields **BY ID, not by array position** — GHL field order isn't stable.
      Use `customFields.find(f => f.id === "<id>")?.value`. (Positional `[1]`/`[3]` grabbed the
      lead id and call counter on a real run — wrong, and crashed to `undefined` on contacts
      with fewer fields.)
- [ ] Guard with `?.` so an unknown caller returns blanks instead of erroring.
- [ ] Workflow **Active** + agent points at the **production** webhook URL (`/webhook/…`,
      not `/webhook-test/…`); no trailing space in the URL.
- [ ] **No duplicate workflows** sharing a webhook path (causes "webhook not registered" 404s).

## Cross-cutting gotchas (apply everywhere)
- Credentials re-bind on EVERY import — re-select on each node.
- `$env` may be blocked at runtime (`N8N_BLOCK_ENV_ACCESS_IN_NODE=true`) — use a **Custom Auth
  credential** for secrets, not `$env`.
- Build JSON bodies with `JSON.stringify(...)`, in Expression mode (`{{ }}`, no leading `=` typed).
- Per-subaccount everything: location ID, field IDs, pipeline/stage IDs, credentials.
- Rotate any API key/token that's been screenshotted or emailed.
