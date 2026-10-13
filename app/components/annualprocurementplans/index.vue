<template>
  <div class="card mt-3 border border-base-200">
    <div class="card-body">
      <div class="flex items-center justify-between border-b border-base-200 pb-2">
        <span class="text-lg font-bold">Annual Procurement Plans</span>
        <AnnualprocurementplansAdd v-if="canAdd" />
      </div>

      <div v-if="store.loading" class="flex justify-center py-10">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <input
            v-model="search"
            type="text"
            placeholder="Search by company or year..."
            class="input input-bordered w-full max-w-xs"
          />
          <select v-model="statusFilter" class="select select-bordered max-w-xs">
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <table class="table table-zebra mt-3 w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Year</th>
              <th>Company</th>
              <th>Procurement Class</th>
              <th>Currency</th>
              <th class="text-right">Items</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filtered.length">
              <td colspan="8" class="text-center text-base-content/50">No annual procurement plans found.</td>
            </tr>
            <tr v-for="(plan, i) in filtered" :key="plan.id">
              <td>{{ i + 1 }}</td>
              <td class="font-medium">{{ plan.year }}</td>
              <td>{{ plan.company?.name ?? '—' }}</td>
              <td>{{ plan.procurementclass?.name ?? '—' }}</td>
              <td>{{ plan.currency?.code ?? '—' }}</td>
              <td class="text-right font-mono">{{ plan.items_count ?? 0 }}</td>
              <td>
                <span :class="['badge badge-sm', statusBadge(plan.status)]">{{ plan.status }}</span>
              </td>
              <td class="text-right">
                <div class="flex justify-end gap-2">
                  <NuxtLink :to="`/annualprocurementplans/${plan.uuid}`" class="btn btn-ghost btn-sm">
                    <Icon name="lucide:eye" />
                    <span class="hidden md:block">View</span>
                  </NuxtLink>
                  <AnnualprocurementplansEdit v-if="canEdit && store.isDraft(plan)" :item="plan" />
                  <AnnualprocurementplansDelete
                    v-if="canDelete && store.isDraft(plan) && Number(plan.items_count ?? 0) === 0"
                    :item="plan"
                  />
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
const store = useAnnualprocurementplanStore();
const search = ref('');
const statusFilter = ref('');

defineProps({
  canAdd: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
});

const statusBadge = (status) => {
  if (status === 'ACTIVE') return 'badge-success';
  if (status === 'DRAFT') return 'badge-warning';
  return 'badge-ghost';
};

const filtered = computed(() =>
  store.items.filter((p) => {
    const term = search.value.toLowerCase();
    const matchesSearch =
      !term ||
      String(p.year ?? '').includes(term) ||
      (p.company?.name ?? '').toLowerCase().includes(term) ||
      (p.procurementclass?.name ?? '').toLowerCase().includes(term);
    const matchesStatus = !statusFilter.value || p.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  }),
);
</script>
