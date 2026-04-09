# Mortgage Loan Processing Automation

Automated workflow for mortgage loan officers: email auto-drafting, document routing, ARIVE integration, and pipeline tracking.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in credentials
cp .env.example .env

# 3. Set up OAuth tokens
npm run setup:oauth      # Microsoft Graph
npm run setup:dropbox    # Dropbox
npm run setup:google     # Google Sheets (verify)

# 4. Verify all connections
npm run test:connections

# 5. Run the email pipeline manually
npm run dev -- email

# 6. Run tests
npm test
```

## Architecture

| Workflow | Schedule | What it does |
|---|---|---|
| Email Pipeline | Every 15 min | Scans inbox, generates draft replies, routes attachments |
| Pipeline Sync | Every 30 min | Syncs ARIVE loan statuses to Google Sheets |
| Andrea Inbox | Every 60 min | Summarizes Andrea's shared mailbox |
| ARIVE Scrape | Daily | Refreshes cached client list via browser automation |

## N8N Setup

```bash
docker run -d --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n
```

Import the workflows from `n8n/workflows/` into the N8N UI.
