<template>
  <section class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-4 p-4 sm:p-5">
      <div>
        <h3 class="font-semibold">Eligibility Evaluation</h3>
        <p class="text-sm text-base-content/55">Open each bidder's eligibility response in full screen, then record a compliant or non-compliant decision. Drafts remain in this browser until you commit the complete evaluation.</p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
        <div><p class="font-medium">{{ completedCount }} of {{ bids.length }} decisions completed</p><p class="text-xs text-base-content/55">{{ hasLocalDrafts ? 'Uncommitted changes are stored in this browser.' : 'The displayed decisions match the committed server record.' }}</p></div>
        <button class="btn btn-primary btn-sm" type="button" :disabled="saving || !hasLocalDrafts || !allDecisionsComplete" @click="commitEvaluation"><span v-if="saving" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:cloud-upload" class="h-4 w-4" /> Commit evaluation</button>
      </div>

      <div v-if="message" class="alert py-2" :class="messageOk ? 'alert-success' : 'alert-error'">
        <Icon :name="messageOk ? 'lucide:circle-check' : 'lucide:triangle-alert'" class="h-4 w-4" />
        <span class="text-sm">{{ message }}</span>
      </div>

      <article v-for="bid in bids" :key="bid.uuid" class="rounded-xl border border-base-200 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 class="font-semibold">{{ bid.bidder?.name || `Bid ${bid.id}` }}</h4>
            <span v-if="bid.compliance_decision" class="badge badge-sm mt-1" :class="bid.compliance_decision.compliant ? 'badge-success' : 'badge-error'">
              {{ bid.compliance_decision.compliant ? 'Compliant' : 'Not compliant' }}
            </span>
          </div>
          <button class="btn btn-outline btn-sm" type="button" @click="openEligibility(bid)"><Icon name="lucide:maximize-2" class="h-4 w-4" /> View eligibility</button>
        </div>
        <div class="mt-4 grid gap-3">
          <label class="fieldset"><span class="fieldset-legend">Compliance decision</span><select v-model="forms[bid.uuid].compliant" class="select select-bordered w-full" required><option :value="null" disabled>Select decision</option><option :value="true">Compliant</option><option :value="false">Not compliant</option></select></label>
          <label class="fieldset"><span class="fieldset-legend">Evaluation comments <span v-if="forms[bid.uuid].compliant === false">(required)</span></span><textarea v-model.trim="forms[bid.uuid].comments" class="textarea textarea-bordered min-h-24 w-full" :required="forms[bid.uuid].compliant === false" placeholder="Record the evidence supporting this decision." /></label>
          <p class="text-right text-xs text-base-content/45"><Icon name="lucide:hard-drive" class="mr-1 inline h-3.5 w-3.5" />Saved locally</p>
        </div>
      </article>
      <p v-if="!bids.length" class="rounded-xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/50">No opened RFQ responses are available for evaluation.</p>
    </div>

    <dialog ref="documentDialog" class="modal">
      <div class="modal-box flex h-screen max-h-none w-screen max-w-none flex-col rounded-none p-0">
        <div class="flex items-center justify-between border-b border-base-200 p-4">
          <div><h2 class="font-semibold">{{ documentBid?.bidder?.name }} — eligibility review</h2><p class="text-xs text-base-content/50">Review responses and supporting evidence before recording compliance.</p></div>
          <button class="btn btn-circle btn-ghost btn-sm" type="button" @click="closeDocuments"><Icon name="lucide:x" /></button>
        </div>
        <div v-if="documentLoading" class="flex flex-1 items-center justify-center gap-2"><span class="loading loading-spinner loading-sm" /> Loading eligibility response…</div>
        <div v-else class="grid min-h-0 flex-1 lg:grid-cols-[minmax(420px,1fr)_minmax(420px,1fr)]">
          <div class="overflow-y-auto border-r border-base-200 p-4">
            <section class="mb-6 rounded-lg border border-info/30 bg-info/5 p-3"><div class="flex items-center gap-2"><span class="badge badge-info badge-sm">{{ review.scope?.response_rules || 'Response' }}</span><p class="text-sm font-medium">Evaluation scope</p></div><div v-for="lot in review.scope?.lots || []" :key="lot.id" class="mt-2 text-xs"><p class="font-medium">{{ lot.description }}</p><p class="text-base-content/60">{{ lot.products.map(product => product.description).join(', ') || 'No responded items' }}</p></div></section>
            <section v-for="section in responseSections" :key="section.title" class="mt-6 space-y-2"><h3 class="font-semibold">{{ section.title }}</h3><article v-for="row in section.rows" :key="row.uuid" class="rounded-lg border border-base-200 p-3"><p class="text-xs text-base-content/45">{{ [row.group, row.lot, row.product].filter(Boolean).join(' · ') }}</p><p class="mt-1 text-sm font-medium">{{ row.question }}</p><div class="mt-2 flex items-center justify-between gap-2"><span class="badge badge-outline">{{ displayResponse(row) }}</span><button v-if="row.file" type="button" class="btn btn-outline btn-xs" @click="activeDocument = row.file">View attachment</button></div></article><p v-if="!section.rows.length" class="text-sm text-base-content/45">No responses configured.</p></section>
            <section class="mt-6 space-y-2"><h3 class="font-semibold">Specification compliance</h3><article v-for="row in review.specifications" :key="row.uuid" class="rounded-lg border border-base-200 p-3"><p class="text-xs text-base-content/45">{{ row.lot }} · {{ row.product }}</p><div class="mt-1 flex justify-between gap-3"><p class="text-sm font-medium">{{ row.specification }}: {{ row.required_value }}</p><span class="badge" :class="row.status === 'COMPLIANT' ? 'badge-success' : 'badge-warning'">{{ displayAnswer(row.status) }}</span></div><p v-if="row.offered_value || row.manufacturer_model || row.explanation" class="mt-2 text-xs text-base-content/60">Offered: {{ row.offered_value || '—' }} <span v-if="row.manufacturer_model">· {{ row.manufacturer_model }}</span> <span v-if="row.explanation">· {{ row.explanation }}</span></p><button v-if="row.file" class="btn btn-outline btn-xs mt-2" @click="activeDocument = row.file">View supporting document</button></article><p v-if="!review.specifications.length" class="text-sm text-base-content/45">No specifications configured.</p></section>
            <section class="mt-6 space-y-3"><div><h3 class="font-semibold">Document compliance</h3><p class="text-xs text-base-content/50">Assess every required document independently. One non-compliant document makes the bidder non-compliant by default.</p></div><article v-for="doc in documents" :key="documentDecisionKey(doc)" class="rounded-xl border p-3" :class="forms[documentBid.uuid]?.documents?.[documentDecisionKey(doc)]?.compliant === false ? 'border-error/40 bg-error/5' : forms[documentBid.uuid]?.documents?.[documentDecisionKey(doc)]?.compliant === true ? 'border-success/30 bg-success/5' : 'border-base-200'"><div class="flex flex-wrap items-start justify-between gap-2"><button type="button" class="min-w-0 text-left" @click="activeDocument = doc"><p class="font-medium">{{ doc.title || doc.file_name }}</p><p class="mt-1 truncate text-xs text-base-content/45">{{ doc.file_name }}</p></button><button type="button" class="btn btn-outline btn-xs" @click="activeDocument = doc"><Icon name="lucide:eye" class="h-3.5 w-3.5" />View</button></div><div class="mt-3 flex flex-wrap gap-4"><label class="flex cursor-pointer items-center gap-2 text-sm"><input v-model="forms[documentBid.uuid].documents[documentDecisionKey(doc)].compliant" type="radio" class="radio radio-success radio-sm" :name="`document-${documentBid.uuid}-${documentDecisionKey(doc)}`" :value="true">Compliant</label><label class="flex cursor-pointer items-center gap-2 text-sm"><input v-model="forms[documentBid.uuid].documents[documentDecisionKey(doc)].compliant" type="radio" class="radio radio-error radio-sm" :name="`document-${documentBid.uuid}-${documentDecisionKey(doc)}`" :value="false">Non-compliant</label></div><textarea v-if="forms[documentBid.uuid].documents[documentDecisionKey(doc)].compliant === false" v-model.trim="forms[documentBid.uuid].documents[documentDecisionKey(doc)].comments" class="textarea textarea-bordered textarea-sm mt-3 min-h-16 w-full" placeholder="Reason the document is non-compliant" /></article><p v-if="!documents.length" class="rounded-lg border border-dashed border-base-300 p-3 text-sm text-base-content/45">No attached documents require assessment.</p></section>
          </div>
          <div class="min-h-0 bg-base-200/40 p-3"><img v-if="activeDocument?.mime_type?.startsWith('image/')" :src="activeDocument.url" class="mx-auto max-h-full max-w-full object-contain" :alt="activeDocument.title"><iframe v-else-if="activeDocument" :src="activeDocument.url" class="h-full w-full rounded-lg bg-white" :title="activeDocument.title || activeDocument.file_name" /><div v-else class="flex h-full items-center justify-center text-base-content/40">Select an attachment to view it.</div></div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button @click="closeDocuments">close</button></form>
    </dialog>
  </section>
