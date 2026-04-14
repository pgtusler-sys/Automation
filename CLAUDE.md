# CLAUDE.md

## About This Repository

This repo contains two automation systems:

1. **Mortgage Loan Processing** — Automated email drafting, document routing, and pipeline tracking for a solo loan officer (TypeScript/Node.js in `src/`).
2. **Job Search Automation** — Claude Code agents for job searching, resume tailoring, cover letter writing, and application tracking (markdown agents in `.claude/agents/`).

---

## Job Search — Candidate Profile

> **SETUP:** Fill in all `[BRACKETED]` values below before using the job search agents.

### Personal Information

- **Name:** Perry Tusler
- **Location:** Los Angeles, CA (open to remote)
- **Email:** pgtusler@gmail.com
- **Phone:** 608-332-9579
- **LinkedIn:** www.linkedin.com/in/Perry-Tusler
- **Portfolio/Website:** [PORTFOLIO URL]

### Professional Summary

[Write 2-3 sentences summarizing your professional background, emphasizing RevOps/Marketing Ops experience, years of experience, and key strengths.]

### Target Roles

- Revenue Operations (RevOps) Manager / Director
- Marketing Operations Manager / Director
- Sales Operations Manager
- Business Operations / GTM Operations roles
- Related hybrid roles (e.g., "Growth Operations", "Revenue Strategy")

### Preferences

- **Salary:** $110,000+ base (flexible for strong equity/bonus packages)
- **Location:** Remote-first preferred; open to hybrid in Los Angeles area
- **Company size:** Open, but prefer Series A+ startups through mid-market
- **Industries of interest:** SaaS, fintech, martech, healthtech, edtech
- **Deal-breakers:** Fully on-site outside LA, below $100K base, contractor/1099 only

### Key Skills & Keywords

- Salesforce administration & architecture
- HubSpot (Marketing Hub, Sales Hub, Operations Hub)
- Marketing automation (Marketo, Pardot, HubSpot)
- Data enrichment & hygiene (ZoomInfo, Clearbit, LeanData)
- Lead lifecycle management, scoring, routing
- Attribution modeling & reporting (Tableau, Looker, DOMO)
- CPQ & deal desk processes
- Cross-functional GTM alignment
- Process documentation & change management

### Education

- **B.S. Business Administration** — University of Wisconsin–Milwaukee

### Experience Highlights

[Replace with 3-5 bullet points of key career achievements with metrics, e.g.:]

- [Built and scaled RevOps function from scratch at [Company], supporting $XM ARR growth]
- [Reduced lead-to-opportunity conversion time by X% through automated routing in Salesforce]
- [Implemented attribution model that identified $XM in previously untracked pipeline]
- [Migrated CRM from [old system] to Salesforce, training X+ users across sales and marketing]
- [Designed and launched lead scoring model that improved SQL rate by X%]

---

## Agent Instructions

### File Locations

- **Search results:** Save to `search-results/` as JSON files with date-stamped filenames (e.g., `search-results/2026-04-14-revops-remote.json`)
- **Applications:** Save to `applications/` in subdirectories per company (e.g., `applications/acme-corp/resume.md`, `applications/acme-corp/cover-letter.md`)
- **Tracking data:** Maintain `applications/tracker.md` as the single source of truth for application status

### Conventions

- Use markdown for all human-readable output files
- Use JSON for structured data (search results, scores)
- Date format: YYYY-MM-DD
- File naming: lowercase-kebab-case
- Always include the date when saving search results
- Never hardcode personal information in agent files — always read from this CLAUDE.md file
- When creating company subdirectories, use kebab-case of the company name (e.g., `acme-corp`, `datadog`, `notion-labs`)
