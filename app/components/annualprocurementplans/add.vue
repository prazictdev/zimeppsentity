<template>
  <div>
    <button class="btn btn-success btn-sm" @click="openModal">
      <Icon name="lucide:plus" />
      <span class="hidden md:block">New Plan</span>
    </button>
    <dialog id="new_annualprocurementplan_modal" class="modal">
      <div class="modal-box">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">New Annual Procurement Plan</h3>
          <button class="btn btn-ghost btn-circle" onclick="new_annualprocurementplan_modal.close()">
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
                placeholder="e.g. 2026"
                :class="['input input-bordered w-full', errors.year ? 'input-error' : '']"
              />
              <label v-if="errors.year" class="label">
                <span class="label-text-alt text-red-600">{{ errors.year }}</span>
              </label>
            </label>

            <label class="fieldset">
              <span class="fieldset-legend">Procurement Class</span>
              <select
                v-model.number="form.procurementclass_id"
                :class="['select select-bordered w-full', errors.procurementclass_id ? 'select-error' : '']"
              >
                <option :value="null">— None —</option>
                <option v-for="c in store.procurementclasses" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <label v-if="errors.procurementclass_id" class="label">
                <span class="label-text-alt text-red-600">{{ errors.procurementclass_id }}</span>
              </label>
            </label>

            <label class="fieldset">
              <span class="fieldset-legend">Default Currency</span>
              <select
                v-model.number="form.currency_id"
                :class="['select select-bordered w-full', errors.currency_id ? 'select-error' : '']"
              >
                <option :value="null">— Use primary —</option>
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
            <button class="btn" type="button" onclick="new_annualprocurementplan_modal.close()">Close</button>
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
const store = useAnnualprocurementplanStore();

const form = ref({ year: new Date().getFullYear(), status: 'DRAFT', procurementclass_id: null, currency_id: null });
const errors = reactive({ year: '', procurementclass_id: '', currency_id: '' });
const submitting = ref(false);

const openModal = async () => {
  await Promise.all([store.fetchProcurementClasses(), store.fetchCurrencies()]);
  // Preselect the primary currency if one is flagged.
  if (!form.value.currency_id) {
    const primary = (store.currencies ?? []).find((c) => c.isprimary === 'Y');
    if (primary) form.value.currency_id = primary.id;
  }
  document.getElementById('new_annualprocurementplan_modal').showModal();
};

const resetForm = () => {
  form.value = { year: new Date().getFullYear(), status: 'DRAFT', procurementclass_id: null, currency_id: null };
  errors.year = '';
  errors.procurementclass_id = '';
  errors.currency_id = '';
};

const handleSubmit = async () => {
  errors.year = '';
  errors.procurementclass_id = '';
  errors.currency_id = '';
  try {
    submitting.value = true;
    const valid = await AnnualprocurementplanSchema.validate(form.value, { abortEarly: false });
    const ok = await store.create(valid);
    if (ok) {
      resetForm();
      document.getElementById('new_annualprocurementplan_modal').close();
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
