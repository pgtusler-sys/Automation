import { getInboxMessages } from './client';
import { loadState, saveState, isNoReplyAddress } from '../shared/utils';
import { EmailMessage } from '../shared/types';
import { logger } from '../shared/logger';

function parseGraphEmail(raw: any): EmailMessage {
  return {
    id: raw.id,
    conversationId: raw.conversationId,
    subject: raw.subject || '',
    from: {
      name: raw.from?.emailAddress?.name || '',
      address: raw.from?.emailAddress?.address || '',
    },
    toRecipients: (raw.toRecipients || []).map((r: any) => ({
      name: r.emailAddress?.name || '',
      address: r.emailAddress?.address || '',
    })),
    body: raw.body?.content || '',
    bodyPreview: raw.bodyPreview || '',
    receivedDateTime: raw.receivedDateTime,
    hasAttachments: raw.hasAttachments || false,
    parentFolderId: raw.parentFolderId || '',
    isRead: raw.isRead || false,
  };
}

export function shouldSkipEmail(email: EmailMessage): boolean {
  if (isNoReplyAddress(email.from.address)) {
    logger.debug(`Skipping no-reply email from ${email.from.address}`);
    return true;
  }

  const marketingSubjects = [
    /unsubscribe/i,
    /newsletter/i,
    /promotional/i,
    /marketing/i,
  ];
  if (marketingSubjects.some((p) => p.test(email.subject) || p.test(email.body))) {
    logger.debug(`Skipping likely marketing email: ${email.subject}`);
    return true;
  }

  return false;
}

export async function scanForNewEmails(): Promise<EmailMessage[]> {
  const state = loadState();
  const sinceTimestamp = state.lastEmailScanTimestamp;

  logger.info(`Scanning for emails since ${sinceTimestamp}`);

  const rawMessages = await getInboxMessages(sinceTimestamp);
  const emails = rawMessages.map(parseGraphEmail);

  logger.info(`Found ${emails.length} new emails`);

  const actionableEmails = emails.filter((email) => !shouldSkipEmail(email));
  logger.info(`${actionableEmails.length} actionable emails after filtering`);

  if (emails.length > 0) {
    const latestTimestamp = emails[emails.length - 1].receivedDateTime;
    saveState({ ...state, lastEmailScanTimestamp: latestTimestamp });
  }

  return actionableEmails;
}
