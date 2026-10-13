<template>
  <div>
    <button class="btn btn-success btn-sm" @click="openModal">
      <Icon name="lucide:plus" />
      <span class="hidden md:block">Add Disposal Item</span>
    </button>
    <dialog id="new_disposalplan_modal" class="modal">
      <div class="modal-box max-w-3xl">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Add Disposal Item</h3>
          <button class="btn btn-ghost btn-circle" onclick="new_disposalplan_modal.close()">
            <Icon name="lucide:x" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="mt-3">
            <DisposalplansForm
              v-model="form"
              :errors="errors"
              :disposalreasons="store.disposalreasons"
            />
          </div>
          <div class="modal-action">
            <button class="btn" type="button" onclick="new_disposalplan_modal.close()">Close</button>
            <button class="btn btn-primary" type="submit" :disabled="submitting">
              <span v-if="submitting">Saving...</span>
              <span v-else>Save</span>
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
});

const store = useAnnualprocurementplanStore();

function initial() {
  return {
    description: '',
    category: '',
    assetnumber: '',
    serialnumber: '',
    physicallocation: '',
    acquisitiondate: '',
    estimatedusefullife: 0,
    estimatedsalvagevalue: 0,
    targetdisposaldate: '',
    disposalreason_id: null,
  };
}

const form = ref(initial());
const errors = reactive({
  description: '', category: '', physicallocation: '',
  acquisitiondate: '', estimatedusefullife: '', estimatedsalvagevalue: '',
  targetdisposaldate: '',
});
const submitting = ref(false);

const openModal = async () => {
  await store.fetchDisposalreasons();
  document.getElementById('new_disposalplan_modal').showModal();
};

const clearErrors = () => {
  for (const k of Object.keys(errors)) errors[k] = '';
};

const handleSubmit = async () => {
  clearErrors();
  try {
    submitting.value = true;
    const valid = await AnnualdisposalplanSchema.validate(form.value, { abortEarly: false });
    const ok = await store.addDisposalplan(props.planUuid, valid);
    if (ok) {
      form.value = initial();
      document.getElementById('new_disposalplan_modal').close();
    }
  } catch (err) {
    if (err?.inner?.length) {
      err.inner.forEach((e) => {
        if (e.path && Object.prototype.hasOwnProperty.call(errors, e.path)) errors[e.path] = e.message;
      });
    } else if (err?.path && Object.prototype.hasOwnProperty.call(errors, err.path)) {
      errors[err.path] = err.message;
    }
  } finally {
    submitting.value = false;
  }
};
</script>
