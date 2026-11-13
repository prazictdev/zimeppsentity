<template>
  <section class="card border border-base-300 bg-white shadow-sm">
    <div class="card-body gap-0 p-0">
      <div class="flex flex-col gap-4 border-b border-base-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-box bg-primary/10 text-primary">
            <Icon name="lucide:files" class="h-5 w-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight sm:text-2xl">Tender documents</h1>
            <p class="text-xs text-base-content/55">{{ filtered.length }} of {{ store.items.length }} documents</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-outline" @click="openFilters">
            <Icon name="lucide:list-filter" class="h-4 w-4" />
            Search &amp; filters
            <span v-if="activeFilterCount" class="badge badge-neutral badge-sm">{{ activeFilterCount }}</span>
          </button>
          <MytenderdocumentsAdd v-if="canAdd" />
        </div>
      </div>

      <dialog id="tender_document_filters" ref="filterDialog" class="modal modal-bottom sm:modal-middle">
        <div class="modal-box max-w-xl p-0">
          <div class="flex items-center justify-between border-b border-base-200 px-5 py-4">
            <div>
              <h2 class="text-lg font-bold">Search and filter documents</h2>
              <p class="text-sm text-base-content/55">Narrow the catalog by ownership, document type, or status.</p>
            </div>
            <form method="dialog">
              <button class="btn btn-ghost btn-circle btn-sm" aria-label="Close filters">
                <Icon name="lucide:x" class="h-4 w-4" />
              </button>
            </form>
          </div>

          <div class="space-y-4 px-5 py-5">
            <div>
              <label for="document-filter-search" class="mb-1.5 block text-sm font-medium">Search</label>
              <label class="input w-full">
                <Icon name="lucide:search" class="h-4 w-4 text-base-content/45" />
                <input id="document-filter-search" v-model="search" type="search" placeholder="Document name or description" />
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="document-filter-scope" class="mb-1.5 block text-sm font-medium">Scope</label>
                <select id="document-filter-scope" v-model="scopeFilter" class="select w-full">
                  <option value="">All scopes</option>
                  <option value="global">Global templates</option>
                  <option value="mine">My entity</option>
                </select>
              </div>
              <div>
                <label for="document-filter-type" class="mb-1.5 block text-sm font-medium">Required from</label>
                <select id="document-filter-type" v-model="typeFilter" class="select w-full">
                  <option value="">All types</option>
                  <option value="REQUEST">Bidder uploads</option>
                  <option value="PROVIDE">Entity provides</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label for="document-filter-status" class="mb-1.5 block text-sm font-medium">Status</label>
                <select id="document-filter-status" v-model="statusFilter" class="select w-full">
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-action mt-0 border-t border-base-200 px-5 py-4">
            <button type="button" class="btn btn-ghost mr-auto" :disabled="!activeFilterCount" @click="clearFilters">
              Clear filters
            </button>
            <form method="dialog">
              <button class="btn btn-primary">Show {{ filtered.length }} {{ filtered.length === 1 ? 'document' : 'documents' }}</button>
            </form>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button>Close filters</button>
        </form>
      </dialog>

      <div v-if="store.loading" class="flex justify-center py-14">
        <span class="loading loading-spinner loading-lg" />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="table w-full text-sm">
          <thead>
            <tr class="bg-base-200/50 text-base-content/65">
              <th>#</th>
              <th>Document</th>
              <th>Scope</th>
              <th>Required from</th>
              <th>Expiry required</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filtered.length">
              <td colspan="7" class="py-14 text-center">
                <div class="mx-auto flex max-w-sm flex-col items-center gap-2 text-base-content/55">
                  <Icon name="lucide:file-search" class="h-8 w-8" />
                  <p class="font-medium text-base-content/70">No matching documents</p>
                  <p class="text-xs">Adjust the filters or add a document for your procurement entity.</p>
                </div>
              </td>
            </tr>
            <tr v-for="(item, i) in filtered" :key="item.id" class="border-base-200 hover:bg-base-200/25">
              <td>{{ i + 1 }}</td>
              <td>
                <div class="flex min-w-64 items-center gap-3">
                  <div
                    :class="[
                      'grid h-9 w-9 shrink-0 place-items-center rounded-box',
                      item.company_id ? 'bg-primary/10 text-primary' : 'bg-base-200 text-base-content/55',
                    ]"
                  >
                    <Icon :name="item.type === 'REQUEST' ? 'lucide:file-up' : 'lucide:file-down'" class="h-4 w-4" />
                  </div>
                  <div>
                    <p class="font-semibold">{{ item.name }}</p>
                    <p v-if="item.description" class="max-w-md truncate text-xs text-base-content/55" :title="item.description">
                      {{ item.description }}
                    </p>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['badge badge-sm badge-soft', item.company_id ? 'badge-primary' : 'badge-neutral']">
                  {{ item.company_id ? 'My entity' : 'Global' }}
                </span>
              </td>
              <td>
                <span :class="['badge badge-sm badge-soft', item.type === 'REQUEST' ? 'badge-warning' : 'badge-info']">
                  {{ item.type === 'REQUEST' ? 'Bidder' : 'Entity' }}
                </span>
              </td>
              <td>
                <span :class="['badge badge-sm badge-soft', item.expires === 'Y' ? 'badge-warning' : 'badge-ghost']">
                  {{ item.expires === 'Y' ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>
                <span :class="['badge badge-sm badge-soft', item.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost']">
                  {{ item.status }}
                </span>
              </td>
              <td class="text-right">
                <div class="flex justify-end gap-2">
                  <template v-if="item.company_id">
                    <MytenderdocumentsEdit v-if="canEdit" :item="item" />
                    <MytenderdocumentsDelete v-if="canDelete && item.status === 'ACTIVE'" :item="item" />
                  </template>
                  <span v-else class="inline-flex items-center gap-1 text-xs text-base-content/45">
                    <Icon name="lucide:lock" class="h-3.5 w-3.5" />
                    Global template
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
const store = useTenderdocumentStore();
const search = ref('');
const typeFilter = ref('');
const statusFilter = ref('');
const scopeFilter = ref('');
const filterDialog = ref(null);

defineProps({
  canAdd: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
});

const activeFilterCount = computed(() => [search.value, typeFilter.value, statusFilter.value, scopeFilter.value].filter(Boolean).length);
const openFilters = () => filterDialog.value?.showModal();
const clearFilters = () => {
  search.value = '';
  typeFilter.value = '';
  statusFilter.value = '';
  scopeFilter.value = '';
};

const filtered = computed(() =>
  store.items.filter((i) => {
    const q = search.value.toLowerCase();
    const matchesSearch = !q
      || (i.name?.toLowerCase().includes(q))
      || (i.description?.toLowerCase().includes(q));
    const matchesType = !typeFilter.value || i.type === typeFilter.value;
    const matchesStatus = !statusFilter.value || i.status === statusFilter.value;
    const matchesScope = !scopeFilter.value
      || (scopeFilter.value === 'global' && !i.company_id)
      || (scopeFilter.value === 'mine' && !!i.company_id);
    return matchesSearch && matchesType && matchesStatus && matchesScope;
  }),
);
</script>
