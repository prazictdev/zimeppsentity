<template>
  <div class="inline-flex">
    <button class="btn btn-success btn-sm" @click="openModal">
      <Icon name="lucide:arrow-left-right" />
      <span class="hidden md:block">New Virement</span>
    </button>

    <dialog id="add_virement_modal" class="modal">
      <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none">
        <div class="flex items-center justify-between border-b border-base-200 pb-2">
          <h3 class="text-lg font-bold">New Virement</h3>
          <button class="btn btn-ghost btn-circle" @click="closeModal">
            <Icon name="lucide:x" />
          </button>
        </div>

        <form class="mt-3 space-y-4" @submit.prevent>
          <fieldset v-if="!props.planUuid" class="fieldset">
            <legend class="fieldset-legend">Plan</legend>
            <select v-model="selectedPlanUuid" class="select select-bordered w-full" @change="onPlanChange">
              <option value="">— select a plan —</option>
              <option v-for="p in planOptions" :key="p.uuid" :value="p.uuid">
                {{ p.year }} · {{ p.company?.name || '—' }}
              </option>
            </select>
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend">Reason (overall)</legend>
            <textarea v-model="reason" rows="2" class="textarea textarea-bordered w-full" placeholder="Why is this virement being requested?"></textarea>
          </fieldset>

          <div class="rounded border border-base-200">
            <div class="flex items-center justify-between border-b border-base-200 bg-base-200/40 px-3 py-2">
              <span class="text-sm font-semibold">Lines</span>
              <button type="button" class="btn btn-ghost btn-xs" @click="addLine">
                <Icon name="lucide:plus" />
                Add line
              </button>
            </div>
            <table class="table table-sm w-full">
              <thead>
                <tr class="text-left">
                  <th>From (source)</th>
                  <th>To (destination)</th>
                  <th class="text-right">Amount</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, i) in lines" :key="i">
                  <td>
                    <select v-model.number="line.source_item_id" class="select select-bordered select-sm w-full">
                      <option :value="0">— select —</option>
                      <option v-for="it in eligibleSources(line)" :key="it.id" :value="it.id">
                        {{ formatItemOption(it) }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <select v-model.number="line.destination_item_id" class="select select-bordered select-sm w-full">
                      <option :value="0">— select —</option>
                      <option v-for="it in eligibleDestinations(line)" :key="it.id" :value="it.id">
                        {{ formatItemOption(it) }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <input v-model.number="line.amount" type="number" min="0.01" step="0.01" class="input input-bordered input-sm w-32 text-right" />
                  </td>
                  <td>
                    <input v-model="line.reason" type="text" class="input input-bordered input-sm w-full" placeholder="Optional" />
                  </td>
                  <td class="text-right">
                    <button v-if="lines.length > 1" type="button" class="btn btn-ghost btn-xs" @click="removeLine(i)">
                      <Icon name="lucide:trash-2" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="error" class="alert alert-warning text-sm">
            <Icon name="lucide:alert-triangle" />
            <span>{{ error }}</span>
          </div>

          <div class="modal-action">
            <button type="button" class="btn" @click="closeModal">Cancel</button>
            <button type="button" class="btn btn-ghost" :disabled="!canSave || saving" @click="saveDraft">
              <span v-if="saving">Saving...</span>
              <span v-else>Save as draft</span>
            </button>
            <button type="button" class="btn btn-success" :disabled="!canSave || saving" @click="saveAndSubmit">
              <span v-if="saving">Submitting...</span>
              <span v-else>
                <Icon name="lucide:send" />
                Save &amp; submit
              </span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  planUuid: { type: String, default: '' },
});
const emit = defineEmits(['created']);

const store = useAnnualprocurementplanStore();
const reason = ref('');
const lines = ref([emptyLine()]);
const saving = ref(false);
const error = ref('');
const selectedPlanUuid = ref('');

const planOptions = computed(() => store.items ?? []);
const activePlanUuid = computed(() => props.planUuid || selectedPlanUuid.value);

function emptyLine() {
  return { source_item_id: 0, destination_item_id: 0, amount: null, reason: '' };
}

const items = computed(() => store.planItems ?? []);

const eligibleSources = (line) => items.value.filter((it) => !it.is_utilized && !it.is_locked && it.id !== line.destination_item_id);
const eligibleDestinations = (line) => items.value.filter((it) => !it.is_locked && it.id !== line.source_item_id);

const formatItemOption = (it) => {
  const ref = it.reference_no ? `[${it.reference_no}] ` : '';
  const desc = (it.description || '').slice(0, 60);
  const balance = Number(it.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${ref}${desc} · ${balance}`;
};

const canSave = computed(() => activePlanUuid.value && lines.value.every((l) => l.source_item_id > 0 && l.destination_item_id > 0 && Number(l.amount) > 0));

const openModal = async () => {
  reason.value = '';
  lines.value = [emptyLine()];
  error.value = '';
  selectedPlanUuid.value = props.planUuid || '';
  if (!props.planUuid && !store.items?.length) {
    await store.fetchAll();
  }
  if (activePlanUuid.value) {
    await store.fetchAllPlanItems(activePlanUuid.value);
  }
  document.getElementById('add_virement_modal').showModal();
};

const onPlanChange = async () => {
  lines.value = [emptyLine()];
  if (selectedPlanUuid.value) {
    await store.fetchAllPlanItems(selectedPlanUuid.value);
  }
};

const closeModal = () => document.getElementById('add_virement_modal').close();
const addLine = () => lines.value.push(emptyLine());
const removeLine = (i) => lines.value.splice(i, 1);

const buildPayload = () => ({
  reason: reason.value || null,
  lines: lines.value.map((l) => ({
    source_item_id: l.source_item_id,
    destination_item_id: l.destination_item_id,
    amount: Number(l.amount),
    reason: l.reason || null,
  })),
});

const saveDraft = async () => {
  if (!canSave.value) return;
  saving.value = true;
  error.value = '';
  const result = await store.addVirement(activePlanUuid.value, buildPayload());
  saving.value = false;
  if (result) {
    emit('created');
    closeModal();
  }
};

const saveAndSubmit = async () => {
  if (!canSave.value) return;
  saving.value = true;
  error.value = '';
  const created = await store.addVirement(activePlanUuid.value, buildPayload());
  if (created && created.uuid) {
    const ok = await store.submitDraftVirement(activePlanUuid.value, created.uuid);
    if (ok) {
      emit('created');
      closeModal();
    }
  }
  saving.value = false;
};
</script>
