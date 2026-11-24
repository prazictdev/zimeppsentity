<template>
  <dialog ref="dialog" class="modal">
    <div class="modal-box max-h-[92vh] max-w-4xl overflow-y-auto p-0">
      <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-base-200 bg-base-100 px-5 py-4 sm:px-6">
        <div>
          <h3 class="text-xl font-semibold">{{ memberIndex === null ? 'Add committee member' : 'Edit committee member' }}</h3>
          <p class="mt-1 text-sm text-base-content/60">Record the member’s identity, committee role and relevant experience.</p>
        </div>
        <button type="button" class="btn btn-ghost btn-circle btn-sm" aria-label="Close member form" :disabled="saving" @click="dialog.close()">
          <Icon name="lucide:x" class="size-5" />
        </button>
      </header>

      <form class="space-y-5 p-5 sm:p-6" @submit.prevent="save">
        <div v-if="error" role="alert" class="alert alert-error alert-soft">
          <Icon name="lucide:circle-alert" class="size-5" />
          <span>{{ error }}</span>
        </div>

        <fieldset :disabled="saving" class="space-y-5">
          <fieldset v-if="company?.users?.length" class="fieldset">
            <legend class="fieldset-legend">Fill from organisation user</legend>
            <select class="select w-full" @change="selectUser">
              <option value="">Select an existing user (optional)</option>
              <option v-for="user in company.users" :key="user.id" :value="user.id">
                {{ user.name }} {{ user.lastname }} — {{ user.email }}
              </option>
            </select>
            <p class="label">Selecting a user fills their available contact details. It does not change their account.</p>
          </fieldset>

          <section>
            <div class="mb-3 flex items-center gap-2">
              <div class="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon name="lucide:user-round" class="size-4" /></div>
              <h4 class="font-semibold">Member details</h4>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Full name</legend>
                <input v-model="form.name" required maxlength="255" class="input w-full" placeholder="Enter full name" />
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Email address</legend>
                <input v-model="form.email" required type="email" maxlength="255" class="input w-full" placeholder="name@example.com" />
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Gender</legend>
                <select v-model="form.gender" required class="select w-full">
                  <option value="" disabled>Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Designation</legend>
                <input v-model="form.designation" maxlength="150" class="input w-full" placeholder="e.g. Procurement officer" />
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Phone number</legend>
                <input v-model="form.phone" maxlength="50" class="input w-full" placeholder="Enter phone number" />
              </fieldset>
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Organisation role</legend>
                <select v-model="form.role_id" class="select w-full">
                  <option :value="null">No role assigned</option>
                  <option v-for="role in company?.roles ?? []" :key="role.id" :value="role.id">{{ role.name }}</option>
                </select>
              </fieldset>
            </div>
            <label v-if="committeeType === 'PMU'" class="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-base-200 bg-base-200/40 p-3 text-sm">
              <input v-model="form.is_head" type="checkbox" class="checkbox checkbox-primary checkbox-sm" />
              <span><strong class="block font-medium">Head of PMU</strong><span class="text-base-content/55">Only one member can hold this position.</span></span>
            </label>
          </section>

          <section v-if="committeeType !== 'DISPOSAL'" class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="grid size-8 place-items-center rounded-lg bg-info/10 text-info"><Icon name="lucide:briefcase-business" class="size-4" /></div>
              <div>
                <h4 class="font-semibold">Professional profile</h4>
                <p class="text-xs text-base-content/55">Optional qualifications and work experience.</p>
              </div>
            </div>

            <div class="collapse-arrow collapse border border-base-200 bg-base-100">
              <input type="checkbox" />
              <div class="collapse-title flex items-center gap-2 font-medium">
                Qualifications <span class="badge badge-ghost badge-sm">{{ form.qualifications.length }}</span>
              </div>
              <div class="collapse-content space-y-3">
                <div v-for="(qualification, index) in form.qualifications" :key="index" class="rounded-xl border border-base-200 bg-base-200/25 p-3">
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <span class="text-sm font-medium">Qualification {{ index + 1 }}</span>
                    <button type="button" class="btn btn-ghost btn-xs text-error" @click="form.qualifications.splice(index, 1)"><Icon name="lucide:trash-2" />Remove</button>
                  </div>
                  <div class="grid gap-3 sm:grid-cols-2">
                    <input v-model="qualification.qualification" required maxlength="255" class="input input-sm w-full" placeholder="Qualification" aria-label="Qualification" />
                    <input v-model="qualification.institution" maxlength="255" class="input input-sm w-full" placeholder="Institution" aria-label="Institution" />
                    <input v-model="qualification.fieldofstudy" maxlength="255" class="input input-sm w-full" placeholder="Field of study" aria-label="Field of study" />
                    <input v-model.number="qualification.yearobtained" type="number" min="1900" max="2100" class="input input-sm w-full" placeholder="Year obtained" aria-label="Year obtained" />
                  </div>
                </div>
                <button type="button" class="btn btn-outline btn-sm" @click="addQualification"><Icon name="lucide:plus" />Add qualification</button>
              </div>
            </div>

            <div class="collapse-arrow collapse border border-base-200 bg-base-100">
              <input type="checkbox" />
              <div class="collapse-title flex items-center gap-2 font-medium">
                Work history <span class="badge badge-ghost badge-sm">{{ form.workhistory.length }}</span>
              </div>
              <div class="collapse-content space-y-3">
                <div v-for="(history, index) in form.workhistory" :key="index" class="rounded-xl border border-base-200 bg-base-200/25 p-3">
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <span class="text-sm font-medium">Work record {{ index + 1 }}</span>
                    <button type="button" class="btn btn-ghost btn-xs text-error" @click="form.workhistory.splice(index, 1)"><Icon name="lucide:trash-2" />Remove</button>
                  </div>
                  <div class="grid gap-3 sm:grid-cols-2">
                    <input v-model="history.employer" required maxlength="255" class="input input-sm w-full" placeholder="Employer" aria-label="Employer" />
                    <input v-model="history.position" required maxlength="255" class="input input-sm w-full" placeholder="Position" aria-label="Position" />
                    <fieldset class="fieldset"><legend class="fieldset-legend">Start date</legend><input v-model="history.startdate" required type="date" class="input input-sm w-full" /></fieldset>
                    <fieldset class="fieldset"><legend class="fieldset-legend">End date</legend><input v-model="history.enddate" type="date" :min="history.startdate" class="input input-sm w-full" /></fieldset>
                    <textarea v-model="history.responsibilities" maxlength="5000" rows="2" class="textarea sm:col-span-2" placeholder="Responsibilities" aria-label="Responsibilities" />
                  </div>
                </div>
                <button type="button" class="btn btn-outline btn-sm" @click="addWorkHistory"><Icon name="lucide:plus" />Add work history</button>
              </div>
            </div>
          </section>
        </fieldset>

        <div class="modal-action border-t border-base-200 pt-4">
          <button type="button" class="btn" :disabled="saving" @click="dialog.close()">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span v-if="saving" class="loading loading-spinner loading-xs" />
            {{ memberIndex === null ? 'Add member' : 'Save member' }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop"><button :disabled="saving">Close</button></form>
  </dialog>
</template>

<script setup>
import { CommitteeMemberSchema } from '~/utils/CommitteeSchema';

const props = defineProps({
  company: { type: Object, default: null },
  committeeType: { type: String, required: true },
  members: { type: Array, default: () => [] },
});
const emit = defineEmits(['saved']);
const dialog = ref(null);
const saving = ref(false);
const error = ref('');
const memberIndex = ref(null);
const emptyMember = () => ({
  name: '', email: '', gender: '', designation: '', phone: '', role_id: null, is_head: false,
  qualifications: [], workhistory: [],
});
const form = ref(emptyMember());
const clonePlainData = value => JSON.parse(JSON.stringify(value));

const open = (member = null, index = null) => {
  memberIndex.value = index;
  form.value = member ? { ...emptyMember(), ...clonePlainData(member), qualifications: clonePlainData(member.qualifications ?? []), workhistory: clonePlainData(member.workhistory ?? []) } : emptyMember();
  error.value = '';
  dialog.value?.showModal();
};
const selectUser = (event) => {
  const user = props.company?.users?.find(item => item.id === Number(event.target.value));
  if (user) {
    Object.assign(form.value, {
      name: `${user.name} ${user.lastname ?? ''}`.trim(),
      email: user.email,
      phone: user.phone ?? '',
      gender: user.gender ?? '',
    });
  }
  event.target.value = '';
};
const addQualification = () => form.value.qualifications.push({ qualification: '', institution: '', fieldofstudy: '', yearobtained: null });
const addWorkHistory = () => form.value.workhistory.push({ employer: '', position: '', startdate: '', enddate: null, responsibilities: '' });
const save = async () => {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const member = await CommitteeMemberSchema.validate(form.value, { abortEarly: false });
    const duplicate = props.members.some((item, index) => index !== memberIndex.value && item.email?.trim().toLowerCase() === member.email.trim().toLowerCase());
    if (duplicate) throw new Error('This email address is already used by another committee member.');
    if (props.committeeType === 'PMU' && member.is_head && props.members.some((item, index) => index !== memberIndex.value && item.is_head)) {
      throw new Error('This committee already has a Head of PMU.');
    }
    if (props.committeeType === 'DISPOSAL') {
      member.qualifications = [];
      member.workhistory = [];
    }
    emit('saved', { member, index: memberIndex.value });
  } catch (err) {
    error.value = err.name === 'ValidationError' ? err.errors.join(' ') : err.message;
    saving.value = false;
  }
};
const finish = () => {
  saving.value = false;
  dialog.value?.close();
};
const fail = (message) => {
  saving.value = false;
  error.value = message;
};

defineExpose({ open, finish, fail });
</script>
