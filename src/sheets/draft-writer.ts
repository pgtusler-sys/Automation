import { appendToSheet } from './client';
import { EmailMessage } from '../shared/types';
import { logger } from '../shared/logger';

const DRAFTS_RANGE = 'Drafts!A:G';

export interface SheetDraftResult {
  emailId: string;
  draftId: string;
}

export async function writeDraftToSheet(
  email: EmailMessage,
  draftBody: string
): Promise<SheetDraftResult> {
  const row = [
    email.id,                    // A: MessageId
    email.from.address,          // B: To (replying to sender)
    email.from.name,             // C: FromName
    `Re: ${email.subject}`,      // D: Subject
    draftBody,                   // E: DraftBody
    'READY',                     // F: Status
    new Date().toISOString(),    // G: CreatedAt
  ];

  await appendToSheet(DRAFTS_RANGE, [row]);
  logger.info(`Draft written to sheet for email ${email.id} (to: ${email.from.address})`);

  return {
    emailId: email.id,
    draftId: `sheet-${email.id}`,
  };
}
