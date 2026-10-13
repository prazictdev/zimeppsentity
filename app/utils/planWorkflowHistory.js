export function latestEntityReturnComment(transitions = []) {
  const latest = [...transitions].sort((a, b) =>
    Number(b.id) - Number(a.id)
    || (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0),
  )[0];
  return latest?.action === 'approver_send_back_to_pe'
    && typeof latest.comment === 'string'
    && latest.comment.trim() ? latest.comment : null;
}

export function adminAuthorizationComments(transitions = []) {
  return transitions.filter(transition =>
    (transition.from_status === 'PENDING_ADMIN_AUTHORIZATION'
      || (transition.from_status === 'PENDING_APPROVER_DECISION'
        && transition.action === 'approver_send_back_to_pe'))
    && transition.action !== 'handler_recommend'
    && typeof transition.comment === 'string'
    && transition.comment.trim().length > 0,
  );
}
