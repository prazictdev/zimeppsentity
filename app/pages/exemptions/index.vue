<template>
  <div class="p-6">
    <div class="breadcrumbs text-sm"><ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li>Exemptions</li></ul></div>
    <div v-if="canAccess" class="card mt-3 border border-base-200"><div class="card-body">
      <div class="flex items-center justify-between border-b border-base-200 pb-3"><div><h1 class="text-xl font-bold">Exemption applications</h1><p class="text-sm text-base-content/60">Prepare exemption items, complete internal review, then submit for admin approval.</p></div><ExemptionsAdd v-if="canAdd" /></div>
      <div class="mt-3 overflow-x-auto"><table class="table table-zebra"><thead><tr><th>APP</th><th>Title</th><th>Items</th><th>Status</th><th></th></tr></thead><tbody><tr v-if="!store.items.length"><td colspan="5" class="text-center text-base-content/50">No exemption applications found.</td></tr><tr v-for="row in store.items" :key="row.uuid"><td>{{ row.plan?.year || '—' }}</td><td class="font-medium">{{ row.title }}</td><td>{{ row.items_count ?? row.items?.length ?? 0 }}</td><td><span class="badge badge-sm" :class="badge(row.status)">{{ label(row.status) }}</span></td><td class="text-right"><NuxtLink :to="`/exemptions/${row.uuid}`" class="btn btn-ghost btn-sm"><Icon name="lucide:eye" /> View</NuxtLink></td></tr></tbody></table></div>
    </div></div>
    <div v-else class="alert alert-error mt-3">You do not have permission to access exemptions.</div>
    <Loader :loading="store.loading" />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
useHead({ title: 'Exemption applications' });
const store = useExemptionStore();
const { canAccess, canAdd } = useCheckPermission('exemptions');
const label = value => ({ PENDING_ADMIN_AUTHORIZATION: 'awaiting admin handler', PENDING_MANAGER_REVIEW: 'awaiting admin reviewer', PENDING_APPROVER_DECISION: 'awaiting admin approver' }[value] || String(value || '').replaceAll('_', ' '));
const badge = status => ({ APPROVED: 'badge-success', DRAFT: 'badge-warning', RETURNED: 'badge-error', PENDING_ADMIN_AUTHORIZATION: 'badge-info', PENDING_MANAGER_REVIEW: 'badge-info', PENDING_APPROVER_DECISION: 'badge-info' }[status] || 'badge-ghost');
onMounted(() => { if (canAccess.value) store.fetchAll(); });
</script>
