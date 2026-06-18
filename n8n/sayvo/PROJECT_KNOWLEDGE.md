# SayVo / IHL — LeadMailbox disposition write-back — Project Knowledge

**Status:** ✅ Live and working in production (last verified 2026-06-16).
**Purpose of this doc:** complete, current handoff so a fresh chat can continue without re-deriving anything.

---

## 1. What this system does

SayVo AI voice agent (on Synthflow) calls Independent Lending (IHL) leads. After each
call, GoHighLevel (GHL) fires a webhook to an n8n workflow, which writes the call
disposition back into **LeadMailbox** (LMB) — moving the lead to the right status group,
adding a note, recording the AI status, and (on booked calls) assigning a loan officer.

```
Synthflow (calls)  ->  GHL (disposition + webhook)  ->  n8n (normalize + PATCH)  ->  LeadMailbox
```

---

## 2. The n8n workflow

- **Instance:** https://n8n.quetalk.ai/  (this is a SHARED COMPANY instance)
- **Workflow name:** `IHL - Post Outbound GHL Disposition to LeadMailbox`
- **Workflow id:** `2qDVTxvir6iZkVY9`
- **Webhook (production):** `POST https://n8n.quetalk.ai/webhook/leadmailbox/disposition`
- **Shape:**
  ```
  Webhook: Disposition -> Normalize (Code) -> IF: Ready?
      true  -> LeadMailbox: PATCH -> Respond: Live Result
      false -> Respond: Skipped
  ```
- **Versioning gotcha:** this instance uses draft → publish. Webhooks run the *published*
  version. After any edit you MUST publish or production keeps running the old version.
- The Normalize node source of truth lives at `n8n/sayvo/normalize.code.js` in this repo.

### PATCH node config
- Method `PATCH`, URL `={{ $json.base + '/leads/' + $json.leadid }}`
- Body (JSON, expression): `={{ JSON.stringify($json.patch_body) }}`
- Auth: **Generic Credential Type → Custom Auth**, credential `Custom Auth account`
  (type `httpCustomAuth`, id `28A2wulYldwugXOj`).

---

## 3. LeadMailbox API — confirmed facts (the hard-won knowledge)

Base: `https://api.leadmailbox.com/v2`  ·  Account: `IHLI01`

### Auth
- LMB expects `api-account` + `api-key` **in the request body**.
- This n8n instance has `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`, so `$env` is blocked at runtime.
- Solution: a **Custom Auth credential** that injects them, so they never live in the workflow:
  ```json
  { "body": { "api-account": "IHLI01", "api-key": "<LMB_API_KEY>" } }
  ```
  (The key is stored only in the n8n credential. Do NOT commit it anywhere.)
- ⚠️ The n8n MCP server **cannot create credentials** — must be done in the n8n UI.
  It also doesn't echo the `credentials` field back when reading a node.

### Field mapping (THE key discovery — three look-alike fields)
| Purpose | LMB field | Notes |
|---|---|---|
| **Status Group** (left sidebar) | **`lead_status`** | The field that actually MOVES the lead. We also send `status` as a harmless fallback (param name not 100% confirmed; LMB returns success and ignores the unused one). |
| Call outcome | `call_status` | Dan's first example (`"No Answer"`). Does **NOT** move the status group. |
| AI Status (column) | `field_121` | Display-only custom field. We put the granular disposition here. |
| AI Summary | `field_125` | |
| Appointment | `field_122` | |
| Transcript | `field_123` | |
| Recording | `field_124` | |
| Note | `note` | We prepend `AI Disposition: <label>` then the GHL note. |
| Owner / assignee | `userid` (integer) | LMB only accepts the integer id. |

> Original handoff said the bucket goes in `call_status` — **that was wrong.** The bucket
> belongs in **Lead Status** (`lead_status`). Confirmed live: setting it moved the test lead.

### Status Groups vs. leaf statuses
- LMB "Status Groups" (sidebar) are driven by the **Lead Status** field.
- Group `Qualified Booked` contains a leaf status also named `Qualified Booked`;
  group `Contacted Not Booked` contains a leaf `Contacted Not Booked`. So we set the
  Lead Status to the exact group/leaf name and the lead moves.

