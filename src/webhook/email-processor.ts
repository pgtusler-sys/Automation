import { EmailMessage } from '../shared/types';
import { generateDraftReply } from '../drafting/auto-drafter';
import { createDraftReply } from '../outlook/draft-creator';
import { routeEmailAttachments } from '../documents/routing-orchestrator';
import { loadCachedClientList } from '../arive/client-list-scraper';
import { getFeedbackStore } from '../feedback/feedback-store';
import { logger } from '../shared/logger';

/**
 * Process a single email: generate draft reply, record feedback, route attachments.
 * Shared by both the webhook handler and the batch pipeline.
 */
export async function processEmail(email: EmailMessage): Promise<void> {
  const loanFiles = loadCachedClientList();
  const store = getFeedbackStore();
  const stylePreferences = store.getStylePreferences();

  const draftText = await generateDraftReply(email, loanFiles, stylePreferences);
  const draft = await createDraftReply(email, draftText);

  store.recordDraft({
    emailId: email.id,
    draftId: draft.draftId,
    generatedText: draftText,
    finalText: null,
    action: 'pending',
    editDistance: null,
    emailCategory: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  });

  if (email.hasAttachments) {
    const decisions = await routeEmailAttachments(email, loanFiles);
    for (const d of decisions) {
      logger.info(`Routing decision for ${email.subject}: ${d.action} - ${d.reason}`);
    }
  }
}
