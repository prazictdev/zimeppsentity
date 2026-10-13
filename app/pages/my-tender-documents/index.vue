<template>
  <div class="p-6">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li>My Tender Documents</li>
          </ul>
        </div>
      </div>
    </div>
    <Mytenderdocuments
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
useHead({ title: 'My Tender Documents' });

const store = useTenderdocumentStore();
// PE-only permission slug — these permissions are seeded against PE roles
// only and do NOT exist on the admin side. The combined /tender-documents
// page (browse + globals) keeps its own broader `tender-documents` slug.
const { canAccess, canAdd, canEdit, canDelete } = useCheckPermission('my-tender-documents');

onMounted(async () => {
  if (canAccess) {
    store.fetchAll();
  }
});
</script>
