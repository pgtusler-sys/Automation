import { createReplyDraft } from './client';
import { DraftReply, EmailMessage } from '../shared/types';
import { logger } from '../shared/logger';

export async function createDraftReply(
  email: EmailMessage,
  draftBody: string
): Promise<DraftReply> {
  logger.info(`Creating draft reply for email ${email.id} (subject: ${email.subject})`);

  const htmlBody = draftBody
    .split('\n')
    .map((line) => `<p>${line}</p>`)
    .join('');

  const draft = await createReplyDraft(email.id, htmlBody);

  const result: DraftReply = {
    emailId: email.id,
    draftId: draft.id,
    generatedText: draftBody,
    subject: `Re: ${email.subject}`,
    toRecipients: [email.from],
    createdAt: new Date(),
  };

  logger.info(`Draft created: ${result.draftId}`);
  return result;
}
