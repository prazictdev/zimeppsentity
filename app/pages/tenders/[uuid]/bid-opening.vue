<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <header class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4 sm:p-5">
        <div class="breadcrumbs text-sm"><ul><li><NuxtLink to="/dashboard">Home</NuxtLink></li><li><NuxtLink to="/tenders/closed">Closed tenders</NuxtLink></li><li>Bid opening</li></ul></div>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><h1 class="text-xl font-bold">{{ isEoiOpening ? 'Controlled EOI opening' : isConsultancySelection ? 'Controlled consultancy proposal opening' : 'Controlled bid opening' }}</h1><p class="text-sm text-base-content/60">Appoint the opening team before response totals or decryption become available.</p></div>
          <NuxtLink to="/tenders/closed" class="btn btn-ghost btn-sm"><Icon name="lucide:arrow-left" class="h-4 w-4" /> Closed tenders</NuxtLink>
        </div>
      </div>
    </header>

    <div v-if="loading" class="card border border-base-200 bg-base-100"><div class="card-body flex-row gap-2"><span class="loading loading-spinner loading-sm" /> Loading opening process…</div></div>
    <div v-else-if="errorMessage" class="alert alert-error"><Icon name="lucide:alert-triangle" class="h-5 w-5" />{{ errorMessage }}</div>

    <template v-else-if="tender && process">
      <ul class="steps w-full text-xs sm:text-sm">
        <li class="step step-success">{{ isEoiOpening ? 'EOI closed' : 'Tender closed' }}</li>
        <li class="step" :class="process.team_ready ? 'step-success' : ''">Opening team</li>
        <li class="step" :class="process.team_ready ? 'step-success' : ''">Responses disclosed</li>
        <li class="step" :class="process.opened ? 'step-success' : ''">Decrypt & report</li>
      </ul>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main class="space-y-6">
          <section class="card border border-base-200 bg-base-100 shadow-sm">
            <div class="card-body gap-4 p-4 sm:p-5">
              <div class="flex items-start justify-between gap-3">
                <div><h2 class="font-semibold">Bid-opening team</h2><p class="text-sm text-base-content/55">A minimum of {{ process.minimum_team_size }} users associated with {{ customerName }} are required.</p></div>
                <span class="badge" :class="process.team_ready ? 'badge-success' : 'badge-warning'">{{ process.team.length }} / {{ process.minimum_team_size }}</span>
              </div>

              <div v-if="actionMessage" class="alert py-2" :class="actionOk ? 'alert-success' : 'alert-error'">{{ actionMessage }}</div>
              <div class="overflow-x-auto rounded-lg border border-base-200">
                <table class="table table-sm"><thead><tr><th>Member</th><th>Email</th><th>Appointed</th><th /></tr></thead>
                  <tbody>
                    <tr v-for="member in process.team" :key="member.uuid">
                      <td>{{ fullName(member.user) }}</td><td>{{ member.user?.email }}</td><td>{{ formatDate(member.appointed_at) }}</td>
                      <td class="text-right"><button v-if="!process.opened" class="btn btn-ghost btn-xs text-error" :disabled="saving" @click="removeMember(member)"><Icon name="lucide:trash-2" /></button></td>
                    </tr>
                    <tr v-if="!process.team.length"><td colspan="4" class="py-8 text-center text-base-content/45">No opening-team users appointed.</td></tr>
                  </tbody>
                </table>
              </div>

              <form v-if="!process.opened" class="flex flex-col gap-2 sm:flex-row" @submit.prevent="addMember">
                <select v-model.number="selectedUserId" class="select select-bordered flex-1" required>
                  <option :value="null" disabled>Select a user from {{ customerName }}</option>
                  <option v-for="user in availableUsers" :key="user.id" :value="user.id">{{ fullName(user) }} — {{ user.email }}</option>
                </select>
                <button class="btn btn-outline" :disabled="saving || !selectedUserId"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:user-plus" class="h-4 w-4" /> Appoint user</button>
              </form>
            </div>
          </section>

          <section v-if="process.team_ready" class="card border border-base-200 bg-base-100 shadow-sm">
            <div class="card-body gap-5 p-4 sm:p-5">
              <div class="flex items-center justify-between gap-3"><div><h2 class="font-semibold">Responses received</h2><p class="text-sm text-base-content/55">{{ process.opened ? 'Count recorded when the sealed responses were opened.' : 'The count is disclosed only after the opening team is complete.' }}</p></div><div class="text-3xl font-bold tabular-nums">{{ process.response_count }}</div></div>
              <div v-if="!process.opened && process.response_count === 0" class="alert alert-info"><Icon name="lucide:inbox" class="h-5 w-5" />No suppliers submitted a response. Decryption is not available.</div>
              <div v-else-if="!process.opened && !process.authorized_to_decrypt" class="alert alert-error">
                <Icon name="lucide:shield-alert" class="h-5 w-5" />
                You require the {{ process.required_decrypt_permission }} permission to decrypt these {{ isEoiOpening ? 'EOI' : 'tender' }} responses.
              </div>
              <div v-else-if="!process.opened" class="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <h3 class="font-semibold">Decrypt sealed responses</h3>
                <p class="mt-1 text-sm text-base-content/65">{{ isEoiOpening ? 'This action decrypts every sealed EOI submission, creates the non-ranked opening record, and sends it to all participating firms and opening-team members.' : stagedOpening ? 'This action decrypts technical envelopes only. Financial ciphertext and sealed keys remain untouched until technical consensus is locked.' : 'This irreversible action decrypts every active submission, creates the non-ranked opening report, and sends it to all participating bidders and opening-team members.' }}</p>
                <label class="mt-4 flex cursor-pointer items-start gap-3"><input v-model="confirmed" type="checkbox" class="checkbox checkbox-warning"><span class="text-sm">I confirm the opening team is present and authorises this controlled opening.</span></label>
                <button class="btn btn-warning mt-4" :disabled="!confirmed || decrypting || !process.can_decrypt" @click="decryptBids"><span v-if="decrypting" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:unlock-keyhole" class="h-4 w-4" /> Decrypt {{ isEoiOpening ? 'EOI' : 'tender' }} responses</button>
              </div>
            </div>
          </section>

          <section v-if="process.opened && process.proposal_mode === 'TWO'" class="card border border-primary/25 bg-base-100 shadow-sm">
            <div class="card-body gap-4 p-4 sm:p-5">
              <div>
                <h2 class="font-semibold">Financial envelope opening</h2>
                <p class="text-sm text-base-content/55">Financial envelopes remain encrypted until technical consensus is locked. Only technically qualified bidders are opened.</p>
              </div>
              <div v-if="process.financial_opened" class="alert alert-success"><Icon name="lucide:check-circle-2" class="h-5 w-5" />Qualified financial envelopes have been opened and audited.</div>
              <div v-else-if="!process.can_open_financial" class="alert alert-info"><Icon name="lucide:lock" class="h-5 w-5" />Complete and lock technical consensus before financial opening becomes available.</div>
              <button v-else class="btn btn-primary self-start" :disabled="financialDecrypting" @click="decryptFinancialBids">
                <span v-if="financialDecrypting" class="loading loading-spinner loading-sm" />
                <Icon v-else name="lucide:badge-dollar-sign" class="h-4 w-4" /> Open qualified financial envelopes
              </button>
            </div>
          </section>

          <section v-if="process.financial_opened && process.financial_envelopes?.length" class="card border border-base-200 bg-base-100 shadow-sm">
            <div class="card-body gap-4 p-4 sm:p-5">
              <div><h2 class="font-semibold">Unopened financial-envelope disposition</h2><p class="text-sm text-base-content/55">Record how each technically disqualified bidder’s still-encrypted financial envelope is retained, returned or destroyed.</p></div>
              <div class="overflow-x-auto rounded-lg border border-base-200"><table class="table table-sm"><thead><tr><th>Bidder</th><th>Outcome</th><th>Recorded</th></tr></thead><tbody><tr v-for="item in process.financial_envelopes" :key="item.supplier_bid_id"><td>{{ item.supplier }}</td><td><select v-model="financialDispositions[item.supplier_bid_id]" class="select select-sm select-bordered"><option value="RETAINED">Retained</option><option value="RETURNED">Returned</option><option value="DESTROYED">Destroyed</option></select></td><td>{{ formatDate(item.recorded_at) }}</td></tr></tbody></table></div>
              <button class="btn btn-outline self-end" :disabled="savingDispositions" @click="saveDispositions"><span v-if="savingDispositions" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:archive" class="h-4 w-4" /> Save disposition record</button>
            </div>
          </section>

          <section v-if="process.report" class="card border border-success/30 bg-base-100 shadow-sm">
            <div class="card-body gap-4 p-4 sm:p-5">
              <div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="font-semibold">{{ isEoiOpening ? 'EOI opening report' : isConsultancySelection ? 'Consultancy proposal-opening report' : 'Bid-opening report' }}</h2><p class="text-sm text-success">Distributed to participating bidders and the bid-opening team.</p></div><NuxtLink v-if="isEoiOpening" :to="`/tenders/${uuid}?tab=eoi`" class="btn btn-primary btn-sm"><Icon name="lucide:list-checks" class="h-4 w-4" />Continue to EOI evaluation</NuxtLink><NuxtLink v-else-if="process.evaluation_workflow === 'RFQ'" :to="`/evaluations/${uuid}`" class="btn btn-primary btn-sm"><Icon name="lucide:list-checks" class="h-4 w-4" />Open RFQ evaluation</NuxtLink><NuxtLink v-else-if="process.evaluation_method?.code === 'LCS'" :to="`/evaluations/least-cost-selection/${uuid}`" class="btn btn-primary btn-sm"><Icon name="lucide:list-checks" class="h-4 w-4" />Start least-cost evaluation</NuxtLink><NuxtLink v-else-if="isConsultancySelection" :to="`/tenders/${uuid}?tab=evaluation-committee`" class="btn btn-primary btn-sm"><Icon name="lucide:users" class="h-4 w-4" />Continue to consultancy evaluation</NuxtLink></div>
              <div class="alert border border-info/25 bg-info/5 text-sm">{{ isConsultancySelection ? 'The technical proposals were opened without disclosing or evaluating the sealed financial proposals. This report does not score or rank consultants.' : process.report.notice }}</div>
              <div v-if="isConsultancySelection" class="overflow-x-auto rounded-lg border border-base-200">
                <table class="table table-sm w-full">
                  <thead><tr><th>Consultant</th><th>Technical proposal</th><th>Financial proposal</th><th>Next step</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, index) in process.report.rows" :key="`${row.bidder_name}-${index}`">
                      <td class="font-medium">{{ row.bidder_name }}</td>
                      <td><span class="badge badge-success badge-sm">Opened securely</span></td>
                      <td><span class="badge badge-sm" :class="process.proposal_mode === 'TWO' && !process.financial_opened ? 'badge-warning' : 'badge-success'">{{ process.proposal_mode === 'TWO' && !process.financial_opened ? 'Sealed pending technical evaluation' : process.proposal_mode === 'TWO' ? 'Opened' : 'Not applicable for QBS' }}</span></td>
                      <td class="text-sm">Appoint the evaluation committee and begin technical scoring.</td>
                    </tr>
                    <tr v-if="!process.report.rows?.length"><td colspan="4" class="py-8 text-center text-base-content/45">No consultancy proposals were recorded.</td></tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="overflow-x-auto rounded-lg border border-base-200">
                <table class="table table-sm w-full">
                  <thead><tr><th>Bidder name</th><th>Responded to</th><th class="text-right">Quantity</th><th class="text-right">Unit price</th><th class="text-right">Amount quoted</th></tr></thead>
                  <tbody>
                    <tr v-for="(row, index) in process.report.rows" :key="`${row.bidder_name}-${row.responded_to}-${index}`">
                      <td class="font-medium">{{ row.bidder_name }}</td>
                      <td>{{ row.responded_to }}</td>
                      <td class="text-right tabular-nums">{{ row.quantity ?? '—' }}</td>
                      <td class="text-right font-mono">{{ formatAmount(row.unit_price) }}</td>
                      <td class="text-right font-mono font-semibold">{{ formatAmount(row.amount_quoted) }}</td>
                    </tr>
                    <tr v-if="!process.report.rows?.length"><td colspan="5" class="py-8 text-center text-base-content/45">No quoted items were recorded.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section v-if="process.opened && !isEoiOpening && !isConsultancySelection" class="card border border-warning/30 bg-base-100 shadow-sm">
            <div class="card-body gap-4 p-4 sm:p-5">
              <div><h2 class="font-semibold">Specification deviation matrix</h2><p class="text-sm text-base-content/55">Alternatives and mandatory non-compliance are flagged for evaluation. This table does not make the final evaluation decision.</p></div>
              <div class="overflow-x-auto rounded-lg border border-base-200"><table class="table table-sm"><thead><tr><th>Bidder</th><th>Product / specification</th><th>Required</th><th>Bidder response</th><th>Offered alternative</th><th>Explanation</th><th>Evidence</th></tr></thead><tbody>
                <tr v-for="(row, index) in process.deviation_matrix" :key="`${row.version_uuid}-${row.specification_uuid}-${index}`" :class="row.flag ? 'bg-warning/5' : ''">
                  <td class="font-medium">{{ row.bidder_name }}</td><td><p>{{ row.product }}</p><p class="text-xs font-semibold">{{ row.specification }}</p><span :class="['badge badge-xs mt-1', row.acceptance_policy === 'MANDATORY' ? 'badge-error' : 'badge-ghost']">{{ policyLabel(row.acceptance_policy) }}</span></td><td>{{ row.required_value || '—' }}</td><td><span :class="['badge badge-sm', row.status === 'COMPLIANT' ? 'badge-success' : row.status === 'ALTERNATIVE' ? 'badge-warning' : 'badge-error']">{{ responseLabel(row.status) }}</span><p v-if="row.flag" class="mt-1 text-xs font-semibold text-warning">{{ row.flag === 'MANDATORY_NON_COMPLIANCE' ? 'Mandatory requirement' : 'Review alternative' }}</p></td><td><p>{{ row.offered_value || '—' }}</p><p v-if="row.manufacturer_model" class="text-xs text-base-content/55">{{ row.manufacturer_model }}</p></td><td class="min-w-56 text-sm">{{ row.explanation || '—' }}</td><td><button v-if="row.has_supporting_document" class="btn btn-outline btn-xs" :disabled="deviationDownloading === row.specification_uuid" @click="downloadDeviationDocument(row)"><span v-if="deviationDownloading === row.specification_uuid" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:download" class="h-3.5 w-3.5" />Datasheet</button><span v-else>—</span></td>
                </tr>
                <tr v-if="!process.deviation_matrix?.length"><td colspan="7" class="py-8 text-center text-base-content/45">No specification responses were recorded.</td></tr>
              </tbody></table></div>
            </div>
          </section>
        </main>

        <aside class="space-y-4">
          <div class="card border border-base-200 bg-base-100 shadow-sm"><div class="card-body gap-3 p-4"><h2 class="text-sm font-semibold">Tender</h2><dl class="space-y-3 text-sm"><div><dt class="text-xs uppercase text-base-content/45">Reference</dt><dd class="font-mono">{{ tender.tendernumber || '—' }}</dd></div><div><dt class="text-xs uppercase text-base-content/45">Title</dt><dd>{{ tender.title }}</dd></div><div><dt class="text-xs uppercase text-base-content/45">Status</dt><dd><span class="badge badge-neutral badge-sm">{{ tender.status }}</span></dd></div></dl></div></div>
          <div class="alert border border-info/25 bg-info/5 text-sm"><Icon name="lucide:scale" class="h-5 w-5 shrink-0" /><span>{{ isConsultancySelection ? 'For two-envelope consultancy selection, only technical proposals are disclosed at this stage. Financial proposals remain sealed until technical consensus is complete.' : 'The opening report lists bidder names, items responded to and quoted amounts only. It does not compare or rank bidders.' }}</span></div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Controlled bid opening' })
