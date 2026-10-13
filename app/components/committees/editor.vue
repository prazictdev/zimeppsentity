<template>
  <dialog ref="dialog" class="modal">
    <div :class="['modal-box', readonly ? 'max-w-7xl' : 'max-w-5xl']">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-xl font-bold">{{ readonly ? 'Committee details' : uuid ? 'Edit committee' : 'Create committee' }}</h2>
        <button v-if="readonly && canEdit && viewedCommittee?.status === 'ACTIVE'" type="button" class="btn btn-primary btn-sm ml-auto" @click="addMemberFromView"><Icon name="lucide:user-plus" />Add Member</button>
        <button type="button" class="btn btn-outline btn-circle btn-sm" aria-label="Close committee editor" :disabled="saving" @click="dialog.close()"><Icon name="lucide:x" /></button>
      </div>
      <p class="mt-2 text-sm text-base-content/60">Saved committees can be reused across APPs. Changes here apply to future attachments.</p>
      <div v-if="error" role="alert" class="alert alert-error mt-3">{{ error }}</div>
      <template v-if="readonly && viewedCommittee">
        <CommitteesDetails
          :committee="viewedCommittee"
          :roles="company?.roles ?? []"
          :can-edit="canEdit && viewedCommittee.status === 'ACTIVE'"
          @manage-experience="manageExperience"
        />
        <div class="modal-action"><button type="button" class="btn" @click="dialog.close()">Close</button></div>
      </template>
      <form v-else class="mt-4 space-y-4" @submit.prevent="save">
        <fieldset :disabled="readonly || saving" class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="fieldset"><span class="fieldset-legend">Organisation</span><select v-model.number="form.company_id" required :disabled="!!uuid" class="select select-bordered w-full" @change="clearRoles"><option :value="null" disabled>Select organisation</option><option v-for="company in store.companies" :key="company.id" :value="company.id">{{ company.name }}</option></select></label>
            <label class="fieldset"><span class="fieldset-legend">Committee name</span><input v-model="form.name" required maxlength="255" class="input input-bordered w-full" placeholder="e.g. 2026 Evaluation Committee" /></label>
            <label class="fieldset"><span class="fieldset-legend">Type</span><select v-model="form.type" :disabled="!!uuid" class="select select-bordered w-full" @change="changeType"><option value="EVALUATION">Evaluation</option><option value="DISPOSAL">Disposal</option><option value="PMU">PMU</option></select></label>
          </div>
          <p class="text-xs text-base-content/60">Choose an organisation user to fill in their details, or enter a member manually. Manual entry does not create a login account.</p>
          <section v-for="(member, index) in form.members" :key="index" :data-member-index="index" class="rounded-xl border border-base-200 p-4">
            <div class="mb-3 flex items-center justify-between gap-2"><h3 class="font-semibold">Member {{ index + 1 }}</h3><button v-if="!readonly" type="button" class="btn btn-ghost btn-sm text-error" @click="form.members.splice(index, 1)">Remove member</button></div>
            <label v-if="!readonly" class="fieldset mb-3"><span class="fieldset-legend">Fill from organisation user</span><select class="select select-bordered w-full" @change="selectUser(member, $event)"><option value="">Select user (optional)</option><option v-for="user in company?.users ?? []" :key="user.id" :value="user.id">{{ user.name }} {{ user.lastname }} — {{ user.email }}</option></select></label>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label class="fieldset"><span class="fieldset-legend">Full name</span><input v-model="member.name" required maxlength="255" class="input input-bordered w-full" /></label>
              <label class="fieldset"><span class="fieldset-legend">Email</span><input v-model="member.email" required type="email" maxlength="255" class="input input-bordered w-full" /></label>
              <label class="fieldset"><span class="fieldset-legend">Gender</span><select v-model="member.gender" required class="select select-bordered w-full"><option value="" disabled>Select gender</option><option value="male">Male</option><option value="female">Female</option></select></label>
              <label class="fieldset"><span class="fieldset-legend">Designation</span><input v-model="member.designation" maxlength="150" class="input input-bordered w-full" /></label>
              <label class="fieldset"><span class="fieldset-legend">Phone</span><input v-model="member.phone" maxlength="50" class="input input-bordered w-full" /></label>
              <label class="fieldset"><span class="fieldset-legend">Role</span><select v-model="member.role_id" class="select select-bordered w-full"><option :value="null">No role</option><option v-for="role in company?.roles ?? []" :key="role.id" :value="role.id">{{ role.name }}</option></select></label>
            </div>
            <label v-if="form.type === 'PMU'" class="mt-3 flex items-center gap-2 text-sm"><input v-model="member.is_head" type="checkbox" class="checkbox checkbox-sm" @change="setHead(index)" />Head of PMU</label>
            <details v-if="form.type !== 'DISPOSAL'" class="mt-4 overflow-hidden rounded-xl border border-base-200 bg-base-200/20" :data-experience-member-index="index">
              <summary class="cursor-pointer px-4 py-3 text-sm font-medium">
                <span class="inline-flex flex-wrap items-center gap-2">
                  Professional profile
                  <span class="badge badge-outline badge-sm">{{ member.qualifications.length }} qualifications</span>
                  <span class="badge badge-outline badge-sm">{{ member.workhistory.length }} work records</span>
                </span>
              </summary>
              <div class="grid gap-4 border-t border-base-200 p-4">
                <section class="overflow-hidden rounded-xl border border-base-200 bg-base-100 shadow-sm">
                  <header class="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-base-200 bg-base-200/40 px-4 py-3">
                    <div>
                      <h4 class="font-semibold">Qualifications</h4>
                      <p class="text-xs text-base-content/60">Academic and professional credentials</p>
                    </div>
                    <button v-if="!readonly" type="button" class="btn btn-success btn-sm w-44 justify-center" @click="member.qualifications.push({ qualification: '', institution: '', fieldofstudy: '', yearobtained: null })"><Icon name="lucide:plus" />Add Qualification</button>
                  </header>
                  <div class="space-y-3 p-3">
                    <p v-if="!member.qualifications.length" class="rounded-lg border border-dashed border-base-300 px-4 py-6 text-center text-sm text-base-content/60">No qualifications added.</p>
                    <article v-for="(qualification, qi) in member.qualifications" :key="qi" class="overflow-hidden rounded-lg border border-base-200" :data-qualification-index="qi">
                      <div class="flex items-center justify-between gap-2 border-b border-base-200 bg-base-200/30 px-3 py-2">
                        <span class="text-sm font-medium">Qualification {{ qi + 1 }}</span>
                        <button v-if="!readonly" type="button" class="btn btn-ghost btn-xs text-error" :aria-label="`Delete qualification ${qi + 1}`" @click="member.qualifications.splice(qi, 1)"><Icon name="lucide:trash-2" />Delete</button>
                      </div>
                      <div class="grid gap-3 p-3 sm:grid-cols-2">
                        <label class="fieldset"><span class="fieldset-legend">Qualification</span><input v-model="qualification.qualification" required maxlength="255" class="input input-bordered input-sm w-full" /></label>
                        <label class="fieldset"><span class="fieldset-legend">Institution</span><input v-model="qualification.institution" maxlength="255" class="input input-bordered input-sm w-full" /></label>
                        <label class="fieldset"><span class="fieldset-legend">Field of study</span><input v-model="qualification.fieldofstudy" maxlength="255" class="input input-bordered input-sm w-full" /></label>
                        <label class="fieldset"><span class="fieldset-legend">Year obtained</span><input v-model.number="qualification.yearobtained" type="number" min="1900" max="2100" class="input input-bordered input-sm w-full" /></label>
                      </div>
                    </article>
                  </div>
                </section>

                <section class="overflow-hidden rounded-xl border border-base-200 bg-base-100 shadow-sm">
                  <header class="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-base-200 bg-base-200/40 px-4 py-3">
                    <div>
                      <h4 class="font-semibold">Work History</h4>
                      <p class="text-xs text-base-content/60">Relevant employment experience</p>
                    </div>
                    <button v-if="!readonly" type="button" class="btn btn-success btn-sm w-44 justify-center" @click="member.workhistory.push({ employer: '', position: '', startdate: '', enddate: null, responsibilities: '' })"><Icon name="lucide:plus" />Add Work History</button>
                  </header>
                  <div class="space-y-3 p-3">
                    <p v-if="!member.workhistory.length" class="rounded-lg border border-dashed border-base-300 px-4 py-6 text-center text-sm text-base-content/60">No work history added.</p>
                    <article v-for="(history, hi) in member.workhistory" :key="hi" class="overflow-hidden rounded-lg border border-base-200" :data-workhistory-index="hi">
                      <div class="flex items-center justify-between gap-2 border-b border-base-200 bg-base-200/30 px-3 py-2">
                        <span class="text-sm font-medium">Work record {{ hi + 1 }}</span>
                        <button v-if="!readonly" type="button" class="btn btn-ghost btn-xs text-error" :aria-label="`Delete work record ${hi + 1}`" @click="member.workhistory.splice(hi, 1)"><Icon name="lucide:trash-2" />Delete</button>
                      </div>
                      <div class="grid gap-3 p-3 sm:grid-cols-2">
                        <label class="fieldset"><span class="fieldset-legend">Employer</span><input v-model="history.employer" required maxlength="255" class="input input-bordered input-sm w-full" /></label>
                        <label class="fieldset"><span class="fieldset-legend">Position</span><input v-model="history.position" required maxlength="255" class="input input-bordered input-sm w-full" /></label>
                        <label class="fieldset"><span class="fieldset-legend">Start date</span><input v-model="history.startdate" required type="date" class="input input-bordered input-sm w-full" /></label>
                        <label class="fieldset"><span class="fieldset-legend">End date</span><input v-model="history.enddate" type="date" :min="history.startdate" class="input input-bordered input-sm w-full" /></label>
                        <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Responsibilities</span><textarea v-model="history.responsibilities" maxlength="5000" rows="3" class="textarea textarea-bordered w-full"></textarea></label>
                      </div>
                    </article>
                  </div>
                </section>
              </div>
            </details>
          </section>
          <button v-if="!readonly" type="button" class="btn btn-outline" @click="form.members.push(emptyMember())"><Icon name="lucide:user-plus" />Add member</button>
        </fieldset>
        <div class="modal-action"><button type="button" class="btn" :disabled="saving" @click="dialog.close()">Close</button><button v-if="!readonly" type="submit" class="btn btn-primary" :disabled="saving"><span v-if="saving" class="loading loading-spinner loading-xs" />Save committee</button></div>
      </form>
    </div>
  </dialog>
