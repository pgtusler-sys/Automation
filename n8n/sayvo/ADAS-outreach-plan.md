# ADAS Calibration Outreach — own-account venture plan

A separate idea explored 2026-06-16: build a personally-owned AI voice agent that cold-calls
**auto body shops** to ask whether they have an **ADAS calibration partner** — reusing the
SayVo/IHL architecture but on the operator's own accounts (not the company's).

## Feasibility
Very doable, and *simpler* than the IHL build — one qualifying question, B2B, and no
third-party system-of-record to reverse-engineer.

```
list of body shops -> Synthflow (calls) -> capture outcome -> n8n (orchestrate) -> store results
```

## Script shape (one question, ~4 branches)
"Hi, this is [name] — quick question, do you currently work with an ADAS calibration partner?"
- **Yes** → who? are they happy with them?
- **No** → interested in options?
- **Gatekeeper / not the right person** → who handles it / callback
- **Voicemail / no answer**

## Cheaper stack (skip GHL)
For a single-question B2B campaign, GHL ($97+/mo) is overkill. Replace it:

| GHL function | Cheaper replacement |
|---|---|
| Contact DB | Airtable (free–$20) or Google Sheets (free) |
| Disposition branching / workflow | n8n (the `Normalize` pattern already proves this) |
| Tags / pipeline stages | a "status" column in Airtable/Sheets |
| Webhooks | n8n webhooks (free) |
| SMS / email follow-up | n8n → Twilio / SendGrid (pay-per-use) |
| Appointment booking | Cal.com (open-source, free) |

**Cheapest viable MVP:** Synthflow → self-hosted n8n ($5–6/mo VPS) → Airtable.
Takes the GHL line item from ~$97+/mo to ~$0–6/mo. Synthflow is the one unavoidable cost.

If a real CRM UI is wanted later: HubSpot Free, Twenty (OSS, self-host), or Zoho (~$14/user).

## Own-account checklist
- Own GHL (only if desired) / or Airtable + self-hosted n8n
- Own Synthflow account + agent + phone number (Synthflow-provisioned or Twilio)
- Own n8n (n8n Cloud or self-hosted VPS) — currently using the company's shared instance
- Lead list: Google Places API, a data vendor, or a scrape (this is the real work)

## Compliance to plan for (not blockers)
- National DNC where applicable; B2B is lighter than consumer but not exempt
- State **AI-disclosure** laws (several require disclosing it's an AI voice)
- **Call-recording consent** in two-party-consent states
- Local-presence caller ID helps with business gatekeepers

## Suggested MVP path
1. Pull 50–100 body shops in one metro (Google Places).
2. Build the Synthflow agent + 4-branch script.
3. Airtable base: tables `Shops`, `Calls`, `Dispositions`.
4. n8n: webhook → normalize → write outcome to Airtable (same shape as the IHL flow).
5. Run 50 calls, read transcripts, tune script, then scale.

## Open questions to answer before building
- What's the goal with a yes/no — sell ADAS calibration services, or sell the lead list?
- Where should results land — Airtable, Google Sheet, GHL, or another CRM?
