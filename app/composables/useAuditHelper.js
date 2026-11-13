export const useAuditHelper = () => {
  const client = usePeClient()
  const base = '/api/v1/me/audits'

  const query = (params = {}) => {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value)
    })
    return search.toString() ? `?${search}` : ''
  }

  const request = async (url) => {
    try {
      return { data: await client(url, { method: 'GET' }), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  return {
    getUtilization: params => request(`${base}/utilization${query(params)}`),
    listAppItems: params => request(`${base}/app-items${query(params)}`),
    getAppItem: uuid => request(`${base}/app-items/${uuid}`),
    getTender: uuid => request(`${base}/tenders/${uuid}`),
    getBidResponse: (tenderUuid, bidUuid) => request(`${base}/tenders/${tenderUuid}/bid-responses/${bidUuid}`),
  }
}
