<template>
  <div>
    <button class="btn btn-info btn-xs" @click="openModal">
      <Icon name="lucide:edit" />
    </button>
    <dialog :id="`edit_evalcomm_modal_${item.id}`" class="modal">
      <div class="modal-box">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Edit Committee Member</h3>
          <button
            class="btn btn-ghost btn-circle"
            :onclick="`document.getElementById('edit_evalcomm_modal_${item.id}').close()`"
          >
            <Icon name="lucide:x" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label class="fieldset md:col-span-2">
              <span class="fieldset-legend">Full Name</span>
              <input
                type="text"
                v-model="form.name"
                :class="['input input-bordered w-full', errors.name ? 'input-error' : '']"
              />
              <label v-if="errors.name" class="label">
                <span class="label-text-alt text-red-600">{{ errors.name }}</span>
              </label>
            </label>

            <label class="fieldset md:col-span-2">
              <span class="fieldset-legend">Email (read-only)</span>
              <input
                type="email"
                :value="item.email"
                readonly
                class="input input-bordered w-full bg-base-200"
              />
            </label>

            <label class="fieldset">
              <span class="fieldset-legend">Designation</span>
              <input v-model="form.designation" type="text" class="input input-bordered w-full" />
            </label>

            <label class="fieldset">
              <span class="fieldset-legend">Phone</span>
              <input v-model="form.phone" type="text" class="input input-bordered w-full" />
            </label>

            <label class="fieldset md:col-span-2">
              <span class="fieldset-legend">Gender</span>
              <select
                v-model="form.gender"
                :class="['select select-bordered w-full', errors.gender ? 'select-error' : '']"
              >
                <option :value="null">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <label v-if="errors.gender" class="label">
                <span class="label-text-alt text-red-600">{{ errors.gender }}</span>
              </label>
            </label>

            <label class="fieldset md:col-span-2">
              <span class="fieldset-legend">Role</span>
              <select v-model.number="form.role_id" class="select select-bordered w-full">
                <option :value="null">— None —</option>
                <option v-for="r in store.committeeRoles" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </label>
          </div>

          <div class="modal-action">
            <button
              class="btn"
              type="button"
              :onclick="`document.getElementById('edit_evalcomm_modal_${item.id}').close()`"
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

const form = ref({
  name: '',
  designation: '',
  phone: '',
  gender: null,
  role_id: null,
});
const errors = reactive({ name: '', gender: '' });
const submitting = ref(false);

const openModal = async () => {
  await store.fetchCommitteeRoles(props.planUuid);
  form.value = {
    name: props.item.name ?? '',
    designation: props.item.designation ?? '',
    phone: props.item.phone ?? '',
    gender: props.item.gender ?? null,
    role_id: props.item.role_id ?? null,
  };
  document.getElementById(`edit_evalcomm_modal_${props.item.id}`).showModal();
};

const handleSubmit = async () => {
  errors.name = '';
  errors.gender = '';
  if (!form.value.name) {
    errors.name = 'Name is required';
    return;
  }
  if (!form.value.gender) {
    errors.gender = 'Gender is required';
    return;
  }
  submitting.value = true;
  try {
    const ok = await store.editCommitteeMember(props.planUuid, props.item.uuid, form.value);
    if (ok) document.getElementById(`edit_evalcomm_modal_${props.item.id}`).close();
  } finally {
    submitting.value = false;
  }
};
</script>
