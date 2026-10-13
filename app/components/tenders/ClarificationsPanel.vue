<template>
  <div class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-4 p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <Icon name="lucide:messages-square" class="h-5 w-5 text-primary" />
            <h2 class="font-semibold">Bidder clarifications</h2>
            <span v-if="total" class="badge badge-primary badge-sm">{{ total }}</span>
          </div>
          <p class="mt-1 text-sm text-base-content/55">Questions and responses are grouped into auditable correspondence threads.</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" :disabled="loading" @click="loadThreads">
          <Icon name="lucide:refresh-cw" class="h-4 w-4" /> Refresh
        </button>
      </div>

      <div v-if="!canAccess" class="alert alert-warning py-3 text-sm">You need <span class="font-mono">can.access.tenderclarifications</span> to view bidder questions.</div>
      <div v-else-if="loading" class="flex items-center gap-2 py-8 text-sm text-base-content/50"><span class="loading loading-spinner loading-sm" /> Loading clarifications…</div>
      <div v-else-if="loadError" class="alert alert-error py-3 text-sm">{{ loadError }}</div>
      <div v-else-if="threads.length === 0" class="rounded-xl border border-dashed border-base-300 py-12 text-center">
        <Icon name="lucide:message-circle-question" class="mx-auto h-10 w-10 text-base-content/20" />
        <p class="mt-2 text-sm text-base-content/50">No bidder questions have been submitted.</p>
      </div>
      <div v-else class="grid gap-4 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(24rem,1.4fr)]">
        <div class="space-y-2">
          <button v-for="thread in threads" :key="thread.uuid" type="button" class="w-full rounded-xl border p-4 text-left transition-colors" :class="selectedUuid === thread.uuid ? 'border-primary bg-primary/5' : 'border-base-200 hover:bg-base-200/30'" @click="openThread(thread.uuid)">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0"><p class="truncate font-semibold">{{ thread.subject }}</p><p class="mt-1 truncate text-xs text-base-content/55">{{ companyName(thread.bidder_company) }}</p></div>
              <span class="badge badge-sm" :class="thread.status === 'ANSWERED' ? 'badge-success' : 'badge-warning'">{{ thread.status }}</span>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-base-content/50">
              <span>{{ formatDateTime(thread.last_correspondence_at) }}</span>
              <span class="badge badge-ghost badge-sm gap-1"><Icon name="lucide:messages-square" class="h-3 w-3" />{{ thread.correspondence_count }}</span>
            </div>
          </button>
        </div>

        <div class="min-h-80 rounded-xl border border-base-200 bg-base-200/15 p-4">
          <div v-if="threadLoading" class="grid min-h-72 place-items-center"><span class="loading loading-spinner" /></div>
          <div v-else-if="!activeThread" class="grid min-h-72 place-items-center text-center text-sm text-base-content/45">Select a question to view its correspondence.</div>
          <template v-else>
            <div class="mb-4 border-b border-base-200 pb-3">
              <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="font-bold">{{ activeThread.subject }}</h3><span class="badge badge-ghost gap-1"><Icon name="lucide:messages-square" class="h-3.5 w-3.5" />{{ activeThread.correspondence_count }}</span></div>
              <p class="mt-1 text-xs text-base-content/55">Submitted by {{ companyName(activeThread.bidder_company) }}</p>
            </div>
            <div class="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              <div v-for="message in activeThread.messages" :key="message.uuid" class="flex" :class="message.sender_type === 'PE' ? 'justify-end' : 'justify-start'">
                <div class="max-w-[88%] rounded-xl px-4 py-3 text-sm" :class="message.sender_type === 'PE' ? 'bg-primary text-primary-content' : 'border border-base-300 bg-base-100'">
                  <div class="mb-1 flex flex-wrap gap-1 text-xs font-semibold opacity-70"><span>{{ message.sender_type === 'PE' ? 'Procuring entity' : companyName(activeThread.bidder_company) }}</span><span>· {{ formatDateTime(message.created_at) }}</span></div>
                  <p class="whitespace-pre-line">{{ message.message }}</p>
                  <button v-if="message.attachment" type="button" class="mt-2 flex max-w-full items-center gap-2 rounded-lg border border-current/20 px-2.5 py-2 text-left text-xs hover:bg-black/5" :disabled="downloadingMessageUuid === message.uuid" @click="downloadAttachment(message)">
                    <span v-if="downloadingMessageUuid === message.uuid" class="loading loading-spinner loading-xs" />
                    <Icon v-else name="lucide:paperclip" class="h-4 w-4 shrink-0" />
                    <span class="min-w-0"><span class="block truncate font-semibold">{{ message.attachment.name }}</span><span class="opacity-65">{{ formatFileSize(message.attachment.size) }}</span></span>
                  </button>
                </div>
              </div>
            </div>
            <form v-if="canRespond" class="mt-4 border-t border-base-200 pt-4" @submit.prevent="submitResponse">
              <textarea v-model.trim="response" class="textarea textarea-bordered min-h-24 w-full" maxlength="10000" required placeholder="Write the procuring entity's response…" />
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <label class="btn btn-outline btn-xs"><span v-if="responseUploading" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:paperclip" class="h-3.5 w-3.5" /> Attach file<input type="file" class="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" :disabled="responseUploading" @change="uploadResponseAttachment" /></label>
                <span v-if="responseAttachment" class="max-w-xs truncate text-xs">{{ responseAttachment.file_name }}</span>
                <button v-if="responseAttachment" type="button" class="btn btn-ghost btn-xs" @click="responseAttachment = null">Remove</button>
                <span class="text-xs text-base-content/45">PDF, JPG, PNG, DOC or DOCX; maximum 10 MB.</span>
              </div>
              <div class="mt-2 flex items-center justify-between gap-3"><p class="text-xs text-base-content/45">This response becomes part of the tender clarification record.</p><button type="submit" class="btn btn-primary btn-sm" :disabled="responding || responseUploading || !response"><span v-if="responding" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:send" class="h-4 w-4" /> Respond</button></div>
              <p v-if="responseError" class="mt-2 text-sm text-error">{{ responseError }}</p>
            </form>
            <div v-else class="alert alert-info mt-4 py-3 text-sm">You need <span class="font-mono">can.respond.tenderclarifications</span> to respond.</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ tenderUuid: { type: String, required: true } })
