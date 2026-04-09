import { readSheetRange, writeSheetRange } from '../sheets/client';
import { getFeedbackStore } from './feedback-store';
import { levenshteinRatio } from '../shared/utils';
import { logger } from '../shared/logger';

const DRAFTS_FEEDBACK_RANGE = 'Drafts!A:I';

/**
 * Reads feedback from the Drafts sheet and syncs it into the SQLite feedback store.
 *
 * Drafts tab extended columns:
 *   A: MessageId
 *   B: To
 *   C: FromName
 *   D: Subject
 *   E: DraftBody (original generated text)
 *   F: Status (READY → DRAFTED → SYNCED)
 *   G: CreatedAt
 *   H: FinalText (user pastes what they actually sent, or leaves blank if sent as-is)
 *   I: Feedback (GOOD, EDITED, or DELETED)
 */
export async function syncSheetFeedback(): Promise<{ synced: number; errors: number }> {
  const rows = await readSheetRange(DRAFTS_FEEDBACK_RANGE);

  if (rows.length <= 1) {
    logger.info('Drafts sheet is empty (no data rows)');
    return { synced: 0, errors: 0 };
  }

  const store = getFeedbackStore();
  let synced = 0;
  let errors = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    const messageId = row[0];
    const draftBody = row[4] || '';
    const status = (row[5] || '').toUpperCase();
    const finalText = row[7] || '';
    const feedback = (row[8] || '').toUpperCase();

    // Only process rows that have feedback and are in DRAFTED status
    if (!feedback || status !== 'DRAFTED') continue;

    const draftId = `sheet-${messageId}`;

    try {
      let action: string;
      let editDistance: number | null = null;

      switch (feedback) {
        case 'GOOD':
          action = 'sent_as_is';
          break;
        case 'EDITED':
          action = 'sent_edited';
          if (finalText && draftBody) {
            editDistance = 1 - levenshteinRatio(draftBody, finalText);
          }
          break;
        case 'DELETED':
          action = 'deleted';
          break;
        default:
          logger.warn(`Unknown feedback value "${feedback}" for row ${i + 1}, skipping`);
          errors++;
          continue;
      }

      store.updateFeedback(draftId, {
        action: action as any,
        finalText: finalText || null,
        editDistance,
        resolvedAt: new Date().toISOString(),
      });

      // Mark status as SYNCED in column F
      const sheetRow = i + 1;
      await writeSheetRange(`Drafts!F${sheetRow}`, [['SYNCED']]);

      synced++;
      logger.info(`Synced feedback for ${draftId}: ${action}`);
    } catch (err) {
      logger.error(`Failed to sync feedback for row ${i + 1}: ${err}`);
      errors++;
    }
  }

  return { synced, errors };
}
