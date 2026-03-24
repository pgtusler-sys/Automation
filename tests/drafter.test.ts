import { buildSystemPrompt, buildDraftPrompt } from '../src/drafting/prompt-templates';
import { EmailMessage, StylePreference } from '../src/shared/types';

describe('Prompt templates', () => {
  const mockEmail: EmailMessage = {
    id: 'test-123',
    conversationId: 'conv-456',
    subject: 'Document request for loan',
    from: { name: 'John Smith', address: 'john@example.com' },
    toRecipients: [{ name: 'Loan Officer', address: 'officer@company.com' }],
    body: '<p>Please send me the latest update on my loan application.</p>',
    bodyPreview: 'Please send me the latest update on my loan application.',
    receivedDateTime: '2025-01-15T10:00:00Z',
    hasAttachments: false,
    parentFolderId: 'inbox',
    isRead: false,
  };

  describe('buildSystemPrompt', () => {
    it('should include base instructions', () => {
      const prompt = buildSystemPrompt([]);
      expect(prompt).toContain('mortgage loan officer');
      expect(prompt).toContain('professional');
    });

    it('should include style preferences', () => {
      const prefs: StylePreference[] = [
        { rule: 'Always use first name', source: 'inferred', confidence: 0.9, createdAt: '' },
      ];
      const prompt = buildSystemPrompt(prefs);
      expect(prompt).toContain('Always use first name');
      expect(prompt).toContain('LEARNED STYLE PREFERENCES');
    });
  });

  describe('buildDraftPrompt', () => {
    it('should include email details', () => {
      const prompt = buildDraftPrompt(mockEmail, '', null);
      expect(prompt).toContain('John Smith');
      expect(prompt).toContain('john@example.com');
      expect(prompt).toContain('Document request for loan');
    });

    it('should include loan context when provided', () => {
      const prompt = buildDraftPrompt(mockEmail, '', 'Borrower: John Smith\nLoan #: 12345');
      expect(prompt).toContain('LOAN FILE CONTEXT');
      expect(prompt).toContain('12345');
    });

    it('should include conversation history when provided', () => {
      const prompt = buildDraftPrompt(mockEmail, '[officer@company.com]: Previous reply', null);
      expect(prompt).toContain('RECENT CONVERSATION HISTORY');
      expect(prompt).toContain('Previous reply');
    });
  });
});
