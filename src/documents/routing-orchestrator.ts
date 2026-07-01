import { extractAttachments, cleanupAttachment } from './attachment-extractor';
import { classifyDocument } from './document-classifier';
import { matchDocumentToLoanFile } from './loan-file-matcher';
import { uploadToDropbox } from '../dropbox/file-uploader';
import { uploadToArive } from '../arive/document-uploader';
import { EmailMessage, LoanFile, RoutingDecision } from '../shared/types';
import { settings } from '../../config/settings';
import { logger } from '../shared/logger';

export async function routeEmailAttachments(
  email: EmailMessage,
  loanFiles: LoanFile[]
): Promise<RoutingDecision[]> {
  if (!email.hasAttachments) {
    return [];
  }

  logger.info(`Routing attachments for email: ${email.subject}`);

  const attachments = await extractAttachments(email.id);
  const decisions: RoutingDecision[] = [];

  for (const { attachment, filePath } of attachments) {
    try {
      const classification = await classifyDocument(filePath, attachment.contentType);
      const match = matchDocumentToLoanFile(
        classification,
        email.from.address,
        loanFiles
      );

      if (match && match.confidence >= settings.documentConfidenceThreshold) {
        logger.info(
          `Auto-routing ${attachment.name} to ${match.loanFile.borrowerName} (${match.matchType}, confidence: ${match.confidence})`
        );

        // Upload to both Dropbox and ARIVE
        const dropboxPath = `/${match.loanFile.borrowerName}/${match.loanFile.loanNumber}/${classification.documentType}/${attachment.name}`;

        await uploadToDropbox(filePath, dropboxPath);
        await uploadToArive(
          filePath,
          match.loanFile.loanNumber,
          classification.documentType,
          attachment.name
        );

        decisions.push({
          action: 'auto_route',
          match,
          reason: `Matched via ${match.matchType} with ${(match.confidence * 100).toFixed(0)}% confidence`,
        });
      } else {
        logger.info(
          `Flagging ${attachment.name} for human review (confidence: ${match?.confidence || 0})`
        );

        decisions.push({
          action: 'needs_review',
          match: match || undefined,
          reason: match
            ? `Low confidence match (${(match.confidence * 100).toFixed(0)}%) via ${match.matchType}`
            : 'No matching loan file found',
        });
      }
    } catch (err) {
      logger.error(`Failed to route attachment ${attachment.name}`, err);
      decisions.push({
        action: 'needs_review',
        reason: `Error during routing: ${err instanceof Error ? err.message : 'unknown'}`,
      });
    } finally {
      cleanupAttachment(filePath);
    }
  }

  return decisions;
}
