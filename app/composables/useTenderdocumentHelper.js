import { usePeClient } from './usePeClient';

export const useTenderdocumentHelper = () => {
  const client = usePeClient();
  const base = '/api/v1/me/tender-documents';

  const getAll = async () => {
    try {
      const data = await client(base, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const getOne = async (uuid) => {
    try {
      const data = await client(`${base}/${uuid}`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const create = async (payload) => {
    try {
      const data = await client(base, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const update = async (uuid, payload) => {
    try {
      const data = await client(`${base}/${uuid}`, { method: 'PUT', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  const archive = async (uuid) => {
    try {
      const data = await client(`${base}/${uuid}`, { method: 'DELETE' });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  return { getAll, getOne, create, update, archive };
};
