<template>
  <div>
    <button class="btn btn-info btn-xs" @click="openModal">
      <Icon name="lucide:edit" />
    </button>
    <dialog :id="`edit_disposalplan_modal_${item.id}`" class="modal">
      <div class="modal-box max-w-3xl">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Edit Disposal Item</h3>
          <button
            class="btn btn-ghost btn-circle"
            :onclick="`document.getElementById('edit_disposalplan_modal_${item.id}').close()`"
          >
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
            <button
              class="btn"
              type="button"
              :onclick="`document.getElementById('edit_disposalplan_modal_${item.id}').close()`"
            >Close</button>
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
  item: { type: Object, required: true },
});

const store = useAnnualprocurementplanStore();

const form = ref({});
const errors = reactive({
  description: '', category: '', physicallocation: '',
  acquisitiondate: '', estimatedusefullife: '', estimatedsalvagevalue: '',
  targetdisposaldate: '',
});
const submitting = ref(false);

const toFormShape = (d) => ({
  description: d.description ?? '',
  category: d.category ?? '',
  assetnumber: d.assetnumber ?? '',
  serialnumber: d.serialnumber ?? '',
  physicallocation: d.physicallocation ?? '',
  acquisitiondate: typeof d.acquisitiondate === 'string' ? d.acquisitiondate.slice(0, 10) : '',
  estimatedusefullife: Number(d.estimatedusefullife ?? 0),
  estimatedsalvagevalue: Number(d.estimatedsalvagevalue ?? 0),
  targetdisposaldate: typeof d.targetdisposaldate === 'string' ? d.targetdisposaldate.slice(0, 10) : '',
  disposalreason_id: d.disposalreason_id ?? null,
});

const openModal = async () => {
  await store.fetchDisposalreasons();
  form.value = toFormShape(props.item);
  document.getElementById(`edit_disposalplan_modal_${props.item.id}`).showModal();
};

const clearErrors = () => { for (const k of Object.keys(errors)) errors[k] = ''; };

const handleSubmit = async () => {
  clearErrors();
  try {
    submitting.value = true;
    const valid = await AnnualdisposalplanSchema.validate(form.value, { abortEarly: false });
    const ok = await store.editDisposalplan(props.planUuid, props.item.uuid, valid);
    if (ok) {
      document.getElementById(`edit_disposalplan_modal_${props.item.id}`).close();
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
