/**
 * Example transform: rename every If/else condition node's action name.
 *
 * The exact JSON shape depends on what your capture shows - GHL workflow
 * graphs typically have an array of actions/steps, each with a type and a
 * name. Adjust the field names below to match your captured workflow JSON,
 * then dry-run against a CLONED workflow first.
 */

export default function rename(workflow: any): any {
  const nodes: any[] = workflow.actions ?? workflow.steps ?? [];
  for (const node of nodes) {
    if (node?.name === 'Condition') {
      node.name = 'Condition (renamed)';
    }
  }
  return workflow;
}
