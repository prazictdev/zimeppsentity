<template>
  <div class="p-6">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="breadcrumbs text-sm"><ul><li><NuxtLink to="/exemptions">Exemptions</NuxtLink></li><li><NuxtLink :to="exemptionPath">{{ exemption?.title || 'Application' }}</NuxtLink></li><li>Add items</li></ul></div>
      <NuxtLink :to="exemptionPath" class="btn btn-ghost btn-sm"><Icon name="lucide:arrow-left" />Back to exemption</NuxtLink>
    </div>
    <AnnualprocurementplansItemAdd v-if="editable && exemption?.plan?.uuid" :plan-uuid="exemption.plan.uuid" :exemption-uuid="String(route.params.uuid)" />
    <div v-else-if="exemption && !editable" class="alert alert-warning">Only the creator can add items while the exemption application is in draft or returned status.</div>
    <Loader :loading="store.loading" />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
useHead({ title: 'Add Exemption Items' });
const route = useRoute();
const store = useExemptionStore();
const exemption = computed(() => store.current);
const exemptionPath = computed(() => `/exemptions/${route.params.uuid}`);
const editable = computed(() => ['DRAFT', 'RETURNED'].includes(exemption.value?.status));
onMounted(() => store.fetchOne(route.params.uuid));
</script>
