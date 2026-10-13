<template>
  <section class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-5 p-4 sm:p-5">
      <header class="flex gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
          <Icon name="lucide:award" class="h-5 w-5" />
        </div>
        <div>
          <h2 class="font-semibold">Award, standstill and challenges</h2>
          <p class="text-sm text-base-content/60">The recommended bidder is recorded separately from the Accounting Officer’s decision and statutory standstill.</p>
        </div>
      </header>

      <div v-if="message" class="alert py-2" :class="messageOk ? 'alert-success' : 'alert-error'">
        <Icon :name="messageOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-4 w-4" />
        <span class="text-sm">{{ message }}</span>
      </div>

      <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50"><span class="loading loading-spinner loading-sm" /> Loading award record…</div>
      <template v-else>
        <form v-if="canDraftAward" class="grid gap-3 rounded-lg border border-base-200 p-4 sm:grid-cols-2" @submit.prevent="saveAward">
          <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Selected responsive bidder</span><select v-model.number="awardForm.supplier_bid_id" class="select select-bordered w-full" required @change="selectBidder"><option :value="null" disabled>Select a passed evaluated bid</option><option v-for="result in passedResults" :key="result.supplier_bid_id" :value="result.supplier_bid_id">#{{ result.rank }} — {{ result.supplier_bid?.company?.name || `Bid ${result.supplier_bid_id}` }} ({{ result.consensus_total_score }} points)</option></select></label>
          <label class="fieldset"><span class="fieldset-legend">Evaluated amount</span><input v-model.number="awardForm.amount" type="number" min="0" step="0.01" class="input input-bordered w-full" required></label>
          <label class="fieldset"><span class="fieldset-legend">Currency</span><input v-model.trim="awardForm.currency_code" maxlength="3" class="input input-bordered w-full uppercase" required></label>
          <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Evaluation recommendation and justification</span><textarea v-model.trim="awardForm.justification" class="textarea textarea-bordered min-h-28 w-full" required /></label>
          <div class="flex justify-end sm:col-span-2"><button class="btn btn-primary" type="submit" :disabled="saving"><span v-if="saving" class="loading loading-spinner loading-sm" /> Save proposed award</button></div>
        </form>

        <div v-if="award" class="rounded-lg border border-base-200 bg-base-200/20 p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><p class="text-xs uppercase tracking-wide text-base-content/40">Recommended supplier</p><p class="text-lg font-semibold">{{ award.supplier_name }}</p><p class="font-mono text-sm">{{ formatMoney(award.amount, award.currency_code) }}</p></div>
            <span class="badge badge-lg" :class="awardStatusClass">{{ pretty(award.status) }}</span>
          </div>
          <p class="mt-3 whitespace-pre-line text-sm">{{ award.justification }}</p>
          <div v-if="award.standstill_ends_at" class="mt-3 flex items-center gap-2 text-sm"><Icon name="lucide:calendar-clock" class="h-4 w-4 text-warning" /> Standstill ends {{ formatDate(award.standstill_ends_at) }}</div>
          <div class="mt-4 flex flex-wrap justify-end gap-2">
            <button v-if="award.status === 'DRAFT'" type="button" class="btn btn-warning" :disabled="saving" @click="publishAward"><Icon name="lucide:megaphone" class="h-4 w-4" /> Issue proposed award</button>
            <button v-if="['PUBLISHED', 'STANDSTILL'].includes(award.status)" type="button" class="btn btn-success" :disabled="saving || hasOpenChallenge" @click="finalizeAward"><Icon name="lucide:badge-check" class="h-4 w-4" /> Confirm final award</button>
          </div>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between"><h3 class="text-sm font-semibold">Challenges and reviews</h3><span class="badge badge-ghost">{{ challenges.length }}</span></div>
          <div v-if="challenges.length === 0" class="rounded-lg border border-dashed border-base-300 p-5 text-center text-sm text-base-content/50">No challenge has been lodged.</div>
          <div v-else class="space-y-3">
            <article v-for="challenge in challenges" :key="challenge.uuid || challenge.id" class="rounded-lg border border-base-200 p-4">
              <div class="flex flex-wrap items-start justify-between gap-2"><div><p class="font-medium">Challenge {{ challenge.uuid || `#${challenge.id}` }}</p><p class="text-xs text-base-content/50">Lodged {{ formatDate(challenge.lodged_at) }}</p></div><span class="badge" :class="['LODGED', 'UNDER_REVIEW', 'REFERRED'].includes(challenge.status) ? 'badge-warning' : 'badge-neutral'">{{ pretty(challenge.status) }}</span></div>
              <p class="mt-3 whitespace-pre-line text-sm">{{ challenge.grounds }}</p>
              <div v-if="challenge.decision" class="mt-3 rounded bg-base-200/50 p-3 text-sm"><strong>Decision:</strong> {{ challenge.decision }}<p v-if="challenge.remedy"><strong>Remedy:</strong> {{ challenge.remedy }}</p></div>
              <form v-if="['LODGED', 'UNDER_REVIEW', 'REFERRED'].includes(challenge.status)" class="mt-4 grid gap-2 sm:grid-cols-2" @submit.prevent="decide(challenge)">
                <select v-model="challenge.decision_status" class="select select-sm select-bordered" required><option value="CONCEDED">Concede challenge</option><option value="REJECTED">Reject challenge</option><option value="REFERRED">Refer to PPRA</option><option value="UPHELD">Uphold and order remedy</option></select>
                <input v-model.trim="challenge.decision_text" class="input input-sm input-bordered" placeholder="Decision reasons" required>
                <input v-model.trim="challenge.remedy_text" class="input input-sm input-bordered sm:col-span-2" placeholder="Remedy, where applicable">
                <div class="flex justify-end sm:col-span-2"><button class="btn btn-sm btn-primary" type="submit" :disabled="saving">Record decision</button></div>
              </form>
            </article>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({ tender: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const { getTenderAward, saveTenderAward, publishTenderAward, finalizeTenderAward, getTenderChallenges, decideTenderChallenge, getTenderEvaluationResults } = useTenderHelper()
const loading = ref(true)
const saving = ref(false)
const award = ref(null)
const challenges = ref([])
const evaluationResults = ref([])
const message = ref('')
const messageOk = ref(true)
const awardForm = reactive({ supplier_bid_id: null, supplier_company_id: null, supplier_name: '', amount: null, currency_code: 'USD', justification: '' })

const canDraftAward = computed(() => ['EVALUATED', 'INTENTION_TO_AWARD'].includes(props.tender.status) && (!award.value || award.value.status === 'DRAFT'))
const hasOpenChallenge = computed(() => challenges.value.some(challenge => ['LODGED', 'UNDER_REVIEW', 'REFERRED'].includes(challenge.status)))
const awardStatusClass = computed(() => award.value?.status === 'FINALIZED' ? 'badge-success' : award.value?.status === 'DRAFT' ? 'badge-warning' : 'badge-info')
const passedResults = computed(() => evaluationResults.value.filter(result => result.passed))

function pretty(value) { return String(value || '—').replaceAll('_', ' ') }
function formatDate(value) { return value ? new Date(value).toLocaleString('en-ZW', { dateStyle: 'medium', timeStyle: value.includes?.('T') ? 'short' : undefined }) : '—' }
function formatMoney(value, currency) { const amount = Number(value); return Number.isFinite(amount) ? `${currency || 'USD'} ${amount.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—' }

function hydrateAward(value) {
  award.value = value
  if (value) Object.assign(awardForm, { supplier_company_id: value.supplier_company_id, supplier_name: value.supplier_name || '', amount: Number(value.amount), currency_code: value.currency_code || 'USD', justification: value.justification || '' })
}

function selectBidder() {
  const result = evaluationResults.value.find(candidate => Number(candidate.supplier_bid_id) === Number(awardForm.supplier_bid_id))
  awardForm.supplier_company_id = result?.supplier_bid?.company?.id ?? null
  awardForm.supplier_name = result?.supplier_bid?.company?.name ?? ''
  if (result?.evaluated_amount != null) awardForm.amount = Number(result.evaluated_amount)
}

async function load() {
  loading.value = true
  try {
    const [awardResult, challengeResult, resultsResult] = await Promise.all([getTenderAward(props.tender.uuid), getTenderChallenges(props.tender.uuid), getTenderEvaluationResults(props.tender.uuid)])
    hydrateAward(awardResult.data.value?.data ?? null)
    challenges.value = (challengeResult.data.value?.data ?? []).map(challenge => ({ ...challenge, decision_status: 'CONCEDED', decision_text: '', remedy_text: '' }))
    evaluationResults.value = resultsResult.data.value?.data ?? []
    if (award.value?.supplier_company_id) awardForm.supplier_bid_id = evaluationResults.value.find(result => Number(result.supplier_bid?.company?.id) === Number(award.value.supplier_company_id))?.supplier_bid_id ?? null
  } finally { loading.value = false }
}

async function perform(operation, successMessage) {
  saving.value = true
  message.value = ''
  try {
    const { data, status, error } = await operation()
    messageOk.value = status.value
    message.value = status.value ? data.value?.message || successMessage : error.value?.data?.message || 'The award action failed.'
    if (status.value) { await load(); emit('updated') }
  } finally { saving.value = false }
}

async function saveAward() { const { supplier_bid_id: _supplierBidId, ...payload } = awardForm; await perform(() => saveTenderAward(props.tender.uuid, { ...payload, supplier_company_id: awardForm.supplier_company_id || null }), 'Proposed award saved.') }
async function publishAward() { await perform(() => publishTenderAward(props.tender.uuid), 'Proposed award issued and standstill started.') }
async function finalizeAward() { await perform(() => finalizeTenderAward(props.tender.uuid), 'Final award confirmed.') }
async function decide(challenge) { await perform(() => decideTenderChallenge(props.tender.uuid, challenge.uuid || challenge.id, { status: challenge.decision_status, decision: challenge.decision_text, remedy: challenge.remedy_text || null }), 'Challenge decision recorded.') }

onMounted(load)
</script>
