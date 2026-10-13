import { usePeClient } from './usePeClient';

export const useAnnualprocurementplanHelper = () => {
  const client = usePeClient();

  const base = '/api/v1/annual-procurement-plans';

  // ─── Plans ──────────────────────────────────────────────────────────────
  const getPlans = async () => {
    try {
      const data = await client(base, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getPlan = async (uuid) => {
    try {
      const data = await client(`${base}/${uuid}`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const createPlan = async (payload) => {
    try {
      const data = await client(base, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updatePlan = async (uuid, payload) => {
    try {
      const data = await client(`${base}/${uuid}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deletePlan = async (uuid) => {
    try {
      const data = await client(`${base}/${uuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // ─── Items ──────────────────────────────────────────────────────────────
  const getItems = async (planUuid, params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `${base}/${planUuid}/items${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  // ─── AI compliance review ───────────────────────────────────────────────
  const getComplianceAnalysis = async (planUuid) => {
    try {
      const data = await client(`${base}/${planUuid}/compliance-analysis`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const startComplianceAnalysis = async (planUuid, payload = {}) => {
    try {
      const data = await client(`${base}/${planUuid}/compliance-analysis/run`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const getClassificationMatches = async (planUuid, scanType = 'NSPL') => {
    try {
      const data = await client(`${base}/${planUuid}/classification-matches`, { method: 'GET', query: { scan_type: scanType } });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const startClassificationMatch = async (planUuid, scanType = 'NSPL') => {
    try {
      const data = await client(`${base}/${planUuid}/classification-matches/run`, { method: 'POST', body: { scan_type: scanType } });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const acceptClassificationMatches = async (planUuid, runId, matches) => {
    try {
      const data = await client(`${base}/${planUuid}/classification-matches/accept-bulk`, {
        method: 'PATCH', body: { run_id: runId, matches },
      });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const decideClassificationMatch = async (planUuid, matchId, decision, nsplProductId = null) => {
    try {
      const data = await client(`${base}/${planUuid}/classification-matches/${matchId}`, {
        method: 'PATCH',
        body: { decision, ...(nsplProductId ? { nspl_product_id: nsplProductId } : {}) },
      });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const getComplianceChat = async (planUuid) => {
    try {
      const data = await client(`${base}/${planUuid}/compliance-chat`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const sendComplianceChat = async (planUuid, message) => {
    try {
      const data = await client(`${base}/${planUuid}/compliance-chat`, { method: 'POST', body: { message } });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // The three totals endpoints accept the same filter params as /items so
  // the summary cards mirror the filtered slice the user is looking at.
  const totalsQs = (params) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    }
    return qs.toString() ? `?${qs}` : '';
  };

  const getItemTotals = async (planUuid, params = {}) => {
    try {
      const data = await client(`${base}/${planUuid}/totals${totalsQs(params)}`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getItemTotalsByGroup = async (planUuid, params = {}) => {
    try {
      const data = await client(`${base}/${planUuid}/totals/groups${totalsQs(params)}`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getItemTotalsByFlag = async (planUuid, params = {}) => {
    try {
      const data = await client(`${base}/${planUuid}/totals/flags${totalsQs(params)}`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getItemTotalsByAwardType = async (planUuid, params = {}) => {
    try {
      const data = await client(`${base}/${planUuid}/totals/awards${totalsQs(params)}`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const bulkUpdateItems = async (planUuid, updates) => {
    try {
      const data = await client(`${base}/${planUuid}/items`, { method: 'PUT', body: { updates } });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const getInvoice = async (planUuid) => {
    try {
      const data = await client(`${base}/${planUuid}/invoice`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const recordInvoiceRtgs = async (planUuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/invoice/payment/rtgs`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const listAllVirements = async (params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `/api/v1/virements${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const listAllSupplements = async (params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `/api/v1/supplements${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const listAllInvoices = async (params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `/api/v1/invoices${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const listVirements = async (planUuid, params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `${base}/${planUuid}/virements${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const createVirement = async (planUuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/virements`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const submitVirement = async (planUuid, uuid) => {
    try {
      const data = await client(`${base}/${planUuid}/virements/${uuid}/submit`, { method: 'POST' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const approveVirement = async (planUuid, uuid, comment) => {
    try {
      const data = await client(`${base}/${planUuid}/virements/${uuid}/approve`, {
        method: 'POST',
        body: { comment },
      });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const rejectVirement = async (planUuid, uuid, comment) => {
    try {
      const data = await client(`${base}/${planUuid}/virements/${uuid}/reject`, {
        method: 'POST',
        body: { comment },
      });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deleteVirement = async (planUuid, uuid) => {
    try {
      const data = await client(`${base}/${planUuid}/virements/${uuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const listSupplements = async (planUuid, params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `${base}/${planUuid}/supplements${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const showSupplement = async (planUuid, uuid) => {
    try {
      const data = await client(`${base}/${planUuid}/supplements/${uuid}`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const createSupplement = async (planUuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/supplements`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updateSupplement = async (planUuid, uuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/supplements/${uuid}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deleteSupplement = async (planUuid, uuid) => {
    try {
      const data = await client(`${base}/${planUuid}/supplements/${uuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const addSupplementItem = async (planUuid, uuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/supplements/${uuid}/items`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updateSupplementItem = async (planUuid, uuid, itemId, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/supplements/${uuid}/items/${itemId}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deleteSupplementItem = async (planUuid, uuid, itemId) => {
    try {
      const data = await client(`${base}/${planUuid}/supplements/${uuid}/items/${itemId}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const supplementTransition = async (planUuid, uuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/supplements/${uuid}/transition`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const getSupplementWorkflowActions = async (planUuid, uuid) => {
    try {
      const data = await client(`${base}/${planUuid}/supplements/${uuid}/workflow/actions`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getSupplementEligibleNextActors = async (planUuid, uuid, stage) => {
    try {
      const url = `${base}/${planUuid}/supplements/${uuid}/workflow/eligible-next-actors?stage=${encodeURIComponent(stage)}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const settleInvoice = async (planUuid) => {
    try {
      const data = await client(`${base}/${planUuid}/invoice/settle`, { method: 'POST' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const transitionPlan = async (planUuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/transition`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const getWorkflowActions = async (planUuid) => {
    try {
      const data = await client(`${base}/${planUuid}/workflow/actions`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getTransitions = async (planUuid) => {
    try {
      const data = await client(`${base}/${planUuid}/transitions`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const createItem = async (planUuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/items`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updateItem = async (planUuid, itemId, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/items/${itemId}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deleteItem = async (planUuid, itemId) => {
    try {
      const data = await client(`${base}/${planUuid}/items/${itemId}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // ─── Disposal plan items ────────────────────────────────────────────────
  const getDisposalplans = async (planUuid, params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `${base}/${planUuid}/disposalplans${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const createDisposalplan = async (planUuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/disposalplans`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updateDisposalplan = async (planUuid, disposalUuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/disposalplans/${disposalUuid}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deleteDisposalplan = async (planUuid, disposalUuid) => {
    try {
      const data = await client(`${base}/${planUuid}/disposalplans/${disposalUuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const getDisposalreasons = async () => {
    try {
      const data = await client('/api/v1/disposal-reasons/list', { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const importDisposalplans = async (planUuid, file) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await client(`${base}/${planUuid}/disposalplans/import`, {
        method: 'POST',
        body: fd,
      });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // ─── Evaluation committee ───────────────────────────────────────────────
  const ecBase = (planUuid) => `${base}/${planUuid}/evaluation-committee`;

  const getCommitteeRoles = async (planUuid) => {
    try {
      const data = await client(`${ecBase(planUuid)}/roles`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getCommitteeMembers = async (planUuid, params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `${ecBase(planUuid)}${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getCommitteeMember = async (planUuid, memberUuid) => {
    try {
      const data = await client(`${ecBase(planUuid)}/${memberUuid}`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const createCommitteeMember = async (planUuid, payload) => {
    try {
      const data = await client(ecBase(planUuid), { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updateCommitteeMember = async (planUuid, memberUuid, payload) => {
    try {
      const data = await client(`${ecBase(planUuid)}/${memberUuid}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deleteCommitteeMember = async (planUuid, memberUuid) => {
    try {
      const data = await client(`${ecBase(planUuid)}/${memberUuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const createQualification = async (planUuid, memberUuid, formData) => {
    try {
      const data = await client(`${ecBase(planUuid)}/${memberUuid}/qualifications`, {
        method: 'POST',
        body: formData,
      });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updateQualification = async (planUuid, memberUuid, qualUuid, formData) => {
    try {
      const data = await client(`${ecBase(planUuid)}/${memberUuid}/qualifications/${qualUuid}`, {
        method: 'POST',
        body: formData,
      });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deleteQualification = async (planUuid, memberUuid, qualUuid) => {
    try {
      const data = await client(`${ecBase(planUuid)}/${memberUuid}/qualifications/${qualUuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const createWorkhistory = async (planUuid, memberUuid, payload) => {
    try {
      const data = await client(`${ecBase(planUuid)}/${memberUuid}/workhistory`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updateWorkhistory = async (planUuid, memberUuid, entryUuid, payload) => {
    try {
      const data = await client(`${ecBase(planUuid)}/${memberUuid}/workhistory/${entryUuid}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deleteWorkhistory = async (planUuid, memberUuid, entryUuid) => {
    try {
      const data = await client(`${ecBase(planUuid)}/${memberUuid}/workhistory/${entryUuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // ─── Procurement Management Unit (PMU) ──────────────────────────────────
  const pmuBase = (planUuid) => `${base}/${planUuid}/procurement-management-unit`;

  const getPmuRoles = async (planUuid) => {
    try {
      const data = await client(`${pmuBase(planUuid)}/roles`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getPmuMembers = async (planUuid, params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `${pmuBase(planUuid)}${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getPmuMember = async (planUuid, memberUuid) => {
    try {
      const data = await client(`${pmuBase(planUuid)}/${memberUuid}`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const createPmuMember = async (planUuid, payload) => {
    try {
      const data = await client(pmuBase(planUuid), { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updatePmuMember = async (planUuid, memberUuid, payload) => {
    try {
      const data = await client(`${pmuBase(planUuid)}/${memberUuid}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deletePmuMember = async (planUuid, memberUuid) => {
    try {
      const data = await client(`${pmuBase(planUuid)}/${memberUuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const createPmuQualification = async (planUuid, memberUuid, formData) => {
    try {
      const data = await client(`${pmuBase(planUuid)}/${memberUuid}/qualifications`, { method: 'POST', body: formData });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updatePmuQualification = async (planUuid, memberUuid, qualUuid, formData) => {
    try {
      const data = await client(`${pmuBase(planUuid)}/${memberUuid}/qualifications/${qualUuid}`, { method: 'POST', body: formData });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deletePmuQualification = async (planUuid, memberUuid, qualUuid) => {
    try {
      const data = await client(`${pmuBase(planUuid)}/${memberUuid}/qualifications/${qualUuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const createPmuWorkhistory = async (planUuid, memberUuid, payload) => {
    try {
      const data = await client(`${pmuBase(planUuid)}/${memberUuid}/workhistory`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updatePmuWorkhistory = async (planUuid, memberUuid, entryUuid, payload) => {
    try {
      const data = await client(`${pmuBase(planUuid)}/${memberUuid}/workhistory/${entryUuid}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deletePmuWorkhistory = async (planUuid, memberUuid, entryUuid) => {
    try {
      const data = await client(`${pmuBase(planUuid)}/${memberUuid}/workhistory/${entryUuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // ─── Disposal committee ─────────────────────────────────────────────────
  const dcBase = (planUuid) => `${base}/${planUuid}/disposal-committee`;

  const getDisposalcommitteeRoles = async (planUuid) => {
    try {
      const data = await client(`${dcBase(planUuid)}/roles`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getDisposalcommitteeMembers = async (planUuid, params = {}) => {
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      }
      const url = `${dcBase(planUuid)}${qs.toString() ? `?${qs}` : ''}`;
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const createDisposalcommitteeMember = async (planUuid, payload) => {
    try {
      const data = await client(dcBase(planUuid), { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updateDisposalcommitteeMember = async (planUuid, memberUuid, payload) => {
    try {
      const data = await client(`${dcBase(planUuid)}/${memberUuid}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deleteDisposalcommitteeMember = async (planUuid, memberUuid) => {
    try {
      const data = await client(`${dcBase(planUuid)}/${memberUuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // ─── Plan documents (required-document uploads) ─────────────────────────
  const docBase = (planUuid) => `${base}/${planUuid}/documents`;

  const getPlanDocuments = async (planUuid) => {
    try {
      const data = await client(docBase(planUuid), { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const uploadPlanDocument = async (planUuid, documentId, docmanData) => {
    try {
      const data = await client(docBase(planUuid), {
        method: 'POST',
        body: { document_id: documentId, ...docmanData },
      });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deletePlanDocument = async (planUuid, docUuid) => {
    try {
      const data = await client(`${docBase(planUuid)}/${docUuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // ─── Plan analysis ───────────────────────────────────────────────────────
  const analyzePlan = async (planUuid) => {
    try {
      const data = await client(`${base}/${planUuid}/analyze`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  /**
   * Stream the Tier 2 issues .xlsx straight to the browser. We request
   * `responseType: 'blob'` so the sanctum client doesn't try to JSON-parse
   * the binary payload.
   */
  const exportAnalyzeIssues = async (planUuid) => {
    try {
      const blob = await client(`${base}/${planUuid}/analyze/export-issues`, {
        method: 'GET',
        responseType: 'blob',
      });
      return { data: ref(blob), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const importAnalyzeFixes = async (planUuid, file) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await client(`${base}/${planUuid}/analyze/import-fixes`, {
        method: 'POST',
        body: fd,
      });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // ─── Resolve unresolved lookups ──────────────────────────────────────────
  const getUnresolved = async (planUuid) => {
    try {
      const data = await client(`${base}/${planUuid}/unresolved`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const resolveLookup = async (planUuid, payload) => {
    try {
      const data = await client(`${base}/${planUuid}/resolve-lookup`, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // ─── Lookups (inline, fetched on demand for the item form) ─────────────
  const getProcurementClasses = async () => {
    try {
      const data = await client('/api/v1/procurement-classes/list', { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getProcurementMethods = async () => {
    try {
      const data = await client('/api/v1/procurement-methods/list', { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getProcurementGroups = async () => {
    try {
      const data = await client('/api/v1/procurement-groups/list', { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getSourceOfFunds = async () => {
    try {
      const data = await client('/api/v1/source-of-funds/list', { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getUnitOfMeasures = async () => {
    try {
      const data = await client('/api/v1/unit-of-measures/list', { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getCurrencies = async () => {
    try {
      const data = await client('/api/v1/currencies/list', { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  return {
    exportAnalyzeIssues,
    importAnalyzeFixes,
    getPlans,
    getPlan,
    createPlan,
    updatePlan,
    deletePlan,
    getItems,
    getComplianceAnalysis,
    startComplianceAnalysis,
    getClassificationMatches,
    startClassificationMatch,
    decideClassificationMatch,
    acceptClassificationMatches,
    getComplianceChat,
    sendComplianceChat,
    getItemTotals,
    getItemTotalsByGroup,
    getItemTotalsByFlag,
    getItemTotalsByAwardType,
    createItem,
    updateItem,
    deleteItem,
    getDisposalplans,
    createDisposalplan,
    updateDisposalplan,
    deleteDisposalplan,
    getDisposalreasons,
    importDisposalplans,
    getCommitteeRoles,
    getCommitteeMembers,
    getCommitteeMember,
    createCommitteeMember,
    updateCommitteeMember,
    deleteCommitteeMember,
    createQualification,
    updateQualification,
    deleteQualification,
    createWorkhistory,
    updateWorkhistory,
    deleteWorkhistory,
    getPmuRoles,
    getPmuMembers,
    getPmuMember,
    createPmuMember,
    updatePmuMember,
    deletePmuMember,
    createPmuQualification,
    updatePmuQualification,
    deletePmuQualification,
    createPmuWorkhistory,
    updatePmuWorkhistory,
    deletePmuWorkhistory,
    getDisposalcommitteeRoles,
    getDisposalcommitteeMembers,
    createDisposalcommitteeMember,
    updateDisposalcommitteeMember,
    deleteDisposalcommitteeMember,
    getPlanDocuments,
    uploadPlanDocument,
    deletePlanDocument,
    analyzePlan,
    bulkUpdateItems,
    transitionPlan,
    getWorkflowActions,
    getTransitions,
    getInvoice,
    settleInvoice,
    recordInvoiceRtgs,
    listVirements,
    listAllVirements,
    listAllSupplements,
    listAllInvoices,
    createVirement,
    submitVirement,
    approveVirement,
    rejectVirement,
    deleteVirement,
    listSupplements,
    showSupplement,
    createSupplement,
    updateSupplement,
    deleteSupplement,
    addSupplementItem,
    updateSupplementItem,
    deleteSupplementItem,
    supplementTransition,
    getSupplementWorkflowActions,
    getSupplementEligibleNextActors,
    getUnresolved,
    resolveLookup,
    getProcurementClasses,
    getProcurementMethods,
    getProcurementGroups,
    getSourceOfFunds,
    getUnitOfMeasures,
    getCurrencies,
  };
};
