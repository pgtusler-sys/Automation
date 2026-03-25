import express, { Request, Response, NextFunction } from 'express';
import { settings } from '../../config/settings';
import { logger } from '../shared/logger';
import { handleIncomingEmail } from './email-handler';
import { trackDraftOutcomes } from '../outlook/draft-tracker';

const app = express();
app.use(express.json({ limit: '5mb' }));

// Authenticate requests using shared secret
function verifyWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = settings.webhook.secret;
  if (secret && req.headers['x-webhook-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// Health check (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Email webhook endpoint
app.post('/api/webhook/email', verifyWebhookSecret, handleIncomingEmail);

/**
 * Start the webhook server and periodic draft-outcome tracking.
 */
export function startWebhookServer(): void {
  const port = settings.webhook.port;

  app.listen(port, () => {
    logger.info(`Webhook server listening on port ${port}`);
    logger.info(`POST /api/webhook/email  — receive emails from Power Automate`);
    logger.info(`GET  /api/health         — health check`);
  });

  // Track draft outcomes every 15 minutes (replaces the n8n cron for this)
  const intervalMs = settings.emailScanIntervalMinutes * 60 * 1000;
  setInterval(async () => {
    try {
      await trackDraftOutcomes();
    } catch (err) {
      logger.error(`Draft outcome tracking failed: ${err}`);
    }
  }, intervalMs);
}

export { app };