</template>

<script setup>
import CommitteesDetails from './details.vue';
import { CommitteeSchema } from '~/utils/CommitteeSchema';
const emit = defineEmits(['saved']);
const store = useCommitteeStore();
const { canAdd, canEdit } = useCheckPermission('committees');
const dialog = ref(null);
const uuid = ref(null);
const readonly = ref(false);
const viewedCommittee = ref(null);
const saving = ref(false);
const error = ref('');
const emptyMember = () => ({ name: '', email: '', gender: '', designation: '', phone: '', role_id: null, is_head: false, qualifications: [], workhistory: [] });
const form = ref({ company_id: null, name: '', type: 'EVALUATION', members: [] });
const company = computed(() => store.companies.find(item => item.id === form.value.company_id));
const clearRoles = () => { form.value.members.forEach(member => { member.role_id = null; }); };
const changeType = () => {
  form.value.members.forEach(member => {
    if (form.value.type !== 'PMU') member.is_head = false;
  });
};
const setHead = (index) => { if (form.value.members[index].is_head) form.value.members.forEach((member, i) => { member.is_head = i === index; }); };
const selectUser = (member, event) => {
  const user = company.value?.users.find(item => item.id === Number(event.target.value));
  if (user) Object.assign(member, { name: `${user.name} ${user.lastname ?? ''}`.trim(), email: user.email, phone: user.phone ?? '', gender: user.gender ?? '' });
  event.target.value = '';
};
const open = async (committee = null, viewOnly = false) => {
  uuid.value = committee?.uuid ?? null;
  readonly.value = viewOnly;
  const members = (committee?.members ?? []).map(member => {
    const copy = JSON.parse(JSON.stringify(member));
    return {
      ...emptyMember(),
      ...copy,
      qualifications: copy.qualifications ?? [],
      workhistory: copy.workhistory ?? [],
    };
  });
  viewedCommittee.value = committee ? { ...committee, members } : null;
  error.value = '';
  form.value = committee ? { company_id: committee.company_id, name: committee.name, type: committee.type, members } : { company_id: store.companies[0]?.id ?? null, name: '', type: 'EVALUATION', members: [emptyMember()] };
  await nextTick();
  dialog.value?.showModal();
};
const addMemberFromView = async () => {
  if (!canEdit.value || viewedCommittee.value?.status !== 'ACTIVE') return;
  readonly.value = false;
  form.value.members.push(emptyMember());
  await nextTick();
  const section = dialog.value?.querySelector(`[data-member-index="${form.value.members.length - 1}"]`);
  section?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  section?.querySelector('input')?.focus({ preventScroll: true });
};
const manageExperience = async ({ memberIndex, section, action, recordIndex }) => {
  if (!canEdit.value || viewedCommittee.value?.status !== 'ACTIVE') return;
  const member = form.value.members[memberIndex];
  if (!member || !['qualifications', 'workhistory'].includes(section)) return;

  if (action === 'delete') {
    const label = section === 'qualifications' ? 'qualification' : 'work history record';
    if (!window.confirm(`Delete this ${label}? The change will be applied when you save the committee.`)) return;
    member[section].splice(recordIndex, 1);
  } else if (action === 'add') {
    member[section].push(section === 'qualifications'
      ? { qualification: '', institution: '', fieldofstudy: '', yearobtained: null }
      : { employer: '', position: '', startdate: '', enddate: null, responsibilities: '' });
    recordIndex = member[section].length - 1;
  }

  readonly.value = false;
  await nextTick();
  const details = dialog.value?.querySelector(`[data-experience-member-index="${memberIndex}"]`);
  if (details) details.open = true;
  const attribute = section === 'qualifications' ? 'data-qualification-index' : 'data-workhistory-index';
  const target = details?.querySelector(`[${attribute}="${recordIndex}"]`) ?? details;
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  target?.querySelector('input, textarea')?.focus({ preventScroll: true });
};
const save = async () => {
  if (readonly.value || saving.value || (uuid.value ? !canEdit.value : !canAdd.value)) return;
  error.value = '';
  saving.value = true;
  try {
    const payload = await CommitteeSchema.validate(form.value, { abortEarly: false });
    payload.members = payload.members.map(member => ({ ...member, qualifications: payload.type === 'DISPOSAL' ? [] : member.qualifications, workhistory: payload.type === 'DISPOSAL' ? [] : member.workhistory, is_head: payload.type === 'PMU' && member.is_head }));
    await store.save(payload, uuid.value);
    dialog.value.close();
    emit('saved');
  } catch (err) { error.value = err.name === 'ValidationError' ? err.errors.join(' ') : store.errorMessage(err); }
  finally { saving.value = false; }
};
defineExpose({ open });
</script>
