<template>
  <div class="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
    <div class="breadcrumbs text-sm text-base-content/60"><ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li>Minimum service delivery standards</li></ul></div>

    <section class="flex flex-col gap-4 rounded-box border border-base-300 bg-base-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><h1 class="text-2xl font-bold">Minimum service delivery standards</h1><p class="mt-1 text-sm text-base-content/60">Manage the standards your entity can select when preparing procurement plan items.</p></div>
      <button v-if="canAdd" type="button" class="btn btn-primary" @click="openEditor()"><Icon name="lucide:plus" />Add standard</button>
    </section>

    <div v-if="store.error || pageError" role="alert" class="alert alert-error"><Icon name="lucide:circle-alert" />{{ pageError || store.error }}</div>
    <div v-if="message" role="status" class="alert alert-success"><Icon name="lucide:circle-check" />{{ message }}</div>

    <section class="rounded-box border border-base-300 bg-base-100">
      <div class="flex flex-col gap-3 border-b border-base-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <input v-model="search" type="search" class="input w-full sm:w-80" placeholder="Search standards…" aria-label="Search standards" />
        <label class="flex items-center gap-2 text-sm"><input v-model="showArchived" type="checkbox" class="checkbox checkbox-sm" />Show archived</label>
      </div>
      <div v-if="store.loading" class="grid min-h-56 place-items-center"><span class="loading loading-spinner loading-lg" /></div>
      <div v-else-if="!filtered.length" class="grid min-h-56 place-items-center px-6 text-center text-base-content/55"><div><Icon name="lucide:badge-check" class="mx-auto mb-3 h-9 w-9" /><p class="font-medium">No service delivery standards found</p><p class="mt-1 text-sm">Add your entity's first standard to make it available in plan-item dropdowns.</p></div></div>
      <div v-else class="overflow-x-auto">
        <table class="table table-zebra">
          <thead><tr><th>Standard</th><th>Description</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
          <tbody><tr v-for="standard in filtered" :key="standard.uuid"><th class="min-w-64 font-semibold">{{ standard.name }}</th><td class="max-w-2xl whitespace-pre-wrap text-sm text-base-content/70">{{ standard.description || '—' }}</td><td><span :class="['badge', standard.status === 'ACTIVE' ? 'badge-success badge-soft' : 'badge-ghost']">{{ standard.status === 'ACTIVE' ? 'Active' : 'Archived' }}</span></td><td><div class="flex justify-end gap-2"><button v-if="canEdit && standard.status === 'ACTIVE'" type="button" class="btn btn-outline btn-sm" @click="openEditor(standard)"><Icon name="lucide:pencil" />Edit</button><button v-if="canDelete && standard.status === 'ACTIVE'" type="button" class="btn btn-error btn-outline btn-sm" :disabled="archiving === standard.uuid" @click="archiveStandard(standard)"><span v-if="archiving === standard.uuid" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:archive" />Archive</button></div></td></tr></tbody>
        </table>
      </div>
    </section>

    <dialog ref="editorDialog" class="modal" @cancel.prevent="closeEditor">
      <div class="modal-box max-w-xl">
        <div class="flex items-start justify-between gap-4"><div><h2 class="text-lg font-bold">{{ editing ? 'Edit' : 'Add' }} service delivery standard</h2><p class="mt-1 text-sm text-base-content/60">This standard will be available only to your procurement entity.</p></div><button type="button" class="btn btn-circle btn-ghost btn-sm" aria-label="Close" @click="closeEditor"><Icon name="lucide:x" /></button></div>
        <form class="mt-5 space-y-4" @submit.prevent="saveStandard">
          <label class="fieldset"><span class="fieldset-legend">Name *</span><input v-model.trim="form.name" class="input w-full" maxlength="255" required /></label>
          <label class="fieldset"><span class="fieldset-legend">Description <span class="text-xs text-base-content/50">(optional)</span></span><textarea v-model.trim="form.description" class="textarea w-full" rows="4" maxlength="5000" /></label>
          <div v-if="formError" role="alert" class="alert alert-error text-sm">{{ formError }}</div>
          <div class="modal-action"><button type="button" class="btn" :disabled="saving" @click="closeEditor">Cancel</button><button type="submit" class="btn btn-primary" :disabled="saving"><span v-if="saving" class="loading loading-spinner loading-xs" />Save standard</button></div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
useHead({ title: 'Minimum service delivery standards' });

const store = useMinimumServiceDeliveryStandardStore();
const { canAccess, canAdd, canEdit, canDelete, guardPage } = useCheckPermission('minimumservicedeliverystandards');
const search = ref('');
const showArchived = ref(false);
const pageError = ref('');
const message = ref('');
const editorDialog = ref(null);
const editing = ref(null);
const saving = ref(false);
const archiving = ref(null);
const formError = ref('');
const form = reactive({ name: '', description: '' });
const filtered = computed(() => store.items.filter(standard => (showArchived.value || standard.status === 'ACTIVE') && `${standard.name} ${standard.description || ''}`.toLowerCase().includes(search.value.toLowerCase())));

const openEditor = (standard = null) => {
  editing.value = standard;
  form.name = standard?.name ?? '';
  form.description = standard?.description ?? '';
  formError.value = '';
  message.value = '';
  editorDialog.value?.showModal();
};
const closeEditor = () => { if (!saving.value) editorDialog.value?.close(); };
const saveStandard = async () => {
  saving.value = true;
  formError.value = '';
  try {
    await store.save({ name: form.name, description: form.description || null }, editing.value?.uuid);
    message.value = 'Minimum service delivery standard saved.';
    editorDialog.value?.close();
  } catch (error) {
    formError.value = store.errorMessage(error);
  } finally {
    saving.value = false;
  }
};
const archiveStandard = async (standard) => {
  if (!window.confirm(`Archive “${standard.name}”? It will remain on existing plan items but cannot be selected for new items.`)) return;
  archiving.value = standard.uuid;
  pageError.value = '';
  try {
    await store.archive(standard.uuid);
    message.value = 'Minimum service delivery standard archived.';
  } catch (error) {
    pageError.value = store.errorMessage(error);
  } finally {
    archiving.value = null;
  }
};

onMounted(async () => {
  if (!canAccess.value) {
    await guardPage(null, 'You are not permitted to manage minimum service delivery standards.');
    return;
  }
  await store.fetchAll();
});
</script>
