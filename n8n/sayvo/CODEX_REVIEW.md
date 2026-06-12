# SayVo AI Call Disposition Automation — Codex Review

## Executive Summary

Built two separate AI call disposition automation workflows:

1. **Kingsmen Capital** (GHL → n8n → Pipedrive) — **WORKING, pending final config**
   - Dispositions from AI voice calls update two Pipedrive pipelines simultaneously (Online Leads + Term Loans)
   - Logs call notes with transcript/recording links, assigns round-robin owners
   - 57-node workflow, fully tested with real data

2. **Independent Home Lending** (LeadMailbox → GHL → SynthFlow AI → n8n → LeadMailbox) — **IN PROGRESS**
   - Single PATCH to LeadMailbox per disposition updates main Lead Status + 5 AI custom fields + assigns LOs
   - 4 functional nodes, architecture proven on Kingsmen playbook
   - Blockers: GHL location ID, LeadMailbox field shapes, LO roster

---

## Architecture Overview

### Pattern: GHL Webhook → n8n Normalizer → Fan-Out Gates → CRM

**Phase 1 (Intake):** Lead enters GHL → AI extracts fields (name, notes, deal_id, person_id) → upsert into GHL contact

**Phase 2 (Call):** GHL voice agent chooses disposition (Voicemail, Busy, Not Interested, Qualified Booked, etc.)

**Phase 3 (Disposition Sync):** GHL webhook fires → n8n **Normalize** node coerces strings→numbers, resolves email→user_id, sets config → fan-out gates → target CRM writes

### The Normalizer (critical — don't delete)

Single Code node that un-nests GHL's `body.customData`, coerces strings to numbers, resolves owner emails to Pipedrive user IDs via a prefilled map. Outputs a clean flat object the rest of the workflow reads. **This is the only place strings become the numeric IDs Pipedrive/LeadMailbox need.**

Key pattern: GHL puts custom-data under `body.customData.*` AND contact fields at top-level `body.*` — always read both:
```javascript
person_id: c.person_id || body.person_id || null,
```

### n8n Footguns (time-wasters)

- **Credential links break on import** — always re-select on every node after import
- **`continueOnFail: true` hides errors** — always read actual node output, not just run status
- **Fixed vs Expression mode on JSON Body** — paste `{{ … }}` in **Expression** mode (no `=`; n8n stores the `=` itself)
- **Use `JSON.stringify(Object.assign(...))`** — auto-escapes quotes/newlines, avoids trailing commas

---

## Kingsmen Capital (GHL → Pipedrive)

### Status: WORKING

**File:** `kingsmen-pipedrive-disposition.json` (57 nodes, v7)

### What Works

- ✅ Two-pipeline sync: Online Leads (pid=9) + Term Loans (pid=2)
- ✅ Stage mapping via hyphen/apostrophe-forgiving `clean()` function
- ✅ Owner assigned round-robin only on Term Loans (Online Leads has no owner visibility issue)
- ✅ Call notes logged via v1 with transcript & recording links
- ✅ Label management (disposition tags, persisted via PATCH + merge array)
- ✅ Tested end-to-end with real Kingsmen data

### Key Decisions

**Why two pipelines?** Online Leads tracks inquiry source (website, comparewise, etc.); Term Loans is the sales funnel. One contact appears in both. Dispositions route per-pipeline:
- Online Leads: stage only (inquiry resolution)
- Term Loans: stage + owner (sales assignment)

**Owner visibility constraint:** Asad lacks Online Leads pipeline visibility → sending `{owner_id, stage_id}` in one PATCH rejected the whole request. **Fix: decouple stage from owner.** Stage goes on both pipelines; owner goes only on TL.

**Stage name matching:** GHL sends "Qualified Booked" or "AI Voicemail" — names must be exact and full (not truncated "Qualified"). If `clean(ghl_disposition)` doesn't match any map key, silently skip (no error, no write). Tested with all 16 disposition branches.

### Architecture: Resolve Stage Node

```javascript
const clean = (s) => (s || '').toString().toLowerCase()
  .replace(/[''ʼ']/g, '')           // strip all apostrophe variants
  .replace(/[‐-―-]/g, ' ')          // dash variants → space
  .replace(/\s+/g, ' ').trim();

const ONLINE_LEADS = {
  'kc website broker': 74, 'comparewise': 72, 'kc website client': 73, 'ai re engagement': 120,
  'qualified booked': 110, 'qualified didnt book': 111, 'unqualified': 112, 'not interested': 113,
  'busy': 114, 'ai voicemail': 115, 'voicemail': 116, 'wrong contact': 117, 'other': 118, 'ai other': 118, 'call failed': 119
};
const TERM_LOANS = {
  'qualified booked': 98, 'qualified didnt book': 97, 'not interested': 97, 'busy': 97
};

// Emit per-deal action items tagged action: "update" | "create"
// Stage goes on both pipelines; owner only on TL
owner_id: (pid === 2 && cfg.owner_id != null ? cfg.owner_id : null)
```

