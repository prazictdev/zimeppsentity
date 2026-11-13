<template>
  <div class="min-h-full bg-base-200/40 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-[1600px] space-y-4">
      <div class="breadcrumbs px-1 text-sm text-base-content/60">
        <ul>
          <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
          <li>Tender documents</li>
        </ul>
      </div>

      <Mytenderdocuments
        v-if="canAccess"
        :can-add="canAdd"
        :can-edit="canEdit"
        :can-delete="canDelete"
      />
      <div v-else role="alert" class="alert alert-error alert-soft">
        <Icon name="lucide:alert-circle" />
        <span>You do not have permission to access this page.</span>
      </div>
      <Loader :loading="store.loading" />
    </div>
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
  if (canAccess.value) {
    store.fetchAll();
  }
});
</script>
