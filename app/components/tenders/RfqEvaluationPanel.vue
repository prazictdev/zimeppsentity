<template>
  <section class="space-y-4">
    <div class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-4 p-4 sm:p-5">
        <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon name="lucide:route" class="h-5 w-5" /></div>
            <div><h2 class="font-semibold">RFQ evaluation workflow</h2><p class="text-sm text-base-content/60">One authorised PMU evaluator assesses quotations, then named reviewers route the recommendation to an approver.</p></div>
          </div>
          <span class="badge" :class="statusClass">{{ pretty(evaluation?.status || tender.status) }}</span>
        </header>

        <div v-if="message" class="alert py-2" :class="messageOk ? 'alert-success' : 'alert-error'"><Icon :name="messageOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-4 w-4" /><span class="text-sm">{{ message }}</span></div>
        <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50"><span class="loading loading-spinner loading-sm" /> Loading RFQ evaluation…</div>

        <template v-else>
          <ul class="steps steps-vertical w-full text-xs lg:steps-horizontal">
            <li v-for="stage in stages" :key="stage.key" class="step" :class="stage.done ? 'step-primary' : ''">{{ stage.label }}</li>
          </ul>

          <div v-if="configuration.demo_mode" class="alert alert-warning py-3"><Icon name="lucide:flask-conical" class="h-5 w-5" /><span>Demo mode permits one officer to act as evaluator, reviewer, and Accounting Officer.</span></div>

          <div v-if="canOpen" class="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <h3 class="font-medium">Ready for PMU evaluation</h3>
            <p class="mt-1 text-sm text-base-content/60">Opening decrypts the closed quotations and records you as the evaluator. No bid evaluation committee is appointed for this RFQ.</p>
            <button class="btn btn-primary btn-sm mt-3" :disabled="saving" @click="openEvaluation"><Icon name="lucide:folder-open" class="h-4 w-4" /> Open RFQ and start evaluation</button>
          </div>

          <dl v-if="evaluation" class="grid gap-3 rounded-xl border border-base-200 p-4 text-sm sm:grid-cols-3">
            <div><dt class="text-xs uppercase tracking-wide text-base-content/45">Evaluator</dt><dd class="font-medium">{{ person(evaluation.evaluator) }}</dd></div>
            <div><dt class="text-xs uppercase tracking-wide text-base-content/45">Current assignee</dt><dd class="font-medium">{{ person(evaluation.assignee) }}</dd></div>
            <div><dt class="text-xs uppercase tracking-wide text-base-content/45">Submitted</dt><dd>{{ formatDate(evaluation.submitted_at) }}</dd></div>
          </dl>

          <article v-if="isRecommendationReviewStage && recommendedBid" class="rounded-xl border border-success/30 bg-success/5 p-4">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-success">Recommended bidder</p>
                <h3 class="mt-1 text-lg font-bold">{{ bidderName(recommendedBid) }}</h3>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span class="badge badge-success">Recommended for award</span>
                  <span class="badge" :class="recommendedBid.compliance_decision?.compliant ? 'badge-success' : 'badge-error'">{{ recommendedBid.compliance_decision?.compliant ? 'Eligibility compliant' : 'Not compliant' }}</span>
                  <span class="badge" :class="recommendedBid.shortlist_decision?.shortlisted ? 'badge-info' : 'badge-ghost'">{{ recommendedBid.shortlist_decision?.shortlisted ? 'Shortlisted' : 'Not shortlisted' }}</span>
                </div>
              </div>
              <div class="text-right"><p class="text-xs text-base-content/45">Evaluated quotation</p><p class="mt-1 text-xl font-bold">{{ currencyCode }} {{ formatAmount(recommendedBid.compliance_decision?.evaluated_amount) }}</p></div>
            </div>
            <div class="mt-4 rounded-lg border border-base-200 bg-base-100/80 p-3"><p class="text-xs font-semibold uppercase tracking-wide text-base-content/45">Evaluator recommendation</p><p class="mt-1 whitespace-pre-wrap text-sm">{{ evaluation.recommendation || 'No recommendation comments recorded.' }}</p></div>
            <div class="mt-4 flex flex-wrap gap-2">
              <button class="btn btn-outline btn-sm" type="button" @click="openEligibilityData(recommendedBid)"><Icon name="lucide:clipboard-list" class="h-4 w-4" /> View eligibility data</button>
              <button class="btn btn-outline btn-sm" type="button" @click="openEligibilityEvaluation(recommendedBid)"><Icon name="lucide:clipboard-check" class="h-4 w-4" /> View eligibility evaluation</button>
            </div>
          </article>

          <section v-if="isRecommendationReviewStage && otherBids.length" class="overflow-hidden rounded-xl border border-base-200">
            <div class="border-b border-base-200 bg-base-200/40 px-4 py-3"><h3 class="font-semibold">Other bidders</h3><p class="text-xs text-base-content/55">Compare the unsuccessful responses and inspect the findings that prevented their recommendation.</p></div>
            <div class="overflow-x-auto">
              <table class="table table-sm min-w-[900px]">
                <thead><tr><th>Bidder</th><th>Eligibility</th><th>Shortlisted</th><th>Evaluated quotation</th><th>Why not recommended</th><th>Actions</th></tr></thead>
                <tbody>
                  <tr v-for="bid in otherBids" :key="bid.id" class="align-top">
                    <td class="font-medium">{{ bidderName(bid) }}</td>
                    <td><span class="badge badge-sm" :class="bid.compliance_decision?.compliant ? 'badge-success' : 'badge-error'">{{ bid.compliance_decision?.compliant ? 'Compliant' : 'Not compliant' }}</span></td>
                    <td><span class="badge badge-sm" :class="bid.shortlist_decision?.shortlisted ? 'badge-info' : 'badge-ghost'">{{ bid.shortlist_decision?.shortlisted ? 'Yes' : 'No' }}</span></td>
                    <td class="whitespace-nowrap">{{ bid.compliance_decision?.evaluated_amount == null ? '—' : `${currencyCode} ${formatAmount(bid.compliance_decision.evaluated_amount)}` }}</td>
                    <td class="max-w-sm whitespace-pre-wrap text-sm">{{ unsuccessfulReason(bid) }}</td>
                    <td><div class="flex flex-wrap gap-2"><button v-if="evaluationMode === 'COMPLIANCE'" class="btn btn-outline btn-xs" type="button" @click="openEligibilityData(bid)"><Icon name="lucide:clipboard-list" class="h-3.5 w-3.5" /> Eligibility data</button><button class="btn btn-outline btn-xs" type="button" @click="openEligibilityEvaluation(bid)"><Icon name="lucide:clipboard-check" class="h-3.5 w-3.5" /> Evaluation</button></div></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div v-if="canSubmit && !allAssessmentsSubmitted" class="alert alert-info py-3"><Icon name="lucide:clipboard-check" class="h-5 w-5" /><span>Complete the eligibility evaluation of every response below.</span></div>
          <div v-else-if="canSubmit && !shortlistComplete" class="alert alert-info py-3"><Icon name="lucide:list-checks" class="h-5 w-5" /><span>Complete and commit the bidder shortlist below before making a recommendation.</span></div>
          <form v-if="canSubmit && allAssessmentsSubmitted && shortlistComplete && !showPreviousStage && !showShortlistStage" class="grid gap-4 rounded-xl border border-info/25 bg-info/5 p-4 sm:grid-cols-2" @submit.prevent="submitEvaluation">
            <div class="flex flex-wrap items-start justify-between gap-3 sm:col-span-2"><div><h3 class="font-semibold">Recommendations</h3><p class="text-xs text-base-content/55">All responses are shown below. The compliant shortlisted bidder with the lowest evaluated quotation is recommended automatically.</p></div><button class="btn btn-outline btn-sm" type="button" @click="showShortlistStage = true"><Icon name="lucide:arrow-left" class="h-4 w-4" /> Back to Shortlist</button></div>
            <div v-if="evaluationMode === 'COMPLIANCE' && leastCostBid" class="overflow-x-auto rounded-xl border border-base-200 bg-base-100 sm:col-span-2">
              <table class="table table-sm">
                <thead><tr><th>Bidder</th><th>Eligibility</th><th>Shortlisted</th><th>Evaluated quotation</th><th>Recommendation</th></tr></thead>
                <tbody><tr v-for="bid in recommendationRows" :key="bid.id" :class="bid.id === leastCostBid.id ? 'bg-success/15' : ''">
                  <td class="font-medium">{{ bidderName(bid) }}</td>
                  <td><span class="badge badge-sm" :class="bid.compliance_decision?.compliant ? 'badge-success' : 'badge-error'">{{ bid.compliance_decision?.compliant ? 'Compliant' : 'Not compliant' }}</span></td>
                  <td><span class="badge badge-sm" :class="bid.shortlist_decision?.shortlisted ? 'badge-info' : 'badge-ghost'">{{ bid.shortlist_decision?.shortlisted ? 'Yes' : 'No' }}</span></td>
                  <td>{{ bid.compliance_decision?.evaluated_amount == null ? '—' : `${currencyCode} ${formatAmount(bid.compliance_decision.evaluated_amount)}` }}</td>
                  <td><span v-if="bid.id === leastCostBid.id" class="badge badge-success gap-1"><Icon name="lucide:award" class="h-3.5 w-3.5" /> Recommended for award</span><span v-else class="text-base-content/40">—</span></td>
                </tr></tbody>
              </table>
            </div>
            <div v-else-if="evaluationMode === 'COMPLIANCE'" class="alert alert-error py-3 sm:col-span-2"><Icon name="lucide:triangle-alert" class="h-4 w-4" /><span>No shortlisted compliant bidder has an evaluated quotation amount.</span></div>
            <label v-else class="fieldset"><span class="fieldset-legend">Recommended quotation</span><select v-model.number="submitForm.recommended_supplier_bid_id" class="select select-bordered w-full" required><option :value="null" disabled>Select bidder</option><option v-for="bid in recommendableBids" :key="bid.id" :value="bid.id">{{ bidderName(bid) }}</option></select></label>
            <label class="fieldset"><span class="fieldset-legend">First reviewer</span><select v-model.number="submitForm.reviewer_user_id" class="select select-bordered w-full" :disabled="reviewers.length === 0" required><option :value="null" disabled>{{ reviewers.length ? 'Select reviewer' : 'No eligible reviewer available' }}</option><option v-for="user in reviewers" :key="user.id" :value="user.id">{{ person(user) }}</option></select></label>
            <div v-if="reviewers.length === 0" class="alert alert-warning py-3 sm:col-span-2"><Icon name="lucide:user-round-x" class="h-5 w-5" /><span>{{ configuration.demo_mode ? 'Assign the evaluator the can.review.rfqs permission to continue the demo workflow.' : 'Add another officer to this procurement entity and assign them the can.review.rfqs permission. The evaluator cannot review their own recommendation.' }}</span></div>
            <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Evaluation recommendation</span><textarea v-model.trim="submitForm.recommendation" class="textarea textarea-bordered min-h-28 w-full" required /></label>
            <div class="flex justify-end sm:col-span-2"><button class="btn btn-info" type="submit" :disabled="saving || reviewers.length === 0 || (evaluationMode === 'COMPLIANCE' && !leastCostBid)"><Icon name="lucide:send" class="h-4 w-4" /> Send to reviewer</button></div>
          </form>

          <form v-if="canApprove" class="rounded-xl border border-success/25 bg-success/5 p-4" @submit.prevent="approveEvaluation">
            <h3 class="font-semibold">Approve evaluation and generate award</h3><p class="mt-1 text-xs text-base-content/55">Approval locks this evaluation, marks the RFQ evaluated, and creates its draft award from the recommended quotation.</p>
            <label class="fieldset mt-3"><span class="fieldset-legend">Approval comment</span><textarea v-model.trim="approvalComment" class="textarea textarea-bordered w-full" /></label>
            <div class="mt-3 flex justify-end"><button class="btn btn-success" type="submit" :disabled="saving"><Icon name="lucide:badge-check" class="h-4 w-4" /> Approve and generate award</button></div>
          </form>
        </template>
      </div>
    </div>

    <div v-if="canSubmit && evaluationMode === 'COMPLIANCE' && allAssessmentsSubmitted && showPreviousStage" class="flex justify-end"><button class="btn btn-outline btn-sm" type="button" @click="showPreviousStage = false">Return to Shortlist <Icon name="lucide:arrow-right" class="h-4 w-4" /></button></div>
    <div v-if="canSubmit && evaluationMode === 'COMPLIANCE' && shortlistComplete && showShortlistStage && !showPreviousStage" class="flex justify-end"><button class="btn btn-outline btn-sm" type="button" @click="showShortlistStage = false">Return to Recommendations <Icon name="lucide:arrow-right" class="h-4 w-4" /></button></div>
    <TendersRfqCompliancePanel v-if="canSubmit && evaluationMode === 'COMPLIANCE' && (!allAssessmentsSubmitted || showPreviousStage)" :tender-uuid="tender.uuid" :evaluator-key="evaluation?.evaluator?.uuid || evaluation?.evaluator_id" :bids="bids" @updated="load" />
    <TendersRfqShortlistPanel v-if="canSubmit && evaluationMode === 'COMPLIANCE' && allAssessmentsSubmitted && !showPreviousStage && (!shortlistComplete || showShortlistStage)" :tender-uuid="tender.uuid" :evaluator-key="evaluation?.evaluator?.uuid || evaluation?.evaluator_id" :bids="bids" @back="showPreviousStage = true" @updated="load" />
    <div v-if="results.length" class="card border border-base-200 bg-base-100 shadow-sm"><div class="card-body p-4 sm:p-5"><h3 class="font-semibold">Evaluated quotations</h3><div class="overflow-x-auto"><table class="table table-sm"><thead><tr><th>Rank</th><th>Bidder</th><th v-if="evaluationMode !== 'COMPLIANCE'">Total score</th><th>Evaluated amount</th><th>Result</th></tr></thead><tbody><tr v-for="result in results" :key="result.id"><td>{{ result.rank }}</td><td>{{ result.supplier_bid?.company?.name || `Bid ${result.supplier_bid_id}` }}</td><td v-if="evaluationMode !== 'COMPLIANCE'">{{ result.consensus_total_score }}</td><td>{{ result.evaluated_amount || '—' }}</td><td><span class="badge badge-sm" :class="result.passed ? 'badge-success' : 'badge-error'">{{ result.passed ? 'Compliant' : 'Not compliant' }}</span></td></tr></tbody></table></div></div></div>

    <form v-if="canReview" class="card grid gap-3 border border-warning/25 bg-warning/5 p-4 shadow-sm sm:grid-cols-2" @submit.prevent="routeReview">
      <div class="sm:col-span-2"><h3 class="font-semibold">Review decision</h3><p class="text-xs text-base-content/55">Forward to another reviewer, submit to an approver, or return it to the evaluator.</p></div>
      <label class="fieldset"><span class="fieldset-legend">Action</span><select v-model="reviewForm.action" class="select select-bordered" required><option value="FORWARD_REVIEW">Forward to another reviewer</option><option value="SUBMIT_FOR_APPROVAL">Send to approver</option><option value="SEND_BACK">Send back to evaluator</option></select></label>
      <label v-if="reviewForm.action !== 'SEND_BACK'" class="fieldset"><span class="fieldset-legend">Next assignee</span><select v-model.number="reviewForm.assigned_to" class="select select-bordered" required><option :value="null" disabled>Select officer</option><option v-for="user in reviewAssignees" :key="user.id" :value="user.id">{{ person(user) }}</option></select></label>
      <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Review comment</span><textarea v-model.trim="reviewForm.comment" class="textarea textarea-bordered min-h-24 w-full" required /></label>
      <div class="flex justify-end sm:col-span-2"><button class="btn btn-warning" type="submit" :disabled="saving"><Icon name="lucide:git-pull-request-arrow" class="h-4 w-4" /> Route review</button></div>
    </form>

    <dialog ref="eligibilityEvaluationDialog" class="modal">
      <div class="modal-box w-11/12 max-w-4xl p-0">
        <div class="flex items-center justify-between border-b border-base-200 px-5 py-4"><div><h2 class="font-semibold">{{ bidderName(selectedBid) }} — eligibility evaluation</h2><p class="text-xs text-base-content/50">The evaluator's committed eligibility finding and supporting comments.</p></div><button class="btn btn-circle btn-ghost btn-sm" type="button" @click="eligibilityEvaluationDialog?.close()"><Icon name="lucide:x" /></button></div>
        <div class="space-y-4 p-5">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-base-200 p-3"><p class="text-xs text-base-content/45">Decision</p><span class="badge mt-2" :class="selectedBid?.compliance_decision?.compliant ? 'badge-success' : 'badge-error'">{{ selectedBid?.compliance_decision?.compliant ? 'Compliant' : 'Not compliant' }}</span></div>
            <div class="rounded-xl border border-base-200 p-3"><p class="text-xs text-base-content/45">Evaluated quotation</p><p class="mt-2 font-bold">{{ currencyCode }} {{ formatAmount(selectedBid?.compliance_decision?.evaluated_amount) }}</p></div>
            <div class="rounded-xl border border-base-200 p-3"><p class="text-xs text-base-content/45">Committed</p><p class="mt-2 text-sm font-medium">{{ formatDate(selectedBid?.compliance_decision?.submitted_at) }}</p></div>
          </div>
          <div class="rounded-xl border border-base-200 p-4"><p class="text-xs font-semibold uppercase tracking-wide text-base-content/45">Evaluation comments</p><p class="mt-2 whitespace-pre-wrap text-sm">{{ selectedBid?.compliance_decision?.comments || 'No comments recorded.' }}</p></div>
          <div class="overflow-x-auto rounded-xl border border-base-200">
            <table class="table table-sm"><thead><tr><th>Document</th><th>Decision</th><th>Comments</th></tr></thead><tbody><tr v-for="decision in selectedBid?.compliance_decision?.document_decisions || []" :key="decision.document_uuid"><td class="font-mono text-xs">{{ decision.document_uuid }}</td><td><span class="badge badge-sm" :class="decision.compliant ? 'badge-success' : 'badge-error'">{{ decision.compliant ? 'Compliant' : 'Not compliant' }}</span></td><td class="whitespace-pre-wrap">{{ decision.comments || '—' }}</td></tr><tr v-if="!selectedBid?.compliance_decision?.document_decisions?.length"><td colspan="3" class="text-center text-base-content/45">No document-level decisions were required.</td></tr></tbody></table>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <dialog ref="eligibilityDataDialog" class="modal">
      <div class="modal-box flex h-screen max-h-none w-screen max-w-none flex-col rounded-none p-0">
        <div class="flex items-center justify-between border-b border-base-200 p-4"><div><h2 class="font-semibold">{{ bidderName(selectedBid) }} — eligibility data</h2><p class="text-xs text-base-content/50">Submitted eligibility, technical, specification, and document responses.</p></div><button class="btn btn-circle btn-ghost btn-sm" type="button" @click="closeEligibilityData"><Icon name="lucide:x" /></button></div>
        <div v-if="eligibilityLoading" class="flex flex-1 items-center justify-center gap-2"><span class="loading loading-spinner loading-sm" /> Loading eligibility data…</div>
        <div v-else class="grid min-h-0 flex-1 lg:grid-cols-[minmax(420px,1fr)_minmax(420px,1fr)]">
          <div class="overflow-y-auto border-r border-base-200 p-4">
            <section class="mb-6 rounded-lg border border-info/30 bg-info/5 p-3"><div class="flex items-center gap-2"><span class="badge badge-info badge-sm">{{ eligibilityReview.scope?.response_rules || 'Response' }}</span><p class="text-sm font-medium">Evaluation scope</p></div><div v-for="lot in eligibilityReview.scope?.lots || []" :key="lot.id" class="mt-2 text-xs"><p class="font-medium">{{ lot.description }}</p><p class="text-base-content/60">{{ lot.products.map(product => product.description).join(', ') || 'No responded items' }}</p></div></section>
            <section v-for="section in eligibilityResponseSections" :key="section.title" class="mt-6 space-y-2"><h3 class="font-semibold">{{ section.title }}</h3><article v-for="row in section.rows" :key="row.uuid" class="rounded-lg border border-base-200 p-3"><p class="text-xs text-base-content/45">{{ [row.group, row.lot, row.product].filter(Boolean).join(' · ') }}</p><p class="mt-1 text-sm font-medium">{{ row.question }}</p><div class="mt-2 flex items-center justify-between gap-2"><span class="badge badge-outline">{{ displayEligibilityResponse(row) }}</span><button v-if="row.file" class="btn btn-outline btn-xs" type="button" @click="activeEligibilityDocument = row.file">View attachment</button></div></article><p v-if="!section.rows.length" class="text-sm text-base-content/45">No responses configured.</p></section>
            <section class="mt-6 space-y-2"><h3 class="font-semibold">Specification compliance</h3><article v-for="row in eligibilityReview.specifications" :key="row.uuid" class="rounded-lg border border-base-200 p-3"><p class="text-xs text-base-content/45">{{ row.lot }} · {{ row.product }}</p><div class="mt-1 flex justify-between gap-3"><p class="text-sm font-medium">{{ row.specification }}: {{ row.required_value }}</p><span class="badge" :class="row.status === 'COMPLIANT' ? 'badge-success' : 'badge-warning'">{{ displayEligibilityAnswer(row.status) }}</span></div><p v-if="row.offered_value || row.manufacturer_model || row.explanation" class="mt-2 text-xs text-base-content/60">Offered: {{ row.offered_value || '—' }} <span v-if="row.manufacturer_model">· {{ row.manufacturer_model }}</span> <span v-if="row.explanation">· {{ row.explanation }}</span></p><button v-if="row.file" class="btn btn-outline btn-xs mt-2" type="button" @click="activeEligibilityDocument = row.file">View supporting document</button></article><p v-if="!eligibilityReview.specifications.length" class="text-sm text-base-content/45">No specifications configured.</p></section>
            <section class="mt-6 space-y-2"><h3 class="font-semibold">Attached documents</h3><button v-for="document in eligibilityDocuments" :key="document.uuid" class="w-full rounded-lg border p-3 text-left text-sm" :class="activeEligibilityDocument?.uuid === document.uuid ? 'border-primary bg-primary/5' : 'border-base-200'" type="button" @click="activeEligibilityDocument = document"><p class="font-medium">{{ document.title || document.file_name }}</p><p class="mt-1 truncate text-xs text-base-content/45">{{ document.file_name }}</p></button><p v-if="!eligibilityDocuments.length" class="text-sm text-base-content/45">No attached documents.</p></section>
          </div>
          <div class="min-h-0 bg-base-200/40 p-3"><img v-if="activeEligibilityDocument?.mime_type?.startsWith('image/')" :src="activeEligibilityDocument.url" class="mx-auto max-h-full max-w-full object-contain" :alt="activeEligibilityDocument.title"><iframe v-else-if="activeEligibilityDocument" :src="activeEligibilityDocument.url" class="h-full w-full rounded-lg bg-white" :title="activeEligibilityDocument.title || activeEligibilityDocument.file_name" /><div v-else class="flex h-full items-center justify-center text-base-content/40">Select an attachment to view it.</div></div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button @click="closeEligibilityData">close</button></form>
    </dialog>

  </section>
