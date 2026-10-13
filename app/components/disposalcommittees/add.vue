<template>
  <div>
    <button class="btn btn-success btn-sm" @click="openModal">
      <Icon name="lucide:user-plus" />
      <span class="hidden md:block">Add Member</span>
    </button>
    <dialog id="new_discomm_modal" class="modal">
      <div class="modal-box">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Add Disposal Committee Member</h3>
          <button class="btn btn-ghost btn-circle" onclick="new_discomm_modal.close()">
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
              <span class="fieldset-legend">Email</span>
              <input
                type="email"
                v-model="form.email"
                :class="['input input-bordered w-full', errors.email ? 'input-error' : '']"
              />
              <label class="label">
                <span class="label-text-alt text-base-content/60">
                  If this email isn't already a user, a new account will be created and an activation email sent.
                </span>
              </label>
              <label v-if="errors.email" class="label">
                <span class="label-text-alt text-red-600">{{ errors.email }}</span>
              </label>
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
                <option v-for="r in store.disposalCommitteeRoles" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </label>
          </div>

          <div class="modal-action">
            <button class="btn" type="button" onclick="new_discomm_modal.close()">Close</button>
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

const initialForm = () => ({
  name: '',
  email: '',
  designation: '',
  phone: '',
  gender: null,
  role_id: null,
});

const form = ref(initialForm());
const errors = reactive({ name: '', email: '', gender: '' });
const submitting = ref(false);

const openModal = async () => {
  await store.fetchDisposalCommitteeRoles(props.planUuid);
  document.getElementById('new_discomm_modal').showModal();
};

const handleSubmit = async () => {
  errors.name = '';
  errors.email = '';
  errors.gender = '';
  if (!form.value.name) {
    errors.name = 'Name is required';
    return;
  }
  if (!form.value.email) {
    errors.email = 'Email is required';
    return;
  }
  if (!form.value.gender) {
    errors.gender = 'Gender is required';
    return;
  }

  submitting.value = true;
  try {
    const result = await store.addDisposalCommitteeMember(props.planUuid, form.value);
    if (result) {
      form.value = initialForm();
      document.getElementById('new_discomm_modal').close();
    }
  } finally {
    submitting.value = false;
  }
};
</script>
