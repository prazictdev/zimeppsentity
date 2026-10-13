<template>
  <div class="mb-4 rounded-xl border border-base-200 bg-base-100 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div><h3 class="font-semibold">Saved {{ label }} committee</h3><p class="text-sm text-base-content/60">{{ attachment ? `Last attached: ${attachment.name}` : 'Attach a committee from your organisation’s library.' }}</p></div>
      <button v-if="canEdit && canAccess" type="button" class="btn btn-outline btn-sm" @click="open"><Icon name="lucide:link" />Attach committee</button>
    </div>
    <p v-if="attachment" class="mt-2 text-xs text-base-content/60">The members below are the APP’s own copy. Library edits do not change this plan.</p>
    <div v-if="message" role="status" class="mt-2 text-sm text-success">{{ message }}</div>
    <div v-if="error" role="alert" class="mt-2 text-sm text-error">{{ error }}</div>
    <dialog ref="dialog" class="modal">
      <div class="modal-box max-w-xl">
        <h3 class="text-lg font-bold">Attach {{ label }} committee</h3>
        <div v-if="loading" class="py-8 text-center"><span class="loading loading-spinner" /></div>
        <template v-else>
          <div v-if="error" role="alert" class="alert alert-error mt-3">{{ error }}</div>
          <label class="fieldset mt-3"><span class="fieldset-legend">Committee</span><select v-model="selected" class="select select-bordered w-full" :disabled="saving"><option value="" disabled>Select a committee</option><option v-for="committee in available" :key="committee.uuid" :value="committee.uuid">{{ committee.name }} ({{ committee.members.length }} members)</option></select></label>
          <p v-if="!available.length" class="mt-2 text-sm">No active {{ label }} committees available. <NuxtLink to="/committees" class="link link-primary">Open the committee library</NuxtLink>.</p>
          <div v-if="selectedCommittee" class="mt-3 overflow-x-auto rounded-lg border border-base-200">
            <table class="table table-sm w-full">
              <caption class="sr-only">Selected committee members</caption>
              <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Designation</th></tr></thead>
              <tbody><tr v-for="member in selectedCommittee.members" :key="member.email"><td>{{ member.name }}</td><td>{{ member.email }}</td><td>{{ member.designation || '—' }}</td></tr></tbody>
            </table>
          </div>
          <label v-if="existingCount > 0" class="mt-4 flex items-start gap-3 rounded-lg bg-warning/10 p-3 text-sm"><input v-model="replace" type="checkbox" class="checkbox checkbox-sm" :disabled="saving" /><span>Replace the {{ existingCount }} existing member(s), including their qualifications and work history, with this saved committee.</span></label>
          <p class="mt-3 text-xs text-base-content/60">A copy is attached to this APP. To change or remove members, update the saved committee and attach it again.</p>
        </template>
        <div class="modal-action"><button class="btn" :disabled="saving" @click="dialog.close()">Cancel</button><button class="btn btn-primary" :disabled="loading || saving || !selected || (existingCount > 0 && !replace)" @click="attach"><span v-if="saving" class="loading loading-spinner loading-xs" />Attach</button></div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({ planUuid: { type: String, required: true }, type: { type: String, required: true }, canEdit: Boolean, memberCount: { type: Number, default: 0 } });
const { can } = useCheckPermission()
const canAccess = computed(() => can('can.access.committes'))
const api = useCommitteeHelper();
const { getCommitteeMembers, getPmuMembers, getDisposalcommitteeMembers } = useAnnualprocurementplanHelper();
const library = useCommitteeStore();
const store = useAnnualprocurementplanStore();
const dialog = ref(null);
const choices = ref([]);
const selected = ref('');
const replace = ref(false);
const existingCount = ref(0);
const loading = ref(false);
const saving = ref(false);
const attachment = ref(null);
const error = ref('');
const message = ref('');
const label = computed(() => ({ EVALUATION: 'Evaluation', DISPOSAL: 'Disposal', PMU: 'PMU' })[props.type]);
const available = computed(() => choices.value.filter(item => item.type === props.type && item.status === 'ACTIVE' && item.company_id === store.currentPlan?.company_id));
const selectedCommittee = computed(() => available.value.find(item => item.uuid === selected.value));
const loadAttachment = async () => {
  try { const result = await api.attachments(props.planUuid); attachment.value = result.data?.find(item => item.type === props.type) ?? null; }
  catch (err) { error.value = library.errorMessage(err); }
};
const open = async () => {
  error.value = ''; message.value = ''; selected.value = ''; replace.value = false; loading.value = true;
  dialog.value.showModal();
  try {
    const fetchMembers = { EVALUATION: getCommitteeMembers, PMU: getPmuMembers, DISPOSAL: getDisposalcommitteeMembers }[props.type];
    const [committees, members] = await Promise.all([api.list(), fetchMembers(props.planUuid, { page: 1, per_page: 10 })]);
    if (members.error.value) throw members.error.value;
    existingCount.value = members.data.value.data.total;
    choices.value = committees.data ?? [];
  }
  catch (err) { choices.value = []; error.value = library.errorMessage(err); }
  finally { loading.value = false; }
};
const attach = async () => {
  if (!props.canEdit || !canAccess.value || saving.value) return;
  saving.value = true; error.value = '';
  try {
    await store.attachSavedCommittee(props.planUuid, { committee_uuid: selected.value, type: props.type, replace: replace.value });
    await loadAttachment();
    message.value = 'Committee attached.';
    dialog.value.close();
  } catch (err) { error.value = library.errorMessage(err); }
  finally { saving.value = false; }
};
watch(() => [props.planUuid, props.type], loadAttachment, { immediate: true });
</script>
