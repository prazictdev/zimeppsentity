<template>
  <div class="card mt-4 border border-base-300 bg-white shadow-sm">
    <div class="card-body gap-0 p-0">
      <div class="flex flex-col gap-4 border-b border-base-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-base-content sm:text-2xl">Annual procurement plans</h1>
          <p class="mt-1 max-w-2xl text-sm text-base-content/60">Prepare, review and track the plans linked to your procurement entity.</p>
        </div>
        <AnnualprocurementplansAdd v-if="canAdd" />
      </div>

      <div v-if="store.loading" class="flex justify-center py-10">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else>
        <div class="grid gap-3 border-b border-base-200 bg-base-200/35 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:max-w-2xl">
          <input
            v-model="search"
            type="text"
            placeholder="Search by company or year..."
            class="input input-bordered w-full bg-white"
          />
          <select v-model="statusFilter" class="select select-bordered w-full bg-white">
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr class="bg-base-200/50 text-base-content/65">
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
            <tr v-for="(plan, i) in filtered" :key="plan.id" class="border-base-200 hover:bg-base-200/25">
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
