<template>
  <div>
    <dialog ref="dialog" class="modal">
      <div :class="['modal-box max-h-[92vh] overflow-y-auto p-0', mode === 'view' ? 'max-w-6xl' : 'max-w-2xl']">
        <header class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-base-200 bg-base-100 px-5 py-4 sm:px-6">
          <div class="flex min-w-0 items-start gap-3">
            <div :class="['grid size-10 shrink-0 place-items-center rounded-lg', mode === 'view' ? 'bg-primary/10 text-primary' : 'bg-base-200 text-base-content/65']">
              <Icon :name="mode === 'view' ? 'lucide:users-round' : uuid ? 'lucide:pencil' : 'lucide:plus'" class="size-5" />
            </div>
            <div class="min-w-0">
              <h2 class="truncate text-xl font-semibold">{{ dialogTitle }}</h2>
              <p class="mt-1 text-sm text-base-content/55">{{ dialogDescription }}</p>
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-circle btn-sm shrink-0" aria-label="Close committee dialog" :disabled="saving" @click="dialog.close()">
            <Icon name="lucide:x" class="size-5" />
          </button>
        </header>

        <div v-if="error" role="alert" class="alert alert-error alert-soft mx-5 mt-5 sm:mx-6">
          <Icon name="lucide:circle-alert" class="size-5" />
          <span>{{ error }}</span>
        </div>

        <div v-if="mode === 'view' && viewedCommittee" class="p-5 sm:p-6">
          <CommitteesDetails
            :committee="viewedCommittee"
            :roles="currentCompany?.roles ?? []"
            :can-edit="canEdit && viewedCommittee.status === 'ACTIVE'"
            @add-member="openMemberEditor()"
            @edit-member="({ member, index }) => openMemberEditor(member, index)"
            @remove-member="removeMember"
          />
          <div class="modal-action mt-5 border-t border-base-200 pt-4">
            <button type="button" class="btn" @click="dialog.close()">Close</button>
          </div>
        </div>

        <form v-else class="space-y-5 p-5 sm:p-6" @submit.prevent="saveCommittee">
          <div class="rounded-xl border border-info/20 bg-info/5 p-4 text-sm text-base-content/70">
            <div class="flex gap-3">
              <Icon name="lucide:info" class="mt-0.5 size-4 shrink-0 text-info" />
              <p>Create the committee record first. Members are added afterwards from the committee’s View screen.</p>
            </div>
          </div>

          <fieldset :disabled="saving" class="grid gap-4">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Organisation</legend>
              <select v-model.number="form.company_id" required :disabled="Boolean(uuid)" class="select w-full">
                <option :value="null" disabled>Select organisation</option>
                <option v-for="company in store.companies" :key="company.id" :value="company.id">{{ company.name }}</option>
              </select>
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Committee name</legend>
              <input v-model="form.name" required maxlength="255" class="input w-full" placeholder="e.g. 2026 Evaluation Committee" />
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Committee type</legend>
              <select v-model="form.type" :disabled="Boolean(uuid)" class="select w-full">
                <option value="EVALUATION">Evaluation committee</option>
                <option value="DISPOSAL">Disposal committee</option>
                <option value="PMU">Procurement Management Unit</option>
              </select>
              <p class="label">The organisation and committee type cannot be changed after creation.</p>
            </fieldset>
          </fieldset>

          <div class="modal-action border-t border-base-200 pt-4">
            <button type="button" class="btn" :disabled="saving" @click="dialog.close()">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="loading loading-spinner loading-xs" />
              {{ uuid ? 'Save changes' : 'Create committee' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button :disabled="saving">Close</button></form>
    </dialog>

    <CommitteesMemberEditor
      ref="memberEditor"
      :company="currentCompany"
      :committee-type="viewedCommittee?.type ?? 'EVALUATION'"
      :members="viewedCommittee?.members ?? []"
      @saved="saveMember"
    />
  </div>
</template>

<script setup>
import CommitteesDetails from './details.vue';
import CommitteesMemberEditor from './member-editor.vue';
import { CommitteeSchema } from '~/utils/CommitteeSchema';

const emit = defineEmits(['saved']);
const store = useCommitteeStore();
const { canAdd, canEdit } = useCheckPermission('pecommittes');
const dialog = ref(null);
const memberEditor = ref(null);
const uuid = ref(null);
const mode = ref('form');
const viewedCommittee = ref(null);
const saving = ref(false);
const error = ref('');
const form = ref({ company_id: null, name: '', type: 'EVALUATION' });

const currentCompany = computed(() => store.companies.find(company => company.id === (viewedCommittee.value?.company_id ?? form.value.company_id)));
const dialogTitle = computed(() => mode.value === 'view' ? viewedCommittee.value?.name : uuid.value ? 'Edit committee' : 'Create committee');
const dialogDescription = computed(() => mode.value === 'view'
  ? 'Review the committee and manage its members.'
  : uuid.value
    ? 'Update the committee name. Existing members are not affected.'
    : 'Set up the committee record. You can add members after it is created.');
const cloneCommittee = committee => ({
  ...structuredClone(committee),
  members: structuredClone(committee.members ?? []),
});

const open = async (committee = null, viewOnly = false) => {
  uuid.value = committee?.uuid ?? null;
  mode.value = viewOnly ? 'view' : 'form';
  viewedCommittee.value = committee ? cloneCommittee(committee) : null;
  form.value = committee
    ? { company_id: committee.company_id, name: committee.name, type: committee.type }
    : { company_id: store.companies[0]?.id ?? null, name: '', type: 'EVALUATION' };
  error.value = '';
  await nextTick();
  dialog.value?.showModal();
};
const saveCommittee = async () => {
  if (saving.value || (uuid.value ? !canEdit.value : !canAdd.value)) return;
  error.value = '';
  saving.value = true;
  try {
    const metadata = await CommitteeSchema.validate(form.value, { abortEarly: false });
    await store.save({ ...metadata, members: viewedCommittee.value?.members ?? [] }, uuid.value);
    dialog.value.close();
    emit('saved');
  } catch (err) {
    error.value = err.name === 'ValidationError' ? err.errors.join(' ') : store.errorMessage(err);
  } finally {
    saving.value = false;
  }
};
const openMemberEditor = (member = null, index = null) => {
  if (!canEdit.value || viewedCommittee.value?.status !== 'ACTIVE') return;
  memberEditor.value?.open(member, index);
};
const refreshViewedCommittee = () => {
  const committee = store.items.find(item => item.uuid === viewedCommittee.value?.uuid);
  if (committee) viewedCommittee.value = cloneCommittee(committee);
};
const saveMember = async ({ member, index }) => {
  if (!viewedCommittee.value || !canEdit.value) return;
  const members = structuredClone(viewedCommittee.value.members ?? []);
  if (index === null) members.push(member);
  else members.splice(index, 1, member);
  try {
    await store.save({
      company_id: viewedCommittee.value.company_id,
      name: viewedCommittee.value.name,
      type: viewedCommittee.value.type,
      members,
    }, viewedCommittee.value.uuid);
    refreshViewedCommittee();
    memberEditor.value?.finish();
    emit('saved', index === null ? 'Member added.' : 'Member updated.');
  } catch (err) {
    memberEditor.value?.fail(store.errorMessage(err));
  }
};
const removeMember = async ({ member, index }) => {
  if (!viewedCommittee.value || !canEdit.value || !window.confirm(`Remove ${member.name} from this committee?`)) return;
  error.value = '';
  saving.value = true;
  try {
    const members = structuredClone(viewedCommittee.value.members ?? []);
    members.splice(index, 1);
    await store.save({
      company_id: viewedCommittee.value.company_id,
      name: viewedCommittee.value.name,
      type: viewedCommittee.value.type,
      members,
    }, viewedCommittee.value.uuid);
    refreshViewedCommittee();
    emit('saved', 'Member removed.');
  } catch (err) {
    error.value = store.errorMessage(err);
  } finally {
    saving.value = false;
  }
};

defineExpose({ open });
</script>
