import { ClassificationResult, LoanFile, MatchResult, EmailMessage } from '../shared/types';
import { logger } from '../shared/logger';

const MATCH_WEIGHTS = {
  loan_number: 1.0,
  email: 0.95,
  borrower_name: 0.85,
  property_address: 0.75,
} as const;

function normalizeString(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeString(a);
  const nb = normalizeString(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const aParts = a.toLowerCase().split(/\s+/);
  const bParts = b.toLowerCase().split(/\s+/);
  const commonParts = aParts.filter((p) => bParts.includes(p));
  return commonParts.length / Math.max(aParts.length, bParts.length);
}

export function matchDocumentToLoanFile(
  classification: ClassificationResult,
  senderEmail: string,
  loanFiles: LoanFile[]
): MatchResult | null {
  logger.info('Matching document to loan file...');

  let bestMatch: MatchResult | null = null;

  for (const lf of loanFiles) {
    // Priority 1: Loan number match
    if (
      classification.loanNumber &&
      normalizeString(classification.loanNumber) === normalizeString(lf.loanNumber)
    ) {
      const result: MatchResult = {
        loanFile: lf,
        confidence: MATCH_WEIGHTS.loan_number,
        matchType: 'loan_number',
      };
      logger.info(`Loan number match: ${lf.loanNumber} (confidence: ${result.confidence})`);
      return result; // exact match, return immediately
    }

    // Priority 2: Sender email match
    if (senderEmail && lf.email.toLowerCase() === senderEmail.toLowerCase()) {
      const result: MatchResult = {
        loanFile: lf,
        confidence: MATCH_WEIGHTS.email,
        matchType: 'email',
      };
      if (!bestMatch || result.confidence > bestMatch.confidence) {
        bestMatch = result;
      }
    }

    // Priority 3: Borrower name match
    if (classification.borrowerName) {
      const similarity = nameSimilarity(classification.borrowerName, lf.borrowerName);
      const coSimilarity = lf.coBorrowerName
        ? nameSimilarity(classification.borrowerName, lf.coBorrowerName)
        : 0;
      const bestSimilarity = Math.max(similarity, coSimilarity);

      if (bestSimilarity > 0.7) {
        const confidence = MATCH_WEIGHTS.borrower_name * bestSimilarity;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            loanFile: lf,
            confidence,
            matchType: 'borrower_name',
          };
        }
      }
    }

    // Priority 4: Property address match
    if (classification.propertyAddress) {
      const normalizedClassAddr = normalizeString(classification.propertyAddress);
      const normalizedFileAddr = normalizeString(lf.propertyAddress);
      if (normalizedClassAddr.includes(normalizedFileAddr) || normalizedFileAddr.includes(normalizedClassAddr)) {
        const confidence = MATCH_WEIGHTS.property_address;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            loanFile: lf,
            confidence,
            matchType: 'property_address',
          };
        }
      }
    }
  }

  if (bestMatch) {
    logger.info(
      `Best match: ${bestMatch.loanFile.borrowerName} via ${bestMatch.matchType} (confidence: ${bestMatch.confidence})`
    );
  } else {
    logger.info('No matching loan file found');
  }

  return bestMatch;
}
