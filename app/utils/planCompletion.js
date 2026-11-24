export function getPlanCompletionStages({ report, itemCount, pmuCount, unresolved, classificationComplete = null, consolidationComplete = null }) {
  const checks = new Map((report?.tier1?.checks ?? []).map(check => [check.key, check]));
  const structural = (key, label, tab) => ({
    key, label, tab,
    complete: checks.get(key)?.status === 'pass',
    message: checks.get(key)?.message ?? 'Not checked yet.',
  });
  return [
    { key: 'items', label: 'Plan Items', tab: 'items', complete: itemCount > 0, message: `${itemCount} plan item(s) recorded.` },
    { key: 'classification', label: 'UNSPSC Validation', tab: 'classification', complete: classificationComplete, message: classificationComplete ? 'All item classifications are verified.' : 'Some item classifications still require verification.' },
    { key: 'consolidation', label: 'Consolidation', tab: 'consolidation', complete: consolidationComplete, message: consolidationComplete ? 'All consolidation candidates are consolidated.' : 'Some repeated-reference groups still require consolidation.' },
    { key: 'issues', label: 'Issues', tab: 'issues', complete: unresolved === 0, message: `${unresolved} unresolved issue(s).` },
    structural('disposal_plan_has_records', 'Disposal Plan', 'disposal'),
    structural('evaluation_committee_has_members', 'Evaluation Committee', 'evaluation'),
    { key: 'pmu', label: 'PMU', tab: 'pmu', complete: pmuCount > 0, message: `${pmuCount} PMU member(s) recorded.` },
    structural('disposal_committee_has_members', 'Disposal Committee', 'disposalcommittee'),
    structural('required_documents_uploaded', 'Required Attachments', 'attachments'),
    { key: 'history', label: 'Workflow History', tab: 'history', navigationOnly: true, icon: 'lucide:history', message: 'View plan workflow activity and comments.' },
  ];
}
