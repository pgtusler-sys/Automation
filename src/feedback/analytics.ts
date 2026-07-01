import { getFeedbackStore } from './feedback-store';
import { logger } from '../shared/logger';

export function logFeedbackMetrics(): void {
  const store = getFeedbackStore();
  const metrics = store.getMetrics();

  const acceptanceRate =
    metrics.total > 0
      ? ((metrics.sentAsIs + metrics.sentEdited) / metrics.total) * 100
      : 0;

  const sentAsIsRate =
    metrics.sentAsIs + metrics.sentEdited > 0
      ? (metrics.sentAsIs / (metrics.sentAsIs + metrics.sentEdited)) * 100
      : 0;

  logger.info('=== Draft Feedback Metrics ===');
  logger.info(`Total drafts: ${metrics.total}`);
  logger.info(`Sent as-is: ${metrics.sentAsIs}`);
  logger.info(`Sent edited: ${metrics.sentEdited}`);
  logger.info(`Deleted: ${metrics.deleted}`);
  logger.info(`Pending: ${metrics.pending}`);
  logger.info(`Acceptance rate: ${acceptanceRate.toFixed(1)}%`);
  logger.info(`Sent-as-is rate: ${sentAsIsRate.toFixed(1)}%`);
  logger.info(`Avg edit distance: ${(metrics.avgEditDistance * 100).toFixed(1)}%`);
}
