/**
 * Swap one model id for another across every node in the workflow.
 *
 * 1. Set OLD_MODEL to the id you want to replace and NEW_MODEL to its
 *    replacement.
 * 2. Dry-run first:
 *    npm run ghl:bulk -- --transform scripts/ghl/transforms/swap-model.ts --workflow <ID>
 * 3. When the diff looks right, add --apply.
 *
 * Workflows that don't contain OLD_MODEL are skipped untouched.
 */

const OLD_MODEL = 'PUT-OLD-MODEL-ID-HERE';
const NEW_MODEL = 'PUT-NEW-MODEL-ID-HERE';

export default function swapModel(workflow: any): any {
  const json = JSON.stringify(workflow);
  if (!json.includes(OLD_MODEL)) return null; // nothing to do -> skip
  return JSON.parse(json.split(OLD_MODEL).join(NEW_MODEL));
}
