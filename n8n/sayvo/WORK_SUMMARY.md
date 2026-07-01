# SayVo AI Call Disposition Automation — Work Summary

**Date:** 2026-06-12
**Branch:** `claude/affectionate-mendel-nw7BV`
**Scope:** Two AI-voice call disposition automations — Kingsmen Capital and Independent Home Lending (IHL)

---

## High-Level Summary

Across this engagement, two separate AI call-disposition automation pipelines were
designed and built, sharing a common architectural pattern (GHL webhook → n8n
normalizer → fan-out → CRM write-back) but targeting different downstream CRMs.

### 1. Kingsmen Capital — GHL → n8n → Pipedrive (WORKING, pending final config)

A production-grade n8n workflow that takes AI voice-call dispositions out of
GoHighLevel and syncs them into **two Pipedrive pipelines simultaneously** (Online
Leads, pid=9, and Term Loans, pid=2). Each disposition can move a deal's stage,
assign a round-robin owner (Term Loans only, to work around a pipeline-visibility
constraint), log call notes with transcript and recording links, and manage
disposition labels. The workflow is ~57 nodes (≈1,900 lines of JSON) and was tested
end-to-end against real Kingsmen data across all 16 disposition branches. A key
hard-won decision — decoupling stage from owner into separate PATCH calls — resolved
a whole-request rejection caused by an owner lacking visibility into the Online Leads
pipeline. Stage matching is hyphen/apostrophe-forgiving via a `clean()` normalizer so
GHL's disposition strings reliably resolve to numeric Pipedrive stage IDs.

### 2. Independent Home Lending — LeadMailbox → GHL → SynthFlow AI → n8n → LeadMailbox (IN PROGRESS)

A second, deliberately simpler write-back workflow targeting **LeadMailbox** instead
of Pipedrive. Where Pipedrive needs ~5 calls, LeadMailbox collapses to a **single
PATCH** to `/v2/leads/{id}` that updates the lead status plus five AI custom fields
(`field_121`–`field_125`) and conditionally assigns a loan officer via persistent
round-robin. The normalizer, disposition mapping (same 9 dispositions as Kingsmen),
round-robin via `$getWorkflowStaticData`, and env-var-based auth are all built and
the architecture is proven against the Kingsmen playbook. It remains IN PROGRESS,
blocked on external inputs from the client (GHL location ID, LeadMailbox field shapes
and AI statuses, a sample intake webhook payload, the LO roster, and voice branding)
rather than on engineering.

Two reusable Claude skills were authored to capture the hard-won patterns
(GHL→n8n→Pipedrive disposition patterns, and Pipedrive API connection specifics), and
full documentation (CODEX_REVIEW, PROJECT_STATUS, LeadMailbox spec) was produced.

---

## Breakdown of Work by Category

### Architecture & Design
- Defined the shared three-phase pattern: GHL intake → n8n normalizer → fan-out
  gates → CRM write-back, reusable across both integrations.
- Designed the **normalizer** pattern: a single Code node that un-nests GHL's split
  payload (`body.customData.*` for custom data, top-level `body.*` for contact
  fields), coerces strings → numeric IDs, and resolves owner emails → CRM user IDs.
- Designed multi-pipeline routing for Kingsmen (Online Leads vs Term Loans) with
  per-pipeline action semantics (stage-only vs stage+owner).
- Designed the single-PATCH write-back model for LeadMailbox and the disposition →
  status/field mapping for both CRMs.

### Workflow Build
- Built the ~57-node Kingsmen Pipedrive workflow (v7): two-pipeline fan-out,
  stage resolution, round-robin owner, v1 notes with transcript/recording links,
  label persistence via PATCH + merged array, update-or-create on Term Loans.
- Built the LeadMailbox write-back workflow: normalizer, round-robin LO assignment,
  conditional non-null PATCH body via `JSON.stringify(Object.assign(...))`, env-var
  auth.

### Debugging Sessions (live)
- Diagnosed and fixed the **owner-visibility rejection** on Kingsmen (decouple
  stage from owner across pipelines).
- Worked through n8n footguns: credential links breaking on import,
  `continueOnFail` hiding errors, Fixed vs Expression mode on JSON body, trailing
  commas / escaping in hand-built JSON.
- Diagnosed Pipedrive **silent no-ops** (wrong custom-field hash returns
  `success: true` but writes nothing) and the v1-vs-v2 endpoint split.
- Stage-name matching failures (truncated "Qualified" not matching map keys) traced
  and documented as a GHL-config remediation.

### API Discovery
- Mapped Pipedrive API version rules per resource (v2 for deals/persons/stages/
  fields; v1-only for notes and users).