</template>

<script setup>
const props = defineProps({ tenderUuid: { type: String, required: true }, evaluatorKey: { type: [String, Number], required: true }, bids: { type: Array, default: () => [] } })
const emit = defineEmits(['updated'])
const { getRfqBidEligibility, saveRfqComplianceDecisions } = useTenderHelper()
const forms = reactive({}); const saving = ref(false); const message = ref(''); const messageOk = ref(true); const draftsReady = ref(false); const hasLocalDrafts = ref(false)
const documentDialog = ref(null); const documentBid = ref(null); const documentLoading = ref(false); const documents = ref([]); const activeDocument = ref(null)
const review = ref({ scope: null, eligibility: [], technical: [], specifications: [] })
const responseSections = computed(() => [{ title: 'Eligibility responses', rows: review.value.eligibility }, { title: 'Technical responses', rows: review.value.technical }])
const draftStorageKey = computed(() => `rfq-compliance-draft:${props.tenderUuid}:${props.evaluatorKey}`)
const completedCount = computed(() => props.bids.filter(bid => typeof forms[bid.uuid]?.compliant === 'boolean').length)
const allDecisionsComplete = computed(() => props.bids.length > 0 && props.bids.every((bid) => { const decision = forms[bid.uuid]; const documentsComplete = decision?.documents_reviewed && Object.values(decision.documents || {}).every(document => typeof document.compliant === 'boolean'); return documentsComplete && typeof decision?.compliant === 'boolean' && (decision.compliant || Boolean(decision.comments?.trim())) }))

