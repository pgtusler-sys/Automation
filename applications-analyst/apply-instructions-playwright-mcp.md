# Analyst Role Applications — Playwright MCP Instructions

**Runtime:** OpenClaw + Playwright MCP server
**No JS injection. No localhost file server. No native file dialog hacks.**

## Setup (one-time on VPS)

```bash
# In repo root:
bash mcp-servers/setup-playwright-mcp.sh
# Register mcp-servers/playwright-mcp.config.json with OpenClaw
```

The PDFs live at `/root/Automation/applications-analyst/{company}/resume.pdf`
(adjust the path prefix to wherever you cloned the repo on the VPS).

---

## Prompt template (reusable across all 10 apps)

Below is the **single generalized prompt**. Substitute the four variables marked
`{{...}}` for each company. The full table of values is at the bottom.

```
You are an application operator. Apply to this job end-to-end using the
Playwright MCP tools. Do not use JavaScript injection — call the MCP tools
directly.

JOB
  Company: {{COMPANY}}
  Title: {{TITLE}}
  URL: {{JOB_URL}}
  Resume PDF path: {{RESUME_PATH}}
  Cover Letter PDF path: {{COVER_PATH}}

STEPS

1. browser_navigate({{JOB_URL}})

2. browser_snapshot()
   — identify the application form, fields, and any "Apply" button that
     needs clicking first. If there is an intermediate "Apply" button,
     browser_click it and snapshot again.

3. For each text field, call browser_type with these values:
     First Name: Perry
     Last Name: Tusler
     Full Name: Perry Tusler
     Email: pgtusler@gmail.com
     Phone: 608-332-9579
     LinkedIn: www.linkedin.com/in/Perry-Tusler
     Location / City: Los Angeles, CA
     Current Company: WeFund Mortgage

4. For the resume file input:
     browser_file_upload(paths=[{{RESUME_PATH}}])

   For the cover letter file input (if present):
     browser_file_upload(paths=[{{COVER_PATH}}])

5. Screening questions — use the answer bank for {{COMPANY}} below. If a
   question is asked that is not in the bank, infer the best answer from the
   candidate profile:
     - 10+ years sales / revenue operations across SaaS and B2B
     - CRM: Salesforce, HubSpot (Marketing Hub, Sales Hub, Ops Hub)
     - Automation: Clay.com, OpenClaw
     - Authorized to work in the US, no sponsorship needed
     - Location: Los Angeles, CA (Pacific timezone)
     - Compensation target: within the company's posted range

6. Verification gate (MANDATORY before submit):
     - browser_take_screenshot()
     - Read the snapshot. Confirm:
         a) Resume file is attached (filename visible)
         b) All required fields are populated
         c) No validation errors are shown
     - If any check fails, STOP and report what's missing.

7. browser_click the Submit button.

8. browser_take_screenshot() of the confirmation page.

9. Report: submitted | blocked | failed, with the reason.

ABORT CONDITIONS
  - CAPTCHA present → abort, report "needs_manual_apply: captcha"
  - Account creation required → abort, report "needs_manual_apply: account"
  - Unexpected 4xx/5xx → abort, report "needs_manual_apply: http_error"
```

---

## Per-company value table

| # | Company | Title | URL | Resume path | Cover path | Salary target |
|---|---------|-------|-----|-------------|------------|---------------|
| 1 | Paddle | GTM Operations Analyst | `https://himalayas.app/companies/paddle/jobs/gtm-operations-analyst` | `applications-analyst/paddle/resume.pdf` | `applications-analyst/paddle/cover-letter.pdf` | $100K-$130K |
| 2 | Tebra | Lead Sales & Growth Operations Analyst | `https://job-boards.greenhouse.io/tebra/jobs/4641537005` | `applications-analyst/tebra-sales-ops/resume.pdf` | `applications-analyst/tebra-sales-ops/cover-letter.pdf` | $127K-$145K |
| 3 | Anaconda | GTM Operations Analyst (deadline 04/24) | `https://ats.rippling.com/anaconda/jobs/2d7c1c17-7dcf-465b-94a3-f2db6ee46d86` | `applications-analyst/anaconda/resume.pdf` | `applications-analyst/anaconda/cover-letter.pdf` | $100K-$135K |
| 4 | impact.com | RevOps Analyst | `https://builtin.com/job/revops-analyst/3999430` | `applications-analyst/impact-com/resume.pdf` | `applications-analyst/impact-com/cover-letter.pdf` | $100K-$113K |
| 5 | Crescendo | Senior Analyst, GTM Strategy & Operations | `https://crescendoai.applytojob.com/apply/s0KUxBN6FI/Senior-Analyst-GTM-Strategy-Operations` | `applications-analyst/crescendo/resume.pdf` | `applications-analyst/crescendo/cover-letter.pdf` | $110K-$140K |
| 6 | Hightouch | Revenue Operations Analyst | `https://job-boards.greenhouse.io/hightouch/jobs/5540583004` | `applications-analyst/hightouch/resume.pdf` | `applications-analyst/hightouch/cover-letter.pdf` | $85K-$100K |
| 7 | Trella Health | Revenue Operations Analyst | `https://boards.greenhouse.io/trellahealth/jobs/5008467004` | `applications-analyst/trella-health/resume.pdf` | `applications-analyst/trella-health/cover-letter.pdf` | $90K-$110K |
| 8 | PushPress | Senior RevOps Analyst | `https://jobs.lever.co/pushpress/c375f001-f00d-4a1a-87c4-50d3ff1454d1` | `applications-analyst/pushpress/resume.pdf` | `applications-analyst/pushpress/cover-letter.pdf` | $100K-$120K |
| 9 | Samsara | Sales Strategy Analyst (Emerging Sales) | `https://www.samsara.com/company/careers/roles/7296894` | `applications-analyst/samsara/resume.pdf` | `applications-analyst/samsara/cover-letter.pdf` | $100K-$117K |
| 10 | Creyos | Revenue Operations Analyst | `https://dynamitejobs.com/company/creyos/remote-job/revenue-operations-analyst` | `applications-analyst/creyos/resume.pdf` | `applications-analyst/creyos/cover-letter.pdf` | $85K-$100K |

## Recommended first target

Start with **#2 Tebra** or **#6 Hightouch**. Both are Greenhouse with the form
directly on the page and standard file inputs — the easiest ATS for a first
run of the Playwright MCP flow. If Tebra works end-to-end, Hightouch and
Trella Health should work identically.
