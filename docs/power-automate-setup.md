# Power Automate → Google Sheet Email Inbox Setup

This guide sets up a Power Automate flow that automatically captures incoming Outlook emails and writes them to a Google Sheet for processing by the automation pipeline.

## Prerequisites

- Microsoft 365 account with Power Automate access (https://make.powerautomate.com)
- Google account with access to the pipeline Google Sheet
- The Google Sheet must have an **"Inbox"** tab (see Step 1)

---

## Step 1: Prepare the Google Sheet

Open your existing pipeline Google Sheet (the one in `GOOGLE_PIPELINE_SHEET_ID`).

1. Add a new tab/sheet named **Inbox**
2. In row 1, add these column headers exactly:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| MessageId | From | FromName | To | Subject | BodyPreview | Body | ReceivedDateTime | HasAttachments | IsRead | Processed |

3. Make sure the Google Sheet is shared with your Google service account email (check `credentials/google-service-account.json` → `client_email` field). It should already be shared if the Pipeline tab works.

---

## Step 2: Create the Power Automate Flow

1. Go to https://make.powerautomate.com
2. Click **Create** → **Automated cloud flow**
3. Name it: **New Email to Google Sheet**
4. Under "Choose your flow's trigger", search for **"When a new email arrives (V3)"**
5. Select the **Office 365 Outlook** connector version
6. Click **Create**

---

## Step 3: Configure the Email Trigger

In the trigger settings:

| Setting | Value |
|---|---|
| **Folder** | Inbox |
| **To** | *(leave blank — captures all)* |
| **Include Attachments** | No |
| **Only with Attachments** | No |
| **Importance** | Any |

> **Tip:** If you only want to monitor a specific mailbox (like Andrea's), set the **To** field to that email address.

Click **New step**.

---

## Step 4: Add the Google Sheets Action

1. Search for **Google Sheets** in the action search
2. Select **Insert row** (Google Sheets connector)
3. If this is your first time using the Google Sheets connector in Power Automate, you will be prompted to **sign in** to your Google account. Use the Google account that owns or has Editor access to the spreadsheet.

Configure the action:

| Setting | Value |
|---|---|
| **File** | Select your pipeline spreadsheet from the dropdown |
| **Worksheet** | Inbox |

Once you select the worksheet, Power Automate will read the headers from row 1 and show fields for each column. Fill them in using **Dynamic content** from the email trigger:

| Column | Dynamic Content to Select |
|---|---|
| **MessageId** | Message Id |
| **From** | From |
| **FromName** | From |
| **To** | To |
| **Subject** | Subject |
| **BodyPreview** | Body Preview |
| **Body** | Body |
| **ReceivedDateTime** | Received Time |
| **HasAttachments** | Has Attachments |
| **IsRead** | Is Read |
| **Processed** | *(leave blank — the automation script fills this)* |

> **Note:** "From" in the trigger gives you the email address. Power Automate may show it as a display string like "John Smith <john@example.com>". Our script handles both formats.

---

## Step 5: Save and Test

1. Click **Save** in the top right
2. Click **Test** → **Manually** → **Test**
3. Send yourself a test email
4. Check the Google Sheet — a new row should appear in the Inbox tab
5. Verify the columns are populated correctly

---

## Step 6: Verify the Pipeline Can Read It

Run the email pipeline locally:

```bash
npx ts-node src/index.ts email
```

You should see logs like:
```
Inbox poll: 1 actionable emails, 1 total marked processed
```

Check the Google Sheet — column K (Processed) should now say **YES** for that row.

---

## How It Works End-to-End

```
New email arrives in Outlook
        ↓
Power Automate triggers (within ~1-3 minutes)
        ↓
Appends a row to the "Inbox" tab in Google Sheets
        ↓
Pipeline script runs on schedule (e.g., every 15 min)
        ↓
Reads unprocessed rows (column K ≠ YES)
        ↓
Generates draft replies, routes attachments
        ↓
Marks rows as Processed = YES
```

---

## Troubleshooting

### Power Automate isn't triggering
- Check that the flow is **turned on** (toggle at the top of the flow page)
- The email trigger polls every 1-3 minutes — it's not instant
- Check **Run history** on the flow page for errors

### Google Sheets action fails with "unauthorized"
- Re-authorize the Google Sheets connection: go to **Data** → **Connections** in Power Automate and reconnect Google Sheets
- Make sure the Google account has **Editor** access to the spreadsheet

### Rows appear but pipeline doesn't process them
- Verify column headers in the Inbox tab match exactly (case-sensitive): `MessageId`, `From`, `FromName`, `To`, `Subject`, `BodyPreview`, `Body`, `ReceivedDateTime`, `HasAttachments`, `IsRead`, `Processed`
- Check that `GOOGLE_PIPELINE_SHEET_ID` in your `.env` file is correct
- Run `npx ts-node scripts/setup-google.ts` to verify sheet access

### Duplicate emails
- The pipeline marks rows as Processed = YES, so re-runs won't reprocess them
- If Power Automate fires twice for the same email (rare), the pipeline will process both but the draft creator handles this gracefully

---

## Optional: Monitor Andrea's Shared Mailbox

To also capture emails from a shared mailbox:

1. **Duplicate the flow** (click ⋯ → Save As)
2. In the trigger, change the **Folder** setting — click the folder icon and navigate to the shared mailbox's Inbox
3. You may need to add the shared mailbox to your Outlook first (File → Account Settings → Delegate Access, or ask IT)
4. Everything else stays the same — emails land in the same Inbox sheet
