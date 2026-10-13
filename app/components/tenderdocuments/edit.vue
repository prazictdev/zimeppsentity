<template>
  <div>
    <button class="btn btn-ghost btn-xs" @click="openModal">
      <Icon name="lucide:edit" />
    </button>
    <dialog :id="modalId" class="modal">
      <div class="modal-box max-w-lg">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Edit Tender Document</h3>
          <button class="btn btn-ghost btn-circle" @click="closeModal">
            <Icon name="lucide:x" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="mt-3 flex flex-col gap-3">
            <label class="fieldset">
              <span class="fieldset-legend">Name</span>
              <input
                v-model="form.name"
                type="text"
                :class="['input input-bordered w-full', errors.name ? 'input-error' : '']"
              />
              <label v-if="errors.name" class="label">
                <span class="label-text-alt text-red-600">{{ errors.name }}</span>
              </label>
            </label>

            <label class="fieldset">
              <span class="fieldset-legend">Description</span>
              <textarea v-model="form.description" rows="2" class="textarea textarea-bordered w-full"></textarea>
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
            <button type="button" class="btn" @click="closeModal">Close</button>
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
const props = defineProps({ item: { type: Object, required: true } });

const store = useTenderdocumentStore();

const modalId = `edit_tenderdocument_modal_${props.item.id}`;
const form = ref({ ...props.item });
const errors = reactive({ name: '' });
const submitting = ref(false);

const openModal = () => {
  form.value = { ...props.item };
  errors.name = '';
  document.getElementById(modalId).showModal();
};
const closeModal = () => document.getElementById(modalId).close();

const handleSubmit = async () => {
  errors.name = '';
  if (!form.value.name) {
    errors.name = 'Name is required.';
    return;
  }
  submitting.value = true;
  const payload = {
    name: form.value.name,
    description: form.value.description,
    type: form.value.type,
    expires: form.value.expires ?? 'N',
  };
  const ok = await store.doUpdate(props.item.uuid, payload);
  submitting.value = false;
  if (ok) closeModal();
};
</script>
