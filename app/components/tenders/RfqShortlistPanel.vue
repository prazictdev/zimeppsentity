<template>
  <section class="overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-sm">
    <header class="border-b border-base-200 bg-gradient-to-r from-primary/10 via-base-100 to-base-100 px-5 py-5 sm:px-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-content shadow-sm"><Icon name="lucide:list-checks" class="h-5 w-5" /></div>
          <div><p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">Shortlist review</p><h3 class="mt-1 text-xl font-bold">Choose bidders to advance</h3><p class="mt-1 max-w-2xl text-sm text-base-content/55">Compare the eligibility finding, inspect supporting evidence, and record one clear decision for every response.</p></div>
        </div>
        <div class="flex flex-wrap items-center gap-2"><button class="btn btn-ghost btn-sm" type="button" @click="emit('back')"><Icon name="lucide:arrow-left" class="h-4 w-4" /> Back to Eligibility Evaluation</button><span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium" :class="hasLocalDrafts ? 'border-warning/30 bg-warning/10 text-warning' : 'border-success/30 bg-success/10 text-success'"><Icon :name="hasLocalDrafts ? 'lucide:hard-drive' : 'lucide:cloud-check'" class="h-3.5 w-3.5" />{{ hasLocalDrafts ? 'Local draft' : 'Committed' }}</span></div>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-base-200 bg-base-100/85 p-3"><p class="text-xs text-base-content/45">Reviewed</p><p class="mt-1 text-lg font-bold">{{ completedCount }} <span class="text-sm font-normal text-base-content/45">/ {{ bids.length }}</span></p></div>
        <div class="rounded-xl border border-success/20 bg-success/5 p-3"><p class="text-xs text-success/70">Advancing</p><p class="mt-1 text-lg font-bold text-success">{{ shortlistedCount }}</p></div>
        <div class="rounded-xl border border-error/20 bg-error/5 p-3"><p class="text-xs text-error/70">Excluded</p><p class="mt-1 text-lg font-bold text-error">{{ excludedCount }}</p></div>
      </div>
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-base-200"><div class="h-full rounded-full bg-primary transition-all duration-300" :style="{ width: `${progressPercent}%` }" /></div>
    </header>

    <div class="space-y-4 p-4 sm:p-6">
      <div v-if="message" class="alert py-2" :class="messageOk ? 'alert-success' : 'alert-error'"><Icon :name="messageOk ? 'lucide:circle-check' : 'lucide:triangle-alert'" class="h-4 w-4" /><span class="text-sm">{{ message }}</span></div>

      <div class="overflow-x-auto rounded-xl border border-base-200">
        <table class="table min-w-[1050px]">
          <thead class="bg-base-200/60 text-xs uppercase tracking-wide text-base-content/50">
            <tr><th class="w-12">#</th><th>Bidder</th><th>Action</th><th>Shortlist decision</th><th class="w-64">Reason / note</th></tr>
          </thead>
          <tbody>
            <tr v-for="(bid, index) in bids" :key="bid.uuid" class="align-top transition-colors" :class="forms[bid.uuid].shortlisted === true ? 'bg-success/[0.04]' : forms[bid.uuid].shortlisted === false ? 'bg-error/[0.03]' : ''">
              <td><span class="flex h-7 w-7 items-center justify-center rounded-full bg-base-200 text-xs font-bold text-base-content/60">{{ index + 1 }}</span></td>
              <td><p class="max-w-52 font-semibold">{{ bid.bidder?.name || `Bid ${bid.id}` }}</p><p v-if="bid.shortlist_decision" class="mt-1 text-xs text-base-content/40">Last saved: {{ bid.shortlist_decision.shortlisted ? 'Shortlisted' : 'Not shortlisted' }}</p></td>
              <td><div class="flex flex-wrap gap-2"><button class="btn btn-outline btn-sm whitespace-nowrap" type="button" @click="openEligibility(bid)"><Icon name="lucide:clipboard-check" class="h-4 w-4" /> View Eligibility data</button><button class="btn btn-ghost btn-sm whitespace-nowrap text-primary" type="button" @click="openEvaluations(bid)"><Icon name="lucide:history" class="h-4 w-4" /> View Evaluations</button></div></td>
              <td>
                <div class="space-y-2">
                  <label class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm" :class="forms[bid.uuid].shortlisted === true ? 'border-success bg-success/10 font-semibold text-success' : 'border-base-200'">
                    <input v-model="forms[bid.uuid].shortlisted" type="radio" class="radio radio-success radio-sm" :name="`shortlist-${bid.uuid}`" :value="true" :disabled="!bid.compliance_decision?.compliant">
                    Shortlist
                  </label>
                  <label class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm" :class="forms[bid.uuid].shortlisted === false ? 'border-error bg-error/10 font-semibold text-error' : 'border-base-200'">
                    <input v-model="forms[bid.uuid].shortlisted" type="radio" class="radio radio-error radio-sm" :name="`shortlist-${bid.uuid}`" :value="false" :disabled="!bid.compliance_decision?.compliant">
                    Do not shortlist
                  </label>
                </div>
              </td>
              <td>
                <textarea v-if="forms[bid.uuid].shortlisted === false" v-model.trim="forms[bid.uuid].comments" class="textarea textarea-bordered textarea-sm min-h-20 w-full" :disabled="!bid.compliance_decision?.compliant" required :placeholder="bid.compliance_decision?.compliant ? 'Reason for not shortlisting' : 'Excluded by compliance result'" />
                <input v-else-if="forms[bid.uuid].shortlisted === true" v-model.trim="forms[bid.uuid].comments" class="input input-bordered input-sm w-full" placeholder="Optional note">
                <span v-else class="text-xs text-base-content/35">Select a decision</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <footer class="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-base-200 bg-base-100/95 px-5 py-4 backdrop-blur sm:px-6"><div><p class="text-sm font-medium">{{ allDecisionsComplete ? 'Shortlist ready to commit' : `${bids.length - completedCount} decision${bids.length - completedCount === 1 ? '' : 's'} remaining` }}</p><p class="text-xs text-base-content/45">All changes stay in this browser until committed.</p></div><button class="btn btn-primary min-w-44" type="button" :disabled="saving || !hasLocalDrafts || !allDecisionsComplete" @click="commitShortlist"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:cloud-upload" class="h-4 w-4" /> Commit shortlist</button></footer>

    <dialog ref="evaluationDialog" class="modal">
      <div class="modal-box w-11/12 max-w-4xl p-0">
        <div class="flex items-center justify-between border-b border-base-200 px-5 py-4"><div><h2 class="font-semibold">{{ selectedBid?.bidder?.name }} — previous evaluations</h2><p class="text-xs text-base-content/50">Committed evaluation decisions recorded before shortlisting.</p></div><button class="btn btn-circle btn-ghost btn-sm" @click="evaluationDialog?.close()"><Icon name="lucide:x" /></button></div>
        <div class="overflow-x-auto p-5">
          <table class="table">
            <thead><tr><th>Evaluation</th><th>Decision</th><th>Comments</th><th>Evaluated on</th></tr></thead>
            <tbody><tr><td class="font-medium">Eligibility Evaluation</td><td><span class="badge" :class="selectedBid?.compliance_decision?.compliant ? 'badge-success' : 'badge-error'">{{ selectedBid?.compliance_decision?.compliant ? 'Compliant' : 'Not compliant' }}</span></td><td class="max-w-md whitespace-pre-wrap">{{ selectedBid?.compliance_decision?.comments || 'No comments recorded.' }}</td><td class="whitespace-nowrap text-xs">{{ formatDate(selectedBid?.compliance_decision?.submitted_at) }}</td></tr></tbody>
          </table>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <dialog ref="dialog" class="modal">
      <div class="modal-box flex h-screen max-h-none w-screen max-w-none flex-col rounded-none p-0">
        <div class="flex items-center justify-between border-b border-base-200 p-4"><div><h2 class="font-semibold">{{ selectedBid?.bidder?.name }} — eligibility data</h2><p class="text-xs text-base-content/50">Review eligibility, technical, specification, and document responses.</p></div><button class="btn btn-circle btn-ghost btn-sm" @click="closeEligibility"><Icon name="lucide:x" /></button></div>
        <div v-if="loadingEligibility" class="flex flex-1 items-center justify-center gap-2"><span class="loading loading-spinner loading-sm" />Loading eligibility data…</div>
        <div v-else class="grid min-h-0 flex-1 lg:grid-cols-[minmax(420px,1fr)_minmax(420px,1fr)]">
          <div class="overflow-y-auto border-r border-base-200 p-4">
            <section class="mb-5 rounded-lg border border-success/30 bg-success/5 p-3"><p class="text-xs font-semibold uppercase tracking-wide text-success">Previous eligibility evaluation</p><p class="mt-1 font-medium">{{ selectedBid?.compliance_decision?.compliant ? 'Compliant' : 'Not compliant' }}</p><p class="mt-1 whitespace-pre-wrap text-sm">{{ selectedBid?.compliance_decision?.comments || 'No comments recorded.' }}</p></section>
            <section class="mb-6 rounded-lg border border-info/30 bg-info/5 p-3"><div class="flex items-center gap-2"><span class="badge badge-info badge-sm">{{ review.scope?.response_rules || 'Response' }}</span><p class="text-sm font-medium">Evaluation scope</p></div><div v-for="lot in review.scope?.lots || []" :key="lot.id" class="mt-2 text-xs"><p class="font-medium">{{ lot.description }}</p><p class="text-base-content/60">{{ lot.products.map(product => product.description).join(', ') || 'No responded items' }}</p></div></section>
            <section v-for="section in responseSections" :key="section.title" class="mt-6 space-y-2"><h3 class="font-semibold">{{ section.title }}</h3><article v-for="row in section.rows" :key="row.uuid" class="rounded-lg border border-base-200 p-3"><p class="text-xs text-base-content/45">{{ [row.group, row.lot, row.product].filter(Boolean).join(' · ') }}</p><p class="mt-1 text-sm font-medium">{{ row.question }}</p><div class="mt-2 flex items-center justify-between gap-2"><span class="badge badge-outline">{{ displayResponse(row) }}</span><button v-if="row.file" class="btn btn-outline btn-xs" @click="activeDocument = row.file">View attachment</button></div></article><p v-if="!section.rows.length" class="text-sm text-base-content/45">No responses configured.</p></section>
            <section class="mt-6 space-y-2"><h3 class="font-semibold">Specification compliance</h3><article v-for="row in review.specifications" :key="row.uuid" class="rounded-lg border border-base-200 p-3"><p class="text-xs text-base-content/45">{{ row.lot }} · {{ row.product }}</p><div class="mt-1 flex justify-between gap-3"><p class="text-sm font-medium">{{ row.specification }}: {{ row.required_value }}</p><span class="badge" :class="row.status === 'COMPLIANT' ? 'badge-success' : 'badge-warning'">{{ displayAnswer(row.status) }}</span></div><p v-if="row.offered_value || row.manufacturer_model || row.explanation" class="mt-2 text-xs text-base-content/60">Offered: {{ row.offered_value || '—' }} <span v-if="row.manufacturer_model">· {{ row.manufacturer_model }}</span> <span v-if="row.explanation">· {{ row.explanation }}</span></p><button v-if="row.file" class="btn btn-outline btn-xs mt-2" @click="activeDocument = row.file">View supporting document</button></article></section>
            <section class="mt-6 space-y-2"><h3 class="font-semibold">Attached documents</h3><button v-for="doc in documents" :key="doc.uuid" class="w-full rounded-lg border p-3 text-left text-sm" :class="activeDocument?.uuid === doc.uuid ? 'border-primary bg-primary/5' : 'border-base-200'" @click="activeDocument = doc"><p class="font-medium">{{ doc.title || doc.file_name }}</p><p class="mt-1 truncate text-xs text-base-content/45">{{ doc.file_name }}</p></button><p v-if="!documents.length" class="text-sm text-base-content/45">No attached documents.</p></section>
          </div>
          <div class="min-h-0 bg-base-200/40 p-3"><img v-if="activeDocument?.mime_type?.startsWith('image/')" :src="activeDocument.url" class="mx-auto max-h-full max-w-full object-contain" :alt="activeDocument.title"><iframe v-else-if="activeDocument" :src="activeDocument.url" class="h-full w-full rounded-lg bg-white" :title="activeDocument.title || activeDocument.file_name" /><div v-else class="flex h-full items-center justify-center text-base-content/40">Select an attachment to view it.</div></div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button @click="closeEligibility">close</button></form>
    </dialog>
  </section>
