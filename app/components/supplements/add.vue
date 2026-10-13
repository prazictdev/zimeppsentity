<template>
  <div class="inline-flex">
    <button class="btn btn-success btn-sm" @click="openModal">
      <Icon name="lucide:plus" />
      <span class="hidden md:block">New Supplement</span>
    </button>

    <dialog id="add_supplement_modal" class="modal">
      <div class="modal-box max-w-xl">
        <div class="flex items-center justify-between border-b border-base-200 pb-2">
          <h3 class="text-lg font-bold">New Budget Supplement</h3>
          <button class="btn btn-ghost btn-circle" @click="closeModal">
            <Icon name="lucide:x" />
          </button>
        </div>

        <p class="mt-3 text-sm text-base-content/70">
          A supplement is a request to add new items to a plan. Once approved, the items
          will be merged into the plan items.
        </p>

        <form class="mt-3 space-y-3" @submit.prevent="submit">
          <fieldset v-if="!props.planUuid" class="fieldset">
            <legend class="fieldset-legend">Plan</legend>
            <select v-model="selectedPlanUuid" class="select select-bordered select-sm w-full">
              <option value="">— select a plan —</option>
              <option v-for="p in planOptions" :key="p.uuid" :value="p.uuid">
                {{ p.year }} · {{ p.company?.name || '—' }}
              </option>
            </select>
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Title</legend>
            <input v-model="form.title" type="text" class="input input-bordered input-sm w-full" placeholder="Short label, e.g. Q3 fleet additions" />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Reason</legend>
            <textarea v-model="form.reason" rows="3" class="textarea textarea-bordered w-full" placeholder="Why are these items being added?"></textarea>
          </fieldset>

          <div class="modal-action">
            <button type="button" class="btn" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-success" :disabled="!canSave || saving">
              <span v-if="saving">Creating...</span>
              <span v-else>Create draft</span>
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
const saving = ref(false);
const form = ref({ title: '', reason: '' });
const selectedPlanUuid = ref('');

const planOptions = computed(() => store.items ?? []);
const activePlanUuid = computed(() => props.planUuid || selectedPlanUuid.value);
const canSave = computed(() => !!activePlanUuid.value);

const openModal = async () => {
  form.value = { title: '', reason: '' };
  selectedPlanUuid.value = props.planUuid || '';
  if (!props.planUuid && !store.items?.length) {
    await store.fetchAll();
  }
  document.getElementById('add_supplement_modal').showModal();
};
const closeModal = () => document.getElementById('add_supplement_modal').close();

const submit = async () => {
  if (!canSave.value) return;
  saving.value = true;
  const created = await store.addSupplement(activePlanUuid.value, form.value);
  saving.value = false;
  if (created) {
    closeModal();
    emit('created', created);
  }
};
</script>
