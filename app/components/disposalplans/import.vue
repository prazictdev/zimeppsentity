<template>
  <div>
    <button class="btn btn-outline btn-sm" @click="openModal">
      <Icon name="lucide:upload" />
      <span class="hidden md:block">Import</span>
    </button>

    <dialog id="import_disposalplan_modal" class="modal">
      <div class="modal-box max-w-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">Import Disposal Items</h3>
          <button class="btn btn-ghost btn-circle" @click="closeModal">
            <Icon name="lucide:x" />
          </button>
        </div>

        <p class="mt-2 text-sm text-base-content/60">
          Upload an Excel (.xlsx, .xls) or CSV file. The first row must be the header.
        </p>

        <button
          type="button"
          class="link link-primary mt-2 inline-flex items-center gap-1 text-sm disabled:opacity-50"
          :disabled="downloadingTemplate"
          @click="downloadTemplate"
        >
          <Icon name="lucide:download" />
          {{ downloadingTemplate ? 'Preparing template...' : 'Download Excel template (with dropdowns)' }}
        </button>

        <!-- Upload form -->
        <div v-if="!summary" class="mt-4 flex flex-col gap-3">
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            class="file-input file-input-bordered w-full"
            @change="onFileChange"
          />
          <div class="modal-action">
            <button class="btn" type="button" @click="closeModal">Close</button>
            <button
              class="btn btn-primary"
              :disabled="!file || uploading"
              @click="upload"
            >
              <span v-if="uploading">Uploading...</span>
              <span v-else>Upload &amp; Import</span>
            </button>
          </div>
        </div>

        <!-- Result summary -->
        <div v-else class="mt-4">
          <div class="text-sm">
            <div>
              <span class="font-semibold text-success">Inserted: {{ summary.inserted ?? 0 }}</span>
              · <span class="font-semibold text-warning">Skipped: {{ summary.skipped ?? 0 }}</span>
            </div>
          </div>

          <div v-if="summary.errors?.length" class="mt-3">
            <div class="text-sm font-semibold">Row issues ({{ summary.errors.length }}):</div>
            <ul class="mt-1 max-h-64 overflow-auto rounded border border-base-200 bg-base-100 p-2 text-xs">
              <li v-for="(e, i) in summary.errors" :key="i" class="font-mono">{{ e }}</li>
            </ul>
          </div>

          <div class="modal-action">
            <button class="btn" type="button" @click="closeModal">Done</button>
            <button class="btn btn-primary" type="button" @click="reset">Import Another</button>
          </div>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { usePeClient } from '~/composables/usePeClient';

const props = defineProps({
  planUuid: { type: String, required: true },
});

const store = useAnnualprocurementplanStore();

const fileInput = ref(null);
const file = ref(null);
const uploading = ref(false);
const summary = ref(null);
const downloadingTemplate = ref(false);

const client = usePeClient();
const toast = useToast();

const openModal = () => document.getElementById('import_disposalplan_modal').showModal();
const closeModal = () => {
  document.getElementById('import_disposalplan_modal').close();
  reset();
};

const reset = () => {
  summary.value = null;
  file.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const onFileChange = (event) => {
  file.value = event.target.files?.[0] ?? null;
};

const upload = async () => {
  if (!file.value) return;
  uploading.value = true;
  try {
    const res = await store.importDisposalplansFile(props.planUuid, file.value);
    if (res) summary.value = res;
  } finally {
    uploading.value = false;
  }
};

const downloadTemplate = async () => {
  if (downloadingTemplate.value) return;
  downloadingTemplate.value = true;
  try {
    const blob = await client('/api/v1/annual-procurement-plans/disposalplans/template', {
      method: 'GET',
      responseType: 'blob',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annualdisposalplan_template.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error({
      title: 'Download failed',
      message: err?.data?.message || 'Could not download the template.',
      position: 'topRight',
      layout: 2,
    });
  } finally {
    downloadingTemplate.value = false;
  }
};
</script>
