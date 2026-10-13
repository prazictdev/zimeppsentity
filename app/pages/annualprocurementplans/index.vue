<template>
  <div class="p-6">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li>Annual Procurement Plans</li>
          </ul>
        </div>
      </div>
    </div>
    <Annualprocurementplans
      v-if="canAccess"
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
