export const useBidBondManagement = () => {
  const client = useSanctumClient()
  const request = async (url, options = {}) => {
    try { return { ok: true, data: await client(url, options), error: null } }
    catch (error) { return { ok: false, data: null, error: error?.data?.message ?? error?.message ?? 'The bid-bond request failed.' } }
  }
  return {
    list: (page, perPage = 15) => request(`/api/v1/me/bid-bonds?page=${page || 1}&per_page=${perPage}`),
    extend: tenderUuid => request(`/api/v1/me/tenders/${tenderUuid}/bid-bonds/extensions`, { method: 'POST' }),
  }
}
