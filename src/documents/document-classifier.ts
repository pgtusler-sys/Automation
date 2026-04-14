import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { settings } from '../../config/settings';
import { ClassificationResult, DocumentType } from '../shared/types';
import { logger } from '../shared/logger';

const client = new Anthropic({ apiKey: settings.anthropic.apiKey });

const VALID_TYPES: DocumentType[] = [
  'w2', 'pay_stub', 'bank_statement', 'tax_return', 'appraisal',
  'title_commitment', 'insurance', 'id_document', 'purchase_agreement',
  'closing_disclosure', 'loan_estimate', 'credit_report', 'other',
];

export async function classifyDocument(
  filePath: string,
  contentType: string
): Promise<ClassificationResult> {
  logger.info(`Classifying document: ${filePath}`);

  const fileBuffer = fs.readFileSync(filePath);
  const base64Content = fileBuffer.toString('base64');

  const isImage = contentType.startsWith('image/');
  const isPdf = contentType === 'application/pdf';

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: isImage || isPdf
        ? [
            {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: (isPdf ? 'image/png' : contentType) as Anthropic.Base64ImageSource['media_type'],
                data: base64Content,
              },
            },
            {
              type: 'text' as const,
              text: CLASSIFICATION_PROMPT,
            },
          ]
        : [{ type: 'text' as const, text: `Document filename: ${filePath}\nContent type: ${contentType}\n\n${CLASSIFICATION_PROMPT}` }],
    },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: 'You are a mortgage document classifier. Analyze the provided document and extract structured information.',
    messages,
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const text = textBlock?.text || '{}';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    const docType = VALID_TYPES.includes(parsed.documentType) ? parsed.documentType : 'other';

    const result: ClassificationResult = {
      documentType: docType,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      borrowerName: parsed.borrowerName || undefined,
      loanNumber: parsed.loanNumber || undefined,
      propertyAddress: parsed.propertyAddress || undefined,
      rawExtraction: parsed,
    };

    logger.info(`Classification: ${result.documentType} (confidence: ${result.confidence})`);
    return result;
  } catch (err) {
    logger.error('Failed to parse classification response', err);
    return {
      documentType: 'other',
      confidence: 0,
      rawExtraction: { error: 'parse_failed', rawText: text },
    };
  }
}

const CLASSIFICATION_PROMPT = `Analyze this mortgage-related document and return a JSON object with:
{
  "documentType": one of: w2, pay_stub, bank_statement, tax_return, appraisal, title_commitment, insurance, id_document, purchase_agreement, closing_disclosure, loan_estimate, credit_report, other
  "confidence": float 0-1,
  "borrowerName": "name if visible" or null,
  "loanNumber": "loan number if visible" or null,
  "propertyAddress": "property address if visible" or null
}

Return ONLY the JSON object.`;