</template>

<script setup>
const props = defineProps({ tenderUuid: { type: String, required: true }, evaluatorKey: { type: [String, Number], required: true }, bids: { type: Array, default: () => [] } })
const emit = defineEmits(['updated', 'back'])
const { getRfqBidEligibility, saveRfqShortlistDecisions } = useTenderHelper()
const forms = reactive({}); const draftsReady = ref(false); const hasLocalDrafts = ref(false); const saving = ref(false); const message = ref(''); const messageOk = ref(true)
const dialog = ref(null); const evaluationDialog = ref(null); const selectedBid = ref(null); const loadingEligibility = ref(false); const documents = ref([]); const activeDocument = ref(null); const review = ref({ scope: null, eligibility: [], technical: [], specifications: [] })
const responseSections = computed(() => [{ title: 'Eligibility responses', rows: review.value.eligibility }, { title: 'Technical responses', rows: review.value.technical }])
const storageKey = computed(() => `rfq-shortlist-draft:${props.tenderUuid}:${props.evaluatorKey}`)
const completedCount = computed(() => props.bids.filter(bid => typeof forms[bid.uuid]?.shortlisted === 'boolean').length)
const shortlistedCount = computed(() => props.bids.filter(bid => forms[bid.uuid]?.shortlisted === true).length)
const excludedCount = computed(() => props.bids.filter(bid => forms[bid.uuid]?.shortlisted === false).length)
const progressPercent = computed(() => props.bids.length ? Math.round((completedCount.value / props.bids.length) * 100) : 0)
const allDecisionsComplete = computed(() => props.bids.length > 0 && props.bids.every((bid) => { const row = forms[bid.uuid]; return typeof row?.shortlisted === 'boolean' && (row.shortlisted || Boolean(row.comments?.trim())) }) && Object.values(forms).some(row => row.shortlisted))