</template>

<script setup>
const props = defineProps({ tender: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const { getRfqEvaluation, getRfqBidEligibility, openRfqEvaluation, submitRfqEvaluation, reviewRfqEvaluation, approveRfqEvaluation } = useTenderHelper()
const loading = ref(true), saving = ref(false), evaluation = ref(null), evaluationMode = ref('SCORING'), shortlistComplete = ref(false), showPreviousStage = ref(false), showShortlistStage = ref(false), results = ref([]), reviewers = ref([]), approvers = ref([]), bids = ref([]), abilities = ref({}), configuration = ref({ demo_mode: false }), currencyCode = ref('USD'), message = ref(''), messageOk = ref(true), approvalComment = ref('')
const eligibilityDataDialog = ref(null), eligibilityEvaluationDialog = ref(null), selectedBid = ref(null), eligibilityLoading = ref(false), eligibilityDocuments = ref([]), activeEligibilityDocument = ref(null)
const eligibilityReview = ref({ scope: null, eligibility: [], technical: [], specifications: [] })
const submitForm = reactive({ recommended_supplier_bid_id: null, reviewer_user_id: null, recommendation: '' })
const reviewForm = reactive({ action: 'FORWARD_REVIEW', assigned_to: null, comment: '' })
const canOpen = computed(() => abilities.value.evaluate && !evaluation.value && ['SUBMISSIONS_CLOSED', 'OPENED'].includes(props.tender.status))
const canSubmit = computed(() => abilities.value.is_evaluator && ['DRAFT', 'RETURNED_TO_EVALUATOR'].includes(evaluation.value?.status))
const canReview = computed(() => abilities.value.review && abilities.value.assigned && evaluation.value?.status === 'PENDING_REVIEW')
const canApprove = computed(() => abilities.value.approve && abilities.value.assigned && evaluation.value?.status === 'PENDING_APPROVAL')
const reviewAssignees = computed(() => reviewForm.action === 'SUBMIT_FOR_APPROVAL' ? approvers.value : reviewers.value)
const isRecommendationReviewStage = computed(() => ['PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED'].includes(evaluation.value?.status))
const recommendedBid = computed(() => bids.value.find(bid => Number(bid.id) === Number(evaluation.value?.recommended_supplier_bid_id)) || null)
const otherBids = computed(() => recommendationRows.value.filter(bid => Number(bid.id) !== Number(evaluation.value?.recommended_supplier_bid_id)))
const eligibilityResponseSections = computed(() => [{ title: 'Eligibility responses', rows: eligibilityReview.value.eligibility }, { title: 'Technical responses', rows: eligibilityReview.value.technical }])
const statusClass = computed(() => evaluation.value?.status === 'APPROVED' ? 'badge-success' : evaluation.value?.status?.startsWith('PENDING') ? 'badge-warning' : 'badge-outline')
const allAssessmentsSubmitted = computed(() => bids.value.length > 0 && bids.value.every(bid => bid.evaluator_submission?.status === 'SUBMITTED'))
const recommendableBids = computed(() => evaluationMode.value === 'COMPLIANCE' ? bids.value.filter(bid => bid.compliance_decision?.compliant && bid.shortlist_decision?.shortlisted) : bids.value)
const leastCostBid = computed(() => [...recommendableBids.value]
  .filter(bid => bid.compliance_decision?.evaluated_amount != null)
  .sort((left, right) => Number(left.compliance_decision.evaluated_amount) - Number(right.compliance_decision.evaluated_amount) || Number(left.id) - Number(right.id))[0] || null)
const recommendationRows = computed(() => [...bids.value].sort((left, right) => {
  if (left.id === leastCostBid.value?.id) return -1
  if (right.id === leastCostBid.value?.id) return 1
  const leftAmount = left.compliance_decision?.evaluated_amount == null ? Number.POSITIVE_INFINITY : Number(left.compliance_decision.evaluated_amount)
  const rightAmount = right.compliance_decision?.evaluated_amount == null ? Number.POSITIVE_INFINITY : Number(right.compliance_decision.evaluated_amount)
  return leftAmount - rightAmount || Number(left.id) - Number(right.id)
}))
const activeStage = computed(() => {
  if (!evaluation.value) return 'EVALUATOR'
  if (['DRAFT', 'RETURNED_TO_EVALUATOR'].includes(evaluation.value.status)) {
    if (!allAssessmentsSubmitted.value || showPreviousStage.value) return 'COMPLIANCE'
    return shortlistComplete.value && !showShortlistStage.value ? 'RECOMMENDATIONS' : 'SHORTLIST'
  }
  if (evaluation.value.status === 'PENDING_REVIEW') return 'REVIEW'
  if (evaluation.value.status === 'PENDING_APPROVAL') return 'ACCOUNTING_OFFICER'
  if (evaluation.value.status === 'APPROVED') return 'AWARD'
  return 'EVALUATOR'
})
const stages = computed(() => {
  const order = ['EVALUATOR', 'COMPLIANCE', 'SHORTLIST', 'RECOMMENDATIONS', 'REVIEW', 'ACCOUNTING_OFFICER', 'AWARD']
  return [
    { key: 'EVALUATOR', label: 'PMU evaluator' },
    { key: 'COMPLIANCE', label: 'Compliance review' },
    { key: 'SHORTLIST', label: 'Shortlist' },
    { key: 'RECOMMENDATIONS', label: 'Recommendations' },
    { key: 'REVIEW', label: 'Review recommendation' },
    { key: 'ACCOUNTING_OFFICER', label: 'Accounting Officer' },
    { key: 'AWARD', label: 'Award' },
  ].map(stage => ({ ...stage, done: order.indexOf(activeStage.value) >= order.indexOf(stage.key) }))
})

watch(() => reviewForm.action, () => { reviewForm.assigned_to = null })
function person(user) { return user ? `${user.name || ''} ${user.lastname || ''}`.trim() || user.email : '—' }
function bidderName(bid) { return bid?.bidder?.name || bid?.company?.name || `Bid ${bid?.id}` }
function formatAmount(value) { return new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0)) }
function pretty(value) { return String(value || 'Not started').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase()) }
function formatDate(value) { return value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }
function failure(error, fallback) { return error?.value?.data?.message || error?.value?.response?._data?.message || fallback }
const displayEligibilityAnswer = value => value === null || value === undefined || value === '' ? 'Not answered' : String(value).replaceAll('_', ' ')
const displayEligibilityResponse = row => row?.answer !== null && row?.answer !== undefined && row?.answer !== '' ? displayEligibilityAnswer(row.answer) : row?.file ? 'Attachment provided' : 'Not answered'

