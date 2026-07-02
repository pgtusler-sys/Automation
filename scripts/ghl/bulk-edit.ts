import fs from 'fs';
import path from 'path';

/**
 * Bulk-edit GHL workflows as JSON via the endpoints discovered by capture.ts.
 *
 * For each workflow ID:
 *   1. GET the workflow JSON (using data/ghl/endpoints.json)
 *   2. Back it up to data/ghl/backups/<id>-<timestamp>.json
 *   3. Apply your transform module
 *   4. Print a path-level diff of what changed
 *   5. Only with --apply: send the save request
 *
 * Dry-run is the default. Publishing is never automated.
 *
 * Usage:
 *   npm run ghl:bulk -- --transform scripts/ghl/transforms/example-rename.ts --workflow <ID> [--workflow <ID2> ...] [--apply]
 *   npm run ghl:bulk -- --transform <file> --workflows-file ids.txt [--apply]
 *
 * A transform module default-exports: (workflow: any) => any | Promise<any>
 * Return the modified workflow, or null/undefined to skip that workflow.
 */

const DATA_DIR = path.join(__dirname, '../../data/ghl');
const ENDPOINTS_PATH = path.join(DATA_DIR, 'endpoints.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

interface EndpointConfig {
  method: string;
  url: string;
  headers: Record<string, string>;
}

interface Endpoints {
  get: EndpointConfig;
  save: EndpointConfig;
  /** Optional: the builder's GET .../trigger?workflowId=... call. Used to fill
   * the oldTriggers/newTriggers bookkeeping on save. */
  triggers?: EndpointConfig;
}

type Transform = (workflow: any) => any | Promise<any>;

function parseArgs(argv: string[]) {
  const workflowIds: string[] = [];
  let transformPath = '';
  let apply = false;

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--workflow':
        workflowIds.push(argv[++i]);
        break;
      case '--workflows-file': {
        const file = argv[++i];
        const lines = fs
          .readFileSync(file, 'utf8')
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'));
        workflowIds.push(...lines);
        break;
      }
      case '--transform':
        transformPath = argv[++i];
        break;
      case '--apply':
        apply = true;
        break;
      default:
        console.error(`Unknown argument: ${argv[i]}`);
        process.exit(1);
    }
  }

  if (!transformPath || workflowIds.length === 0) {
    console.error(
      'Usage: npm run ghl:bulk -- --transform <file> --workflow <ID> [--workflow <ID2>] [--apply]'
    );
    process.exit(1);
  }
  return { workflowIds, transformPath, apply };
}

function loadEndpoints(): Endpoints {
  if (!fs.existsSync(ENDPOINTS_PATH)) {
    console.error(`Missing ${ENDPOINTS_PATH}. Run "npm run ghl:capture" first and fill it in.`);
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(ENDPOINTS_PATH, 'utf8'));
  for (const key of ['get', 'save'] as const) {
    if (!config[key]?.url) {
      console.error(`endpoints.json is missing a "${key}" URL - fill it in from your capture.`);
      process.exit(1);
    }
  }
  return config;
}

/** Recursively collect dotted paths where two JSON values differ. */
function diffPaths(before: any, after: any, prefix = '', out: string[] = []): string[] {
  if (before === after) return out;
  const bothObjects =
    before !== null && after !== null && typeof before === 'object' && typeof after === 'object';
  if (!bothObjects) {
    out.push(`${prefix || '(root)'}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
    return out;
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    diffPaths(before[key], after[key], prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

/** Map of step/template id -> serialized step, for change detection. */
function stepMap(workflow: any): Map<string, string> {
  const map = new Map<string, string>();
  const templates: any[] = workflow?.workflowData?.templates ?? [];
  for (const template of templates) {
    if (template?.id) map.set(template.id, JSON.stringify(template));
  }
  return map;
}

/**
 * Build the save body the way the GHL builder does: the full workflow
 * document plus bookkeeping about which steps changed. Trigger edits are
 * deliberately unsupported (triggersChanged stays false).
 */
function buildSaveBody(original: any, modified: any, triggers: unknown[]): any {
  const before = stepMap(original);
  const after = stepMap(modified);

  const modifiedSteps: string[] = [];
  const createdSteps: string[] = [];
  const deletedSteps: string[] = [];
  for (const [id, json] of after) {
    if (!before.has(id)) createdSteps.push(id);
    else if (before.get(id) !== json) modifiedSteps.push(id);
  }
  for (const id of before.keys()) {
    if (!after.has(id)) deletedSteps.push(id);
  }

  return {
    ...modified,
    modifiedSteps,
    createdSteps,
    deletedSteps,
    triggersChanged: false,
    oldTriggers: triggers,
    newTriggers: triggers,
  };
}

async function fetchTriggers(endpoints: Endpoints, workflowId: string): Promise<unknown[]> {
  if (!endpoints.triggers?.url) return [];
  const response = await callEndpoint(endpoints.triggers, workflowId);
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.triggers)) return response.triggers;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

async function callEndpoint(endpoint: EndpointConfig, workflowId: string, body?: unknown) {
  const url = endpoint.url.replace('{workflowId}', workflowId);
  const response = await fetch(url, {
    method: endpoint.method,
    headers: endpoint.headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${endpoint.method} ${url} -> ${response.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  const { workflowIds, transformPath, apply } = parseArgs(process.argv.slice(2));
  const endpoints = loadEndpoints();
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const transformModule = await import(path.resolve(transformPath));
  const transform: Transform = transformModule.default ?? transformModule;
  if (typeof transform !== 'function') {
    console.error(`${transformPath} must default-export a function (workflow) => workflow`);
    process.exit(1);
  }

  console.log(
    `${apply ? 'APPLY' : 'DRY-RUN'} - ${workflowIds.length} workflow(s), transform: ${transformPath}\n`
  );

  let failures = 0;
  for (const id of workflowIds) {
    try {
      const original = await callEndpoint(endpoints.get, id);

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `${id}-${stamp}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(original, null, 2));

      const modified = await transform(JSON.parse(JSON.stringify(original)));
      if (modified === null || modified === undefined) {
        console.log(`[${id}] transform returned nothing - skipped (backup at ${backupPath})`);
        continue;
      }

      const changes = diffPaths(original, modified);
      if (changes.length === 0) {
        console.log(`[${id}] no changes`);
        continue;
      }

      console.log(`[${id}] ${changes.length} change(s), backup at ${backupPath}:`);
      for (const change of changes.slice(0, 50)) console.log(`    ${change}`);
      if (changes.length > 50) console.log(`    ... and ${changes.length - 50} more`);

      const triggers = await fetchTriggers(endpoints, id);
      const saveBody = buildSaveBody(original, modified, triggers);
      console.log(
        `[${id}] steps modified: ${saveBody.modifiedSteps.length}, ` +
          `created: ${saveBody.createdSteps.length}, deleted: ${saveBody.deletedSteps.length}`
      );

      if (apply) {
        await callEndpoint(endpoints.save, id, saveBody);
        console.log(`[${id}] SAVED (not published - review in the builder before publishing)`);
      }
    } catch (err) {
      failures++;
      console.error(`[${id}] FAILED: ${err instanceof Error ? err.message : err}`);
      if (apply) {
        console.error('Stopping the batch on first failure in apply mode.');
        break;
      }
    }
  }

  if (!apply) console.log('\nDry-run complete. Re-run with --apply to save changes.');
  process.exit(failures > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Bulk edit failed:', err);
    process.exit(1);
  });
}
