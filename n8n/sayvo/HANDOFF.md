# HANDOFF — SayVo voice-agent integrations (session context reload)

**Written:** 2026-07-01, on branch `claude/session-handoff-docs-87s5q4` (contains everything
from `claude/affectionate-mendel-nw7BV` plus this file).
**Purpose:** one-file context reload for a fresh Claude session. Read this first, then pull
the referenced docs as needed.

## How to get up to speed (new session)

1. Read this file.
2. Read `n8n/sayvo/PROJECT_STATUS.md` (working-state snapshot) and
   `n8n/sayvo/QUESTIONS_FOR_DAN.md` (open IHL blockers).
3. For depth: `CODEX_REVIEW.md` (full architecture + learnings), `leadmailbox-spec.md`
   (LMB API reference), `CLIENT_ONBOARDING_RUNBOOK.md` (per-client checklist),
   `WORK_SUMMARY.md` (engagement recap + hours).
4. The live n8n instance is reachable via the n8n MCP server — the workflow IDs below are
   current as of this file's date. Repo JSON files are reference exports/scaffolds; the
   n8n instance is the source of truth for what's actually deployed.

## State by client (as of 2026-07-01)

### Kingsmen Capital (GHL → n8n → Pipedrive) — WORKING
- Canonical workflow: `kingsmen-pipedrive-disposition.json` (v7, ~57 nodes). Tested
  end-to-end across all 16 disposition branches.
- Live in n8n: `Kingsmen (inbound call context)` (HhUPplKYyuLVrPlF, active),
  `SayVo Error Alerts (Kingsmen)` (DdjsU5Uzf1e2wrmY, active),
  `Kingsmen (Outbound to Inbound)` (dcQMLEzrWxplegPL, inactive).
- Remaining config (engineering done): GHL must send the FULL `stage_name` per branch
  (not truncated "Qualified"); fill `COMPANY_DOMAIN` in Normalize; switch webhook to
  production URL and do a final dry run.

### Independent Home Lending / IHL (LeadMailbox ↔ GHL ↔ SynthFlow ↔ n8n) — DEPLOYED, ACTIVE
Live workflows in n8n (all active):

| Workflow | ID | Notes |
|---|---|---|
| IHL - LeadMailbox Intake to GHL | 5u6gngg1VdpNNo28 | last updated 06-25 |
| IHL - Post Outbound GHL Disposition to LeadMailbox | 2qDVTxvir6iZkVY9 | last updated 06-18 |
| IHL - LeadMailbox AI No Show to GHL Tag | sFetORewfsvmwAKo | built 06-25, "AI No Show" status → GHL "No Show" tag |
| IHL (inbound call context) | 543Im9yiemVmSLfD | updated 06-30 |
| IHL (inbound call context)v1 | aDARPYddFhBZQ6mO | created 06-30, ALSO active — see open items |

- Confirmed facts: GHL location `dVtkyM31aGC8IWAKrcvW`; two-bucket model
  ("Qualified Booked" / "Contacted Not Booked"); `STATUS_KEY='call_status'`; leadid
  plumbing proven (dry-run leadid=36769638); voice = "Sam from Independent Lending"
  (hard money loans); round-robin LOs David Milo 100173 / Mike Colapinto 107230
  (assign on Qualified Booked only).
- ⚠️ The repo docs (`PROJECT_STATUS.md`, `QUESTIONS_FOR_DAN.md`, dated ~06-12) describe a
  dry-run state, but the live instance has moved on since (workflows active, an AI No Show
  workflow added 06-25, call-context edits 06-30). Before acting on any "blocker" listed in
  those docs, check the live workflow in n8n first — several were likely resolved live and
  never written back to the repo.

### Advantage Lending (Bonzo system-of-record) — SCAFFOLDS ONLY, NOT DEPLOYED
- Repo has three import-ready n8n JSON scaffolds in `n8n/sayvo/advantage/`, mirroring the
  IHL pattern with `REPLACE_*` placeholders for Bonzo/GHL specifics:
  - `advantage-bonzo-intake.json` (Bonzo lead → GHL contact upsert)
  - `advantage-disposition-to-bonzo.json` (SynthFlow disposition → Bonzo update)
  - `advantage-inbound-call-context.json` (SynthFlow → GHL lookup, by-ID custom fields)
- Nothing named "Advantage" exists in the live n8n instance yet.
- To deploy: walk `CLIENT_ONBOARDING_RUNBOOK.md` §0 for the Advantage subaccount
  (location ID, PIT credential, custom-field IDs, pipeline stages, SynthFlow agent), fill
  the `REPLACE_*` placeholders, import, and test with a dry lead.

## Open items

1. **Advantage go-live** — the main forward work: gather Bonzo API auth + field shapes and
   the GHL Advantage subaccount facts, fill scaffolds, deploy (see above).
2. **Duplicate IHL call-context workflows** — `543Im9yiemVmSLfD` and the "v1" copy
   `aDARPYddFhBZQ6mO` are BOTH active. Confirm which one SynthFlow points at and
   deactivate the other.
3. **Questions for Dan** (`QUESTIONS_FOR_DAN.md`) — verify against the live instance which
   are still open. Written-as-open items: full `call_status` value enum, intake Service
   token syntax + Status Trigger, bucket statuses created in LMB, n8n env vars
   `LMB_API_ACCOUNT`/`LMB_API_KEY` set.
4. **Rotate the LeadMailbox api-key** — it was shared in plaintext/screenshots. Store only
   as an n8n credential/env var. Still open unless Dan confirms rotation.
5. **Kingsmen final config** — full stage_name per GHL branch + production URL switch.
6. **n8n MCP connection** — the previous chat session ended because the n8n MCP connection
   was unstable. The connection is now pinned down in the repo: `.mcp.json` points at
   `https://n8n.quetalk.ai/mcp-server/http` (HTTP transport) and reads the bearer token
   from the `N8N_MCP_TOKEN` env var (see `.env.example`; the real token lives only in
   `.env` / session env, never in git). If a session can't reach n8n, check that
   `N8N_MCP_TOKEN` is set and the token is still valid (n8n Settings → MCP server) before
   suspecting the instance. The MCP server worked fine from the 2026-07-01 remote session.
7. **Repo docs drift** — after any live change in n8n, re-export the workflow JSON into
   `n8n/sayvo/` and update `PROJECT_STATUS.md`, so the next handoff doesn't have to
   re-diagnose the gap between docs and reality.

## What was lost with the old session

Only the conversational back-and-forth (the "why" behind small choices). Everything
load-bearing is either in these docs, the committed workflow JSON, or the live n8n
instance. The reusable patterns and gotchas are captured in
`.claude/skills/ghl-n8n-pipedrive-disposition/SKILL.md` and
`.claude/skills/pipedrive-api-connection/SKILL.md`.
