export const useMinimumServiceDeliveryStandardHelper = () => {
  const client = usePeClient();
  const base = '/api/v1/minimum-service-delivery-standards';

  return {
    list: () => client(base),
    active: () => client(`${base}/list`),
    save: (payload, uuid = null) => client(uuid ? `${base}/${uuid}` : base, {
      method: uuid ? 'PUT' : 'POST',
      body: payload,
    }),
    archive: uuid => client(`${base}/${uuid}`, { method: 'DELETE' }),
  };
};
