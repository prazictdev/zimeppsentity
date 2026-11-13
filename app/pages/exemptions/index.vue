<template>
  <div class="min-h-full bg-base-200/40 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-[1600px] space-y-4">
      <div class="breadcrumbs px-1 text-sm text-base-content/60">
        <ul>
          <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
          <li>Exemption applications</li>
        </ul>
      </div>

      <div v-if="canAccess" class="card border border-base-300 bg-white shadow-sm">
        <div class="card-body gap-0 p-0">
          <div class="flex flex-col gap-4 border-b border-base-200 px-5 py-5 xl:flex-row xl:items-center xl:justify-between sm:px-6">
            <h1 class="text-xl font-bold tracking-tight sm:text-2xl">Exemption applications</h1>
            <div class="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap xl:w-auto xl:flex-nowrap xl:justify-end">
              <input
                v-model="search"
                type="text"
                placeholder="Search by title or plan year..."
                class="input w-full bg-white sm:w-64"
              />
              <select v-model="statusFilter" class="select w-full bg-white sm:w-52">
                <option value="">All statuses</option>
                <option v-for="status in statusOptions" :key="status" :value="status">{{ label(status) }}</option>
              </select>
              <ExemptionsAdd v-if="canAdd" />
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr class="bg-base-200/50 text-base-content/65">
                  <th>APP</th>
                  <th>Title</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredItems.length">
                  <td colspan="5" class="py-12 text-center text-base-content/50">No exemption applications found.</td>
                </tr>
                <tr v-for="row in filteredItems" :key="row.uuid" class="border-base-200 hover:bg-base-200/25">
                  <td>
                    <p class="font-medium">{{ row.plan?.year || '—' }}</p>
                    <p class="text-xs text-base-content/55">Annual procurement plan</p>
                  </td>
                  <td class="font-medium">{{ row.title }}</td>
                  <td>{{ row.items_count ?? row.items?.length ?? 0 }}</td>
                  <td><span class="badge badge-sm" :class="badge(row.status)">{{ label(row.status) }}</span></td>
                  <td class="text-right">
                    <NuxtLink :to="`/exemptions/${row.uuid}`" class="btn btn-ghost btn-sm">
                      <Icon name="lucide:eye" /> View
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div v-else role="alert" class="alert alert-error">You do not have permission to access exemptions.</div>
      <Loader :loading="store.loading" />
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
useHead({ title: 'Exemption applications' });
const store = useExemptionStore();
const { canAccess, canAdd } = useCheckPermission('exemptions');
const search = ref('');
const statusFilter = ref('');
const label = value => ({ PENDING_ADMIN_AUTHORIZATION: 'awaiting admin handler', PENDING_MANAGER_REVIEW: 'awaiting admin reviewer', PENDING_APPROVER_DECISION: 'awaiting admin approver' }[value] || String(value || '').replaceAll('_', ' '));
const badge = status => ({ APPROVED: 'badge-success', DRAFT: 'badge-warning', RETURNED: 'badge-error', PENDING_ADMIN_AUTHORIZATION: 'badge-info', PENDING_MANAGER_REVIEW: 'badge-info', PENDING_APPROVER_DECISION: 'badge-info' }[status] || 'badge-ghost');
const statusOptions = computed(() => [...new Set(store.items.map(item => item.status).filter(Boolean))].sort());
const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase();
  return store.items.filter((item) => {
    const matchesSearch = !term
      || String(item.title || '').toLowerCase().includes(term)
      || String(item.plan?.year || '').toLowerCase().includes(term);
    const matchesStatus = !statusFilter.value || item.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});
onMounted(() => { if (canAccess.value) store.fetchAll(); });
</script>
