<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div><p class="text-xs font-semibold uppercase tracking-wide text-primary">Step 3</p><h2 class="mt-1 text-xl font-bold">Chairperson shortlisting</h2><p class="mt-1 text-sm text-base-content/55">Review committee responses, shortlist compliant bidders, and submit the recommendation.</p></div>
      <button class="btn btn-ghost btn-sm" @click="emit('back')"><Icon name="lucide:arrow-left" class="h-4 w-4" />Back to evaluations</button>
    </div>

    <div v-if="loading" class="flex items-center gap-2 rounded-2xl border border-base-200 bg-base-100 p-8"><span class="loading loading-spinner loading-sm" />Loading committee responses…</div>
    <div v-else-if="errorMessage" class="alert alert-error"><Icon name="lucide:triangle-alert" class="h-5 w-5" />{{ errorMessage }}</div>

    <div v-else class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside class="card h-fit border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-5">
          <div><h2 class="font-semibold">Evaluation committee</h2><p class="text-sm text-base-content/55">Open each member's submitted evaluation responses.</p></div>
          <article v-for="member in committeeResponses" :key="member.uuid" class="rounded-xl border border-base-200 p-3">
            <div class="flex items-start justify-between gap-2"><div><p class="text-sm font-medium">{{ member.name }}</p><p class="text-xs text-base-content/45">{{ member.email }}</p></div><span v-if="member.is_chairperson" class="badge badge-primary badge-sm">Chair</span></div>
            <div class="mt-3 flex items-center justify-between gap-3"><span class="text-xs text-base-content/55">{{ member.completed_bids }} of {{ workspace.bids.length }} responses</span><button class="btn btn-outline btn-xs" @click="viewResponses(member)"><Icon name="lucide:eye" class="h-4 w-4" />View response</button></div>
          </article>
        </div>
      </aside>

      <main class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5">
          <div><h2 class="font-semibold">Compliant bidders</h2><p class="text-sm text-base-content/55">Select bidders to shortlist. The system recommends the bidder with the lowest evaluated price.</p></div>
          <div class="space-y-3">
            <label v-for="bid in compliantBids" :key="bid.uuid" class="flex cursor-pointer items-center gap-3 rounded-xl border border-base-200 p-4 hover:border-primary/50"><input v-model="shortlisted" type="checkbox" class="checkbox checkbox-primary" :value="bid.uuid"><span class="min-w-0 flex-1"><span class="block font-medium">{{ bid.bidder?.name }}</span><span class="text-xs text-success">Compliant</span></span><span class="font-mono text-sm">{{ money(bid.financial_amount, bid.currency_code) }}</span></label>
            <p v-if="!compliantBids.length" class="rounded-xl border border-dashed border-base-300 p-5 text-sm text-base-content/50">No bidders were found compliant by the full committee.</p>
          </div>
          <label class="fieldset"><span class="fieldset-legend">Committee recommendation</span><textarea v-model.trim="recommendation" class="textarea textarea-bordered min-h-32 w-full" placeholder="Enter the committee's recommendation" /></label>
          <label class="fieldset"><span class="fieldset-legend">Signed evaluation committee minutes</span><input type="file" class="file-input file-input-bordered w-full" accept=".pdf,.doc,.docx" @change="minutesFile = $event.target.files?.[0] || null"></label>
          <div v-if="message" class="alert alert-error"><Icon name="lucide:triangle-alert" class="h-5 w-5" />{{ message }}</div>
          <div class="flex flex-wrap justify-end gap-2"><button class="btn btn-ghost" @click="emit('back')">Back</button><button class="btn btn-primary" :disabled="saving || !shortlisted.length || !recommendation || !minutesFile" @click="submit"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:send" class="h-4 w-4" />Send to PMU</button></div>
        </div>
      </main>
    </div>

    <dialog ref="responseDialog" class="modal">
      <div class="modal-box w-11/12 max-w-5xl">
        <div class="flex items-start justify-between gap-3"><div><h2 class="text-lg font-semibold">{{ selectedMember?.name }} — evaluation responses</h2><p class="text-sm text-base-content/50">Committed compliance decisions and comments.</p></div><button class="btn btn-circle btn-ghost btn-sm" @click="responseDialog?.close()"><Icon name="lucide:x" /></button></div>
        <div class="mt-5 overflow-x-auto"><table class="table"><thead><tr><th>Bidder</th><th>Response</th><th>Evaluation comments</th><th>Committed</th><th></th></tr></thead><tbody><tr v-for="response in selectedMember?.responses || []" :key="response.bid_uuid"><td class="font-medium">{{ response.bidder?.name }}</td><td><span class="badge" :class="response.compliant ? 'badge-success' : 'badge-error'">{{ response.compliant ? 'Compliant' : 'Not compliant' }}</span></td><td class="max-w-md whitespace-pre-wrap">{{ response.comments || '—' }}</td><td class="text-xs">{{ formatDate(response.completed_at) }}</td><td class="text-right"><button class="btn btn-outline btn-xs whitespace-nowrap" @click="openEligibility(response)"><Icon name="lucide:clipboard-check" class="h-4 w-4" />View eligibility</button></td></tr><tr v-if="!selectedMember?.responses?.length"><td colspan="5" class="py-8 text-center text-base-content/45">This member has not committed any responses.</td></tr></tbody></table></div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <dialog ref="eligibilityDialog" class="modal">
      <div class="modal-box flex h-screen max-h-none w-screen max-w-none flex-col rounded-none p-0">
        <div class="flex items-center justify-between border-b border-base-200 p-4"><div><h2 class="font-semibold">{{ eligibilityBid?.bidder?.name }} — eligibility review</h2><p class="text-xs text-base-content/50">Eligibility, technical, specification, and document responses.</p></div><button class="btn btn-circle btn-ghost btn-sm" @click="closeEligibility"><Icon name="lucide:x" /></button></div>
        <div v-if="eligibilityLoading" class="flex flex-1 items-center justify-center gap-2"><span class="loading loading-spinner loading-sm" />Loading eligibility…</div>
        <div v-else class="grid min-h-0 flex-1 lg:grid-cols-[minmax(420px,1fr)_minmax(420px,1fr)]">
          <div class="overflow-y-auto border-r border-base-200 p-4">
            <section class="mb-6 rounded-lg border border-info/30 bg-info/5 p-3"><div class="flex items-center gap-2"><span class="badge badge-info badge-sm">{{ eligibilityReview.scope?.response_rules }}</span><p class="text-sm font-medium">Evaluation scope</p></div><div v-for="lot in eligibilityReview.scope?.lots || []" :key="lot.id" class="mt-2 text-xs"><p class="font-medium">{{ lot.description }}</p><p class="text-base-content/60">{{ lot.products.map(product => product.description).join(', ') || 'No responded items' }}</p></div></section>
            <section class="space-y-2"><h3 class="font-semibold">Eligibility responses</h3><article v-for="row in eligibilityReview.eligibility" :key="row.uuid" class="rounded-lg border border-base-200 p-3"><p class="text-xs text-base-content/45">{{ row.group }}</p><p class="mt-1 text-sm font-medium">{{ row.question }}</p><div class="mt-2 flex items-center justify-between gap-2"><span class="badge" :class="row.file && !row.answer ? 'badge-info' : 'badge-outline'">{{ displayResponse(row) }}</span><button v-if="row.file" class="btn btn-outline btn-xs" @click="activeDocument = row.file">View attachment</button></div></article><p v-if="!eligibilityReview.eligibility.length" class="text-sm text-base-content/45">No eligibility questions configured.</p></section>
            <section class="mt-6 space-y-2"><h3 class="font-semibold">Technical responses</h3><article v-for="row in eligibilityReview.technical" :key="row.uuid" class="rounded-lg border border-base-200 p-3"><p class="text-xs text-base-content/45">{{ [row.group, row.lot, row.product].filter(Boolean).join(' · ') }}</p><p class="mt-1 text-sm font-medium">{{ row.question }}</p><div class="mt-2 flex items-center justify-between gap-2"><span class="badge" :class="row.file && !row.answer ? 'badge-info' : 'badge-outline'">{{ displayResponse(row) }}</span><button v-if="row.file" class="btn btn-outline btn-xs" @click="activeDocument = row.file">View attachment</button></div></article><p v-if="!eligibilityReview.technical.length" class="text-sm text-base-content/45">No technical questions configured.</p></section>
            <section class="mt-6 space-y-2"><h3 class="font-semibold">Specification compliance</h3><article v-for="row in eligibilityReview.specifications" :key="row.uuid" class="rounded-lg border border-base-200 p-3"><p class="text-xs text-base-content/45">{{ row.lot }} · {{ row.product }}</p><div class="mt-1 flex justify-between gap-3"><p class="text-sm font-medium">{{ row.specification }}: {{ row.required_value }}</p><span class="badge" :class="row.status === 'COMPLIANT' ? 'badge-success' : 'badge-warning'">{{ displayAnswer(row.status) }}</span></div><p v-if="row.offered_value || row.manufacturer_model || row.explanation" class="mt-2 text-xs text-base-content/60">Offered: {{ row.offered_value || '—' }} <span v-if="row.manufacturer_model">· {{ row.manufacturer_model }}</span> <span v-if="row.explanation">· {{ row.explanation }}</span></p><button v-if="row.file" class="btn btn-outline btn-xs mt-2" @click="activeDocument = row.file">View supporting document</button></article></section>
            <section class="mt-6 space-y-2"><h3 class="font-semibold">Attached documents</h3><button v-for="doc in eligibilityDocuments" :key="doc.uuid" class="w-full rounded-lg border p-3 text-left text-sm" :class="activeDocument?.uuid === doc.uuid ? 'border-primary bg-primary/5' : 'border-base-200'" @click="activeDocument = doc"><p class="font-medium">{{ doc.title || doc.file_name }}</p><p class="mt-1 truncate text-xs text-base-content/45">{{ doc.file_name }}</p></button><p v-if="!eligibilityDocuments.length" class="text-sm text-base-content/45">No attached documents.</p></section>
          </div>
          <div class="min-h-0 bg-base-200/40 p-3"><img v-if="activeDocument?.mime_type?.startsWith('image/')" :src="activeDocument.url" class="mx-auto max-h-full max-w-full object-contain" :alt="activeDocument.title"><iframe v-else-if="activeDocument" :src="activeDocument.url" class="h-full w-full rounded-lg bg-white" :title="activeDocument.title || activeDocument.file_name" /><div v-else class="flex h-full items-center justify-center text-base-content/40">Select an attachment to view it.</div></div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button @click="closeEligibility">close</button></form>
    </dialog>
  </section>