const { can } = useAbility()
const canAccess = computed(() => can('can.access.tenderclarifications'))
const canRespond = computed(() => can('can.respond.tenderclarifications'))
const { getTenderClarifications, getTenderClarification, respondToTenderClarification, getTenderClarificationAttachmentUrl } = useTenderHelper()
const { presignAndUpload } = useS3Upload()
const loading = ref(false)
const loadError = ref('')
const threads = ref([])
const total = ref(0)
const selectedUuid = ref(null)
const activeThread = ref(null)
const threadLoading = ref(false)
const response = ref('')
const responding = ref(false)
const responseError = ref('')
const responseAttachment = ref(null)
const responseUploading = ref(false)
const downloadingMessageUuid = ref('')

async function loadThreads() {
  if (!canAccess.value) return
  loading.value = true
  loadError.value = ''
  const result = await getTenderClarifications(props.tenderUuid)
  loading.value = false
  if (result.error.value) return void (loadError.value = result.error.value?.data?.message ?? 'Unable to load clarifications.')
  const paginator = result.data.value?.data ?? {}
  threads.value = paginator.data ?? []
  total.value = paginator.total ?? threads.value.length
}

async function openThread(uuid) {
  selectedUuid.value = uuid
  threadLoading.value = true
  const result = await getTenderClarification(props.tenderUuid, uuid)
  activeThread.value = result.error.value ? null : result.data.value?.data ?? null
  threadLoading.value = false
}

async function submitResponse() {
  if (!selectedUuid.value || !response.value) return
  responding.value = true
  responseError.value = ''
  const result = await respondToTenderClarification(props.tenderUuid, selectedUuid.value, { message: response.value, ...(responseAttachment.value ?? {}) })
  responding.value = false
  if (!result.status.value) return void (responseError.value = result.error.value?.data?.message ?? 'Unable to send the response.')
  response.value = ''
  responseAttachment.value = null
  await openThread(selectedUuid.value)
  await loadThreads()
}

async function uploadResponseAttachment(event) {
  const file = event.target.files?.[0]
  if (!file) return
  responseError.value = ''
  if (file.size > 10 * 1024 * 1024) {
    responseError.value = 'The selected file must not exceed 10 MB.'
    event.target.value = ''
    return
  }
  responseUploading.value = true
  const result = await presignAndUpload(file, 'tender-clarifications')
  responseUploading.value = false
  event.target.value = ''
  if (!result.ok) return void (responseError.value = result.error)
  responseAttachment.value = {
    file_key: result.key,
    file_name: file.name,
    mime_type: file.type,
    file_size: file.size,
  }
}

async function downloadAttachment(message) {
  if (!selectedUuid.value || downloadingMessageUuid.value) return
  const openedWindow = window.open('', '_blank')
  downloadingMessageUuid.value = message.uuid
  responseError.value = ''
  const result = await getTenderClarificationAttachmentUrl(props.tenderUuid, selectedUuid.value, message.uuid)
  downloadingMessageUuid.value = ''
  if (result.error.value) {
    openedWindow?.close()
    responseError.value = result.error.value?.data?.message ?? 'Unable to open this attachment.'
    return
  }
  const url = result.data.value?.data?.url
  if (url && openedWindow) openedWindow.location.href = url
  else if (url) window.location.href = url
}

function companyName(company) { return company?.name ?? company?.legal_name ?? 'Bidder organisation' }
function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-ZW', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(loadThreads)
</script>
