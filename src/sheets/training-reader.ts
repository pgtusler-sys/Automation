import { readSheetRange } from './client';
import { TrainingExample } from '../shared/types';
import { logger } from '../shared/logger';

const TRAINING_RANGE = 'Training!A:E';

/**
 * Reads training examples from the "Training" tab in Google Sheets.
 *
 * Column layout:
 *   A: EmailFrom
 *   B: EmailSubject
 *   C: EmailBody
 *   D: YourReply
 *   E: Category (optional)
 */
export async function readTrainingExamples(): Promise<TrainingExample[]> {
  try {
    const rows = await readSheetRange(TRAINING_RANGE);

    if (rows.length <= 1) {
      logger.debug('Training sheet is empty (no data rows)');
      return [];
    }

    const examples: TrainingExample[] = [];

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0] || !row[3]) continue; // need at least EmailFrom and YourReply

      examples.push({
        emailFrom: row[0] || '',
        emailSubject: row[1] || '',
        emailBody: row[2] || '',
        yourReply: row[3] || '',
        category: row[4] || undefined,
      });
    }

    logger.info(`Loaded ${examples.length} training examples`);
    return examples;
  } catch (err) {
    logger.warn(`Failed to read training examples: ${err}`);
    return [];
  }
}

/**
 * Select the most relevant training examples for a given email.
 * Uses simple keyword overlap scoring.
 */
export function selectRelevantExamples(
  email: { subject: string; bodyPreview: string },
  examples: TrainingExample[],
  maxExamples: number = 2
): TrainingExample[] {
  if (examples.length <= maxExamples) return examples;

  const emailWords = tokenize(`${email.subject} ${email.bodyPreview}`);

  const scored = examples.map((ex) => {
    const exWords = tokenize(`${ex.emailSubject} ${ex.emailBody}`);
    const overlap = [...emailWords].filter((w: string) => exWords.has(w)).length;
    return { example: ex, score: overlap };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxExamples).map((s) => s.example);
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'where', 'when',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very',
]);

function tokenize(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  return new Set(words.filter((w) => w.length > 2 && !STOP_WORDS.has(w)));
}
