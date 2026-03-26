import { readSheetRange, writeSheetRange } from './client';
import { EmailMessage } from '../shared/types';
import { shouldSkipEmail } from '../outlook/email-scanner';
import { logger } from '../shared/logger';

const INBOX_RANGE = 'Inbox!A:M';

/**
 * Column layout for the Inbox sheet (Power Automate appends rows here):
 *   A: MessageId
 *   B: From (email address)
 *   C: FromName
 *   D: To (semicolon-separated)
 *   E: Subject
 *   F: BodyPreview
 *   G: Body
 *   H: ReceivedDateTime
 *   I: HasAttachments (TRUE/FALSE)
 *   J: IsRead (TRUE/FALSE)
 *   K: Processed (YES when done — we write this)
 *   L: TriageAction (DRAFT/SKIP/REVIEW — we write this)
 *   M: TriageReason (explanation — we write this)
 */

export const INBOX_HEADERS = [
  'MessageId', 'From', 'FromName', 'To', 'Subject',
  'BodyPreview', 'Body', 'ReceivedDateTime', 'HasAttachments', 'IsRead',
  'Processed', 'TriageAction', 'TriageReason',
];

export interface InboxEmail {
  email: EmailMessage;
  rowIndex: number;
}

function parseRecipients(to: string): { name: string; address: string }[] {
  if (!to) return [];
  return to.split(';').map((addr) => ({
    name: '',
    address: addr.trim(),
  })).filter((r) => r.address.length > 0);
}

function rowToEmailMessage(row: string[]): EmailMessage {
  return {
    id: row[0] || '',
    conversationId: '',
    subject: row[4] || '',
    from: {
      name: row[2] || '',
      address: row[1] || '',
    },
    toRecipients: parseRecipients(row[3] || ''),
    body: row[6] || '',
    bodyPreview: row[5] || '',
    receivedDateTime: row[7] || new Date().toISOString(),
    hasAttachments: (row[8] || '').toUpperCase() === 'TRUE',
    parentFolderId: '',
    isRead: (row[9] || '').toUpperCase() === 'TRUE',
  };
}

/**
 * Read the Inbox sheet. Returns unprocessed emails with their row indices.
 * Does NOT mark rows as processed — the caller handles that via markInboxRowProcessed().
 * Deterministic skips (no-reply, marketing) are still marked processed immediately.
 */
export async function pollInboxSheet(): Promise<InboxEmail[]> {
  const rows = await readSheetRange(INBOX_RANGE);

  if (rows.length <= 1) {
    logger.info('Inbox sheet is empty (no data rows)');
    return [];
  }

  const results: InboxEmail[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    // Column K (index 10) = Processed
    const processed = (row[10] || '').toUpperCase();
    if (processed === 'YES') continue;

    // Column L (index 11) = TriageAction — skip already-triaged REVIEW rows
    const existingTriage = (row[11] || '').toUpperCase();
    if (existingTriage === 'REVIEW') continue;

    const email = rowToEmailMessage(row);

    // Deterministic skip (no-reply, marketing) — mark processed immediately
    if (shouldSkipEmail(email)) {
      logger.debug(`Skipping filtered email: ${email.subject}`);
      const sheetRow = i + 1;
      await writeSheetRange(`Inbox!K${sheetRow}:M${sheetRow}`, [['YES', 'SKIP', 'Filtered: no-reply or marketing']]);
      continue;
    }

    results.push({ email, rowIndex: i });
  }

  logger.info(`Inbox poll: ${results.length} emails to triage`);
  return results;
}

/**
 * Mark a row as processed (column K = YES).
 */
export async function markInboxRowProcessed(rowIndex: number): Promise<void> {
  const sheetRow = rowIndex + 1; // 1-indexed
  await writeSheetRange(`Inbox!K${sheetRow}`, [['YES']]);
}

/**
 * Write triage results to columns L and M for a given row.
 */
export async function writeTriageResult(
  rowIndex: number,
  action: string,
  reason: string
): Promise<void> {
  const sheetRow = rowIndex + 1; // 1-indexed
  await writeSheetRange(`Inbox!L${sheetRow}:M${sheetRow}`, [[action, reason]]);
}
