import Anthropic from '@anthropic-ai/sdk';
import { settings } from '../../config/settings';
import { EmailMessage, LoanFile, StylePreference } from '../shared/types';
import { buildSystemPrompt, buildDraftPrompt } from './prompt-templates';
import { getConversationHistory } from '../outlook/client';
import { readTrainingExamples, selectRelevantExamples } from '../sheets/training-reader';
import { sanitizeForPrompt } from '../shared/utils';
import { logger } from '../shared/logger';

const client = new Anthropic({ apiKey: settings.anthropic.apiKey });

export async function generateDraftReply(
  email: EmailMessage,
  loanFiles: LoanFile[],
  stylePreferences: StylePreference[]
): Promise<string> {
  logger.info(`Generating draft reply for: ${email.subject}`);

  // Get conversation history
  let conversationContext = '';
  try {
    const history = await getConversationHistory(email.conversationId, 5);
    conversationContext = history
      .map((msg: any) => {
        const from = msg.from?.emailAddress?.address || 'unknown';
        const preview = msg.bodyPreview || '';
        return `[${from}]: ${sanitizeForPrompt(preview)}`;
      })
      .join('\n---\n');
  } catch (err) {
    logger.warn('Failed to fetch conversation history', err);
  }

  // Match sender to loan file
  let loanContext: string | null = null;
  const matchedFile = loanFiles.find(
    (lf) => lf.email.toLowerCase() === email.from.address.toLowerCase()
  );
  if (matchedFile) {
    loanContext = `Borrower: ${matchedFile.borrowerName}\nLoan #: ${matchedFile.loanNumber}\nProperty: ${matchedFile.propertyAddress}\nStatus: ${matchedFile.status}`;
  }

  // Fetch training examples for few-shot context
  let selectedExamples;
  try {
    const allExamples = await readTrainingExamples();
    selectedExamples = selectRelevantExamples(email, allExamples, 2);
  } catch (err) {
    logger.warn('Failed to load training examples', err);
  }

  const systemPrompt = buildSystemPrompt(stylePreferences);
  const userPrompt = buildDraftPrompt(email, conversationContext, loanContext, selectedExamples);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: sanitizeForPrompt(userPrompt) }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const draftText = textBlock?.text || '';

  logger.info(`Draft generated (${draftText.length} chars)`);
  return draftText;
}
