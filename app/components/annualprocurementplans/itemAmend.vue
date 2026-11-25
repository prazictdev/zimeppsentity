<template>
  <div>
    <button :class="buttonClass" title="Request an amendment" aria-label="Request an amendment" @click="open">
      <Icon name="lucide:file-pen-line" />
      <span v-if="buttonLabel">{{ buttonLabel }}</span>
    </button>

    <dialog ref="dialog" class="modal">
      <div class="modal-box max-w-2xl">
        <div class="flex items-start justify-between gap-3 border-b border-base-200 pb-3">
          <div>
            <h3 class="text-lg font-bold">Amend approved item</h3>
            <p class="mt-1 text-sm text-base-content/60">{{ item.reference_no }} · {{ item.description }}</p>
          </div>
          <button type="button" class="btn btn-circle btn-ghost btn-sm" aria-label="Close" @click="close"><Icon name="lucide:x" /></button>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-box bg-base-200/60 p-3"><div class="text-xs text-base-content/55">Approved method</div><div class="mt-1 font-semibold">{{ methodLabel(item.procurementmethod_id) }}</div></div>
          <div class="rounded-box bg-base-200/60 p-3"><div class="text-xs text-base-content/55">Approved quantity</div><div class="mt-1 font-mono font-bold">{{ money(item.quantity) }}</div></div>
          <div class="rounded-box bg-base-200/60 p-3"><div class="text-xs text-base-content/55">Approved unit cost</div><div class="mt-1 font-mono font-bold">{{ money(item.unit_cost) }}</div></div>
          <div class="rounded-box bg-base-200/60 p-3"><div class="text-xs text-base-content/55">Approved total</div><div class="mt-1 font-mono font-bold">{{ money(item.total_cost) }}</div></div>
        </div>

        <form class="mt-4 space-y-4" @submit.prevent="submit">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Proposed procurement method</legend>
            <select v-model.number="form.procurementmethod_id" class="select w-full" required>
              <option disabled :value="null">Select procurement method</option>
              <option v-for="method in store.procurementmethods" :key="method.id" :value="method.id">{{ method.name }}<template v-if="method.code"> ({{ method.code }})</template></option>
            </select>
            <p class="label text-xs text-base-content/55">Only methods permitted for the item’s procurement group can be approved.</p>
          </fieldset>
          <div class="grid gap-3 sm:grid-cols-2">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Proposed quantity</legend>
              <input v-model.number="form.quantity" type="number" min="0.01" step="0.01" class="input w-full" required />
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Proposed unit cost</legend>
              <input v-model.number="form.unit_cost" type="number" min="0.01" step="0.01" class="input w-full" required />
            </fieldset>
          </div>
          <div class="flex items-center justify-between rounded-box border border-primary/20 bg-primary/5 px-3 py-2">
            <span class="text-sm text-base-content/60">Proposed total</span>
            <span class="font-mono text-lg font-bold text-primary">{{ money(proposedTotal) }}</span>
          </div>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Reason for amendment</legend>
            <textarea v-model.trim="form.reason" rows="4" class="textarea w-full" placeholder="Explain the error and why the approved value must change" required />
          </fieldset>
          <div v-if="errorMessage" class="alert alert-error py-2 text-sm"><Icon name="lucide:circle-alert" />{{ errorMessage }}</div>
          <div class="modal-action">
            <button type="button" class="btn" @click="close">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving || form.reason.length < 10">
              <span v-if="saving" class="loading loading-spinner loading-xs" />
              Create amendment
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  item: { type: Object, required: true },
  buttonLabel: { type: String, default: '' },
  buttonClass: { type: String, default: 'btn btn-ghost btn-xs' },
});

const store = useAnnualprocurementplanStore();
const client = useSanctumClient();
const dialog = ref(null);
const saving = ref(false);
const errorMessage = ref('');
const form = reactive({ procurementmethod_id: null, quantity: 0, unit_cost: 0, reason: '' });
const proposedTotal = computed(() => Number(form.quantity || 0) * Number(form.unit_cost || 0));

const open = async () => {
  await store.fetchItemLookups();
  form.procurementmethod_id = props.item.procurementmethod_id ?? null;
  form.quantity = Number(props.item.quantity || 0);
  form.unit_cost = Number(props.item.unit_cost || 0);
  form.reason = '';
  errorMessage.value = '';
  dialog.value?.showModal();
};
const close = () => dialog.value?.close();
const money = value => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const methodLabel = id => store.procurementmethods.find(method => Number(method.id) === Number(id))?.name || props.item.procurementmethod?.name || 'Not set';

const submit = async () => {
  saving.value = true;
  errorMessage.value = '';
  try {
    const response = await client(`/api/v1/annual-procurement-plans/${props.planUuid}/items/${props.item.id}/amendments`, {
      method: 'POST',
      body: form,
    });
    const amendment = response?.data;
    close();
    await navigateTo(`/supplements/${props.planUuid}/${amendment.uuid}`);
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.response?._data?.message || 'Unable to create the amendment request.';
  } finally {
    saving.value = false;
  }
};
</script>
