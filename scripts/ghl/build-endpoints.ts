import fs from 'fs';
import path from 'path';

/**
 * Build data/ghl/endpoints.json from a capture produced by capture.ts.
 *
 * Finds the workflow-load GET, the save PUT, and the triggers GET in the
 * capture, swaps the concrete workflow id for a {workflowId} placeholder,
 * and writes the config bulk-edit.ts consumes. Run this after every new
 * capture (new sub-account, or expired session).
 *
 * Usage: npm run ghl:endpoints            (uses the newest capture folder)
 *        npm run ghl:endpoints -- <dir>   (uses a specific capture folder)
 */

const DATA_DIR = path.join(__dirname, '../../data/ghl');
const CAPTURE_ROOT = path.join(DATA_DIR, 'capture');
const ENDPOINTS_PATH = path.join(DATA_DIR, 'endpoints.json');

interface CapturedCall {
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
}

function newestCaptureDir(): string {
  const dirs = fs
    .readdirSync(CAPTURE_ROOT)
    .map((name) => path.join(CAPTURE_ROOT, name))
    .filter((p) => fs.statSync(p).isDirectory())
    .sort();
  if (dirs.length === 0) {
    console.error(`No captures found in ${CAPTURE_ROOT}. Run "npm run ghl:capture" first.`);
    process.exit(1);
  }
  return dirs[dirs.length - 1];
}

function main() {
  const captureDir = process.argv[2] ? path.resolve(process.argv[2]) : newestCaptureDir();
  const summaryPath = path.join(captureDir, 'summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error(`No summary.json in ${captureDir} - is this a capture folder?`);
    process.exit(1);
  }
  const calls: CapturedCall[] = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  const get = calls.find(
    (c) => c.method === 'GET' && c.url.includes('includeScheduledPauseInfo')
  );
  const save = calls.find(
    (c) => c.method === 'PUT' && /backend\.leadconnectorhq\.com\/workflow\//.test(c.url)
  );
  const triggers = calls.find((c) => c.method === 'GET' && c.url.includes('/trigger?workflowId='));

  if (!get || !save) {
    console.error(
      `Capture is missing ${!get ? 'the workflow-load GET' : 'the save PUT'}. ` +
        'Re-run "npm run ghl:capture", make one small node edit, and click Save before pressing Enter.'
    );
    process.exit(1);
  }

  const idMatch = get.url.match(/\/workflow\/[^/]+\/([0-9a-f-]{36})/i);
  if (!idMatch) {
    console.error(`Could not find a workflow id in ${get.url}`);
    process.exit(1);
  }
  const workflowId = idMatch[1];
  const tmpl = (u: string) => u.split(workflowId).join('{workflowId}');

  const endpoints: Record<string, unknown> = {
    get: { method: 'GET', url: tmpl(get.url), headers: get.requestHeaders },
    save: { method: 'PUT', url: tmpl(save.url), headers: save.requestHeaders },
  };
  if (triggers) {
    endpoints.triggers = {
      method: 'GET',
      url: tmpl(triggers.url),
      headers: triggers.requestHeaders,
    };
  } else {
    console.warn('No triggers GET found in capture - continuing without it (oldTriggers/newTriggers will be []).');
  }

  fs.writeFileSync(ENDPOINTS_PATH, JSON.stringify(endpoints, null, 2));
  const location = (get.url.match(/\/workflow\/([^/]+)\//) || [])[1];
  console.log(`endpoints.json written for location ${location} (from ${path.basename(captureDir)})`);
  console.log('Note: this file holds live auth tokens for THIS sub-account only.');
  console.log('Switching sub-accounts later = redo login + capture + this command.');
}

main();
