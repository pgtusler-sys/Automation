import fs from 'fs';
import path from 'path';
import { chromium, Frame, Page } from 'playwright';
import { STORAGE_STATE_PATH } from './session';

/**
 * Recon tool for the GHL workflow builder.
 *
 * Opens a workflow URL with your saved session and records two things:
 *
 * 1. Every LeadConnector backend call the builder makes (method, URL, auth
 *    headers, request/response JSON) -> data/ghl/capture/<timestamp>/.
 *    Make one small manual edit + "Save" while this runs so the save
 *    endpoint gets captured alongside the load endpoint.
 *
 * 2. The DOM inside the cross-origin "Workflow Builder" iframe, proving
 *    frame access works and giving you real selectors to automate against.
 *
 * Usage: npm run ghl:capture -- "https://app.gohighlevel.com/v2/location/<LOC>/automation/workflows/<ID>"
 */

const DATA_DIR = path.join(__dirname, '../../data/ghl');
const ENDPOINTS_TEMPLATE_PATH = path.join(DATA_DIR, 'endpoints.json');

// Request headers worth keeping: these carry auth/versioning for replay.
const INTERESTING_HEADERS = [
  'authorization',
  'token-id',
  'channel',
  'source',
  'version',
  'content-type',
];

interface CapturedCall {
  seq: number;
  method: string;
  url: string;
  status: number;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
}

function isWorkflowApiCall(url: string, method: string): boolean {
  // GHL stores the workflow node graph as a file in Firebase Storage; the
  // builder fetches and (on save) rewrites it there, so capture that domain.
  if (/firebasestorage\.googleapis\.com/.test(url)) return true;
  if (/leadconnectorhq\.com/.test(url) && /workflow|automation/i.test(url)) return true;
  // Any write on any domain during the session is worth keeping (asset files
  // are only ever GETs, so this stays quiet until the user clicks Save).
  return method !== 'GET' && !url.startsWith('blob:') && !url.startsWith('data:');
}

async function findBuilderFrame(page: Page, timeoutMs = 60_000): Promise<Frame | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const frame = page
      .frames()
      .find((f) => f !== page.mainFrame() && /leadconnectorhq\.com/.test(f.url()));
    if (frame) {
      // Wait until the builder app has actually rendered something.
      const bodyLength = await frame
        .evaluate<number>('document.body ? document.body.innerText.length : 0')
        .catch(() => 0);
      if (bodyLength > 0) return frame;
    }
    await page.waitForTimeout(1_000);
  }
  return null;
}

async function main() {
  const workflowUrl = process.argv[2];
  if (!workflowUrl) {
    console.error('Usage: npm run ghl:capture -- <workflow-builder-url>');
    process.exit(1);
  }
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    console.error(`No saved session at ${STORAGE_STATE_PATH}. Run "npm run ghl:login" first.`);
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const captureDir = path.join(DATA_DIR, 'capture', stamp);
  fs.mkdirSync(captureDir, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  const calls: CapturedCall[] = [];
  let seq = 0;

  page.on('response', async (response) => {
    const url = response.url();
    const request = response.request();
    if (!isWorkflowApiCall(url, request.method())) return;
    const headers: Record<string, string> = {};
    const allHeaders = await request.allHeaders().catch(() => ({} as Record<string, string>));
    for (const name of INTERESTING_HEADERS) {
      if (allHeaders[name]) headers[name] = allHeaders[name];
    }

    const call: CapturedCall = {
      seq: seq++,
      method: request.method(),
      url,
      status: response.status(),
      requestHeaders: headers,
    };
    try {
      call.requestBody = request.postDataJSON();
    } catch {
      /* not JSON or no body */
    }
    try {
      call.responseBody = await response.json();
    } catch {
      /* not JSON */
    }

    calls.push(call);
    const file = path.join(captureDir, `${String(call.seq).padStart(3, '0')}-${call.method}.json`);
    fs.writeFileSync(file, JSON.stringify(call, null, 2));
    console.log(`[captured] ${call.method} ${call.status} ${url}`);
  });

  console.log(`Opening ${workflowUrl}`);
  await page.goto(workflowUrl, { waitUntil: 'domcontentloaded' });

  console.log('Waiting for the Workflow Builder iframe to attach...');
  const frame = await findBuilderFrame(page);
  if (frame) {
    console.log(`Attached to builder frame: ${frame.url()}`);
    const html = await frame.content();
    const domPath = path.join(captureDir, 'builder-frame-dom.html');
    fs.writeFileSync(domPath, html);
    console.log(`Inner iframe DOM dumped to ${domPath} (use it to pick selectors).`);
  } else {
    console.warn('Could not attach to the builder frame within 60s; capture continues anyway.');
  }

  console.log('');
  console.log('Now make ONE small edit to a node and click Save (do NOT publish),');
  console.log('so the save endpoint gets captured. Press Enter here when done.');
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve());
  });

  fs.writeFileSync(path.join(captureDir, 'summary.json'), JSON.stringify(calls, null, 2));
  console.log(`\n${calls.length} API calls captured in ${captureDir}`);

  if (!fs.existsSync(ENDPOINTS_TEMPLATE_PATH)) {
    fs.writeFileSync(
      ENDPOINTS_TEMPLATE_PATH,
      JSON.stringify(
        {
          _instructions:
            'Fill from your capture: "get" is the call that returned the full workflow ' +
            'graph JSON; "save" is the PUT/POST fired when you clicked Save. ' +
            'Use {workflowId} as a placeholder in URLs. Headers here hold live ' +
            'auth tokens - keep this file out of git.',
          get: { method: 'GET', url: '', headers: {} },
          save: { method: 'PUT', url: '', headers: {} },
        },
        null,
        2
      )
    );
    console.log(`Wrote endpoints template to ${ENDPOINTS_TEMPLATE_PATH} - fill it in from the capture.`);
  }

  await browser.close();
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Capture failed:', err);
    process.exit(1);
  });
}
