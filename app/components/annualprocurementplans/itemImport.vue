<template>
  <div>
    <button type="button" class="btn btn-outline btn-sm" :disabled="disabled" @click="open">
      <Icon name="lucide:upload" />
      Import file
    </button>

    <dialog ref="dialog" class="modal" @cancel.prevent="close">
      <div class="modal-box max-w-2xl">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold">Import items into local draft</h3>
            <p class="mt-1 text-sm text-base-content/60">
              The file is parsed for review only. Nothing is added to the plan until every row has a UNSPSC commodity and you click Bulk upload.
            </p>
          </div>
          <button type="button" class="btn btn-circle btn-ghost btn-sm" :disabled="loading" aria-label="Close import" @click="close">
            <Icon name="lucide:x" />
          </button>
        </div>

        <button
          type="button"
          class="link link-primary mt-3 inline-flex items-center gap-1 text-sm disabled:opacity-50"
          :disabled="downloadingTemplate || loading"
          @click="downloadTemplate"
        >
          <Icon name="lucide:download" />
          {{ downloadingTemplate ? 'Preparing template…' : 'Download Excel template' }}
        </button>

        <div v-if="errorMessage" class="alert alert-error mt-4 text-sm" role="alert">
          <Icon name="lucide:alert-circle" />
          <span>{{ errorMessage }}</span>
        </div>

        <div class="mt-4 space-y-3">
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            class="file-input file-input-bordered w-full"
            :disabled="loading"
            @change="onFileChange"
          />
          <p class="text-xs text-base-content/60">Up to 5,000 rows can be loaded. Imported rows remain in this browser for the signed-in user and plan.</p>
        </div>

        <div class="modal-action">
          <button type="button" class="btn" :disabled="loading" @click="close">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="!file || loading" @click="loadIntoDraft">
            <span v-if="loading" class="loading loading-spinner loading-sm" />
            {{ loading ? 'Reading file…' : 'Load into local draft' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="close">close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  supplementUuid: { type: String, default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['imported'])
const client = usePeClient()
const toast = useToast()
const dialog = ref(null)
const fileInput = ref(null)
const file = ref(null)
const loading = ref(false)
const downloadingTemplate = ref(false)
const errorMessage = ref('')

function open() {
  errorMessage.value = ''
  dialog.value?.showModal?.()
}

function resetFile() {
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function close() {
  if (loading.value) return
  dialog.value?.close?.()
  resetFile()
  errorMessage.value = ''
}

function onFileChange(event) {
  file.value = event.target.files?.[0] ?? null
  errorMessage.value = ''
}

async function loadIntoDraft() {
  if (!file.value || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const body = new FormData()
    body.append('file', file.value)
    const endpoint = props.supplementUuid
      ? `/api/v1/annual-procurement-plans/${props.planUuid}/supplements/${props.supplementUuid}/items/import-preview`
      : `/api/v1/annual-procurement-plans/${props.planUuid}/items/import-preview`
    const response = await client(endpoint, {
      method: 'POST',
      body,
    })
    const preview = response.data ?? {}
    emit('imported', preview.rows ?? [], preview.warnings ?? [])
    loading.value = false
    close()
  } catch (error) {
    errorMessage.value = error.data?.message || Object.values(error.data?.errors || {}).flat().join(' ') || 'The file could not be loaded.'
  } finally {
    loading.value = false
  }
}

async function downloadTemplate() {
  if (downloadingTemplate.value) return
  downloadingTemplate.value = true
  try {
    const blob = await client('/api/v1/annual-procurement-plans/items/template', {
      method: 'GET',
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'annualprocurementplan_items_template.xlsx'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.error({
      title: 'Download failed',
      message: error.data?.message || 'Could not download the template.',
      position: 'topRight',
      layout: 2,
    })
  } finally {
    downloadingTemplate.value = false
  }
}
</script>
