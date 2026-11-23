import { defineStore } from 'pinia';

export const useMinimumServiceDeliveryStandardStore = defineStore('minimum-service-delivery-standards', () => {
  const api = useMinimumServiceDeliveryStandardHelper();
  const items = ref([]);
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
      const response = await api.list();
      items.value = response?.data ?? response ?? [];
    } catch (err) {
      items.value = [];
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  };

  const save = async (payload, uuid = null) => {
    const response = await api.save(payload, uuid);
    await fetchAll();
    return response;
  };

  const archive = async (uuid) => {
    await api.archive(uuid);
    await fetchAll();
  };

  return { items, loading, error, errorMessage, fetchAll, save, archive };
});
