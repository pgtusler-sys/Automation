import { matchDocumentToLoanFile } from '../src/documents/loan-file-matcher';
import { ClassificationResult, LoanFile } from '../src/shared/types';

describe('Loan file matching', () => {
  const mockLoanFiles: LoanFile[] = [
    {
      id: '1',
      borrowerName: 'John Smith',
      loanNumber: 'LN-2025-001',
      propertyAddress: '123 Main St, Springfield, IL 62704',
      email: 'john.smith@email.com',
      status: 'processing',
      lastUpdated: '2025-01-15',
    },
    {
      id: '2',
      borrowerName: 'Jane Doe',
      coBorrowerName: 'Bob Doe',
      loanNumber: 'LN-2025-002',
      propertyAddress: '456 Oak Ave, Chicago, IL 60601',
      email: 'jane.doe@email.com',
      status: 'underwriting',
      lastUpdated: '2025-01-14',
    },
  ];

  it('should match by loan number with highest confidence', () => {
    const classification: ClassificationResult = {
      documentType: 'w2',
      confidence: 0.95,
      loanNumber: 'LN-2025-001',
      rawExtraction: {},
    };

    const result = matchDocumentToLoanFile(classification, '', mockLoanFiles);
    expect(result).not.toBeNull();
    expect(result!.matchType).toBe('loan_number');
    expect(result!.confidence).toBe(1.0);
    expect(result!.loanFile.borrowerName).toBe('John Smith');
  });

  it('should match by email address', () => {
    const classification: ClassificationResult = {
      documentType: 'pay_stub',
      confidence: 0.9,
      rawExtraction: {},
    };

    const result = matchDocumentToLoanFile(classification, 'jane.doe@email.com', mockLoanFiles);
    expect(result).not.toBeNull();
    expect(result!.matchType).toBe('email');
    expect(result!.loanFile.borrowerName).toBe('Jane Doe');
  });

  it('should match by borrower name', () => {
    const classification: ClassificationResult = {
      documentType: 'bank_statement',
      confidence: 0.85,
      borrowerName: 'John Smith',
      rawExtraction: {},
    };

    const result = matchDocumentToLoanFile(classification, 'unknown@email.com', mockLoanFiles);
    expect(result).not.toBeNull();
    expect(result!.matchType).toBe('borrower_name');
    expect(result!.loanFile.loanNumber).toBe('LN-2025-001');
  });

  it('should match co-borrower name', () => {
    const classification: ClassificationResult = {
      documentType: 'w2',
      confidence: 0.9,
      borrowerName: 'Bob Doe',
      rawExtraction: {},
    };

    const result = matchDocumentToLoanFile(classification, 'unknown@email.com', mockLoanFiles);
    expect(result).not.toBeNull();
    expect(result!.loanFile.borrowerName).toBe('Jane Doe');
  });

  it('should return null when no match found', () => {
    const classification: ClassificationResult = {
      documentType: 'other',
      confidence: 0.5,
      borrowerName: 'Nobody Known',
      rawExtraction: {},
    };

    const result = matchDocumentToLoanFile(classification, 'nobody@email.com', mockLoanFiles);
    expect(result).toBeNull();
  });
});
