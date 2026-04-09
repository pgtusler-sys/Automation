# Claude Cowork Prompt: Set Up Power Automate Flow for Outlook Drafts

Copy and paste this entire prompt into Claude Cowork (or Claude Computer Use) to have it set up the Power Automate flow that reads draft replies from Google Sheets and creates them as Outlook drafts.

---

## Prompt

You are helping me set up a Power Automate flow. Please navigate to https://make.powerautomate.com and follow these steps exactly.

### Goal

Create a flow that runs every 15 minutes, reads draft email replies from a Google Sheet "Drafts" tab, and creates them as draft emails in Outlook.

### Prerequisites (already done)

- I have a Google Sheet with a tab called **Drafts**
- The Drafts tab has these column headers in row 1: `MessageId | To | FromName | Subject | DraftBody | Status | CreatedAt`
- An automation script writes rows with Status = "READY" when it generates a draft reply
- I already have a working Power Automate flow that uses the Google Sheets connector (for my Inbox flow), so the Google connection should already be authorized

### Step-by-step instructions

#### 1. Create a new flow

1. Click **Create** in the left sidebar
2. Click **Automated cloud flow** (or **Scheduled cloud flow**)
3. Name it: **Sheet Drafts to Outlook**
4. If prompted for a trigger, skip it — we'll add one manually

#### 2. Add the trigger: Recurrence

1. Search for **Recurrence** in the trigger list
2. Set **Interval** to `15`
3. Set **Frequency** to `Minute`

#### 3. Add action: Get rows from Google Sheets

1. Click **+ New step**
2. Search for **Google Sheets** → select **Get rows**
3. Configure:
   - **File**: Select the same spreadsheet used by the Inbox flow (the pipeline spreadsheet)
   - **Worksheet**: Select **Drafts**
4. Under **Advanced options** (if available):
   - **Row filter** or **Filter query**: leave blank (we'll filter in the next step)

#### 4. Add action: Filter array

1. Click **+ New step**
2. Search for **Filter array** (under Data Operations)
3. Configure:
   - **From**: Select the **value** output from the "Get rows" step (this is the array of rows)
   - **Condition**:
     - Left side: Select the **Status** column (column F) from the dynamic content
     - Operator: **is equal to**
     - Right side: Type `READY`

#### 5. Add action: Apply to each

1. Click **+ New step**
2. Search for **Apply to each**
3. Set **Select an output from previous steps** to the **Body** output of the Filter array step

Inside the Apply to each loop, add TWO actions:

##### 5a. Create Outlook draft

1. Click **Add an action** inside the loop
2. Search for **Office 365 Outlook** → select **Create a draft message (V2)** (NOT "Send an email")
3. Configure the fields using Dynamic Content from the current item:
   - **To**: Select the **To** column (column B)
   - **Subject**: Select the **Subject** column (column D)
   - **Body**: Select the **DraftBody** column (column E)
4. Optional but recommended:
   - If you see a **Categories** field, type `AutoDrafted` — this tags the draft so you can tell it was machine-generated
   - Set **Importance** to Normal

##### 5b. Update the row status

1. Click **Add an action** inside the loop (after the Outlook action)
2. Search for **Google Sheets** → select **Update row**
3. Configure:
   - **File**: Same spreadsheet
   - **Worksheet**: **Drafts**
   - **Row id**: Select the row identifier from the current item (Power Automate's Google Sheets connector provides a `__PowerAppsId__` or row number — use whichever is available)
   - **Status**: Type `DRAFTED` (this replaces "READY")
   - Leave all other columns with their dynamic content values so they don't get blanked out:
     - **MessageId**: Select MessageId from current item
     - **To**: Select To from current item
     - **FromName**: Select FromName from current item
     - **Subject**: Select Subject from current item
     - **DraftBody**: Select DraftBody from current item
     - **CreatedAt**: Select CreatedAt from current item

#### 6. Save and test

1. Click **Save** in the top right
2. Click **Test** → **Manually** → **Test**
3. Before testing, make sure there is at least one row in the Drafts tab with Status = `READY`. You can add a test row:
   - MessageId: `test-001`
   - To: `your-own-email@example.com`
   - FromName: `Test Sender`
   - Subject: `Re: Test Email`
   - DraftBody: `Hi, thanks for reaching out. I'll look into this and get back to you shortly.`
   - Status: `READY`
   - CreatedAt: `2026-03-26T12:00:00Z`
4. After the test run completes:
   - Check your Outlook **Drafts** folder — you should see the new draft
   - Check the Google Sheet — the Status column should now say `DRAFTED`

### Troubleshooting

- **"Get rows" returns empty**: Make sure the Google Sheets connector is connected to the correct Google account and the spreadsheet/worksheet names match exactly
- **Filter array returns empty but rows exist**: Check that the Status column value is exactly `READY` (case-sensitive, no extra spaces)
- **Outlook draft not created**: Verify the Office 365 Outlook connection is working. Go to Data → Connections and re-authorize if needed
- **Row update blanks out columns**: You must map ALL columns in the "Update row" action, not just Status. Any unmapped column gets cleared
- **Connector authorization prompt**: If prompted to sign in to Google Sheets or Outlook, use the same accounts as your existing Inbox flow

### What the end-to-end flow looks like

```
New email arrives in Outlook
    ↓
Power Automate Flow 1 (already set up)
    ↓
Row added to Google Sheet "Inbox" tab
    ↓
Automation script runs (every 15 min)
    ↓
Claude API generates draft reply
    ↓
Row added to Google Sheet "Drafts" tab (Status = READY)
    ↓
Power Automate Flow 2 (this flow)
    ↓
Outlook draft created, Status updated to DRAFTED
    ↓
You review and send from Outlook
```
