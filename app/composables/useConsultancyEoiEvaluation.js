export const useConsultancyEoiEvaluation = () => {
  const client = usePeClient()

  const request = async (url, options = {}, fallback = 'The EOI evaluation request failed.') => {
    try {
      return { ok: true, data: await client(url, { timeout: 15000, ...options }), error: null }
    } catch (error) {
      const validationErrors = error?.data?.errors ?? error?.response?._data?.errors
      const message = validationErrors
        ? Object.values(validationErrors).flat().join(' ')
        : error?.data?.message ?? error?.response?._data?.message ?? error?.message ?? fallback

      return { ok: false, data: null, error: message }
    }
  }

  const endpoint = uuid => `/api/v1/me/tenders/${uuid}/consultancy-eoi/evaluation`

  return {
    getWorkspace: uuid => request(endpoint(uuid), { method: 'GET' }, 'Could not load the EOI evaluation workspace.'),
    initialize: uuid => request(`${endpoint(uuid)}/initialize`, { method: 'POST' }, 'Could not initialize the EOI evaluation.'),
    appointCommittee: (uuid, members) => request(`${endpoint(uuid)}/committee`, { method: 'PUT', body: { members } }, 'Could not appoint the EOI evaluation committee.'),
    declareConflict: (uuid, payload) => request(`${endpoint(uuid)}/conflict`, { method: 'PUT', body: payload }, 'Could not save the conflict declaration.'),
    submitScores: (uuid, submissions) => request(`${endpoint(uuid)}/scores`, { method: 'PUT', body: { submissions } }, 'Could not save the individual evaluation.'),
    getEvidenceUrl: (uuid, responseUuid, documentUuid) => request(`${endpoint(uuid)}/responses/${responseUuid}/documents/${documentUuid}`, { method: 'GET' }, 'Could not open the response evidence.'),
    recordConsensus: (uuid, payload) => request(`${endpoint(uuid)}/consensus`, { method: 'POST', body: payload }, 'Could not record the committee consensus.'),
    returnEvaluator: (uuid, memberId, reason) => request(`${endpoint(uuid)}/members/${memberId}/return`, { method: 'POST', body: { reason } }, 'Could not return the individual evaluation.'),
    pmuSubmit: (uuid, comments) => request(`${endpoint(uuid)}/pmu-submit`, { method: 'POST', body: { comments } }, 'Could not forward the EOI shortlist to the Accounting Officer.'),
    pmuReturn: (uuid, reason) => request(`${endpoint(uuid)}/pmu-return`, { method: 'POST', body: { reason } }, 'Could not return the EOI shortlist to the Evaluation Chairperson.'),
    accountingOfficerDecision: (uuid, action, comments) => request(`${endpoint(uuid)}/accounting-officer-decision`, { method: 'POST', body: { action, comments } }, 'Could not record the Accounting Officer decision.'),
  }
}
