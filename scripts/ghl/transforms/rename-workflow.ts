/**
 * Smoke-test transform: append " BULK-TEST" to the workflow's display name.
 *
 * This is the safest possible first --apply: it changes no nodes (steps
 * modified: 0), and the result is instantly visible in the GHL workflow
 * list. Revert by running it once more with SUFFIX removal or by restoring
 * the backup.
 */

const SUFFIX = ' BULK-TEST';

export default function renameWorkflow(workflow: any): any {
  if (typeof workflow.name !== 'string' || workflow.name.endsWith(SUFFIX)) return null;
  workflow.name = workflow.name + SUFFIX;
  return workflow;
}