- Discovered LeadMailbox v2 API shape live: auth keys (`api-account`/`api-key` in
  body), the single-PATCH endpoint, `field_121`–`field_125` custom fields, `status`
  key, `userid` assignment, user roster, and the `{leadid}`/`{field_NNN}` token
  pattern for intake.

### Documentation
- `CODEX_REVIEW.md` — comprehensive 298-line integration review (architecture,
  per-integration status, learnings, blockers, security, next steps).
- `PROJECT_STATUS.md` — concise working-state snapshot.
- `leadmailbox-spec.md` — LeadMailbox API/service reference from live discovery.

### Skills Authoring
- `ghl-n8n-pipedrive-disposition` skill — reusable patterns and gotchas for the
  whole class of GHL → n8n → Pipedrive disposition automations.
- `pipedrive-api-connection` skill — Pipedrive auth, host/version selection, ID
  discovery, and silent-failure gotchas.

---

## Rough Hours Estimate

These are defensible ranges for the effort a senior automation engineer would
realistically spend producing these artifacts (a ~57-node workflow tested across 16
branches, live multi-API debugging, a second workflow, two skills, and full docs).
Ranges, not single numbers.

| Phase | Work | Low (h) | High (h) |
|---|---|---|---|
| 1. Architecture & design | Shared pattern, normalizer, multi-pipeline routing, single-PATCH model, disposition maps | 3 | 5 |
| 2. Kingsmen workflow build | ~57-node two-pipeline workflow, stage/owner/notes/labels | 5 | 8 |
| 3. Kingsmen debugging (live) | Owner-visibility fix, n8n footguns, stage matching, end-to-end testing across 16 branches | 4 | 7 |
| 4. Pipedrive API discovery | v1/v2 rules, ID discovery, silent no-op diagnosis | 1.5 | 3 |
| 5. LeadMailbox build | Write-back workflow, round-robin, conditional PATCH, env auth | 2 | 3.5 |
| 6. LeadMailbox API discovery | Live API shape, fields, roster, token pattern, intake/write-back model | 1.5 | 3 |
| 7. Skills authoring | Two reusable skills | 1.5 | 2.5 |
| 8. Documentation | CODEX_REVIEW, PROJECT_STATUS, spec, this summary | 1.5 | 3 |
| **Total** | | **20** | **35** |

**Estimated total effort: ~20–35 hours** of senior automation engineering, with a
realistic midpoint around **26–28 hours**. The Kingsmen build + live debugging is the
single largest bucket; the LeadMailbox side is lighter because the architecture was
reused and most remaining IHL work is blocked on client inputs rather than
engineering.

---

## Deliverables

| File | Description | Size |
|---|---|---|
| `kingsmen-pipedrive-disposition.json` | ~57-node Kingsmen GHL→Pipedrive workflow (v7), WORKING | 1,897 lines |
| `leadmailbox-disposition.json` | IHL LeadMailbox write-back workflow, ready to deploy | 176 lines |
| `leadmailbox-spec.md` | LeadMailbox API / service-discovery reference | — |
| `CODEX_REVIEW.md` | Comprehensive integration review (architecture, status, learnings, next steps) | 298 lines |
| `PROJECT_STATUS.md` | Concise working-state snapshot | — |
| `WORK_SUMMARY.md` | This recap and hours estimate | — |
| `.claude/skills/ghl-n8n-pipedrive-disposition/SKILL.md` | Reusable disposition-automation skill | — |
| `.claude/skills/pipedrive-api-connection/SKILL.md` | Reusable Pipedrive API skill | — |

---

## Remaining Work (Blockers Carried Forward)

### Kingsmen (final config — engineering done)
1. GHL disposition branches must each send the **full** `stage_name` (not truncated
   "Qualified") so it matches the ONLINE_LEADS / TERM_LOANS maps.
2. Fill `COMPANY_DOMAIN` and any custom-field hash keys in the Normalize node.
3. Switch webhook URL from staging to production, then a final dry run.

### IHL / LeadMailbox (blocked on client inputs)
1. **GHL location ID** for the Independent Lending subaccount (needed for intake).
2. **Dan English:** create the AI statuses in LeadMailbox and confirm
   `field_121`–`field_125` shapes (dropdown vs free text, valid values).
3. **Sample intake webhook payload** — fire a test lead from LMB Settings → Services
   to confirm `{leadid}` / `{field_NNN}` token names and payload shape.
4. **LO roster & round-robin rules** — confirm pool (David Milo / Mike Colapinto /
   others) and whether assignment is Qualified-Booked-only.
5. **Voice branding** line for `field_124` and GHL voice-agent config.
6. Decide whether to move the **main Lead Status** or only `field_121` (main-status
   changes may trigger existing Zapier services).

### Security
- LeadMailbox API key was emailed in plaintext — **rotate once live**; store only as
  an n8n credential / env var, never hardcoded.
