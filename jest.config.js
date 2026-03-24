module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@outlook/(.*)$': '<rootDir>/src/outlook/$1',
    '^@drafting/(.*)$': '<rootDir>/src/drafting/$1',
    '^@documents/(.*)$': '<rootDir>/src/documents/$1',
    '^@arive/(.*)$': '<rootDir>/src/arive/$1',
    '^@dropbox/(.*)$': '<rootDir>/src/dropbox/$1',
    '^@sheets/(.*)$': '<rootDir>/src/sheets/$1',
    '^@feedback/(.*)$': '<rootDir>/src/feedback/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
};
