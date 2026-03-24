import { isNoReplyAddress, sanitizeForPrompt } from '../src/shared/utils';

describe('Email utilities', () => {
  describe('isNoReplyAddress', () => {
    it('should detect no-reply addresses', () => {
      expect(isNoReplyAddress('noreply@company.com')).toBe(true);
      expect(isNoReplyAddress('no-reply@company.com')).toBe(true);
      expect(isNoReplyAddress('do-not-reply@company.com')).toBe(true);
      expect(isNoReplyAddress('mailer-daemon@company.com')).toBe(true);
    });

    it('should pass normal addresses', () => {
      expect(isNoReplyAddress('john@example.com')).toBe(false);
      expect(isNoReplyAddress('support@company.com')).toBe(false);
    });
  });

  describe('sanitizeForPrompt', () => {
    it('should strip HTML tags', () => {
      expect(sanitizeForPrompt('<p>Hello</p>')).toBe('Hello');
    });

    it('should remove script tags', () => {
      expect(sanitizeForPrompt('Hello<script>alert("xss")</script>World')).toBe('Hello[script removed]World');
    });

    it('should escape backtick blocks', () => {
      expect(sanitizeForPrompt('```code```')).toBe("'''code'''");
    });
  });
});
