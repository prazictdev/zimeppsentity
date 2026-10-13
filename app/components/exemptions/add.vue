<template>
  <div>
    <button class="btn btn-primary btn-sm" @click="open"><Icon name="lucide:plus" /> New application</button>
    <dialog ref="dialog" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">New exemption application</h3>
        <form class="mt-4 space-y-4" @submit.prevent="submit">
          <label class="fieldset"><span class="fieldset-legend">Annual procurement plan</span>
            <select v-model.number="form.annualprocurementplan_id" class="select w-full" required>
              <option :value="null" disabled>Select a plan</option>
              <option v-for="plan in planStore.items.filter(plan => plan.status !== 'ARCHIVED')" :key="plan.id" :value="plan.id">{{ plan.year }} · {{ plan.procurementclass?.name || 'Plan' }}</option>
            </select>
          </label>
          <label class="fieldset"><span class="fieldset-legend">Title</span><input v-model.trim="form.title" class="input w-full" maxlength="255" required /></label>
          <label class="fieldset"><span class="fieldset-legend">Notes</span><textarea v-model.trim="form.notes" class="textarea w-full" rows="3" /></label>
          <div class="modal-action"><button type="button" class="btn" @click="dialog.close()">Cancel</button><button class="btn btn-primary" :disabled="saving"><span v-if="saving" class="loading loading-spinner loading-xs" /> Create</button></div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const store = useExemptionStore();
const planStore = useAnnualprocurementplanStore();
const dialog = ref(null);
const saving = ref(false);
const form = reactive({ annualprocurementplan_id: null, title: '', notes: '' });
const open = async () => { if (!planStore.items.length) await planStore.fetchAll(); dialog.value.showModal(); };
const submit = async () => { saving.value = true; const ok = await store.create({ ...form, notes: form.notes ? [form.notes] : null }); saving.value = false; if (ok) { Object.assign(form, { annualprocurementplan_id: null, title: '', notes: '' }); dialog.value.close(); } };
</script>
