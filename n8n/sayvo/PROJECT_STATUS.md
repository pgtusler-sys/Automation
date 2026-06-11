# SayVo integrations — working state

## Kingsmen (GHL -> n8n -> Pipedrive) — WORKING
- `kingsmen-pipedrive-disposition.json` = canonical n8n workflow (v7).
  Two-pipeline sync: Online Leads (9) stage by name, Term Loans (2) update-or-create,
  owner only on TL (Asad 31874979), notes via v1, hyphen/apostrophe-proof stage matching.
- Remaining: GHL must send FULL stage_name per branch (not "Qualified"); production URL switch.

## Independent Lending (LeadMailbox -> GHL -> n8n -> LeadMailbox) — IN PROGRESS
- LMB API (from Dan English email, ihlend acct IHLI01):
  - Intake: LMB posts full lead payload to our webhook (configured Settings | Services)
  - Write-back: single PATCH https://api.leadmailbox.com/v2/leads/{LEADID}
    body: api-account, api-key, field_121 (AI status), userid (assign LO), note, field_125 (AI summary)
  - API key was emailed in plaintext -> ask Dan to ROTATE once live. Store only as n8n credential.
- Same 9 dispositions as Kingsmen; reuse optimized SynthFlow extractor (rules v2 with priority order).
- BLOCKERS: (1) valid field_121 values / is it dropdown or free text; (2) sample new-lead webhook
  payload (fire test from Settings | Services); (3) userid roster + round-robin weights
  (assign on Qualified Booked only); (4) IHL voice branding + GHL location id.
