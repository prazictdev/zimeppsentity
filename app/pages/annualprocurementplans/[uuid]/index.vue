<template>
  <div class="w-full">
    <div class="breadcrumbs text-sm text-base-content/55"><ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li><NuxtLink to="/annualprocurementplans">Annual Procurement Plans</NuxtLink></li><li>{{ store.currentPlan ? `${store.currentPlan.year} · ${store.currentPlan.company?.name ?? ''}` : '...' }}</li></ul></div>

    <AnnualprocurementplansDetail
      v-if="canAccess"
      :plan-uuid="planUuid"
      :can-add="canAdd"
      :can-edit="canEdit"
      :can-delete="canDelete"
    />
    <div v-else>
      <div role="alert" class="alert alert-error mt-3">
        <Icon name="lucide:alert-circle" />
        <span>You do not have permission to access this page.</span>
      </div>
    </div>
    <Loader :loading="store.currentPlanLoading" />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', fullWidth: true, sanctum: { authOnly: true } });

const route = useRoute();
const planUuid = computed(() => String(route.params.uuid));

const store = useAnnualprocurementplanStore();
const { canAccess, canAdd, canEdit, canDelete } = useCheckPermission('annualprocurementplans');

useHead({ title: () => `Annual Procurement Plan: ${store.currentPlan?.year ?? ''}` });

onMounted(async () => {
  if (!canAccess) return;
  await Promise.all([
    store.fetchPlan(planUuid.value),
    store.fetchPlanItems(planUuid.value, { page: 1 }),
    store.fetchItemTotals(planUuid.value),
    store.fetchItemTotalsByGroup(planUuid.value),
    store.fetchItemTotalsByFlag(planUuid.value),
    store.fetchItemTotalsByAwardType(planUuid.value),
    store.fetchUnresolved(planUuid.value),
    store.fetchDisposalplans(planUuid.value),
    store.fetchWorkflowActions(planUuid.value),
    store.fetchTransitions(planUuid.value),
    store.fetchPlanInvoice(planUuid.value),
  ]);
});
</script>
