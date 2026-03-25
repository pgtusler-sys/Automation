import { pollInboxSheet } from './sheets/email-inbox';
import { generateDraftReply } from './drafting/auto-drafter';
import { createDraftReply } from './outlook/draft-creator';
import { trackDraftOutcomes } from './outlook/draft-tracker';
import { routeEmailAttachments } from './documents/routing-orchestrator';
import { syncPipeline } from './sheets/pipeline-tracker';
import { loadCachedClientList } from './arive/client-list-scraper';
import { getFeedbackStore } from './feedback/feedback-store';
import { logFeedbackMetrics } from './feedback/analytics';
import { logger } from './shared/logger';
import { EmailMessage } from './shared/types';

/**
 * Main orchestrator for the mortgage loan automation workflow.
 *
 * Commands:
 *   email   — Poll Google Sheet inbox for new emails from Power Automate
 *   sync    — Sync pipeline data to Google Sheets
 *   metrics — Log feedback metrics
 */

async function processEmail(email: EmailMessage): Promise<void> {
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

export async function runEmailPipeline(): Promise<void> {
  logger.info('=== Starting Email Pipeline ===');

  const emails = await pollInboxSheet();

  for (const email of emails) {
    try {
      await processEmail(email);
    } catch (err) {
      logger.error(`Failed to process email ${email.id}: ${err}`);
    }
  }

  await trackDraftOutcomes();

  logger.info('=== Email Pipeline Complete ===');
}

export async function runPipelineSync(): Promise<void> {
  logger.info('=== Starting Pipeline Sync ===');
  const loanFiles = loadCachedClientList();
  await syncPipeline(loanFiles);
  logger.info('=== Pipeline Sync Complete ===');
}

// Direct execution
if (require.main === module) {
  const command = process.argv[2] || 'email';

  switch (command) {
    case 'email':
      runEmailPipeline().catch((err) => {
        logger.error('Email pipeline failed', err);
        process.exit(1);
      });
      break;
    case 'sync':
      runPipelineSync().catch((err) => {
        logger.error('Pipeline sync failed', err);
        process.exit(1);
      });
      break;
    case 'metrics':
      logFeedbackMetrics();
      break;
    default:
      console.log('Usage: ts-node src/index.ts [email|sync|metrics]');
  }
}