function readDraft() { if (!import.meta.client) return null; try { const raw = localStorage.getItem(storageKey.value); return raw ? JSON.parse(raw) : null } catch { return null } }
function persistDraft() { if (!import.meta.client || !draftsReady.value) return; try { localStorage.setItem(storageKey.value, JSON.stringify({ version: 1, tender_uuid: props.tenderUuid, evaluator: props.evaluatorKey, saved_at: new Date().toISOString(), decisions: JSON.parse(JSON.stringify(forms)) })); hasLocalDrafts.value = true } catch { hasLocalDrafts.value = true } }
function clearDraft() { if (!import.meta.client) return; try { localStorage.removeItem(storageKey.value) } catch { /* Server state remains authoritative. */ } hasLocalDrafts.value = false }
async function hydrate() { draftsReady.value = false; Object.keys(forms).forEach(key => delete forms[key]); for (const bid of props.bids) forms[bid.uuid] = { shortlisted: bid.compliance_decision?.compliant ? (bid.shortlist_decision?.shortlisted ?? null) : false, comments: bid.shortlist_decision?.comments ?? (bid.compliance_decision?.compliant ? '' : 'Bidder did not pass the eligibility evaluation.') }; const local = readDraft(); for (const bid of props.bids) if (local?.decisions?.[bid.uuid]) forms[bid.uuid] = { ...forms[bid.uuid], ...local.decisions[bid.uuid] }; hasLocalDrafts.value = Boolean(local?.decisions && Object.keys(local.decisions).length); await nextTick(); draftsReady.value = true }
watch(() => props.bids, hydrate, { immediate: true, deep: true }); watch(forms, persistDraft, { deep: true })
function failure(error, fallback) { return error?.value?.data?.message || error?.value?.response?._data?.message || fallback }
const formatDate = value => value ? new Date(value).toLocaleString('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const displayAnswer = value => value === null || value === undefined || value === '' ? 'Not answered' : String(value).replaceAll('_', ' ')
const displayResponse = row => row?.answer !== null && row?.answer !== undefined && row?.answer !== '' ? displayAnswer(row.answer) : row?.file ? 'Attachment provided' : 'Not answered'
async function commitShortlist() { if (!allDecisionsComplete.value) return; saving.value = true; message.value = ''; const decisions = props.bids.map(bid => ({ bid_uuid: bid.uuid, shortlisted: forms[bid.uuid].shortlisted, comments: forms[bid.uuid].comments || null })); const result = await saveRfqShortlistDecisions(props.tenderUuid, { decisions }); messageOk.value = result.status.value; message.value = result.status.value ? 'The shortlist was committed successfully.' : `${failure(result.error, 'The shortlist could not be committed.')} Your local draft has been retained.`; if (result.status.value) { clearDraft(); emit('updated') } saving.value = false }
function openEvaluations(bid) { selectedBid.value = bid; evaluationDialog.value?.showModal() }
async function openEligibility(bid) { selectedBid.value = bid; loadingEligibility.value = true; documents.value = []; activeDocument.value = null; review.value = { scope: null, eligibility: [], technical: [], specifications: [] }; dialog.value?.showModal(); const result = await getRfqBidEligibility(props.tenderUuid, bid.uuid); if (result.status.value) { const payload = result.data.value?.data || {}; review.value = { scope: payload.scope || null, eligibility: payload.eligibility || [], technical: payload.technical || [], specifications: payload.specifications || [] }; documents.value = payload.documents || [] } else { messageOk.value = false; message.value = failure(result.error, 'Eligibility data could not be loaded.'); dialog.value?.close() } loadingEligibility.value = false }
function closeEligibility() { dialog.value?.close(); activeDocument.value = null }
function warn(event) { if (!hasLocalDrafts.value) return; event.preventDefault(); event.returnValue = '' }
onMounted(() => window.addEventListener('beforeunload', warn)); onBeforeUnmount(() => window.removeEventListener('beforeunload', warn))
</script>
