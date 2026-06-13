# LeadMailbox (IHL / account IHLI01) — integration spec

## Auth (store as n8n credential; ask Dan to ROTATE — emailed in plaintext)
api-account: IHLI01   |   api-key: <secret>   (both go in the JSON body)

## GHL — Independent Lending subaccount (CONFIRMED 2026-06-13)
locationId: dVtkyM31aGC8IWAKrcvW
GHL auth: Private Integration Token (Bearer pit-...) -> store as n8n Header Auth
  credential ONLY; never in node body or commit. ROTATE once wired (was screenshotted).
Contact custom-field keys (fieldKey -> use as {{contact.<key>}} / API id):
  leadid_leadmailbox  ULqBh4WhEnOVUzXQjVIF  <- LMB lead id (disposition write-back ref)
  person_id           TdV6dUVshH4Z4CIrqty0
  deal_id             qjzTw9HTmoWE91Xq0qzH
  status              PDLvoHl4dPN2WgIDvdcl
  cf_dispostion       L0meHdbRVsn4nqkE2Aax  (note: misspelled in GHL)
  note_html           ZLOJ5P5sleqaROuTg6fE
  lead_notes          IjxjwllVSYwz7opJCuVp  (LARGE_TEXT)
  custom_introduction vadHuBnrarRKLvfcndG8  (LARGE_TEXT)
  call_counter        infbSmh6IPfWwaVdwkeH  (NUMERICAL)
  add_label_id        d0eRhg2o1fIyHhw4oOys
  remove_label_id     mVkxA2Z11npKDU3storT
  state_id            9SSwI7GPWhqO1AdawZtI
  lost_reason         o1Q8QZqBAlZNhdFSfjyz

## INTAKE: LMB new lead -> our n8n webhook
LMB Settings | Services -> new service: Type=Server, Content-Type=POST JSON,
Status Trigger=New, URL=<n8n intake webhook>. Body uses {token} placeholders.
Lead ID token: likely {leadid} (Lead.LeadID internally) -- CONFIRM with Dan.
Custom field tokens: {field_NNN} (confirmed pattern field_121/field_125).

## WRITE-BACK: disposition -> single PATCH
PATCH https://api.leadmailbox.com/v2/leads/{leadid}
{ api-account, api-key,
  field_121: AI Status (disposition label),
  field_122: AI Appointment (booked time, only on Qualified Booked),
  field_123: AI Transcript (URL),
  field_124: AI Recording (URL),
  field_125: AI Summary,
  note: optional,
  userid: LO id (only on Qualified Booked, weighted round-robin) }

## Users (Settings | Users)
107371 Arman Zolmajd arman@sayvo.ai (SayVo - EXCLUDE from routing)
107260 Chelsea Santos chelsea@ihlend.com (Manager)
100173 David Milo dmilo@ihlend.com (Manager/President)
107230 Michael Colapinto mike@ihlend.com (Agent)

## Sample lead 36767917 (Robin Kim) custom fields available for intake -> AI context
field_034 Loan Purpose (HELOC), field_036 Loan Amount, field_007 Property Value,
field_008 Property Type, field_009 Property Use, field_041 Credit Rating,
field_039 Cash Out, field_044 Current Balance. (Mortgage/HELOC leads.)

## OPEN ITEMS
- Dan: confirm {leadid} token (and {field_NNN} for customs).
- David: round-robin pool (Mike only? Mike+Chelsea? all @ihlend) + assign on Qualified Booked only.
- David: also move MAIN Lead Status, or ONLY field_121? (Main-status changes can trigger the 16 Zapier services -> default: field_121 ONLY.)
- IHL: voice-agent branding line. (GHL location id CONFIRMED: dVtkyM31aGC8IWAKrcvW.)

## Disposition -> field_121 labels (free text; David confirms wording)
Qualified Booked | Qualified - Didn't Book | Unqualified | Not Interested |
Busy | Voicemail | Wrong Contact | Call Failed | Other
