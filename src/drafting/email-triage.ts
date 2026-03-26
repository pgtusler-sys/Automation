import Anthropic from '@anthropic-ai/sdk';
import { settings } from '../../config/settings';
import { EmailMessage, LoanFile, TriageResult } from '../shared/types';
import { sanitizeForPrompt } from '../shared/utils';
import { logger } from '../shared/logger';

const client = new Anthropic({ apiKey: settings.anthropic.apiKey });

const TRIAGE_SYSTEM_PROMPT = `You are an email triage classifier for a mortgage loan officer. Your job is to decide whether an incoming email needs a drafted reply.

Classify each email as one of:
- DRAFT: The email needs a reply (contains a question, request, or requires acknowledgment from the loan officer)
- SKIP: The email does NOT need a reply (automated notifications, marketing, newsletters, no-reply senders, short acknowledgments like "Thanks!", "Got it", "Will do", system alerts, DocuSign completions, closing notifications)
- REVIEW: You're unsure — flag for human review (ambiguous intent, the loan officer is only CC'd, unclear if action is needed)

Guidelines:
- Emails from known clients about their loan nearly always need DRAFT
- Automated/system emails (status alerts, shipping notifications, calendar invites) are SKIP
- Very short replies that are just acknowledgments ("Thanks!", "Sounds good") are SKIP
- If the loan officer is CC'd but not the primary recipient, lean toward SKIP or REVIEW
- When in doubt, choose REVIEW over SKIP (better to flag than to miss something)

Respond with ONLY a JSON object: {"action": "DRAFT"|"SKIP"|"REVIEW", "reason": "brief explanation"}`;

export async function triageEmail(
  email: EmailMessage,
  loanFiles: LoanFile[]
): Promise<TriageResult> {
  logger.info(`Triaging email: ${email.subject} (from: ${email.from.address})`);

  // Check if sender is a known client
  const matchedFile = loanFiles.find(
    (lf) => lf.email.toLowerCase() === email.from.address.toLowerCase()
  );

  const senderContext = matchedFile
    ? `SENDER IS A KNOWN CLIENT: ${matchedFile.borrowerName} (Loan #${matchedFile.loanNumber}, Status: ${matchedFile.status})`
    : 'SENDER IS NOT A KNOWN CLIENT';

  const userPrompt = `Classify this email:

${senderContext}

FROM: ${email.from.name} <${email.from.address}>
TO: ${email.toRecipients.map((r) => r.address).join(', ')}
SUBJECT: ${email.subject}
BODY PREVIEW:
${email.bodyPreview}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: sanitizeForPrompt(userPrompt) }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const action = parsed.action?.toUpperCase();
      if (action === 'DRAFT' || action === 'SKIP' || action === 'REVIEW') {
        logger.info(`Triage result: ${action} — ${parsed.reason}`);
        return { action, reason: parsed.reason || '' };
      }
    }

    logger.warn(`Triage returned unexpected format, defaulting to DRAFT: ${text}`);
    return { action: 'DRAFT', reason: 'Triage response could not be parsed' };
  } catch (err) {
    logger.error(`Triage API call failed, defaulting to DRAFT: ${err}`);
    return { action: 'DRAFT', reason: 'Triage failed — drafting as precaution' };
  }
}