function unsuccessfulReason(bid) {
  if (bid.compliance_decision && !bid.compliance_decision.compliant) return `Failed eligibility evaluation${bid.compliance_decision.comments ? `: ${bid.compliance_decision.comments}` : '.'}`
  if (bid.shortlist_decision && !bid.shortlist_decision.shortlisted) return `Not shortlisted${bid.shortlist_decision.comments ? `: ${bid.shortlist_decision.comments}` : '.'}`
  const bidAmount = bid.compliance_decision?.evaluated_amount
  const winningAmount = recommendedBid.value?.compliance_decision?.evaluated_amount
  if (bidAmount != null && winningAmount != null && Number(bidAmount) > Number(winningAmount)) return `Higher evaluated quotation by ${currencyCode.value} ${formatAmount(Number(bidAmount) - Number(winningAmount))}.`
  const result = results.value.find(row => Number(row.supplier_bid_id) === Number(bid.id))
  const winningResult = results.value.find(row => Number(row.supplier_bid_id) === Number(recommendedBid.value?.id))
  if (result && !result.passed) return 'Did not pass the final evaluation.'
  if (result?.consensus_total_score != null && winningResult?.consensus_total_score != null && Number(result.consensus_total_score) < Number(winningResult.consensus_total_score)) return `Lower total score (${result.consensus_total_score} versus ${winningResult.consensus_total_score}).`
  return 'Not selected in the evaluator recommendation.'
}

