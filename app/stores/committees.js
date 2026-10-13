import { defineStore } from 'pinia';

export const useCommitteeStore = defineStore('committees', () => {
  const api = useCommitteeHelper();
  const items = ref([]);
  const companies = ref([]);
  const loading = ref(false);
  const error = ref('');
  const errorMessage = (err) => {
    const data = err?.data ?? err?.response?._data;
    return Object.values(data?.errors ?? {}).flat().join(' ') || data?.message || err?.message || 'The request could not be completed.';
  };
  const fetchAll = async () => {
    loading.value = true;
    error.value = '';
    try {
      const [list, lookups] = await Promise.all([api.list(), api.lookups()]);
      items.value = list.data ?? [];
      companies.value = lookups.data?.companies ?? [];
    } catch (err) {
      items.value = [];
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  };
  const save = async (payload, uuid) => {
    const result = await api.save(payload, uuid);
    await fetchAll();
    return result;
  };
  const archive = async (uuid) => {
    await api.archive(uuid);
    await fetchAll();
  };
  return { items, companies, loading, error, errorMessage, fetchAll, save, archive };
});
