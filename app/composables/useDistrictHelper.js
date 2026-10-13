import { usePeClient } from './usePeClient';

export const useDistrictHelper = () => {
  const client = usePeClient();

  const getDistricts = async ($search = '', $page = 1, $perPage = 10, $provinceId = '') => {
    let url = `/api/districts?search=${$search}&page=${$page}&perPage=${$perPage}`;
    if ($provinceId) url += `&province_id=${$provinceId}`;
    try {
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), status: ref(false), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const getDistrict = async (id) => {
    const url = `/api/districts/${id}`;
    try {
      const data = await client(url, { method: 'GET' });
      return { data: ref(data), status: ref(false), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const createDistrict = async (data) => {
    const url = '/api/v1/districts';
    try {
      const response = await client(url, { method: 'POST', body: data });
      return { data: ref(response), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const updateDistrict = async (id, data) => {
    const url = `/api/districts/${id}`;
    try {
      const response = await client(url, { method: 'PUT', body: data });
      return { data: ref(response), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const deleteDistrict = async (id) => {
    const url = `/api/districts/${id}`;
    try {
      const response = await client(url, { method: 'DELETE' });
      return { data: ref(response), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  return {
    getDistricts,
    getDistrict,
    createDistrict,
    updateDistrict,
    deleteDistrict,
  };
};
