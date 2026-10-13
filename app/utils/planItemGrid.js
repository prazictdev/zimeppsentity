export const gridDraftKey = (userId, planUuid) => `app-item-grid:v1:${userId}:${planUuid}`;
export const exemptionGridDraftKey = (userId, exemptionUuid) => `exemption-item-grid:v1:${userId}:${exemptionUuid}`;
export const supplementGridDraftKey = (userId, supplementUuid) => `supplement-item-grid:v1:${userId}:${supplementUuid}`;
export function newGridRow(uuid) {
  return {
    uuid, reference_no: '', description: '', unspsc_id: null, unspsc_label: '',
    procurementgroup_id: null, procurementmethod_id: null, sourceoffunds_id: null, unitofmeasure_id: null,
    quantity: 0, unit_cost: 0, expensecategory: 'MOOE', award_type: 'AWARD', quarter: null,
    pre_qualification: false, eoi: false, sustainable_procurement: false, affirmative_procurement: false,
    eoi_publication_date: '', eoi_closing_date: '',
    bid_notice_publication_date: '', lead_time_days: null, estimated_contract_negotiation_days: null, msds: '',
  };
}
export function gridPayload(row) {
  return Object.fromEntries(Object.keys(newGridRow(row.uuid)).filter(key => key !== 'unspsc_label')
    .map(key => [key, row[key] === '' && key !== 'description' ? null : row[key]]));
}
export function newExemptionGridRow(uuid) {
  return { ...newGridRow(uuid), grounds: [], evidence_document_key: '' };
}
export function exemptionGridPayload(row) {
  return {
    ...gridPayload(row),
    grounds: (row.grounds || []).map(({ exemption_type_id, justification, requested_terms }) => ({ exemption_type_id, justification, requested_terms })),
    evidence_document_key: row.evidence_document_key || null,
  };
}
export function loadGridDraft(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) return [];
  const draft = JSON.parse(raw);
  if (draft.version !== 1 || !Array.isArray(draft.rows) || draft.rows.length > 5000
    || draft.rows.some(row => !row || typeof row.uuid !== 'string' || typeof row.description !== 'string')
    || new Set(draft.rows.map(row => row.uuid)).size !== draft.rows.length) throw new Error('Saved draft could not be read. It has been left unchanged.');
  return draft.rows;
}
export function saveGridDraft(storage, key, rows) {
  storage.setItem(key, JSON.stringify({ version: 1, rows }));
}
export async function uploadGridRows(rows, send, checkpoint, serialize = gridPayload) {
  let uploaded = 0;
  while (rows.length) {
    const batch = rows.slice(0, 100);
    batch.forEach(row => { row._sent = true; });
    checkpoint();
    let response;
    try { response = await send(batch.map(serialize)); }
    catch (error) {
      if ((error.statusCode || error.status || error.response?.status) === 422) {
        batch.forEach(row => { row._sent = false; }); checkpoint();
      }
      throw error;
    }
    const acknowledged = new Set(response.data.uploaded_uuids);
    if (!batch.every(row => acknowledged.has(row.uuid))) throw new Error('Upload confirmation incomplete. Retry to confirm these rows.');
    rows.splice(0, batch.length); uploaded += batch.length; checkpoint(uploaded);
  }
  return uploaded;
}
