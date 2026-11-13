<template>
  <div class="min-h-full bg-base-200/40 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-[1600px]">
      <div class="breadcrumbs px-1 text-sm text-base-content/60">
        <ul>
          <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
          <li>Annual procurement plans</li>
        </ul>
      </div>
      <Annualprocurementplans
        v-if="canAccess"
        :can-add="canAdd"
        :can-edit="canEdit"
        :can-delete="canDelete"
      />
      <div v-else role="alert" class="alert alert-error mt-4">
        <Icon name="lucide:alert-circle" />
        <span>You do not have permission to access this page.</span>
      </div>
    </div>
    <Loader :loading="store.loading" />
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
useHead({ title: 'Annual Procurement Plans' });

const store = useAnnualprocurementplanStore();
const { canAccess, canAdd, canEdit, canDelete } = useCheckPermission('annualprocurementplans');

onMounted(async () => {
  if (canAccess) {
    store.fetchAll();
  }
});
</script>
