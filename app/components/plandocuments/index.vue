<template>
  <div>
    <div v-if="store.planDocumentsLoading" class="flex justify-center py-10">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else>
      <table class="table table-zebra mt-3 w-full text-sm">
        <thead>
          <tr>
            <th>#</th>
            <th>Document</th>
            <th>Description</th>
            <th>Status</th>
            <th>Uploaded By</th>
            <th>Uploaded At</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!store.planDocuments.length">
            <td colspan="7" class="text-center text-base-content/50">
              No document requirements defined for this plan's year. Ask an administrator to set them up under Document Requirement Years.
            </td>
          </tr>
          <tr v-for="(d, i) in store.planDocuments" :key="d.document_id">
            <td>{{ i + 1 }}</td>
            <td>
              <div class="flex items-center gap-2">
                <span>{{ d.name }}</span>
              </div>
              <div v-if="d.notes" class="text-xs text-base-content/60">{{ d.notes }}</div>
            </td>
            <td class="max-w-xs truncate" :title="d.description">{{ d.description || '—' }}</td>
            <td>
              <span
                v-if="uploadingId === d.document_id"
                class="badge badge-sm badge-info gap-1"
              >
                <span class="loading loading-spinner loading-xs" />
                Uploading...
              </span>
              <span v-else :class="['badge badge-sm', d.upload ? 'badge-success' : 'badge-ghost']">
                {{ d.upload ? 'Uploaded' : 'Pending' }}
              </span>
              <div v-if="d.upload && uploadingId !== d.document_id" class="mt-1 text-xs text-base-content/60">{{ d.upload.filename }}</div>
            </td>
            <td>{{ d.upload?.uploader?.name || '—' }}</td>
            <td>{{ d.upload?.uploaded_at ? new Date(d.upload.uploaded_at).toLocaleString() : '—' }}</td>
            <td class="text-right">
              <div class="flex justify-end gap-1">
                <PlandocumentsViewer
                  v-if="d.upload"
                  :plan-uuid="planUuid"
                  :document-uuid="d.upload.uuid"
                  :url="d.upload.url || ''"
                  :name="d.name"
                  :filename="d.upload.filename"
                  :mime-type="d.upload.mime_type"
                />
                <label
                  v-if="canEdit"
                  :class="['btn btn-info btn-xs', uploadingId === d.document_id ? 'btn-disabled' : 'cursor-pointer']"
                >
                  <span v-if="uploadingId === d.document_id" class="loading loading-spinner loading-xs" />
                  <Icon v-else :name="d.upload ? 'lucide:refresh-ccw' : 'lucide:upload'" />
                  <input
                    type="file"
                    class="hidden"
                    :disabled="uploadingId === d.document_id"
                    @change="onFileChange($event, d)"
                  />
                </label>
                <button
                  v-if="d.upload && canDelete"
                  class="btn btn-error btn-xs"
                  :disabled="uploadingId === d.document_id"
                  @click="confirmRemove(d)"
                >
                  <Icon name="lucide:trash-2" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="mt-2 text-xs text-base-content/60">
        Allowed file types: PDF, JPG/PNG, DOC/DOCX, XLS/XLSX. Max 20 MB per file.
      </p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
});

const store = useAnnualprocurementplanStore();
const uploadingId = ref(null);

const onFileChange = async (event, d) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  uploadingId.value = d.document_id;
  try {
    await store.uploadDocumentForPlan(props.planUuid, d.document_id, file);
  } finally {
    uploadingId.value = null;
  }
};

const confirmRemove = async (d) => {
  if (!d.upload?.uuid) return;
  if (!window.confirm(`Remove the uploaded "${d.name}"?`)) return;
  await store.removePlanDocument(props.planUuid, d.upload.uuid);
};

onMounted(() => store.fetchPlanDocuments(props.planUuid));
</script>
