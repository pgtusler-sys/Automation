import { pollInboxSheet, markInboxRowProcessed, writeTriageResult } from './sheets/email-inbox';
import { generateDraftReply } from './drafting/auto-drafter';
import { triageEmail } from './drafting/email-triage';
import { writeDraftToSheet } from './sheets/draft-writer';
import { routeEmailAttachments } from './documents/routing-orchestrator';
import { syncPipeline } from './sheets/pipeline-tracker';
import { loadCachedClientList } from './arive/client-list-scraper';
import { getFeedbackStore } from './feedback/feedback-store';
import { syncSheetFeedback } from './feedback/sheet-feedback-reader';
import { analyzeEditPatterns } from './drafting/feedback-learner';
import { logFeedbackMetrics } from './feedback/analytics';
import { runJobSearch, runMaterialsGeneration, runNotification, runJobStatus, runFullPipeline, runTrackerSync, generateApplyInstructions, markApplied } from './jobs/pipeline';
import { logger } from './shared/logger';
import { EmailMessage } from './shared/types';

/**
 * Main orchestrator for the mortgage loan automation workflow.
 *
 * Commands:
 *   email        — Poll Google Sheet inbox, triage, and draft replies
 *   sync         — Sync pipeline data to Google Sheets
 *   metrics      — Log feedback metrics
 *   feedback     — Sync sheet feedback and re-analyze style patterns
 *   jobs:search  — Search job boards, score, and save listings
 *   jobs:generate— Generate tailored resume + cover letter for high-scoring listings
 *   jobs:notify  — Send email digest of job search activity
 *   jobs:status  — Print pipeline summary
 *   jobs:sync    — Sync tracker.md with SQLite
 *   jobs:full    — Run complete job search pipeline
 */

async function processEmail(email: EmailMessage): Promise<void> {
  const loanFiles = loadCachedClientList();
  const store = getFeedbackStore();
  const stylePreferences = store.getStylePreferences();

  const draftText = await generateDraftReply(email, loanFiles, stylePreferences);
  const result = await writeDraftToSheet(email, draftText);

  store.recordDraft({
    emailId: email.id,
    draftId: result.draftId,
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

  const loanFiles = loadCachedClientList();
  const inboxEmails = await pollInboxSheet();

  for (const { email, rowIndex } of inboxEmails) {
    try {
      // Triage: decide whether to draft, skip, or flag for review
      const triage = await triageEmail(email, loanFiles);
      await writeTriageResult(rowIndex, triage.action, triage.reason);

      if (triage.action === 'SKIP') {
        logger.info(`Triage SKIP: ${email.subject} — ${triage.reason}`);
        await markInboxRowProcessed(rowIndex);
        continue;
      }

      if (triage.action === 'REVIEW') {
        logger.info(`Triage REVIEW: ${email.subject} — ${triage.reason}`);
        // Don't mark processed — human needs to handle
        continue;
      }

      // DRAFT path
      await processEmail(email);
      await markInboxRowProcessed(rowIndex);
    } catch (err) {
      logger.error(`Failed to process email ${email.id}: ${err}`);
    }
  }

  logger.info('=== Email Pipeline Complete ===');
}

export async function runPipelineSync(): Promise<void> {
  logger.info('=== Starting Pipeline Sync ===');
  const loanFiles = loadCachedClientList();
  await syncPipeline(loanFiles);
  logger.info('=== Pipeline Sync Complete ===');
}

export async function runFeedbackSync(): Promise<void> {
  logger.info('=== Starting Feedback Sync ===');

  const result = await syncSheetFeedback();
  logger.info(`Synced ${result.synced} feedback entries (${result.errors} errors)`);

  // Re-analyze patterns if we have enough edited drafts
  const store = getFeedbackStore();
  const edited = store.getEditedFeedback(5);
  if (edited.length >= 5) {
    logger.info('Enough edited drafts — analyzing edit patterns...');
    const preferences = await analyzeEditPatterns();
    logger.info(`Extracted ${preferences.length} style preferences`);
  } else {
    logger.info(`Only ${edited.length}/5 edited drafts — need more data for pattern analysis`);
  }

  logger.info('=== Feedback Sync Complete ===');
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
    case 'feedback':
      runFeedbackSync().catch((err) => {
        logger.error('Feedback sync failed', err);
        process.exit(1);
      });
      break;
    case 'jobs:search':
      runJobSearch().catch((err) => {
        logger.error('Job search failed', err);
        process.exit(1);
      });
      break;
    case 'jobs:generate':
      runMaterialsGeneration().catch((err) => {
        logger.error('Materials generation failed', err);
        process.exit(1);
      });
      break;
    case 'jobs:notify':
      runNotification().catch((err) => {
        logger.error('Job notification failed', err);
        process.exit(1);
      });
      break;
    case 'jobs:status':
      runJobStatus().catch((err) => {
        logger.error('Job status failed', err);
        process.exit(1);
      });
      break;
    case 'jobs:sync':
      runTrackerSync().catch((err) => {
        logger.error('Tracker sync failed', err);
        process.exit(1);
      });
      break;
    case 'jobs:full':
      runFullPipeline().catch((err) => {
        logger.error('Full job pipeline failed', err);
        process.exit(1);
      });
      break;
    case 'jobs:apply':
      generateApplyInstructions().catch((err) => {
        logger.error('Apply instructions failed', err);
        process.exit(1);
      });
      break;
    case 'jobs:mark-applied':
      const company = process.argv[3];
      if (!company) {
        console.log('Usage: ts-node src/index.ts jobs:mark-applied <company-slug>');
        process.exit(1);
      }
      markApplied(company).catch((err) => {
        logger.error('Mark applied failed', err);
        process.exit(1);
      });
      break;
    default:
      console.log('Usage: ts-node src/index.ts [email|sync|metrics|feedback|jobs:search|jobs:generate|jobs:notify|jobs:status|jobs:sync|jobs:full|jobs:apply|jobs:mark-applied <company>]');
  }
}
