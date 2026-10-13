<template>
  <div>
    <button class="btn btn-success btn-sm" @click="openModal">
      <Icon name="lucide:plus" />
      <span class="hidden md:block">Add Document</span>
    </button>
    <dialog id="new_tenderdocument_modal" class="modal">
      <div class="modal-box max-w-lg">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Add Tender Document</h3>
          <button class="btn btn-ghost btn-circle" onclick="new_tenderdocument_modal.close()">
            <Icon name="lucide:x" />
          </button>
        </div>
        <p class="text-xs opacity-60">
          Catalog entry only. PROVIDE files are attached when preparing a tender (step 3).
        </p>

        <form @submit.prevent="handleSubmit">
          <div class="mt-3 flex flex-col gap-3">
            <label class="fieldset">
              <span class="fieldset-legend">Name</span>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g. Site Visit Attendance List"
                :class="['input input-bordered w-full', errors.name ? 'input-error' : '']"
              />
              <label v-if="errors.name" class="label">
                <span class="label-text-alt text-red-600">{{ errors.name }}</span>
              </label>
            </label>

            <label class="fieldset">
              <span class="fieldset-legend">Description</span>
              <textarea
                v-model="form.description"
                rows="2"
                placeholder="Optional context for bidders"
                class="textarea textarea-bordered w-full"
              ></textarea>
            </label>

            <label class="fieldset">
              <span class="fieldset-legend">Type</span>
              <select v-model="form.type" class="select select-bordered w-full">
                <option value="REQUEST">REQUEST — bidder must upload during bid</option>
                <option value="PROVIDE">PROVIDE — entity supplies at tender preparation</option>
              </select>
            </label>

            <label class="fieldset">
              <span class="fieldset-legend">Expires</span>
              <select v-model="form.expires" class="select select-bordered w-full">
                <option value="N">No</option>
                <option value="Y">Yes — document must be within its validity period</option>
              </select>
            </label>
          </div>

          <div class="modal-action">
            <button type="button" class="btn" onclick="new_tenderdocument_modal.close()">Close</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
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
const store = useTenderdocumentStore();

const blank = () => ({
  name: '',
  description: '',
  type: 'REQUEST',
  expires: 'N',
});

const form = ref(blank());
const errors = reactive({ name: '' });
const submitting = ref(false);

const openModal = () => {
  form.value = blank();
  errors.name = '';
  document.getElementById('new_tenderdocument_modal').showModal();
};

const handleSubmit = async () => {
  errors.name = '';
  if (!form.value.name) {
    errors.name = 'Name is required.';
    return;
  }
  submitting.value = true;
  const ok = await store.doCreate(form.value);
  submitting.value = false;
  if (ok) document.getElementById('new_tenderdocument_modal').close();
};
</script>
