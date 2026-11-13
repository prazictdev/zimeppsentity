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
          <div class="flex flex-col gap-4 border-b border-base-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h1 class="text-xl font-bold tracking-tight sm:text-2xl">Exemption applications</h1>
              <p class="mt-1 max-w-2xl text-sm text-base-content/60">Prepare exemption items, complete internal review and submit them for authorization.</p>
            </div>
            <ExemptionsAdd v-if="canAdd" />
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
                <tr v-if="!store.items.length">
                  <td colspan="5" class="py-12 text-center text-base-content/50">No exemption applications found.</td>
                </tr>
                <tr v-for="row in store.items" :key="row.uuid" class="border-base-200 hover:bg-base-200/25">
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
const label = value => ({ PENDING_ADMIN_AUTHORIZATION: 'awaiting admin handler', PENDING_MANAGER_REVIEW: 'awaiting admin reviewer', PENDING_APPROVER_DECISION: 'awaiting admin approver' }[value] || String(value || '').replaceAll('_', ' '));
const badge = status => ({ APPROVED: 'badge-success', DRAFT: 'badge-warning', RETURNED: 'badge-error', PENDING_ADMIN_AUTHORIZATION: 'badge-info', PENDING_MANAGER_REVIEW: 'badge-info', PENDING_APPROVER_DECISION: 'badge-info' }[status] || 'badge-ghost');
onMounted(() => { if (canAccess.value) store.fetchAll(); });
</script>