function readLocalDraft() { if (!import.meta.client) return null; try { const raw = window.localStorage.getItem(draftStorageKey.value); const draft = raw ? JSON.parse(raw) : null; return draft?.version === 2 ? draft : null } catch { return null } }
function persistLocalDraft() { if (!import.meta.client || !draftsReady.value) return; try { window.localStorage.setItem(draftStorageKey.value, JSON.stringify({ version: 2, tender_uuid: props.tenderUuid, evaluator: props.evaluatorKey, saved_at: new Date().toISOString(), decisions: JSON.parse(JSON.stringify(forms)) })); hasLocalDrafts.value = true } catch { hasLocalDrafts.value = true } }
function clearLocalDraft() { if (!import.meta.client) return; try { window.localStorage.removeItem(draftStorageKey.value) } catch { /* The committed server copy remains authoritative. */ } hasLocalDrafts.value = false }
async function hydrate() { draftsReady.value = false; Object.keys(forms).forEach(key => delete forms[key]); for (const bid of props.bids) { const savedDocuments = Object.fromEntries((bid.compliance_decision?.document_decisions || []).map(document => [document.document_uuid, { compliant: document.compliant, comments: document.comments || '' }])); forms[bid.uuid] = { compliant: bid.compliance_decision?.compliant ?? null, comments: bid.compliance_decision?.comments ?? '', documents: savedDocuments, documents_reviewed: Boolean(bid.compliance_decision) } } const local = readLocalDraft(); for (const bid of props.bids) { if (local?.decisions?.[bid.uuid]) forms[bid.uuid] = { ...forms[bid.uuid], ...local.decisions[bid.uuid], documents: { ...forms[bid.uuid].documents, ...(local.decisions[bid.uuid].documents || {}) } } } hasLocalDrafts.value = Boolean(local?.decisions && Object.keys(local.decisions).length); await nextTick(); draftsReady.value = true }
watch(() => props.bids, hydrate, { immediate: true, deep: true })
watch(forms, () => { for (const decision of Object.values(forms)) { if (Object.values(decision.documents || {}).some(document => document.compliant === false)) decision.compliant = false } persistLocalDraft() }, { deep: true })
function failure(error, fallback) { return error?.value?.data?.message || error?.value?.response?._data?.message || fallback }
const displayAnswer = value => value === null || value === undefined || value === '' ? 'Not answered' : String(value).replaceAll('_', ' ')
const displayResponse = row => row?.answer !== null && row?.answer !== undefined && row?.answer !== '' ? displayAnswer(row.answer) : row?.file ? 'Attachment provided' : 'Not answered'
const documentDecisionKey = document => document?.decision_uuid || document?.requirement_uuid || document?.uuid
async function commitEvaluation() { if (!allDecisionsComplete.value) return; saving.value = true; message.value = ''; const decisions = props.bids.map(bid => ({ bid_uuid: bid.uuid, compliant: forms[bid.uuid].compliant, comments: forms[bid.uuid].comments || null, documents: Object.entries(forms[bid.uuid].documents || {}).map(([document_uuid, decision]) => ({ document_uuid, compliant: decision.compliant, comments: decision.comments || null })) })); const response = await saveRfqComplianceDecisions(props.tenderUuid, { decisions }); messageOk.value = response.status.value; message.value = response.status.value ? 'All compliance decisions were committed successfully.' : `${failure(response.error, 'The evaluation could not be committed.')} Your local draft has been retained.`; if (response.status.value) { clearLocalDraft(); emit('updated') } saving.value = false }
async function openEligibility(bid) { documentBid.value = bid; documentLoading.value = true; review.value = { scope: null, eligibility: [], technical: [], specifications: [] }; documents.value = []; activeDocument.value = null; documentDialog.value?.showModal(); const response = await getRfqBidEligibility(props.tenderUuid, bid.uuid); if (response.status.value) { const payload = response.data.value?.data || {}; review.value = { scope: payload.scope || null, eligibility: payload.eligibility || [], technical: payload.technical || [], specifications: payload.specifications || [] }; documents.value = payload.documents || []; const validKeys = new Set(); for (const document of documents.value) { const key = documentDecisionKey(document); validKeys.add(key); forms[bid.uuid].documents[key] ||= { compliant: null, comments: '' } } for (const key of Object.keys(forms[bid.uuid].documents)) if (!validKeys.has(key)) delete forms[bid.uuid].documents[key]; forms[bid.uuid].documents_reviewed = true } else { messageOk.value = false; message.value = failure(response.error, 'Eligibility information could not be loaded.'); documentDialog.value?.close() } documentLoading.value = false }
function closeDocuments() { documentDialog.value?.close(); activeDocument.value = null }
function warnBeforeUnload(event) { if (!hasLocalDrafts.value) return; event.preventDefault(); event.returnValue = '' }
onMounted(() => window.addEventListener('beforeunload', warnBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload))
</script>
