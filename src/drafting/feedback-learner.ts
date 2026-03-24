import Anthropic from '@anthropic-ai/sdk';
import { settings } from '../../config/settings';
import { DraftFeedback, StylePreference } from '../shared/types';
import { getFeedbackStore } from '../feedback/feedback-store';
import { logger } from '../shared/logger';

const client = new Anthropic({ apiKey: settings.anthropic.apiKey });

export async function analyzeEditPatterns(): Promise<StylePreference[]> {
  const store = getFeedbackStore();
  const editedDrafts = store.getEditedFeedback(50);

  if (editedDrafts.length < 5) {
    logger.info('Not enough edited drafts to analyze patterns (need at least 5)');
    return [];
  }

  logger.info(`Analyzing ${editedDrafts.length} edited drafts for patterns`);

  const examples = editedDrafts.map((d) => ({
    original: d.generatedText.substring(0, 500),
    edited: (d.finalText || '').substring(0, 500),
    category: d.emailCategory,
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You analyze differences between AI-generated email drafts and the human-edited versions that were actually sent. Your goal is to extract style rules that the human consistently applies.`,
    messages: [
      {
        role: 'user',
        content: `Here are ${examples.length} examples of original drafts and their human-edited versions:\n\n${JSON.stringify(examples, null, 2)}\n\nExtract consistent style preferences as a JSON array of objects with "rule" (string describing the preference) and "confidence" (0-1 float). Only include rules you see in at least 3 examples.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const text = textBlock?.text || '[]';

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<{ rule: string; confidence: number }>;
    const preferences: StylePreference[] = parsed.map((p) => ({
      rule: p.rule,
      source: 'inferred' as const,
      confidence: p.confidence,
      createdAt: new Date().toISOString(),
    }));

    store.saveStylePreferences(preferences);
    logger.info(`Extracted ${preferences.length} style preferences`);
    return preferences;
  } catch (err) {
    logger.error('Failed to parse style preferences from Claude response', err);
    return [];
  }
}
