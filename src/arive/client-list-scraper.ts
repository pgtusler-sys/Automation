import { triggerAriveTask } from './browser-agent';
import { LoanFile, LoanStatus } from '../shared/types';
import { loadState, saveState } from '../shared/utils';
import { logger } from '../shared/logger';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(__dirname, '../../data/arive-clients.json');

function normalizeStatus(raw: string): LoanStatus {
  const statusMap: Record<string, LoanStatus> = {
    application: 'application',
    processing: 'processing',
    underwriting: 'underwriting',
    'conditional approval': 'conditional_approval',
    'conditionally approved': 'conditional_approval',
    'clear to close': 'clear_to_close',
    ctc: 'clear_to_close',
    closing: 'closing',
    funded: 'funded',
    suspended: 'suspended',
    denied: 'denied',
    withdrawn: 'withdrawn',
  };

  const normalized = raw.toLowerCase().trim();
  return statusMap[normalized] || 'application';
}

export async function scrapeClientList(): Promise<LoanFile[]> {
  logger.info('Starting ARIVE client list scrape');

  const result = await triggerAriveTask({
    type: 'scrape_client_list',
    payload: {},
  });

  if (!result.success || !result.data) {
    logger.error('Client list scrape failed', result.error);
    // Fall back to cached data
    return loadCachedClientList();
  }

  const loanFiles: LoanFile[] = (result.data as any[]).map((item, index) => ({
    id: `arive-${index}`,
    borrowerName: item.borrowerName || '',
    coBorrowerName: item.coBorrowerName || undefined,
    loanNumber: item.loanNumber || '',
    propertyAddress: item.propertyAddress || '',
    email: item.email || '',
    phone: item.phone || undefined,
    status: normalizeStatus(item.status || ''),
    lastUpdated: new Date().toISOString(),
  }));

  // Cache the results
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(loanFiles, null, 2));

  const state = loadState();
  saveState({ ...state, lastAriveScrapTimestamp: new Date().toISOString() });

  logger.info(`Scraped ${loanFiles.length} loan files from ARIVE`);
  return loanFiles;
}

export function loadCachedClientList(): LoanFile[] {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    logger.warn('No cached client list available');
    return [];
  }
}
