export function getPlanCompletionStages({ report, itemCount, pmuCount, unresolved }) {
  const checks = new Map((report?.tier1?.checks ?? []).map(check => [check.key, check]));
  const structural = (key, label, tab) => ({
    key, label, tab,
    complete: checks.get(key)?.status === 'pass',
    message: checks.get(key)?.message ?? 'Not checked yet.',
  });
  return [
    { key: 'items', label: 'Plan Items', tab: 'items', complete: itemCount > 0, message: `${itemCount} plan item(s) recorded.` },
    { key: 'issues', label: 'Issues', tab: 'issues', complete: unresolved === 0, message: `${unresolved} unresolved issue(s).` },
    structural('disposal_plan_has_records', 'Disposal Plan', 'disposal'),
    structural('evaluation_committee_has_members', 'Evaluation Committee', 'evaluation'),
    { key: 'pmu', label: 'PMU', tab: 'pmu', complete: pmuCount > 0, message: `${pmuCount} PMU member(s) recorded.` },
    structural('disposal_committee_has_members', 'Disposal Committee', 'disposalcommittee'),
    structural('required_documents_uploaded', 'Required Attachments', 'attachments'),
    { key: 'analysis', label: 'Item compliance', tab: 'items', complete: report?.can_submit === true, message: report?.can_submit ? 'Plan analysis passed.' : 'Use Analyze Plan to review outstanding checks.' },
  ];
}
