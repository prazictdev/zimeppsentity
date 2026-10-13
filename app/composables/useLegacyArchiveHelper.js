export const useLegacyArchiveHelper = () => {
  const client = useSanctumClient()
  const list = (resource, query = {}) => client(`/api/v1/legacy-archive/${resource}`, { query })
  return {
    tenders: (query) => list('tenders', query),
    tender: (uuid) => list(`tenders/${uuid}`),
    awards: (query) => list('awards', query),
    contracts: (query) => list('contracts', query),
  }
}
