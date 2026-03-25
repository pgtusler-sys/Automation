import { scanForNewEmails } from './outlook/email-scanner';
import { trackDraftOutcomes } from './outlook/draft-tracker';
import { syncPipeline } from './sheets/pipeline-tracker';
import { loadCachedClientList } from './arive/client-list-scraper';
import { logFeedbackMetrics } from './feedback/analytics';
import { processEmail } from './webhook/email-processor';
import { startWebhookServer } from './webhook/server';
import { logger } from './shared/logger';

/**
 * Main orchestrator for the mortgage loan automation workflow.
 *
 * Commands:
 *   server  — Start webhook server (receives emails from Power Automate)
 *   email   — Batch scan via Graph API (legacy/fallback)
 *   sync    — Sync pipeline data to Google Sheets
 *   metrics — Log feedback metrics
 */

export async function runEmailPipeline(): Promise<void> {
  logger.info('=== Starting Email Pipeline (batch mode) ===');

  const emails = await scanForNewEmails();

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
  const command = process.argv[2] || 'server';

  switch (command) {
    case 'server':
      startWebhookServer();
      break;
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
      console.log('Usage: ts-node src/index.ts [server|email|sync|metrics]');
  }
}
