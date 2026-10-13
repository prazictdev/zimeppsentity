<template>
  <div>
    <button class="btn btn-info btn-sm" @click="openModal">
      <Icon name="lucide:edit" />
      <span class="hidden md:block">Edit</span>
    </button>
    <dialog :id="`edit_annualprocurementplan_modal_${item.id}`" class="modal">
      <div class="modal-box">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Edit Annual Procurement Plan</h3>
          <button
            class="btn btn-ghost btn-circle"
            :onclick="`document.getElementById('edit_annualprocurementplan_modal_${item.id}').close()`"
          >
            <Icon name="lucide:x" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="mt-3 flex flex-col gap-3">
            <label class="fieldset">
              <span class="fieldset-legend">Year</span>
              <input
                type="number"
                v-model.number="form.year"
                :class="['input input-bordered w-full', errors.year ? 'input-error' : '']"
              />
              <label v-if="errors.year" class="label">
                <span class="label-text-alt text-red-600">{{ errors.year }}</span>
              </label>
            </label>

            <label class="fieldset">
              <span class="fieldset-legend">Status</span>
              <select
                v-model="form.status"
                :class="['select select-bordered w-full', errors.status ? 'select-error' : '']"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>

            <label class="fieldset">
              <span class="fieldset-legend">Default Currency</span>
              <select
                v-model.number="form.currency_id"
                :class="['select select-bordered w-full', errors.currency_id ? 'select-error' : '']"
              >
                <option :value="null">— None —</option>
                <option v-for="c in store.currencies" :key="c.id" :value="c.id">
                  {{ c.code }} — {{ c.name }}
                </option>
              </select>
              <label v-if="errors.currency_id" class="label">
                <span class="label-text-alt text-red-600">{{ errors.currency_id }}</span>
              </label>
            </label>
          </div>

          <div class="modal-action">
            <button
              class="btn"
              type="button"
              :onclick="`document.getElementById('edit_annualprocurementplan_modal_${item.id}').close()`"
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
const props = defineProps({ item: { type: Object, required: true } });
const store = useAnnualprocurementplanStore();

const form = ref({ year: new Date().getFullYear(), status: 'DRAFT', currency_id: null });
const errors = reactive({ year: '', status: '', currency_id: '' });
const submitting = ref(false);

const openModal = async () => {
  await store.fetchCurrencies();
  form.value = {
    year: props.item.year ?? new Date().getFullYear(),
    status: props.item.status ?? 'DRAFT',
    currency_id: props.item.currency_id ?? null,
  };
  document.getElementById(`edit_annualprocurementplan_modal_${props.item.id}`).showModal();
};

const handleSubmit = async () => {
  errors.year = '';
  errors.status = '';
  errors.currency_id = '';
  try {
    submitting.value = true;
    const valid = await AnnualprocurementplanEditSchema.validate(form.value, { abortEarly: false });
    const ok = await store.update(props.item.uuid, valid);
    if (ok) {
      document.getElementById(`edit_annualprocurementplan_modal_${props.item.id}`).close();
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
