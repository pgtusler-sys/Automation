/**
 * HUMAN HANDOFF VALIDATION — hCaptcha Session Binding Test
 *
 * Tests whether a human solving a CAPTCHA on a phone can produce
 * a valid token inside an agent's separate cloud browser session.
 *
 * NOTE: The Browserbase SDK API shape may have changed since this
 * was written. Claude Code should verify the current API (method
 * names, parameter shapes) and adapt before running.
 */

import { Browserbase } from '@browserbasehq/sdk';
import { chromium, type Browser, type Page } from 'playwright-core';
import * as dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.BROWSERBASE_API_KEY;
const PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error('Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID in .env');
  process.exit(1);
}

const DEMO_URL = 'https://accounts.hcaptcha.com/demo';
const CAPTCHA_WAIT_TIMEOUT_MS = 3 * 60 * 1000;

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function banner(title: string) {
  console.log('\n' + '='.repeat(60) + '\n  ' + title + '\n' + '='.repeat(60));
}

async function createSessionWithLiveView() {
  banner('Q1: Create session with live-view URL');

  const bb = new Browserbase({ apiKey: API_KEY });

  log('Creating Browserbase session...');
  const session = await bb.sessions.create({ projectId: PROJECT_ID });
  log(`Session created: ${session.id}`);

  log('Requesting live-view URL...');
  const liveView = await bb.sessions.debug(session.id);
  const debuggerUrl = liveView.debuggerFullscreenUrl || liveView.debuggerUrl;

  if (!debuggerUrl) {
    throw new Error('No debugger URL returned');
  }

  log('Live-view URL obtained');
  console.log('\n  OPEN THIS URL ON YOUR PHONE:\n');
  console.log(`     ${debuggerUrl}\n`);

  return {
    sessionId: session.id,
    connectUrl: session.connectUrl,
    liveViewUrl: debuggerUrl,
  };
}

async function navigateAndAwaitSolve(connectUrl: string) {
  banner('Q2: Phone-side solve registers in agent session');

  log('Connecting Playwright to cloud browser...');
  const browser: Browser = await chromium.connectOverCDP(connectUrl);
  const context = browser.contexts()[0] || (await browser.newContext());
  const page: Page = context.pages()[0] || (await context.newPage());

  log(`Navigating to ${DEMO_URL}...`);
  await page.goto(DEMO_URL, { waitUntil: 'domcontentloaded' });
  log('Page loaded — CAPTCHA widget should be visible on your phone now');

  console.log('\n  On your phone: solve the hCaptcha challenge.\n');

  log('Polling for solved token in agent-side session...');

  const startedAt = Date.now();
  let token: string | null = null;

  while (Date.now() - startedAt < CAPTCHA_WAIT_TIMEOUT_MS) {
    token = await page.evaluate(() => {
      const el = document.querySelector<HTMLTextAreaElement>(
        'textarea[name="h-captcha-response"]',
      );
      if (el && el.value && el.value.length > 20) return el.value;
      return null;
    });
    if (token) break;
    await new Promise((r) => setTimeout(r, 1000));
    process.stdout.write('.');
  }
  console.log('');

  if (!token) {
    log('Timed out waiting for solve');
    await browser.close();
    return { solved: false, token: null };
  }

  log('Token detected in agent-side session');
  log(`  Token length: ${token.length} chars`);
  log(`  Token prefix: ${token.slice(0, 30)}...`);
  log('Q2 PASS — phone-side solve is visible in agent-side session');

  await browser.close();
  return { solved: true, token };
}

async function main() {
  banner('HUMAN HANDOFF VALIDATION — hCaptcha Session Binding');

  try {
    const session = await createSessionWithLiveView();
    const result = await navigateAndAwaitSolve(session.connectUrl);

    banner('RESULT');

    if (result.solved && result.token) {
      console.log('\n  CORE THESIS CONFIRMED\n');
      console.log('  Session-binding works. Build the product.\n');
    } else {
      console.log('\n  CORE THESIS NOT CONFIRMED\n');
      console.log('  Retry or rethink architecture.\n');
    }
  } catch (err) {
    console.error('\nTEST ERRORED:', err);
    process.exit(1);
  }
}

main();
