<template>
  <div>
    <button class="btn btn-info btn-xs" @click="openModal">
      <Icon name="lucide:edit" />
    </button>
    <dialog :id="`edit_apitem_modal_${item.id}`" class="modal">
      <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Edit Plan Item</h3>
          <button
            class="btn btn-ghost btn-circle"
            :onclick="`document.getElementById('edit_apitem_modal_${item.id}').close()`"
          >
            <Icon name="lucide:x" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="mt-3">
            <AnnualprocurementplansItemForm
              v-model="form"
              :errors="errors"
              :procurementmethods="store.procurementmethods"
              :procurementgroups="store.procurementgroups"
              :sourceoffunds="store.sourceoffunds"
              :unitofmeasures="store.unitofmeasures"
            />
          </div>
          <div class="modal-action">
            <button
              class="btn"
              type="button"
              :onclick="`document.getElementById('edit_apitem_modal_${item.id}').close()`"
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
const errors = reactive({ description: '', quantity: '', unit_cost: '', award_type: '' });
const submitting = ref(false);

const toFormShape = (it) => ({
  reference_no: it.reference_no ?? '',
  description: it.description ?? '',
  procurementgroup_id: it.procurementgroup_id ?? null,
  procurementmethod_id: it.procurementmethod_id ?? null,
  pre_qualification: !!it.pre_qualification,
  eoi: !!it.eoi,
  spoc: !!it.spoc,
  sustainable_procurement: !!it.sustainable_procurement,
  affirmative_procurement: !!it.affirmative_procurement,
  eoi_publication_date: it.eoi_publication_date ?? '',
  eoi_closing_date: it.eoi_closing_date ?? '',
  bid_notice_publication_date: it.bid_notice_publication_date ?? '',
  bid_closing_date: it.bid_closing_date ?? '',
  publish_award_notice: it.publish_award_notice ?? '',
  contract_signing: it.contract_signing ?? '',
  cycle_days: it.cycle_days ?? null,
  lead_time_days: it.lead_time_days ?? null,
  estimated_contract_negotiation_days: it.estimated_contract_negotiation_days ?? null,
  sourceoffunds_id: it.sourceoffunds_id ?? null,
  unitofmeasure_id: it.unitofmeasure_id ?? null,
  quantity: Number(it.quantity ?? 0),
  unit_cost: Number(it.unit_cost ?? 0),
  total_cost: it.total_cost != null ? Number(it.total_cost) : null,
  expensecategory: it.expensecategory ?? 'MOOE',
  award_type: it.award_type ?? 'AWARD',
  msds: it.msds ?? '',
  quarter: it.quarter ?? null,
});

const openModal = async () => {
  await store.fetchItemLookups();
  form.value = toFormShape(props.item);
  document.getElementById(`edit_apitem_modal_${props.item.id}`).showModal();
};

const handleSubmit = async () => {
  errors.description = '';
  errors.quantity = '';
  errors.unit_cost = '';
  errors.award_type = '';
  try {
    submitting.value = true;
    const valid = await AnnualprocurementplanItemSchema.validate(form.value, { abortEarly: false });
    const ok = await store.editItem(props.planUuid, props.item.id, valid);
    if (ok) {
      document.getElementById(`edit_apitem_modal_${props.item.id}`).close();
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
