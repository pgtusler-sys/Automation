# SayVo integrations — working state

## Kingsmen (GHL -> n8n -> Pipedrive) — WORKING
- `kingsmen-pipedrive-disposition.json` = canonical n8n workflow (v7).
  Two-pipeline sync: Online Leads (9) stage by name, Term Loans (2) update-or-create,
  owner only on TL (Asad 31874979), notes via v1, hyphen/apostrophe-proof stage matching.
- Remaining: GHL must send FULL stage_name per branch (not "Qualified"); production URL switch.

## Independent Lending (LeadMailbox -> GHL -> n8n -> LeadMailbox) — IN PROGRESS (dry-run green)
- Write-back workflow `leadmailbox-disposition.json` updated to current working state:
  two-bucket model, STATUS_KEY='call_status', leadid regex fallback, DRY_RUN guard.
- CONFIRMED: GHL location id dVtkyM31aGC8IWAKrcvW; leadid plumbing works (dry-run leadid=36769638);
  two buckets = "Qualified Booked" / "Contacted Not Booked"; voice = "Sam from Independent Lending"
  (hard money loans). Dry-run preview maps "not interested" -> Contacted Not Booked + field_121.
- LAST BLOCKERS (see QUESTIONS_FOR_DAN.md): (1) Dan's full call_status value enum + whether
  call_status is the bucket field or separate; (2) intake Service token syntax (#{LeadID} vs {leadid})
  + which Status Trigger fires it (leads arrive as "Future Contact", not "New"); (3) create the two
  bucket statuses in LMB; (4) set n8n env vars LMB_API_ACCOUNT/LMB_API_KEY; (5) ROTATE api-key
  (shown in screenshots); then flip DRY_RUN=false.
