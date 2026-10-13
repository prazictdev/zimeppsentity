<template>
  <div class="inline-flex">
    <button class="btn btn-ghost btn-xs" type="button" @click="openModal">
      <Icon name="lucide:edit-2" />
      Edit
    </button>

    <dialog :id="dialogId" class="modal">
      <div class="modal-box max-w-xl text-left">
        <div class="flex items-center justify-between border-b border-base-200 pb-2">
          <h3 class="text-lg font-bold">Edit Budget Supplement</h3>
          <button class="btn btn-ghost btn-circle" type="button" @click="closeModal">
            <Icon name="lucide:x" />
          </button>
        </div>

        <form class="mt-3 space-y-3" @submit.prevent="submit">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Title</legend>
            <input
              v-model="form.title"
              type="text"
              maxlength="255"
              class="input input-bordered input-sm w-full"
              placeholder="Short label, e.g. Q3 fleet additions"
            />
          </fieldset>

          <fieldset class="fieldset">
            <legend class="fieldset-legend">Reason</legend>
            <textarea
              v-model="form.reason"
              rows="4"
              maxlength="5000"
              class="textarea textarea-bordered w-full"
              placeholder="Why are these items being added?"
            ></textarea>
          </fieldset>

          <div class="modal-action">
            <button type="button" class="btn" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving">Saving...</span>
              <span v-else>Save changes</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  supplement: { type: Object, required: true },
});

const emit = defineEmits(['updated']);
const store = useAnnualprocurementplanStore();
const saving = ref(false);
const form = ref({ title: '', reason: '' });
const dialogId = computed(() => `edit_supplement_${props.supplement.uuid}`);

const openModal = () => {
  form.value = {
    title: props.supplement.title ?? '',
    reason: props.supplement.reason ?? '',
  };
  document.getElementById(dialogId.value)?.showModal();
};

const closeModal = () => document.getElementById(dialogId.value)?.close();

const submit = async () => {
  saving.value = true;
  const updated = await store.editSupplement(props.planUuid, props.supplement.uuid, form.value);
  saving.value = false;
  if (updated) {
    closeModal();
    emit('updated', updated);
  }
};
</script>
