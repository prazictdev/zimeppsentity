<template>
  <section class="card border border-base-300 bg-white shadow-sm">
    <div class="card-body gap-0 p-0">
      <div class="flex flex-col gap-4 border-b border-base-200 px-5 py-5 2xl:flex-row 2xl:items-center 2xl:justify-between sm:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-box bg-primary/10 text-primary">
            <Icon name="lucide:files" class="h-5 w-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight sm:text-2xl">Tender documents</h1>
            <p class="text-xs text-base-content/55">{{ filtered.length }} of {{ store.items.length }} documents</p>
          </div>
        </div>

        <div class="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap 2xl:w-auto 2xl:flex-nowrap 2xl:justify-end">
          <label class="input w-full bg-white sm:w-64">
            <Icon name="lucide:search" class="h-4 w-4 text-base-content/45" />
            <input
              v-model="search"
              type="search"
              placeholder="Search documents..."
            />
          </label>
          <select v-model="scopeFilter" class="select w-full bg-white sm:w-40">
            <option value="">All scopes</option>
            <option value="global">Global templates</option>
            <option value="mine">My entity</option>
          </select>
          <select v-model="typeFilter" class="select w-full bg-white sm:w-44">
            <option value="">All types</option>
            <option value="REQUEST">Bidder uploads</option>
            <option value="PROVIDE">Entity provides</option>
          </select>
          <select v-model="statusFilter" class="select w-full bg-white sm:w-40">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <MytenderdocumentsAdd v-if="canAdd" />
        </div>
      </div>

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

defineProps({
  canAdd: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
});

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
