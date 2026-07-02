# GHL Workflow Bulk-Edit Toolkit

Tools for safely bulk-editing nodes in the GoHighLevel (LeadConnector) workflow
builder, which lives in a cross-origin iframe titled "Workflow Builder".

## Why not coordinate-clicking (Aside, computer-use agents)?

Vision/coordinate agents work for supervised one-off edits, but they are the
wrong tool for bulk edits:

- Every click is probabilistic; across 50 nodes x 20 workflows the error rate
  compounds and a misclick can silently wire a node to the wrong branch.
- The canvas pans/zooms, so coordinates are not stable between runs.
- There is no machine-checkable "diff" — you can't verify what actually changed.

You can't "train" Aside in a meaningful sense; you can only constrain it. The
better move is to give the deterministic parts to scripts and keep the agent
(or yourself) as the supervisor.

## What actually works

Two facts make this tractable:

1. **Playwright pierces the iframe.** The builder iframe is cross-origin
   (`*.leadconnectorhq.com` inside `app.gohighlevel.com`), which breaks naive
   DOM snapshots (this is why Aside's snapshot only saw the outer iframe). But
   Playwright drives the browser over CDP with out-of-process-iframe support,
   so `page.frames()` and `frameLocator()` reach inside it — full DOM read and
   selector-based clicks, no coordinates.

2. **The builder is just a client of a JSON API.** Everything the builder does
   — loading the workflow graph, saving a node edit — is a REST call to
   LeadConnector backend endpoints, visible from the page's network traffic.
   Once you've captured the GET (workflow JSON) and PUT/POST (save) calls for
   your account, bulk editing becomes: fetch JSON → transform → diff → put
   back. Deterministic, diffable, reversible.

The official GHL API 2.0 only exposes workflows read-only (list), so the
capture-and-replay route uses *internal* endpoints. That's unsupported and can
change without notice — hence the safety protocol below — but it is the same
API the builder itself uses, so a successful save is exactly as valid as a
manual one.

## The three scripts

| Script | Command | What it does |
|---|---|---|
| `session.ts` | `npm run ghl:login` | Opens a headed browser, you log in (incl. 2FA), saves session to `data/ghl/storage-state.json`. |
| `capture.ts` | `npm run ghl:capture -- <workflow-url>` | Opens a workflow with your saved session, records every LeadConnector API call (URL, method, auth headers, JSON body) to `data/ghl/capture/`, attaches to the iframe, and dumps the inner DOM to a file so you can find selectors offline. |
| `bulk-edit.ts` | `npm run ghl:bulk -- --transform <file> --workflow <id>` | Fetches workflow JSON via the captured endpoints, backs it up, applies your transform, prints a diff. **Dry-run by default**; add `--apply` to save. |

## Workflow

```bash
# 0. One-time: install the browser runtime
npm install && npx playwright install chromium

# 1. Log in once (handles 2FA interactively)
npm run ghl:login

# 2. Open ONE workflow and make ONE small manual edit + Save while capture runs.
#    This records both the "load workflow" GET and the "save" PUT/POST.
npm run ghl:capture -- "https://app.gohighlevel.com/v2/location/<LOC>/automation/workflows/<ID>"

# 3. Build endpoints.json from the newest capture automatically:
npm run ghl:endpoints

# 4. Write a transform (see transforms/example-rename.ts), then dry-run it:
npm run ghl:bulk -- --transform scripts/ghl/transforms/example-rename.ts --workflow <ID>

# 5. When the printed diff is exactly what you expect, apply:
npm run ghl:bulk -- --transform scripts/ghl/transforms/example-rename.ts --workflow <ID> --apply
```

## Safety protocol (non-negotiable for bulk runs)

1. **Test on a clone.** Duplicate a workflow in GHL, run your transform against
   the clone, open it in the builder, and eyeball it before touching real ones.
2. **Backups are automatic** — every fetched workflow JSON is written to
   `data/ghl/backups/<id>-<timestamp>.json` before any transform runs. Restore
   is a PUT of the backup file.
3. **Dry-run is the default.** `--apply` is required to write anything.
4. **Never auto-publish.** The scripts only save; publishing stays manual so a
   bad edit can't go live unattended. GHL's built-in version history is a
   second restore path.
5. **Start with n=1, then n=3, then the batch.** Verify in the UI between steps.

## Notes

- `data/ghl/storage-state.json` contains live session cookies — it is
  gitignored; never commit it. Same for `data/ghl/capture/` (auth headers).
- If GHL changes their backend, re-run a capture to refresh
  `endpoints.json`; your transforms don't change.
- The iframe DOM dump from `capture.ts` is also the right artifact to hand to
  an agent (Aside, Claude) when you *do* want supervised UI automation: with
  real selectors it can use `frameLocator()` clicks instead of coordinates.
