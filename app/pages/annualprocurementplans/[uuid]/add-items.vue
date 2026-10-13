<template>
  <div class="min-w-0 space-y-4 p-6">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li><NuxtLink to="/annualprocurementplans">Annual Procurement Plans</NuxtLink></li>
            <li><NuxtLink :to="planPath">{{ planLabel }}</NuxtLink></li>
            <li>Add items</li>
          </ul>
        </div>
      </div>
    </div>

    <NuxtLink :to="planPath" class="btn btn-ghost btn-sm"><Icon name="lucide:arrow-left" />Back to plan</NuxtLink>

    <div v-if="!canAccess || !canAdd" role="alert" class="alert alert-error">
      You do not have permission to add plan items.
    </div>
    <div v-else-if="loading" class="flex justify-center py-10" role="status">
      <span class="loading loading-spinner loading-lg"></span>
      <span class="sr-only">Loading plan…</span>
    </div>
    <div v-else-if="loadError" role="alert" class="alert alert-error">{{ loadError }}</div>
    <div v-else-if="!store.currentPlan" role="alert" class="alert alert-error">The annual procurement plan could not be loaded.</div>
    <AnnualprocurementplansItemAdd v-else-if="canAddItems" :plan-uuid="planUuid" />
    <div v-else role="alert" class="alert alert-warning">Only the creator of a draft plan can add items.</div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true }, key: route => route.fullPath });

const route = useRoute();
const planUuid = computed(() => String(route.params.uuid));
const planPath = computed(() => `/annualprocurementplans/${planUuid.value}`);
const store = useAnnualprocurementplanStore();
const { canAccess, canAdd } = useCheckPermission('annualprocurementplans');
const loading = ref(true);
const loadError = ref('');
const planLabel = computed(() => loading.value ? 'Plan' : `${store.currentPlan?.year ?? 'Plan'} · ${store.currentPlan?.company?.name ?? ''}`);
const canAddItems = computed(() => store.isDraft(store.currentPlan) && store.workflowIsCreator);

useHead({ title: 'Add items · Annual Procurement Plan' });

onMounted(async () => {
  if (!canAccess.value || !canAdd.value) { loading.value = false; return; }
  store.workflowIsCreator = false;
  try {
    await Promise.all([store.fetchPlan(planUuid.value), store.fetchWorkflowActions(planUuid.value)]);
  } catch {
    loadError.value = 'Unable to load the plan. Please reload the page to try again.';
  } finally {
    loading.value = false;
  }
});
</script>
