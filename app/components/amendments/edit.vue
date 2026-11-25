<template>
  <div>
    <button class="btn btn-outline btn-sm" @click="open"><Icon name="lucide:edit-3" />Edit proposal</button>
    <dialog ref="dialog" class="modal">
      <div class="modal-box max-w-xl">
        <div class="flex items-center justify-between"><h3 class="text-lg font-bold">Edit item amendment</h3><button class="btn btn-circle btn-ghost btn-sm" @click="close"><Icon name="lucide:x" /></button></div>
        <form class="mt-4 space-y-4" @submit.prevent="save">
          <fieldset class="fieldset"><legend class="fieldset-legend">Proposed procurement method</legend><select v-model.number="form.procurementmethod_id" class="select w-full" required><option disabled :value="null">Select procurement method</option><option v-for="method in store.procurementmethods" :key="method.id" :value="method.id">{{ method.name }}<template v-if="method.code"> ({{ method.code }})</template></option></select></fieldset>
          <div class="grid gap-3 sm:grid-cols-2">
            <fieldset class="fieldset"><legend class="fieldset-legend">Proposed quantity</legend><input v-model.number="form.quantity" type="number" min="0.01" step="0.01" class="input w-full" required /></fieldset>
            <fieldset class="fieldset"><legend class="fieldset-legend">Proposed unit cost</legend><input v-model.number="form.unit_cost" type="number" min="0.01" step="0.01" class="input w-full" required /></fieldset>
          </div>
          <div class="rounded-box bg-primary/5 px-3 py-2 text-right font-mono font-bold text-primary">Total {{ money(total) }}</div>
          <fieldset class="fieldset"><legend class="fieldset-legend">Reason</legend><textarea v-model.trim="form.reason" rows="4" class="textarea w-full" required /></fieldset>
          <div v-if="errorMessage" class="alert alert-error py-2 text-sm">{{ errorMessage }}</div>
          <div class="modal-action"><button type="button" class="btn" @click="close">Cancel</button><button class="btn btn-primary" :disabled="saving || form.reason.length < 10">Save changes</button></div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({ planUuid: { type: String, required: true }, amendment: { type: Object, required: true } });
const store = useAnnualprocurementplanStore();
const client = useSanctumClient();
const dialog = ref(null);
const saving = ref(false);
const errorMessage = ref('');
const form = reactive({ procurementmethod_id: null, quantity: 0, unit_cost: 0, reason: '' });
const total = computed(() => Number(form.quantity || 0) * Number(form.unit_cost || 0));
const money = value => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const open = async () => { await store.fetchItemLookups(); form.procurementmethod_id = props.amendment.proposed_values?.procurementmethod_id ?? null; form.quantity = Number(props.amendment.proposed_values?.quantity || 0); form.unit_cost = Number(props.amendment.proposed_values?.unit_cost || 0); form.reason = props.amendment.reason || ''; errorMessage.value = ''; dialog.value?.showModal(); };
const close = () => dialog.value?.close();
const save = async () => {
  saving.value = true;
  errorMessage.value = '';
  try {
    await client(`/api/v1/annual-procurement-plans/${props.planUuid}/supplements/${props.amendment.uuid}/amendment`, { method: 'PUT', body: form });
    await store.fetchSupplement(props.planUuid, props.amendment.uuid);
    close();
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.response?._data?.message || 'Unable to update the amendment.';
  } finally { saving.value = false; }
};
</script>
