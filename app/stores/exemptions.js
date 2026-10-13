import { defineStore } from 'pinia';

export const useExemptionStore = defineStore('exemptions', () => {
  const api = useExemptionHelper();
  const toast = useToast();
  const items = ref([]);
  const current = ref(null);
  const workflowActions = ref([]);
  const history = ref([]);
  const loading = ref(false);

  const payloadData = response => response?.data ?? null;
  const errorMessage = (error, fallback) => error?.data?.message || error?.message || fallback;
  const fail = (error, fallback) => toast.error({ title: 'Error', message: errorMessage(error, fallback), position: 'topRight', layout: 2 });
  const done = (message) => toast.success({ title: 'Exemptions', message, position: 'topRight', layout: 2 });

  const fetchAll = async () => {
    loading.value = true;
    const { data, error } = await api.list();
    if (error) fail(error, 'Could not load exemption applications.');
    else {
      const payload = payloadData(data);
      items.value = Array.isArray(payload) ? payload : (payload?.data ?? []);
    }
    loading.value = false;
  };

  const fetchOne = async (uuid) => {
    loading.value = true;
    const { data, error } = await api.show(uuid);
    current.value = error ? null : payloadData(data);
    if (error) fail(error, 'Could not load the exemption application.');
    loading.value = false;
    return current.value;
  };

  const refreshWorkflow = async (uuid) => {
    const [actionResult, historyResult] = await Promise.all([api.actions(uuid), api.transitions(uuid)]);
    workflowActions.value = actionResult.error ? [] : (payloadData(actionResult.data)?.actions ?? payloadData(actionResult.data) ?? []);
    history.value = historyResult.error ? [] : (payloadData(historyResult.data) ?? []);
  };

  const mutate = async (operation, successMessage, refreshUuid = null) => {
    const { data, error } = await operation();
    if (error || data?.status === false) {
      fail(error ?? data, 'The exemption action could not be completed.');
      return false;
    }
    done(data?.message || successMessage);
    if (refreshUuid) await Promise.all([fetchOne(refreshUuid), refreshWorkflow(refreshUuid)]);
    else await fetchAll();
    return true;
  };

  return {
    items, current, workflowActions, history, loading,
    fetchAll, fetchOne, refreshWorkflow,
    create: payload => mutate(() => api.create(payload), 'Exemption application created.'),
    update: (uuid, payload) => mutate(() => api.update(uuid, payload), 'Exemption application updated.', uuid),
    remove: uuid => mutate(() => api.remove(uuid), 'Exemption application deleted.'),
    addItem: (uuid, payload) => mutate(() => api.addItem(uuid, payload), 'Exemption item added.', uuid),
    updateItem: (uuid, itemId, payload) => mutate(() => api.updateItem(uuid, itemId, payload), 'Exemption item updated.', uuid),
    removeItem: (uuid, itemId) => mutate(() => api.removeItem(uuid, itemId), 'Exemption item removed.', uuid),
    transition: (uuid, action, comment) => mutate(() => api.transition(uuid, action, comment), 'Workflow updated.', uuid),
  };
});
