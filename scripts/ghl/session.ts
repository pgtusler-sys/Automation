import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

/**
 * One-time interactive login for GoHighLevel.
 *
 * Opens a headed browser, waits for you to complete login (including 2FA),
 * then persists cookies + local storage to data/ghl/storage-state.json so
 * capture.ts and bulk-edit.ts can reuse the session headlessly.
 *
 * Usage: npm run ghl:login [-- <login-url>]
 */

const DATA_DIR = path.join(__dirname, '../../data/ghl');
export const STORAGE_STATE_PATH = path.join(DATA_DIR, 'storage-state.json');

const DEFAULT_LOGIN_URL = 'https://app.gohighlevel.com/';

async function main() {
  const loginUrl = process.argv[2] || DEFAULT_LOGIN_URL;
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(loginUrl);

  console.log('');
  console.log('Log in to GHL in the browser window (2FA included).');
  console.log('When you can see your dashboard, come back here and press Enter.');
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve());
  });

  await context.storageState({ path: STORAGE_STATE_PATH });
  console.log(`Session saved to ${STORAGE_STATE_PATH}`);
  console.log('This file contains live session cookies - keep it out of git.');

  await browser.close();
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Login capture failed:', err);
    process.exit(1);
  });
}
