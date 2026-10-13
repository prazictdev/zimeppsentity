<template>
  <div class="min-w-0 space-y-4 p-6">
    <div class="card outline card-xs outline-1 outline-base-200"><div class="card-body"><div class="breadcrumbs text-sm"><ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li><NuxtLink to="/supplements">Supplements</NuxtLink></li><li><NuxtLink :to="detailPath">{{ supplement?.title || 'Supplement' }}</NuxtLink></li><li>Add items</li></ul></div></div></div>
    <NuxtLink :to="detailPath" class="btn btn-ghost btn-sm"><Icon name="lucide:arrow-left" />Back to supplement</NuxtLink>
    <div v-if="loading" class="flex justify-center py-10"><span class="loading loading-spinner loading-lg"></span></div>
    <div v-else-if="loadError" class="alert alert-error">{{ loadError }}</div>
    <AnnualprocurementplansItemAdd v-else-if="canAddItems" :plan-uuid="planUuid" :supplement-uuid="supplementUuid" @uploaded="returnToSupplement" />
    <div v-else class="alert alert-warning">Only the requester can add items while the supplement is in draft.</div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true }, key: route => route.fullPath });

const route = useRoute();
const router = useRouter();
const store = useAnnualprocurementplanStore();
const planUuid = computed(() => String(route.params.planUuid));
const supplementUuid = computed(() => String(route.params.uuid));
const detailPath = computed(() => `/supplements/${planUuid.value}/${supplementUuid.value}`);
const supplement = computed(() => store.currentSupplement);
const canAddItems = computed(() => supplement.value?.status === 'DRAFT' && store.supplementIsCreator);
const loading = ref(true);
const loadError = ref('');

useHead({ title: 'Add supplement items' });
const returnToSupplement = () => router.push(detailPath.value);

onMounted(async () => {
  store.currentSupplement = null;
  try {
    await store.fetchSupplement(planUuid.value, supplementUuid.value);
    if (!store.currentSupplement) loadError.value = 'The supplement could not be found.';
  } catch {
    loadError.value = 'Unable to load the supplement. Please reload the page to try again.';
  } finally {
    loading.value = false;
  }
});
</script>
