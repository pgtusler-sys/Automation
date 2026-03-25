import { readSheetRange, writeSheetRange } from './client';
import { EmailMessage } from '../shared/types';
import { shouldSkipEmail } from '../outlook/email-scanner';
import { logger } from '../shared/logger';

const INBOX_RANGE = 'Inbox!A:K';

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
 */

export const INBOX_HEADERS = [
  'MessageId', 'From', 'FromName', 'To', 'Subject',
  'BodyPreview', 'Body', 'ReceivedDateTime', 'HasAttachments', 'IsRead', 'Processed',
];

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
 * Read the Inbox sheet, return unprocessed emails, and mark them as processed.
 */
export async function pollInboxSheet(): Promise<EmailMessage[]> {
  const rows = await readSheetRange(INBOX_RANGE);

  if (rows.length <= 1) {
    logger.info('Inbox sheet is empty (no data rows)');
    return [];
  }

  const emails: EmailMessage[] = [];
  const processedRowIndices: number[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    // Column K (index 10) = Processed
    const processed = (row[10] || '').toUpperCase();
    if (processed === 'YES') continue;

    const email = rowToEmailMessage(row);

    if (shouldSkipEmail(email)) {
      logger.debug(`Skipping filtered email: ${email.subject}`);
      processedRowIndices.push(i);
      continue;
    }

    emails.push(email);
    processedRowIndices.push(i);
  }

  // Mark all processed rows (including skipped) as "YES" in column K
  for (const rowIndex of processedRowIndices) {
    const sheetRow = rowIndex + 1; // 1-indexed
    await writeSheetRange(`Inbox!K${sheetRow}`, [['YES']]);
  }

  logger.info(`Inbox poll: ${emails.length} actionable emails, ${processedRowIndices.length} total marked processed`);

  return emails;
}