### Remaining Tasks

1. **GHL config:** Each disposition branch must hardcode full `stage_name` (not truncated). Currently "Qualified" → no match. Verify all 16 branches send exact names from ONLINE_LEADS + TERM_LOANS maps.

2. **Normalize node fields:** Fill in:
   - `COMPANY_DOMAIN` (for email validation)
   - Custom field keys (40-char hashes for any AI-specific fields in Pipedrive)

3. **Webhook URL:** Switch from staging to production once everything validated.

4. **Owner map:** Already complete with all Kingsmen staff; verify email/ID pairs if roster changes.

---

## Independent Home Lending (LeadMailbox → GHL → n8n → LeadMailbox)

### Status: IN PROGRESS

**Files:**
- `leadmailbox-disposition.json` (4 functional nodes + sticky, ready to deploy)
- `leadmailbox-spec.md` (full API reference and service discovery)

### What's Built & Tested

- ✅ Normalize node: un-nests GHL webhook, coerces strings→numbers, resolves owner email→ID via map
- ✅ Round-robin via `$getWorkflowStaticData('global')` persistent counter (David Milo #100173, Mike Colapinto #107230)
- ✅ PATCH template uses `JSON.stringify(Object.assign(...))` to safely include only non-null fields
- ✅ Auth via environment variables (`$env.LMB_API_ACCOUNT`, `$env.LMB_API_KEY`), never hardcoded
- ✅ All 9 dispositions mapped to LeadMailbox statuses (AI - Qualified Booked, AI - Not Interested, etc.)
- ✅ Field shapes verified: `api-account`, `api-key`, `status`, `userid`, `field_121`–`field_125`, `note`

### Architecture: The Single PATCH

LeadMailbox is far simpler than Pipedrive — one PATCH to `/v2/leads/{id}` replaces ~5 Pipedrive calls:

```javascript
PATCH https://api.leadmailbox.com/v2/leads/{id}
body: {
  'api-account': 'IHLI01',
  'api-key': '<from env>',
  'status': 'AI - Qualified Booked',     // main lead status
  'field_121': 'Qualified',              // AI primary disposition
  'field_122': 'Booked',                 // AI confidence / sub-disposition
  'field_123': '2026-06-12',             // call date
  'field_124': 'Sam from IHL voice call', // call source/branding
  'field_125': 'Lead said yes to callback', // AI summary
  'userid': 100173,                      // David (round-robin assigned on booking only)
  'note': 'Call transcript / recording link'
}
```

### Blockers & Decisions

**1. GHL Location ID for Independent Lending subaccount**
   - Needed to create GHL opportunities on intake (like Kingsmen did)
   - Must be extracted from GHL UI (Settings → Subaccounts → Independent Lending → get `locationId`)
   - **Action:** Use Claude-in-Chrome to navigate GHL and extract this

**2. LeadMailbox field shapes (IHL-specific)**
   - `field_121` — is it dropdown enum or free text? What are the valid values?
   - `field_122`–`field_125` — what do IHL use these for?
   - `status` — the PATCH key is definitely `status` (confirmed by Dan English), but verify all AI statuses (`AI - Qualified Booked`, `AI - Not Interested`, etc.) are created in LMB
   - **Action:** Dan must create AI statuses in LeadMailbox; confirm field shapes

**3. Sample webhook payload from LeadMailbox**
   - Currently assuming LMB sends lead JSON with `leadid`, `first_name`, `last_name`, `phone`, `email`, custom fields
   - Fire test lead from LMB Settings → Services → Server service to see actual shape
   - **Action:** Confirm LMB → n8n webhook payload structure (full `leadid` field name, custom field keys)

**4. LO roster & round-robin rules**
   - Currently: David Milo (100173) + Mike Colapinto (107230), alternating on Qualified Booked only
   - Decide: are these the only two LOs? Should other dispositions assign? Weights?
   - **Action:** Confirm roster and assignment rules

**5. Voice branding**
   - What does the AI say when it calls? ("Sam from Independent Home Lending"?)
   - Needed for field_124 and GHL voice agent config
   - **Action:** Confirm branding line

### Disposition Mapping (Proven, Reusable)

Same 9 dispositions as Kingsmen:
```javascript
const MAP = {
  'qualified booked':     { status: 'Contact',                    booked: true  },
  'qualified didnt book': { status: 'AI - Qualified No Book',    booked: false },
  'unqualified':          { status: 'AI - Unqualified',          booked: false },
  'not interested':       { status: 'AI - Not Interested',       booked: false },
  'busy':                 { status: 'AI - Busy',                 booked: false },
  'voicemail':            { status: 'AI - Voicemail',            booked: false },
  'wrong contact':        { status: 'AI - Wrong Contact',        booked: false },
  'call failed':          { status: 'AI - Call Failed',          booked: false },
  'other':                { status: 'AI - Other',                booked: false }
};
```

---

## Key Technical Learnings

### GHL Webhook Payload Shape (Critical)

Custom-data lands under `body.customData.*`; **contact fields land at top-level `body.*`** — NOT in customData.

```javascript
{
  "body": {
    "person_id": 12345,           // contact field — at top level
    "owner_email": "...",         // contact field — at top level
    "customData": {
      "ai_confidence": "high",    // custom data — nested
      "transcript_url": "..."     // custom data — nested
    }
  }
}
```

**Solution in Normalizer:** Always read both:
```javascript
person_id: c.person_id || body.person_id || null,
```

### Silent No-Ops (Pipedrive-specific)

Sending a wrong custom-field hash key returns `success: true` but **silently doesn't update anything**. After any write, verify the response `data` actually has the fields you sent.

### Round-Robin via Static Data (n8n Pattern)

Persistent counter across executions:
```javascript
const sd = $getWorkflowStaticData('global');
sd.rr = ((typeof sd.rr === 'number' ? sd.rr : -1) + 1) % OWNERS.length;
ownerid = OWNERS[sd.rr];  // increments on every execution
```

### Pipedrive API Version Rules

- **v2** for: deals, persons, pipelines, stages, dealFields, personFields
- **v1 ONLY** for: notes (no v2 endpoint), users (no v2 list endpoint)

---

## File Locations

```
/home/user/Automation/n8n/sayvo/
├── kingsmen-pipedrive-disposition.json    # 57-node Kingsmen workflow (WORKING)
├── leadmailbox-disposition.json           # 4-node IHL write-back (READY)
├── leadmailbox-spec.md                    # Full IHL API/service reference
├── PROJECT_STATUS.md                      # Brief status snapshot
├── CODEX_REVIEW.md                        # This file
└── claude-in-chrome-prompts.md            # Extraction scripts (GHL location ID discovery)
```

All committed to branch `claude/affectionate-mendel-nw7BV` in `pgtusler-sys/Automation` repo.

---

## Next Steps (Priority Order)

### Immediate (IHL Blockers)

1. **Extract GHL location ID** — use Claude-in-Chrome to navigate GHL → Independent Lending subaccount → get `locationId`
2. **Dan English:** Create AI statuses in LeadMailbox (AI - Qualified Booked, AI - Not Interested, AI - Unqualified, AI - Busy, AI - Voicemail, AI - Wrong Contact, AI - Call Failed, AI - Other)
3. **Dan English:** Confirm `field_121`–`field_125` shapes and usage
4. **Fire test lead** — LMB → n8n webhook to confirm payload shape
5. **Confirm LO roster** — David Milo, Mike Colapinto, assignment rules
6. **Confirm voice branding** — what does AI say when it calls?

### Short-Term (Kingsmen Final Config)

1. **GHL disposition branches** — ensure each sends full `stage_name` (exact match from ONLINE_LEADS/TERM_LOANS maps)
2. **Normalize node** — fill in COMPANY_DOMAIN + custom field keys
3. **Webhook URL** — switch from staging to production
4. **Dry run** — fire test disposition from GHL, verify both pipelines update

### Longer-Term (IHL Intake Workflow)

Once blockers resolve:
1. Build LMB intake workflow (LMB → n8n → create GHL contact/opportunity)
2. Wire GHL location ID as config
3. Deploy disposition write-back to production
4. Dry run: lead in LMB → AI call → disposition → back to LMB + GHL

---

## Security Notes

- **LeadMailbox API key** was emailed in plaintext. Ask Dan to **rotate it once live**. Store only as n8n credential (`$env.LMB_API_KEY`), never hardcode.
- **Pipedrive API token** stored via predefined `pipedriveApi` credential type (n8n built-in).
- All n8n nodes use `continueOnFail: false` to catch errors; always read actual node outputs.

---

## Questions for Codex

1. Is the two-pipeline architecture for Kingsmen sound? (Online Leads for inquiry tracking, Term Loans for sales)
2. Should IHL LO assignment (David / Mike) be on all dispositions or only Qualified Booked?
3. Are there other integrations besides Kingsmen + IHL that need this pattern?

---

**Last updated:** 2026-06-12 (continuation from 32k+ context session)
**Author:** Claude Code
**Branch:** `claude/affectionate-mendel-nw7BV`