</template>

<script setup>
import { useLeastCostSelectionApi } from '~/features/least-cost-selection/api'

const props = defineProps({
  tenderUuid: { type: String, required: true },
  workspace: { type: Object, required: true },
})
const emit = defineEmits(['back', 'submitted'])
const api = useLeastCostSelectionApi()
const { presignAndUpload } = useS3Upload()
const loading = ref(true)
const saving = ref(false)
const committeeResponses = ref([])
const shortlisted = ref([])
const recommendation = ref('')
const minutesFile = ref(null)
const errorMessage = ref('')
const message = ref('')
const responseDialog = ref(null)
const selectedMember = ref(null)
const eligibilityDialog = ref(null)
const eligibilityLoading = ref(false)
const eligibilityBid = ref(null)
const eligibilityDocuments = ref([])
const activeDocument = ref(null)
const eligibilityReview = ref({ scope: null, eligibility: [], technical: [], specifications: [] })
const compliantBids = computed(() => (props.workspace.bids ?? []).filter(bid => bid.unanimously_compliant))
const money = (amount, currency = 'USD') => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(Number(amount || 0))
const formatDate = value => value ? new Date(value).toLocaleString('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

async function loadResponses() {
  const result = await api.chairResponses(props.tenderUuid)
  if (result.ok) committeeResponses.value = result.data ?? []
  else errorMessage.value = result.error
  loading.value = false
}

function viewResponses(member) {
  selectedMember.value = member
  responseDialog.value?.showModal()
}

const displayAnswer = value => value === null || value === undefined || value === '' ? 'Not answered' : String(value).replaceAll('_', ' ')
const displayResponse = row => row?.answer !== null && row?.answer !== undefined && row?.answer !== '' ? displayAnswer(row.answer) : row?.file ? 'Attachment provided' : 'Not answered'

async function openEligibility(response) {
  eligibilityBid.value = response
  eligibilityLoading.value = true
  eligibilityDocuments.value = []
  activeDocument.value = null
  eligibilityReview.value = { scope: null, eligibility: [], technical: [], specifications: [] }
  eligibilityDialog.value?.showModal()
  const result = await api.documents(props.tenderUuid, response.bid_uuid)
  if (result.ok) {
    eligibilityReview.value = result.data
    eligibilityDocuments.value = result.data?.documents ?? []
  } else message.value = result.error
  eligibilityLoading.value = false
}

function closeEligibility() {
  eligibilityDialog.value?.close()
  eligibilityBid.value = null
  eligibilityDocuments.value = []
  activeDocument.value = null
}

async function submit() {
  saving.value = true
  message.value = ''
  const upload = await presignAndUpload(minutesFile.value, 'lcs-minutes')
  if (!upload.ok) {
    message.value = upload.error
    saving.value = false
    return
  }
  const result = await api.chairSubmit(props.tenderUuid, {
    shortlisted_bid_uuids: shortlisted.value,
    recommendation: recommendation.value,
    minutes: {
      path: upload.key,
      filename: minutesFile.value.name,
      mime_type: minutesFile.value.type || 'application/octet-stream',
      size: minutesFile.value.size,
    },
  })
  if (result.ok) emit('submitted')
  else message.value = result.error
  saving.value = false
}

onMounted(loadResponses)
</script>
