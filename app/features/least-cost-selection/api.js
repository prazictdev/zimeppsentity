export const useLeastCostSelectionApi = () => {
  const client = useSanctumClient()

  const call = async (url, options = {}) => {
    try {
      const response = await client(url, options)
      return { ok: true, data: response?.data, message: response?.message, error: null }
    } catch (error) {
      return {
        ok: false,
        data: null,
        message: null,
        error: error?.data?.message ?? error?.response?._data?.message ?? error?.message ?? 'The LCS request failed.',
        statusCode: error?.statusCode ?? error?.response?.status,
      }
    }
  }

  return {
    queue: (page = 1) => call(`/api/v1/me/lcs-evaluations?page=${page}`),
    initialize: tenderUuid => call(`/api/v1/me/tenders/${tenderUuid}/lcs/initialize`, { method: 'POST' }),
    workspace: tenderUuid => call(`/api/v1/me/tenders/${tenderUuid}/lcs`),
    eligibleCommittee: tenderUuid => call(`/api/v1/me/tenders/${tenderUuid}/lcs/eligible-committee`),
    assignCommittee: (tenderUuid, body) => call(`/api/v1/me/tenders/${tenderUuid}/lcs/committee`, { method: 'POST', body }),
    saveDecisions: (tenderUuid, body) => call(`/api/v1/me/tenders/${tenderUuid}/lcs/decisions`, { method: 'PUT', body }),
    saveDecision: (tenderUuid, bidUuid, body) => call(`/api/v1/me/tenders/${tenderUuid}/lcs/bids/${bidUuid}/decision`, { method: 'PUT', body }),
    documents: (tenderUuid, bidUuid) => call(`/api/v1/me/tenders/${tenderUuid}/lcs/bids/${bidUuid}/documents`),
    chairResponses: tenderUuid => call(`/api/v1/me/tenders/${tenderUuid}/lcs/chair-responses`),
    chairSubmit: (tenderUuid, body) => call(`/api/v1/me/tenders/${tenderUuid}/lcs/chair-submit`, { method: 'POST', body }),
    pmuSubmit: (tenderUuid, body) => call(`/api/v1/me/tenders/${tenderUuid}/lcs/pmu-submit`, { method: 'POST', body }),
    pmuReturnToChair: (tenderUuid, body) => call(`/api/v1/me/tenders/${tenderUuid}/lcs/pmu-return-to-chair`, { method: 'POST', body }),
    accountingOfficerDecision: (tenderUuid, body) => call(`/api/v1/me/tenders/${tenderUuid}/lcs/accounting-officer-decision`, { method: 'POST', body }),
    accountingOfficerReturnToPmu: (tenderUuid, body) => call(`/api/v1/me/tenders/${tenderUuid}/lcs/accounting-officer-return-to-pmu`, { method: 'POST', body }),
  }
}
