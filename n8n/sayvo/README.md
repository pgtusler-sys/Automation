# n8n/sayvo — SayVo / IHL knowledge pack

Handoff pack for the SayVo AI voice → GHL → n8n → LeadMailbox pipeline, plus a spin-off
venture plan. Start here when continuing the work in a fresh chat.

| File | What it is |
|---|---|
| `PROJECT_KNOWLEDGE.md` | **Read first.** Complete current-state handoff: architecture, the LeadMailbox API field mapping (the hard part), disposition model, GHL payload shape, owner assignment, verified results, and open items. |
| `normalize.code.js` | Source of truth for the n8n **Normalize** Code node (workflow `2qDVTxvir6iZkVY9`). |
| `leadmailbox-disposition.workflow.json` | Importable export of the disposition workflow. NOTE: re-attach the `Custom Auth account` credential after import (credentials/secrets are not included). |
| `ADAS-outreach-plan.md` | Separate idea: own-account AI agent cold-calling auto body shops about ADAS calibration partners, incl. a cheaper-than-GHL stack. |

⚠️ No secrets are stored here. The LeadMailbox api-key lives only in the n8n credential.