function openEligibilityEvaluation(bid) {
  selectedBid.value = bid
  eligibilityEvaluationDialog.value?.showModal()
}

async function openEligibilityData(bid) {
  selectedBid.value = bid
  eligibilityLoading.value = true
  eligibilityDocuments.value = []
  activeEligibilityDocument.value = null
  eligibilityReview.value = { scope: null, eligibility: [], technical: [], specifications: [] }
  eligibilityDataDialog.value?.showModal()
  const response = await getRfqBidEligibility(props.tender.uuid, bid.uuid)
  if (response.status.value) {
    const payload = response.data.value?.data || {}
    eligibilityReview.value = { scope: payload.scope || null, eligibility: payload.eligibility || [], technical: payload.technical || [], specifications: payload.specifications || [] }
    eligibilityDocuments.value = payload.documents || []
  } else {
    messageOk.value = false
    message.value = failure(response.error, 'Eligibility data could not be loaded.')
    eligibilityDataDialog.value?.close()
  }
  eligibilityLoading.value = false
}

function closeEligibilityData() {
  eligibilityDataDialog.value?.close()
  activeEligibilityDocument.value = null
}

async function load() {
  loading.value = true
  const workflow = await getRfqEvaluation(props.tender.uuid)
  if (workflow.status.value) {
    const payload = workflow.data.value?.data || {}
    evaluation.value = payload.evaluation || null; evaluationMode.value = payload.evaluation_mode || 'SCORING'; shortlistComplete.value = Boolean(payload.shortlist_complete); results.value = payload.results || []; reviewers.value = payload.eligible_reviewers || []; approvers.value = payload.eligible_approvers || []; abilities.value = payload.abilities || {}; configuration.value = payload.configuration || { demo_mode: false }; currencyCode.value = payload.currency_code || 'USD'; bids.value = payload.bids || []
  } else {
    messageOk.value = false; message.value = failure(workflow.error, 'RFQ evaluation workspace could not be loaded.')
  }
  loading.value = false
}
async function run(action, success, fallback) {
  saving.value = true; message.value = ''
  const response = await action()
  messageOk.value = response.status.value; message.value = response.status.value ? success : failure(response.error, fallback)
  if (response.status.value) { emit('updated'); await load() }
  saving.value = false
}
const openEvaluation = () => run(() => openRfqEvaluation(props.tender.uuid), 'RFQ opened and evaluation started.', 'RFQ could not be opened.')
const submitEvaluation = () => run(() => submitRfqEvaluation(props.tender.uuid, { ...submitForm, recommended_supplier_bid_id: evaluationMode.value === 'COMPLIANCE' ? null : submitForm.recommended_supplier_bid_id }), 'Least-cost recommendation sent to the reviewer.', 'Evaluation could not be submitted.')
const routeReview = () => run(() => reviewRfqEvaluation(props.tender.uuid, { ...reviewForm, assigned_to: reviewForm.action === 'SEND_BACK' ? null : reviewForm.assigned_to }), 'Review routed to the next officer.', 'Review could not be routed.')
const approveEvaluation = () => run(() => approveRfqEvaluation(props.tender.uuid, { comment: approvalComment.value || null }), 'Evaluation approved and draft award generated.', 'Evaluation could not be approved.')
onMounted(load)
</script>
