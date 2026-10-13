import { usePeClient } from './usePeClient';

export const useExemptionHelper = () => {
  const client = usePeClient();
  const base = '/api/v1/exemptions';

  const request = async (url, options = {}) => {
    try {
      return { data: await client(url, options), error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  return {
    list: () => request(base),
    show: uuid => request(`${base}/${uuid}`),
    create: payload => request(base, { method: 'POST', body: payload }),
    update: (uuid, payload) => request(`${base}/${uuid}`, { method: 'PUT', body: payload }),
    remove: uuid => request(`${base}/${uuid}`, { method: 'DELETE' }),
    addItem: (uuid, payload) => request(`${base}/${uuid}/items`, { method: 'POST', body: payload }),
    updateItem: (uuid, itemId, payload) => request(`${base}/${uuid}/items/${itemId}`, { method: 'PUT', body: payload }),
    removeItem: (uuid, itemId) => request(`${base}/${uuid}/items/${itemId}`, { method: 'DELETE' }),
    actions: uuid => request(`${base}/${uuid}/workflow/actions`),
    transition: (uuid, action, comment = null) => request(`${base}/${uuid}/transition`, { method: 'POST', body: { action, comment } }),
    transitions: uuid => request(`${base}/${uuid}/transitions`),
  };
};
