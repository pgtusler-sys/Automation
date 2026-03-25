import { Request, Response } from 'express';
import { EmailMessage } from '../shared/types';
import { shouldSkipEmail } from '../outlook/email-scanner';
import { processEmail } from './email-processor';
import { logger } from '../shared/logger';

/**
 * Shape of the JSON payload sent by Power Automate's
 * "When a new email arrives (V3)" trigger + HTTP action.
 */
interface PowerAutomateEmailPayload {
  MessageId: string;
  ConversationId?: string;
  Subject?: string;
  From?: string;
  FromName?: string;
  To?: string;
  Body?: string;
  BodyPreview?: string;
  ReceivedDateTime?: string;
  HasAttachments?: boolean;
  IsRead?: boolean;
}

// Simple deduplication to handle Power Automate retries
const recentlyProcessed = new Set<string>();
const MAX_DEDUP_SIZE = 1000;

function parseRecipients(to: string | undefined): { name: string; address: string }[] {
  if (!to) return [];
  return to.split(';').map((addr) => ({
    name: '',
    address: addr.trim(),
  })).filter((r) => r.address.length > 0);
}

function parsePowerAutomatePayload(payload: PowerAutomateEmailPayload): EmailMessage {
  return {
    id: payload.MessageId,
    conversationId: payload.ConversationId || '',
    subject: payload.Subject || '',
    from: {
      name: payload.FromName || '',
      address: payload.From || '',
    },
    toRecipients: parseRecipients(payload.To),
    body: payload.Body || '',
    bodyPreview: payload.BodyPreview || '',
    receivedDateTime: payload.ReceivedDateTime || new Date().toISOString(),
    hasAttachments: payload.HasAttachments || false,
    parentFolderId: '',
    isRead: payload.IsRead || false,
  };
}

/**
 * Express handler for POST /api/webhook/email
 * Responds 200 immediately, then processes the email asynchronously.
 */
export async function handleIncomingEmail(req: Request, res: Response): Promise<void> {
  const payload = req.body as PowerAutomateEmailPayload;

  if (!payload.MessageId) {
    res.status(400).json({ error: 'Missing MessageId' });
    return;
  }

  // Respond immediately so Power Automate doesn't time out (30s limit)
  res.status(200).json({ received: true, messageId: payload.MessageId });

  // Deduplicate
  if (recentlyProcessed.has(payload.MessageId)) {
    logger.debug(`Skipping duplicate webhook for email ${payload.MessageId}`);
    return;
  }
  recentlyProcessed.add(payload.MessageId);
  if (recentlyProcessed.size > MAX_DEDUP_SIZE) {
    const first = recentlyProcessed.values().next().value;
    if (first) recentlyProcessed.delete(first);
  }

  // Parse and process
  try {
    const email = parsePowerAutomatePayload(payload);
    logger.info(`Webhook received email: "${email.subject}" from ${email.from.address}`);

    if (shouldSkipEmail(email)) {
      logger.info(`Skipped email ${email.id} (filtered)`);
      return;
    }

    await processEmail(email);
    logger.info(`Successfully processed webhook email ${email.id}`);
  } catch (err) {
    logger.error(`Failed to process webhook email ${payload.MessageId}: ${err}`);
  }
}