const { guardPage } = useCheckPermission('tenders')
const { getTender, getTenderBidOpening, addTenderBidOpeningTeamMember, removeTenderBidOpeningTeamMember, decryptTenderBids, decryptTenderFinancialBids, saveTenderFinancialEnvelopeDispositions } = useTenderHelper()
const route = useRoute(); const uuid = String(route.params.uuid)
const sanctumClient = useSanctumClient()
const loading = ref(true); const saving = ref(false); const decrypting = ref(false); const financialDecrypting = ref(false); const tender = ref(null); const process = ref(null)
const deviationDownloading = ref(null)
const savingDispositions = ref(false); const financialDispositions = reactive({})
const errorMessage = ref(''); const actionMessage = ref(''); const actionOk = ref(true); const selectedUserId = ref(null); const confirmed = ref(false)
const availableUsers = computed(() => { const ids = new Set((process.value?.team ?? []).map(m => Number(m.user_id))); return (process.value?.eligible_users ?? []).filter(u => !ids.has(Number(u.id))) })
const customerName = computed(() => process.value?.customer?.name || 'this tender customer')
const fullName = user => [user?.name, user?.lastname].filter(Boolean).join(' ') || '—'
const formatDate = value => value ? new Date(value).toLocaleString('en-ZW') : '—'
const formatAmount = value => value == null || value === '' ? '—' : new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))
const policyLabel = value => ({ MANDATORY: 'Mandatory', EQUIVALENT_ALLOWED: 'Equivalent allowed', PREFERRED: 'Preferred' })[value] || 'Equivalent allowed'
const responseLabel = value => ({ COMPLIANT: 'Compliant', ALTERNATIVE: 'Alternative offered', NOT_COMPLIANT: 'Not compliant' })[value] || 'Not answered'
const stagedOpening = computed(() => ['QBS', 'QCBS'].includes(process.value?.evaluation_method?.code))
const isConsultancySelection = stagedOpening
const isEoiOpening = computed(() => process.value?.opening_phase === 'EOI')
async function downloadDeviationDocument(row) { deviationDownloading.value = row.specification_uuid; try { const response = await sanctumClient(`/api/v1/me/tenders/${uuid}/bid-opening/versions/${row.version_uuid}/documents/${row.specification_uuid}`); if (response?.data?.url) window.open(response.data.url, '_blank', 'noopener') } finally { deviationDownloading.value = null } }
async function load() { loading.value = true; errorMessage.value = ''; try { const [a, b] = await Promise.all([getTender(uuid), getTenderBidOpening(uuid)]); if (a.error.value || b.error.value) { errorMessage.value = a.error.value?.data?.message || b.error.value?.data?.message || 'Could not load bid opening.'; return } tender.value = a.data.value?.data; process.value = b.data.value?.data; for (const item of process.value?.financial_envelopes || []) financialDispositions[item.supplier_bid_id] = item.disposition === 'RETURN_PENDING' ? 'RETAINED' : item.disposition || 'RETAINED' } finally { loading.value = false } }
async function addMember() { if (!selectedUserId.value) return; saving.value = true; const r = await addTenderBidOpeningTeamMember(uuid, selectedUserId.value); actionOk.value = r.status.value; actionMessage.value = r.status.value ? 'Opening-team user appointed.' : r.error.value?.data?.message || 'Could not appoint user.'; if (r.status.value) { selectedUserId.value = null; await load() } saving.value = false }
async function removeMember(member) { saving.value = true; const r = await removeTenderBidOpeningTeamMember(uuid, member.uuid); actionOk.value = r.status.value; actionMessage.value = r.status.value ? 'Opening-team user removed.' : r.error.value?.data?.message || 'Could not remove user.'; if (r.status.value) await load(); saving.value = false }
async function decryptBids() { decrypting.value = true; actionMessage.value = ''; const r = await decryptTenderBids(uuid); actionOk.value = r.status.value; actionMessage.value = r.status.value ? 'Responses decrypted and report distributed.' : r.error.value?.data?.message || 'Decryption failed.'; if (r.status.value) await load(); decrypting.value = false }
async function decryptFinancialBids() { financialDecrypting.value = true; actionMessage.value = ''; const r = await decryptTenderFinancialBids(uuid); actionOk.value = r.status.value; actionMessage.value = r.status.value ? 'Qualified financial envelopes opened.' : r.error.value?.data?.message || 'Financial opening failed.'; if (r.status.value) await load(); financialDecrypting.value = false }
async function saveDispositions() { savingDispositions.value = true; actionMessage.value = ''; const responses = (process.value?.financial_envelopes || []).map(item => ({ supplier_bid_id: item.supplier_bid_id, outcome: financialDispositions[item.supplier_bid_id] })); const r = await saveTenderFinancialEnvelopeDispositions(uuid, responses); actionOk.value = r.status.value; actionMessage.value = r.status.value ? 'Financial-envelope dispositions recorded.' : r.error.value?.data?.message || 'Disposition recording failed.'; if (r.status.value) await load(); savingDispositions.value = false }
onMounted(async () => { await guardPage('can.access.tenders', 'You do not have permission to view tenders.'); await load() })
</script>
