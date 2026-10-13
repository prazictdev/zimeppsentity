<template>
  <div class="card mt-3 border border-base-200">
    <div class="card-body">
      <div class="flex items-center justify-between border-b border-base-200 pb-2">
        <div>
          <span class="text-lg font-bold">Tender Documents</span>
          <p class="text-xs text-base-content/60">Global documents from admin + your entity's own.</p>
        </div>
        <TenderdocumentsAdd v-if="canAdd" />
      </div>

      <div v-if="store.loading" class="flex justify-center py-10">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
      <div v-else>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <input
            v-model="search"
            type="text"
            placeholder="Search documents..."
            class="input input-bordered w-full max-w-xs"
          />
          <select v-model="scopeFilter" class="select select-bordered max-w-xs">
            <option value="">All scopes</option>
            <option value="global">Global (admin)</option>
            <option value="mine">My entity</option>
          </select>
          <select v-model="typeFilter" class="select select-bordered max-w-xs">
            <option value="">All types</option>
            <option value="REQUEST">Request (bidder uploads)</option>
            <option value="PROVIDE">Provide (at tender prep)</option>
          </select>
          <select v-model="statusFilter" class="select select-bordered max-w-xs">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <table class="table table-zebra mt-3 w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Scope</th>
              <th>Type</th>
              <th>Expires</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filtered.length">
              <td colspan="7" class="text-center text-base-content/50">No tender documents found.</td>
            </tr>
            <tr v-for="(item, i) in filtered" :key="item.id">
              <td>{{ i + 1 }}</td>
              <td>
                <div class="font-semibold">{{ item.name }}</div>
                <div v-if="item.description" class="text-xs opacity-60">{{ item.description }}</div>
              </td>
              <td>
                <span :class="['badge badge-sm', item.company_id ? 'badge-primary' : 'badge-neutral']">
                  {{ item.company_id ? 'Mine' : 'Global' }}
                </span>
              </td>
              <td>
                <span :class="['badge badge-sm', item.type === 'REQUEST' ? 'badge-warning' : 'badge-info']">
                  {{ item.type }}
                </span>
              </td>
              <td>
                <span :class="['badge badge-sm', item.expires === 'Y' ? 'badge-warning' : 'badge-ghost']">
                  {{ item.expires === 'Y' ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>
                <span :class="['badge badge-sm', item.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost']">
                  {{ item.status }}
                </span>
              </td>
              <td class="text-right">
                <div class="flex justify-end gap-2">
                  <template v-if="item.company_id">
                    <TenderdocumentsEdit v-if="canEdit" :item="item" />
                    <TenderdocumentsDelete v-if="canDelete && item.status === 'ACTIVE'" :item="item" />
                  </template>
                  <span v-else class="text-xs opacity-50">Admin-managed</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
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
