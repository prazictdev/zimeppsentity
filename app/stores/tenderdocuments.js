import { defineStore } from 'pinia';
import { useTenderdocumentHelper } from '~/composables/useTenderdocumentHelper';

export const useTenderdocumentStore = defineStore('tenderdocument', () => {
  const items = ref([]);
  const loading = ref(false);

  const { getAll, getOne, create, update, archive } = useTenderdocumentHelper();
  const toast = useToast();

  const fetchAll = async () => {
    loading.value = true;
    const { data, error } = await getAll();
    if (!error.value) {
      items.value = data.value?.data ?? [];
    } else {
      const msg = error.value?.data?.message || 'Failed to fetch tender documents.';
      toast.error({ title: 'Error', message: msg, position: 'topRight', layout: 2 });
    }
    loading.value = false;
  };

  const findOne = async (uuid) => {
    const { data, error } = await getOne(uuid);
    if (!error.value) return data.value?.data ?? null;
    toast.error({
      title: 'Error',
      message: error.value?.data?.message || 'Failed to fetch tender document.',
      position: 'topRight',
      layout: 2,
    });
    return null;
  };

  const doCreate = async (payload) => {
    const { data: response, status, error } = await create(payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      toast.success({ title: 'Tender document created', message: res.message, position: 'topRight', layout: 2 });
      await fetchAll();
      return true;
    }
    toast.error({
      title: 'Error',
      message: error?.value?.data?.message || res?.message || 'Failed to create tender document.',
      position: 'topRight',
      layout: 2,
    });
    return false;
  };

  const doUpdate = async (uuid, payload) => {
    const { data: response, status, error } = await update(uuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      toast.success({ title: 'Tender document updated', message: res.message, position: 'topRight', layout: 2 });
      await fetchAll();
      return true;
    }
    toast.error({
      title: 'Error',
      message: error?.value?.data?.message || res?.message || 'Failed to update tender document.',
      position: 'topRight',
      layout: 2,
    });
    return false;
  };

  const doArchive = async (uuid) => {
    const { data: response, status, error } = await archive(uuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      toast.success({ title: 'Tender document archived', message: res.message, position: 'topRight', layout: 2 });
      await fetchAll();
      return true;
    }
    toast.error({
      title: 'Error',
      message: error?.value?.data?.message || res?.message || 'Failed to archive tender document.',
      position: 'topRight',
      layout: 2,
    });
    return false;
  };

  return { items, loading, fetchAll, findOne, doCreate, doUpdate, doArchive };
});
