---
name: ghl-bulk-edit
description: Bulk-edit nodes in GoHighLevel (LeadConnector) workflows via the builder's internal API, using the scripts in scripts/ghl/. Use when the user wants to change node settings (model ids, phone fields, names, any per-node attribute) across one or many GHL workflows, re-capture GHL endpoints, or restore a workflow from backup.
---

# GHL Workflow Bulk-Edit

Deterministic bulk editing of GoHighLevel workflow nodes: fetch workflow JSON
via the builder's own API, transform it, diff it, save it back. No browser
clicking. All commands run from the repo root.

## How GHL stores workflows (verified 2026-07)

- Main record: `GET https://backend.leadconnectorhq.com/workflow/{locationId}/{workflowId}?includeScheduledPauseInfo=true`
- The full node graph is in the response at `workflowData.templates[]` — one
  template per node, settings under `templates[i].attributes` (e.g.
  `attributes.model` for AI-call nodes). A copy also lives as a Firebase
  Storage file (`fileUrl` on the record) but is NOT needed for editing.
- Save: `PUT` to the same URL **without** the query string, body = the full
  workflow document plus bookkeeping the builder adds:
  `modifiedSteps`/`createdSteps`/`deletedSteps` (arrays of template ids),
  `triggersChanged: false`, and `oldTriggers`/`newTriggers` (the triggers
  array, identical when triggers weren't touched; fetched from
  `GET .../workflow/{locationId}/trigger?workflowId={workflowId}`).
  `scripts/ghl/bulk-edit.ts` builds all of this automatically.
- Auth: `authorization` bearer + `channel`/`source` headers, captured into
  `data/ghl/endpoints.json`. Tokens expire with the browser session —
  **401 responses mean re-run login + capture** (steps 1–2 below).
- Saving never publishes. Publishing stays manual in the GHL UI.

## Workflow

1. **Login (once per session expiry):** `npm run ghl:login` — user logs in
   interactively (2FA), presses Enter; session saved to
   `data/ghl/storage-state.json`.
2. **Capture (once, or after 401s):**
   `npm run ghl:capture -- "<workflow builder URL>"` — user makes one tiny
   node edit + Save (not Publish) in the opened browser, presses Enter.
   Then `npm run ghl:endpoints` builds `data/ghl/endpoints.json` from the
   newest capture automatically. Auth is scoped per sub-account (and
   white-label domains like app.aicrm.agency are separate logins):
   switching sub-accounts = redo login + capture + ghl:endpoints.
3. **Write a transform** in `scripts/ghl/transforms/` — a module
   default-exporting `(workflow) => workflow | null` (null = skip this
   workflow). Iterate `workflow.workflowData.templates`, edit
   `template.attributes.*` fields. See `swap-model.ts` for the pattern.
4. **Dry-run (always first):**
   `npm run ghl:bulk -- --transform <file> --workflow <id>` — prints a
   path-level diff and `steps modified: N`. Read every line before applying.
5. **Apply:** same command + `--apply`. Saves via the API; stops the batch on
   first failure. Multiple `--workflow <id>` flags or `--workflows-file
   ids.txt` for batches.
6. **Verify** in the GHL builder, then publish manually if desired.

## Safety rules (non-negotiable)

- Test every new transform on a DUPLICATED workflow first, then n=1 real,
  then the batch.
- Match field values **exactly**, never by substring: a real account had two
  model ids where one was a prefix of the other (`...c1d` vs `...c1d11`);
  string-replace would have corrupted the second. Compare
  `attributes.model === OLD` style.
- Backups are written automatically to `data/ghl/backups/<id>-<ts>.json`
  before any change. Restore = a transform that returns the backup contents,
  or PUT the backup body via the save endpoint.
- Never automate Publish. Never commit `data/ghl/` (gitignored: session
  cookies + live auth headers).

## Reference

Full walkthrough and rationale: `scripts/ghl/README.md`.
