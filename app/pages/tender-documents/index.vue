<template>
  <div class="p-6">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li>Tender Documents</li>
          </ul>
        </div>
      </div>
    </div>
    <Tenderdocuments
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
useHead({ title: 'Tender Documents' });

const store = useTenderdocumentStore();
const { canAccess, canAdd, canEdit, canDelete } = useCheckPermission('tender-documents');

onMounted(async () => {
  if (canAccess) {
    store.fetchAll();
  }
});
</script>
