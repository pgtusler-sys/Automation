import fs from 'fs';
import path from 'path';
import { getMessageAttachments } from '../outlook/client';
import { EmailAttachment } from '../shared/types';
import { logger } from '../shared/logger';

const TEMP_DIR = path.join(__dirname, '../../data/attachments');

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

export async function extractAttachments(
  messageId: string
): Promise<Array<{ attachment: EmailAttachment; filePath: string }>> {
  ensureTempDir();
  logger.info(`Extracting attachments from message ${messageId}`);

  const rawAttachments = await getMessageAttachments(messageId);
  const results: Array<{ attachment: EmailAttachment; filePath: string }> = [];

  for (const raw of rawAttachments) {
    if (raw['@odata.type'] !== '#microsoft.graph.fileAttachment') {
      continue;
    }

    const attachment: EmailAttachment = {
      id: raw.id,
      name: raw.name,
      contentType: raw.contentType,
      size: raw.size,
      contentBytes: raw.contentBytes,
    };

    const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(TEMP_DIR, `${messageId}_${safeName}`);

    if (attachment.contentBytes) {
      const buffer = Buffer.from(attachment.contentBytes, 'base64');
      fs.writeFileSync(filePath, buffer);
      logger.info(`Saved attachment: ${filePath} (${buffer.length} bytes)`);
    }

    results.push({ attachment, filePath });
  }

  logger.info(`Extracted ${results.length} file attachments`);
  return results;
}

export function cleanupAttachment(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    logger.warn(`Failed to clean up attachment: ${filePath}`, err);
  }
}
