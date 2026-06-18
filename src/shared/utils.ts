import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(__dirname, '../../data/state.json');

export interface AppState {
  lastEmailScanTimestamp: string;
  lastAriveScrapTimestamp: string;
  lastPipelineSyncTimestamp: string;
}

const DEFAULT_STATE: AppState = {
  lastEmailScanTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  lastAriveScrapTimestamp: '',
  lastPipelineSyncTimestamp: '',
};

export function loadState(): AppState {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state: AppState): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function levenshteinRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - levenshteinDistance(a, b) / maxLen;
}

export function isNoReplyAddress(email: string): boolean {
  const noReplyPatterns = [
    /no-?reply/i,
    /do-?not-?reply/i,
    /noreply/i,
    /mailer-daemon/i,
    /postmaster/i,
  ];
  return noReplyPatterns.some((p) => p.test(email));
}

export function hasUnsubscribeHeader(headers: Record<string, string>): boolean {
  return 'list-unsubscribe' in headers || 'List-Unsubscribe' in headers;
}

export function sanitizeForPrompt(text: string): string {
  return text
    .replace(/```/g, "'''")
    .replace(/<script[\s\S]*?<\/script>/gi, '[script removed]')
    .replace(/<style[\s\S]*?<\/style>/gi, '[style removed]')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