### Success response
- `{"code":0,"message":"success"}`

### Loan officer user ids (Settings | Users)
- **David Milo** — `100173` — dmilo@ihlend.com
- **Mike Colapinto** — `107230` — mike@ihlend.com

---

## 4. Two-bucket disposition model

Every disposition collapses into one of two LMB status groups; granular detail kept in `field_121` + note.

| GHL `stage_name` (case/punctuation-insensitive) | → Status Group | booked? (assigns owner) |
|---|---|---|
| `Qualified Booked`, `Booked`, `Meeting Booked` | **Qualified Booked** | ✅ |
| `Qualified Didn't Book`, `Qualified No Book` | Contacted Not Booked | no |
| `Unqualified` | Contacted Not Booked | no |
| `Not Interested` | Contacted Not Booked | no |
| `Busy` | Contacted Not Booked | no |
| `Voicemail`, `AI Voicemail` | Contacted Not Booked | no |
| `Wrong Contact` | Contacted Not Booked | no |
| `Call Failed` | Contacted Not Booked | no |
| `Other`, `AI Other` | Contacted Not Booked | no |
| anything else (incl. GHL "None" branch) | — **skipped, no LMB update** | — |

Normalize lowercases, strips apostrophes/dashes, and collapses whitespace before matching.

---

## 5. GHL webhook payload (what actually arrives)

- `leadid` plumbing: GHL custom field `leadid_leadmailbox`; webhook sends
  `leadid = {{contact.leadid_leadmailbox}}`. Normalize also has a regex fallback that
  extracts the id from the `lead_notes` blob (`LeadMailbox Lead ID: <digits>`).
- Disposition arrives in `customData.stage_name` (lowercased branch name).
- **Owner** arrives at the **body root** as `user: { firstName, lastName, email }` — NOT
  in customData. Normalize reads `body.user` and maps name+email → `userid`.
- GHL location id (IHL subaccount): `dVtkyM31aGC8IWAKrcvW`.

### Owner assignment behavior (per product decision)
- Assign **only on booked** dispositions (Qualified Booked).
- GHL is the single source of truth for round-robin; n8n just maps GHL owner → LMB userid.
- n8n's internal `ROUND_ROBIN` is a fallback only (booked lead with no recognized owner).
- Plan on the GHL side: remove "Assign to user" from all branches except Qualified Booked.

---

## 6. Verified end-to-end (2026-06-16)
- Auth via Custom Auth credential — `{"code":0,"message":"success"}`. ✅
- Disposition `not interested` → lead moved to **Contacted Not Booked** group. ✅
- AI Status column shows the granular disposition (`field_121`). ✅
- Note written with `AI Disposition:` prefix. ✅
- Owner resolution: `Mike Colapinto` → `107230` computed correctly from `body.user`. ✅

---

## 7. Open items / next steps
1. **GHL fix:** the *Qualified Booked* branch's webhook was still sending
   `stage_name: "not interested"`. Set it to `Qualified Booked` so booked + owner
   assignment actually fires, then re-fire and verify `userid` lands.
2. Confirm with Dan whether the Lead Status param is `lead_status` or `status` (we send
   both; once known, drop the dead key).
3. **Inbound call context workflow** (`543Im9yiemVmSLfD`) — needs "Available in MCP"
   enabled before it can be read/edited via MCP. Next focus area.
4. Intake side (LMB Service → n8n): token syntax `#{LeadID}`; leads arrive as
   "Future Contact" (not "New"), so a "New"-status trigger never auto-fires.
5. **Security:** the LMB api-key and GHL token were exposed in plaintext earlier. User
   opted not to rotate for now — revisit if this goes to real production volume.

---

## 8. Stack reference
- **Synthflow** — AI voice agent (makes calls, captures outcome). Voice branding:
  "Sam from Independent Lending" (hard money loans).
- **GoHighLevel (GHL)** — CRM, disposition branching, webhook out. Subaccount under a company.
- **n8n** (`n8n.quetalk.ai`) — shared company instance, MCP-enabled.
- **LeadMailbox** — IHL's system of record (account IHLI01). CTO contact: Dan English.
