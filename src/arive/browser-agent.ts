import { settings } from '../../config/settings';
import { logger } from '../shared/logger';

/**
 * ARIVE Browser Agent
 *
 * This module provides instructions for Claude Computer to interact with
 * the ARIVE web application. Since ARIVE has no API, all operations are
 * performed via browser automation using Claude's Computer Use Tool.
 *
 * Architecture:
 * - A Claude Computer session runs in a Docker container with a browser
 * - N8N triggers tasks via webhook
 * - Claude Computer takes screenshots and performs mouse/keyboard actions
 * - All actions are logged with screenshots for audit trail
 */

export interface AriveTask {
  type: 'scrape_client_list' | 'upload_document';
  payload: Record<string, string>;
}

export interface AriveResult {
  success: boolean;
  data?: any;
  screenshotPaths?: string[];
  error?: string;
}

export function buildLoginInstructions(): string {
  return `
TASK: Log into ARIVE

1. Navigate to ${settings.arive.loginUrl}
2. Wait for the login page to load completely
3. Find the username/email input field and type: ${settings.arive.username}
4. Find the password input field and type the password
5. Click the "Login" or "Sign In" button
6. Wait for the dashboard to load
7. Take a screenshot to confirm successful login
8. If a 2FA prompt appears, STOP and report that manual intervention is needed

SAFETY: If the page shows an unexpected error or CAPTCHA, take a screenshot and abort.
TIMEOUT: If login takes more than 30 seconds, abort and report failure.
`.trim();
}

export function buildScrapeInstructions(): string {
  return `
TASK: Extract the client/loan pipeline list from ARIVE

PREREQUISITE: Must be logged in (run login task first if needed)

1. Navigate to the pipeline or "My Loans" section
2. Take a screenshot of the current page
3. For each loan file visible:
   a. Extract: Borrower Name, Co-Borrower Name (if any), Loan Number, Property Address, Status, Email, Phone
   b. If there are multiple pages, click "Next" and repeat
4. Compile all extracted data into a JSON array with this structure:
   [
     {
       "borrowerName": "...",
       "coBorrowerName": "..." or null,
       "loanNumber": "...",
       "propertyAddress": "...",
       "email": "...",
       "phone": "..." or null,
       "status": "..."
     }
   ]
5. Take a final screenshot showing the last page processed

SAFETY: Do not click any links that would modify data. This is READ-ONLY.
TIMEOUT: Max 2 minutes per page. If a page takes longer, abort.
`.trim();
}

export function buildUploadInstructions(
  loanNumber: string,
  documentType: string,
  fileName: string
): string {
  return `
TASK: Upload a document to a specific loan file in ARIVE

TARGET: Loan Number ${loanNumber}
DOCUMENT TYPE: ${documentType}
FILE NAME: ${fileName}

1. Navigate to the loan file search or pipeline
2. Search for loan number: ${loanNumber}
3. Click on the matching loan file to open it
4. Find the "Documents" or "Upload" section
5. Click "Upload Document" or equivalent button
6. Select the file: ${fileName}
7. If prompted for document category, select: ${documentType}
8. Click "Upload" or "Submit"
9. Wait for upload confirmation
10. Take a screenshot to verify the document appears in the file

SAFETY: Double-check the loan number before uploading. If the loan file doesn't match, ABORT.
TIMEOUT: Max 2 minutes for the entire upload. If it takes longer, abort.
`.trim();
}

export async function triggerAriveTask(task: AriveTask): Promise<AriveResult> {
  logger.info(`Triggering ARIVE task: ${task.type}`);

  // In production, this sends a webhook to the Claude Computer container.
  // The container runs Claude Computer with the appropriate instructions.
  const webhookUrl = `${settings.n8n.webhookUrl}/webhook/arive-task`;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: task.type,
        instructions:
          task.type === 'scrape_client_list'
            ? buildScrapeInstructions()
            : buildUploadInstructions(
                task.payload.loanNumber,
                task.payload.documentType,
                task.payload.fileName
              ),
        payload: task.payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`ARIVE webhook failed: ${response.statusText}`);
    }

    const result = await response.json();
    logger.info(`ARIVE task ${task.type} completed: ${result.success}`);
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'unknown error';
    logger.error(`ARIVE task ${task.type} failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}
