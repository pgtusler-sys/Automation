import { levenshteinDistance, levenshteinRatio } from '../src/shared/utils';

describe('Utility functions', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should compute correct distance', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('', 'abc')).toBe(3);
    });
  });

  describe('levenshteinRatio', () => {
    it('should return 1.0 for identical strings', () => {
      expect(levenshteinRatio('hello', 'hello')).toBe(1.0);
    });

    it('should return 0 for completely different strings of same length', () => {
      expect(levenshteinRatio('abc', 'xyz')).toBeCloseTo(0.0);
    });

    it('should return ratio between 0 and 1', () => {
      const ratio = levenshteinRatio('hello world', 'hello there');
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThan(1);
    });
  });
});
