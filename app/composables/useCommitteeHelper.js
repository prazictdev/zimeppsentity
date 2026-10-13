export const useCommitteeHelper = () => {
  const client = useSanctumClient();
  const base = '/api/v1/me/committees';
  return {
    list: () => client(base),
    lookups: () => client(`${base}/lookups`),
    save: (payload, uuid) => client(uuid ? `${base}/${uuid}` : base, { method: uuid ? 'PUT' : 'POST', body: payload }),
    archive: (uuid) => client(`${base}/${uuid}`, { method: 'DELETE' }),
    attachments: (planUuid) => client(`/api/v1/annual-procurement-plans/${planUuid}/committees`),
    attach: (planUuid, payload) => client(`/api/v1/annual-procurement-plans/${planUuid}/committees`, { method: 'POST', body: payload }),
  };
};
