# Questions for Dan (LeadMailbox / IHLI01) — to finish IHL go-live

Context: AI voice agent (SayVo) calls IHL leads, then we PATCH the outcome back to
LeadMailbox. Dry-run is green (leadid resolves, mapping works). These are the last
unknowns before we flip live.

## 1. `call_status` value list (the blocker)
Your PATCH example uses `"call_status": "No Answer"`. We need the **full list of valid
`call_status` values** so we map exactly (case-sensitive).
- Are `Qualified Booked` and `Contacted Not Booked` valid `call_status` values?
- Or is `call_status` only call-outcome strings (No Answer, Left Message, etc.) — in
  which case, what key sets the lead's **pipeline/Lead Status** (the two buckets)?

## 2. Same PATCH, other keys
Confirm these are valid on the same PATCH body: `field_121`, `field_122`, `field_123`,
`field_124`, `field_125`, `note`, `userid`. Any that aren't, tell us the correct key.

## 3. Intake Service (LMB -> our n8n)
- For an outbound **Service** body, is the token syntax `#{LeadID}` (like inbound) or
  `{leadid}`? Please paste the available tokens for a Service.
- Which **Status Trigger** should fire the intake Service to our webhook? (New leads
  arrive as "Future Contact" in our tests, not "New" — that's why our trigger didn't fire.)
- Does a Service support Content-Type: JSON (vs form-urlencoded)?

## 4. Statuses to create
Please confirm/create the two pipeline buckets we write to: **Qualified Booked** and
**Contacted Not Booked** (exact spelling/casing).

## 5. Security
The `api-key` (ae...c8e0) has been shared in plaintext / screenshots. Please **rotate it**
once we're wired up; we store it only as an n8n environment variable.

## 6. Assignment
Confirm `userid` values for round-robin on booked appts: David Milo 100173,
Mike Colapinto 107230. Assign on Qualified Booked only — correct?
