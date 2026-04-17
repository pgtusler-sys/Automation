# Migration Plan — From JS Injection to Playwright MCP

## The problem with the current runner

The current approach (JS injection via DevTools console) is a clever hack, not
a foundation:

- Native file dialogs still fail unless the PDF is hosted on a local HTTP server.
- Every ATS quirk becomes a per-site patch to the injection script.
- No stable selectors — relies on `querySelectorAll('input[type="file"]')[0]`,
  which breaks the moment a form has a logo upload or image picker before
  the resume field.
- No structured state verification before submit. The runner "hopes" the
  change event fires; it can't reliably read back whether the form accepted
  the file.
- CAPTCHAs, account-wall pages, and validation errors bubble up as silent
  failures because the runner has no snapshot of the page to reason about.

## What Playwright MCP changes

Playwright MCP gives the LLM first-class tools:

- `browser_navigate`, `browser_click`, `browser_type`
- `browser_file_upload(paths)` — **native file upload, no dialog, no JS hack**
- `browser_snapshot()` — returns the accessibility tree, which is a structured
  representation of the page the LLM can reason over before taking actions
- `browser_take_screenshot()` — visual verification gate

The LLM drives the browser through these tools the same way a human would, but
with perfect fidelity. No DOM archaeology. No dialog brittleness.

## What to replace

| Current piece | Replacement | Notes |
|---|---|---|
| `serve-pdfs.sh` | Delete | Playwright MCP reads files directly from disk |
| DevTools console JS injection | `browser_file_upload(paths)` | Native tool call |
| `cowork-instructions-openclaw.md` (JS version) | `apply-instructions-playwright-mcp.md` | New prompt template |
| Per-site `querySelectorAll` hacks | `browser_snapshot` + `browser_click(ref)` | LLM picks the right element by role + label |
| Implicit "hope it worked" check | `browser_take_screenshot` + read-back verification | Explicit gate before submit |

## What to keep

- All per-company resumes and cover letters (PDFs stay in
  `applications-analyst/{company}/`)
- The universal resume (`applications-analyst/universal-analyst-resume.pdf`)
- The per-company screening question answer banks
- The job-store SQLite schema and `jobs:mark-applied` flow
- The ATS detection logic (`src/jobs/ats-detector.ts`) — still useful for
  routing, even if the Playwright runner handles all ATS types uniformly

## What to test first

Order of operations, smallest blast radius first:

1. **Smoke test Playwright MCP locally on the VPS**
   - Run `bash mcp-servers/setup-playwright-mcp.sh`
   - Register the MCP server with OpenClaw
   - Have OpenClaw navigate to `https://example.com`, snapshot, and screenshot
   - Confirms the MCP server is wired up and OpenClaw can call the tools

2. **Dry-run a single Greenhouse application** (Tebra or Hightouch)
   - Use the prompt template with verification gate enabled
   - Stop before submit — just verify the form is fully populated and the
     resume is attached
   - Inspect the screenshot manually

3. **First real submission** (Tebra — highest-score Greenhouse)
   - Remove the "stop before submit" gate
   - Confirm confirmation page in screenshot
   - Run `jobs:mark-applied tebra`

4. **Batch the remaining 9**
   - Run each app through the same prompt with different variables
   - OpenClaw reports submitted | blocked | failed per app

5. **Integrate into the pipeline**
   - Replace the `triggerJobApplyTask()` webhook call in
     `src/jobs/browser-apply.ts` with a direct OpenClaw/MCP invocation
   - Keep `src/jobs/pipeline.ts runAutoApply()` as the orchestration layer

## How OpenClaw and the local pipeline divide work

```
┌─────────────────────────────────────────────────────────┐
│ Local Automation pipeline (this repo)                   │
│                                                         │
│   jobs:search    → SQLite: job_listings                 │
│   jobs:generate  → applications-analyst/{co}/*.md + pdf │
│   jobs:apply     → emits prompt + vars for each app     │
└────────────────────┬────────────────────────────────────┘
                     │  (one prompt per application)
                     ▼
┌─────────────────────────────────────────────────────────┐
│ OpenClaw on the VPS                                     │
│                                                         │
│   Reads prompt                                          │
│   Calls Playwright MCP tools                            │
│   Reports back: submitted | blocked | failed            │
└────────────────────┬────────────────────────────────────┘
                     │  (result per application)
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Local pipeline                                          │
│                                                         │
│   jobs:mark-applied — SQLite: job_applications          │
│   tracker-sync      — applications/tracker.md           │
│   notifier          — email digest                      │
└─────────────────────────────────────────────────────────┘
```

The local pipeline owns **data and orchestration**. OpenClaw owns **execution**.
Playwright MCP is the **tool layer** that makes execution reliable.

## Near-term changes to this repo

1. **Add** `mcp-servers/setup-playwright-mcp.sh` — done
2. **Add** `mcp-servers/playwright-mcp.config.json` — done
3. **Add** `applications-analyst/apply-instructions-playwright-mcp.md` — done
4. **Deprecate** `applications-analyst/cowork-instructions-openclaw.md` (keep
   for reference until Playwright MCP is proven out)
5. **Deprecate** `applications-analyst/serve-pdfs.sh` (same — keep until migration complete)
6. **Update** `src/jobs/browser-apply.ts` — replace the N8N webhook
   `triggerJobApplyTask()` with an OpenClaw MCP invocation, once we know the
   exact invocation shape OpenClaw expects

## Deferred / later moves

- **Skyvern evaluation** — if Playwright MCP works but we're still
  hand-writing prompts for each ATS, Skyvern's workflow-save-and-replay is
  the next obvious win. Pairs naturally with the SQLite job_store (save
  workflow by `ats_type`, replay per company).
- **browser-use evaluation** — only if Playwright MCP turns out to need too
  much hand-holding for weird ATSes. browser-use is more autonomous but
  less predictable.
- **N8N re-introduction** — only once there are > 30 apps/day. For the
  current volume OpenClaw being the direct executor is simpler.

## Success criteria

The migration is done when:

- [ ] 8+ of the 10 current analyst apps submit end-to-end via Playwright MCP
      with zero JS injection
- [ ] File uploads work on Greenhouse, Lever, Ashby, Rippling, and at least
      one "generic" ATS without per-site patches
- [ ] Verification gate catches a deliberately malformed application (e.g.
      missing resume) before submit, at least once in testing
- [ ] `src/jobs/browser-apply.ts` calls OpenClaw directly and records the
      result in SQLite
- [ ] `cowork-instructions-openclaw.md` and `serve-pdfs.sh` can be deleted
