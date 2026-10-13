<template>
  <div class="space-y-4 p-2 sm:p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Committees</h1>
        <p class="text-sm text-base-content/60">Create reusable Evaluation, Disposal and PMU committees, then attach them to your annual procurement plans.</p>
      </div>
      <button v-if="canAccess && canAdd" class="btn btn-primary" :disabled="store.loading || !store.companies.length" @click="openEditor()"><Icon name="lucide:plus" />Create committee</button>
    </div>
    <div v-if="!canAccess" role="alert" class="alert alert-error">You do not have permission to access committees.</div>
    <template v-else>
      <div v-if="store.error || error" role="alert" class="alert alert-error">{{ error || store.error }}<button class="btn btn-sm" @click="store.fetchAll">Retry</button></div>
      <div v-if="message" role="status" class="alert alert-success">{{ message }}</div>
      <div class="flex flex-wrap gap-3">
        <input v-model="search" type="search" class="input input-bordered w-full sm:w-72" placeholder="Search committees…" aria-label="Search committees" />
        <select v-model="type" class="select select-bordered" aria-label="Filter committee type"><option value="">All types</option><option value="EVALUATION">Evaluation</option><option value="DISPOSAL">Disposal</option><option value="PMU">PMU</option></select>
        <label class="flex items-center gap-2 text-sm"><input v-model="showArchived" type="checkbox" class="checkbox checkbox-sm" />Show archived</label>
      </div>
      <div v-if="store.loading" class="flex justify-center p-10"><span class="loading loading-spinner" /></div>
      <div v-else-if="!filtered.length" class="rounded-xl border border-dashed border-base-300 p-10 text-center text-base-content/60">No committees found. Create a committee to get started.</div>
      <div v-else class="overflow-x-auto rounded-xl border border-base-200 bg-base-100 shadow-sm">
        <table class="table table-zebra w-full">
          <caption class="sr-only">Committee library</caption>
          <thead><tr><th scope="col">#</th><th scope="col">Committee</th><th scope="col">Organisation</th><th scope="col">Type</th><th scope="col">Members</th><th scope="col">Status</th><th scope="col" class="text-right">Actions</th></tr></thead>
          <tbody>
            <tr v-for="(committee, index) in filtered" :key="committee.uuid">
              <td>{{ index + 1 }}</td>
              <th scope="row" class="font-medium">{{ committee.name }}</th>
              <td>{{ committee.company?.name }}</td>
              <td><span class="badge badge-outline">{{ labels[committee.type] }}</span></td>
              <td>{{ committee.members.length }}</td>
              <td><span :class="['badge', committee.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost']">{{ committee.status === 'ACTIVE' ? 'Active' : 'Archived' }}</span></td>
              <td><div class="flex justify-end gap-2">
                <button class="btn btn-outline btn-sm" @click="openEditor(committee, true)">View</button>
                <button v-if="canEdit && committee.status === 'ACTIVE'" class="btn btn-outline btn-sm" @click="openEditor(committee)">Edit</button>
                <button v-if="canDelete && committee.status === 'ACTIVE'" class="btn btn-outline btn-error btn-sm" :disabled="archiving === committee.uuid" @click="archive(committee)">Archive</button>
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <CommitteesEditor ref="editor" @saved="message = 'Committee saved.'" />
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
useHead({ title: 'Committees' });
const { can, canAdd, canEdit, canDelete } = useCheckPermission('committees')
const canAccess = computed(() => can('can.access.committes'))
const store = useCommitteeStore();
const editor = ref(null);
const search = ref('');
const type = ref('');
const showArchived = ref(false);
const error = ref('');
const message = ref('');
const archiving = ref(null);
const labels = { EVALUATION: 'Evaluation', DISPOSAL: 'Disposal', PMU: 'PMU' };
const filtered = computed(() => store.items.filter(item => (!type.value || item.type === type.value) && (showArchived.value || item.status === 'ACTIVE') && `${item.name} ${item.company?.name}`.toLowerCase().includes(search.value.toLowerCase())));
const openEditor = (committee = null, readonly = false) => { message.value = ''; editor.value?.open(committee, readonly); };
const archive = async (committee) => {
  if (!canDelete.value || !window.confirm(`Archive “${committee.name}”? Copies already attached to APPs will be retained.`)) return;
  error.value = '';
  archiving.value = committee.uuid;
  try { await store.archive(committee.uuid); message.value = 'Committee archived.'; }
  catch (err) { error.value = store.errorMessage(err); }
  finally { archiving.value = null; }
};
onMounted(() => { if (canAccess.value) store.fetchAll(); });
</script>
