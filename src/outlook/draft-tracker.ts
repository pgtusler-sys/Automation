import { getDraftMessages, getSentMessages } from './client';
import { DraftFeedback } from '../shared/types';
import { levenshteinRatio } from '../shared/utils';
import { logger } from '../shared/logger';
import { getFeedbackStore } from '../feedback/feedback-store';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

export async function trackDraftOutcomes(): Promise<void> {
  const store = getFeedbackStore();
  const pendingDrafts = store.getPendingFeedback();

  if (pendingDrafts.length === 0) {
    logger.debug('No pending drafts to track');
    return;
  }

  logger.info(`Tracking outcomes for ${pendingDrafts.length} pending drafts`);

  const currentDrafts = await getDraftMessages();
  const draftIds = new Set(currentDrafts.map((d: any) => d.id));

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sentMessages = await getSentMessages(oneDayAgo);

  for (const pending of pendingDrafts) {
    if (draftIds.has(pending.draftId)) {
      continue; // still in drafts, skip
    }

    const sentMatch = sentMessages.find(
      (s: any) => s.conversationId === pending.emailId
    );

    if (sentMatch) {
      const sentText = stripHtml(sentMatch.body?.content || '');
      const ratio = levenshteinRatio(pending.generatedText, sentText);

      const action = ratio > 0.95 ? 'sent_as_is' : 'sent_edited';
      store.updateFeedback(pending.draftId, {
        action,
        finalText: sentText,
        editDistance: 1 - ratio,
        resolvedAt: new Date().toISOString(),
      });

      logger.info(`Draft ${pending.draftId}: ${action} (similarity: ${(ratio * 100).toFixed(1)}%)`);
    } else {
      store.updateFeedback(pending.draftId, {
        action: 'deleted',
        finalText: null,
        editDistance: null,
        resolvedAt: new Date().toISOString(),
      });

      logger.info(`Draft ${pending.draftId}: deleted`);
    }
  }
}
