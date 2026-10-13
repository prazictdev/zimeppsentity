import { usePeClient } from './usePeClient';

export const useProvinceHelper = () => {
  const client = usePeClient();

  const getProvinces = async () => {
    try {
      const data = await client('/api/pe/v1/global/provinces-with-districts', { method: 'GET' });
      return { ok: true, data, error: null };
    } catch (err) {
      return { ok: false, data: null, error: err };
    }
  };

  const getDistrictsByProvince = async (provinceId) => {
    try {
      const data = await client(`/api/pe/v1/global/provinces/${provinceId}/districts`, { method: 'GET' });
      return { ok: true, data, error: null };
    } catch (err) {
      return { ok: false, data: null, error: err };
    }
  };

  return {
    getProvinces,
    getDistrictsByProvince,
  };
};
