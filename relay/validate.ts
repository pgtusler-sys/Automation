/**
 * HUMAN HANDOFF VALIDATION — hCaptcha Session Binding Test
 *
 * Tests whether a human solving a CAPTCHA on a phone can produce
 * a valid token inside an agent's separate cloud browser session.
 *
 * Strategy: Playwright and DevTools CDP debug URLs fight over the
 * same target. So we connect Playwright briefly to navigate, then
 * disconnect it so the phone can take over via the debug URL.
 * After the user solves the CAPTCHA, we reconnect Playwright to
 * read the token.
 */

import 'dotenv/config';
import Browserbase from '@browserbasehq/sdk';
import { chromium, type Browser, type Page } from 'playwright-core';
import * as readline from 'readline';

const API_KEY = process.env.BROWSERBASE_API_KEY;
const PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error('Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID in .env');
  process.exit(1);
}

const DEMO_URL = 'https://accounts.hcaptcha.com/demo';

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function banner(title: string) {
  console.log('\n' + '='.repeat(60) + '\n  ' + title + '\n' + '='.repeat(60));
}

function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  banner('HUMAN HANDOFF VALIDATION — hCaptcha Session Binding');

  const bb = new Browserbase({ apiKey: API_KEY });

  // --- Step 1: Create a keep-alive session ---
  banner('Q1: Create session');
  log('Creating Browserbase session (keepAlive: true)...');
  const session = await bb.sessions.create({
    projectId: PROJECT_ID,
    keepAlive: true,
  });
  log(`Session created: ${session.id}`);

  // --- Step 2: Connect Playwright, navigate, then disconnect ---
  banner('Q2: Navigate to hCaptcha demo');
  log('Connecting Playwright to cloud browser...');
  let browser: Browser = await chromium.connectOverCDP(session.connectUrl);
  let context = browser.contexts()[0] || (await browser.newContext());
  let page: Page = context.pages()[0] || (await context.newPage());

  log(`Navigating to ${DEMO_URL}...`);
  await page.goto(DEMO_URL, { waitUntil: 'domcontentloaded' });
  log('Page loaded — disconnecting Playwright so phone can connect...');

  // Disconnect Playwright (for CDP connections, close() just disconnects,
  // it does NOT shut down the remote browser)
  await browser.close();
  log('Playwright disconnected');

  // --- Step 3: Get debug URL and hand off to phone ---
  banner('Q3: Phone-side CAPTCHA solve');
  log('Requesting live-view URL...');
  const liveView = await bb.sessions.debug(session.id);
  const debuggerUrl = liveView.debuggerFullscreenUrl || liveView.debuggerUrl;
  log('Live-view URL obtained');

  console.log('\n  OPEN THIS URL ON YOUR PHONE:\n');
  console.log(`     ${debuggerUrl}\n`);
  console.log('  Solve the hCaptcha challenge, then come back here.\n');

  await waitForEnter('  Press ENTER after you have solved the CAPTCHA...');

  // --- Step 4: Reconnect Playwright and read the token ---
  banner('Q4: Verify token in agent-side session');
  log('Reconnecting Playwright to read token...');

  // Retrieve session to get a fresh connectUrl
  const refreshed = await bb.sessions.retrieve(session.id);
  const reconnectUrl = refreshed.connectUrl;
  if (!reconnectUrl) {
    log('ERROR: Could not get connectUrl for reconnection. Session may have expired.');
    process.exit(1);
  }

  browser = await chromium.connectOverCDP(reconnectUrl);
  context = browser.contexts()[0] || (await browser.newContext());
  page = context.pages()[0] || (await context.newPage());

  const token = await page.evaluate(() => {
    const el = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="h-captcha-response"]',
    );
    if (el && el.value && el.value.length > 20) return el.value;
    return null;
  });

  await browser.close();

  // --- Result ---
  banner('RESULT');

  if (token) {
    log('Token detected in agent-side session');
    log(`  Token length: ${token.length} chars`);
    log(`  Token prefix: ${token.slice(0, 30)}...`);
    log('Q4 PASS — phone-side solve is visible in agent-side session');
    console.log('\n  CORE THESIS CONFIRMED\n');
    console.log('  Session-binding works. Build the product.\n');
  } else {
    log('No token found after reconnection');
    console.log('\n  CORE THESIS NOT CONFIRMED\n');
    console.log('  Retry or rethink architecture.\n');
  }

  // Release the session
  await bb.sessions.update(session.id, {
    status: 'REQUEST_RELEASE',
    projectId: PROJECT_ID,
  });
}

main().catch((err) => {
  console.error('\nTEST ERRORED:', err);
  process.exit(1);
});
