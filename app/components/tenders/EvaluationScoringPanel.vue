<template>
  <section class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-5 p-4 sm:p-5">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info"><Icon name="lucide:list-checks" class="h-5 w-5" /></div><div><h2 class="font-semibold">{{ rfqMode ? 'RFQ compliance review' : 'Bid evaluation' }}</h2><p class="text-sm text-base-content/60">{{ twoEnvelope ? 'Two-envelope evaluation: eligibility and technical assessment must be completed before any qualified financial proposal is opened.' : rfqMode ? 'Confirm compliance and the evaluated quotation amount for every response before making a recommendation.' : 'Individual scores are recorded first. Consensus produces a ranked recommendation, not an automatic award.' }}</p></div></div>
        <div class="flex flex-wrap gap-2"><span v-if="twoEnvelope" class="badge badge-info badge-outline">Two-envelope evaluation</span><span v-if="scheme" class="badge badge-outline">{{ scheme.method?.name || 'Locked scheme' }}</span></div>
      </header>

      <div v-if="message" class="alert py-2" :class="messageOk ? 'alert-success' : 'alert-error'"><Icon :name="messageOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-4 w-4" /><span class="text-sm">{{ message }}</span></div>
      <div v-if="!loading && evaluationActive && bids.some(bid => !bid.form.submitted)" class="flex flex-wrap items-center gap-2 text-xs text-base-content/55"><span class="badge badge-sm" :class="isOnline ? 'badge-success badge-outline' : 'badge-warning'"><Icon :name="isOnline ? 'lucide:wifi' : 'lucide:wifi-off'" class="h-3 w-3" />{{ isOnline ? 'Online' : 'Offline' }}</span><span><Icon name="lucide:save" class="mr-1 inline h-3.5 w-3.5" />{{ draftStatus || 'Changes are saved locally as you work.' }}</span></div>
      <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50"><span class="loading loading-spinner loading-sm" /> Loading evaluation workspace…</div>
      <div v-else-if="!evaluationActive" class="alert alert-warning"><Icon name="lucide:lock-keyhole" class="h-5 w-5" /><span>This tender is {{ evaluation.tender_status || props.tender.status }}. Complete the evaluation committee setup and use <strong>Start evaluation</strong> before evaluators enter scores.</span></div>

      <template v-else>
        <div v-if="twoEnvelope" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div v-for="step in rfpEvaluationSteps" :key="step.number" class="rounded-xl border p-4" :class="workflowStepClass(step.state)">
            <div class="flex items-start gap-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-base-100 font-bold">{{ step.number }}</div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2"><h3 class="font-semibold">{{ step.label }}</h3><span class="badge badge-sm" :class="workflowStepBadgeClass(step.state)">{{ step.status }}</span></div>
                <p class="mt-1 text-xs text-base-content/60">{{ step.description }}</p>
                <button v-if="step.opensApproval && recommendationReady" type="button" class="btn btn-ghost btn-xs mt-3" @click="showRecommendationApproval = true"><Icon name="lucide:clipboard-check" class="h-3.5 w-3.5" />Open review</button>
              </div>
            </div>
          </div>
        </div>

        <section v-if="twoEnvelope && activeStage === 'TECHNICAL' && workflowStep === 1" class="rounded-xl border border-base-200 bg-base-100">
          <header class="flex flex-wrap items-start justify-between gap-3 border-b border-base-200 p-4"><div><h3 class="font-semibold">RFP evaluation roles and submission progress</h3><p class="mt-1 text-xs text-base-content/55">Mandatory committee roles, their assigned users, and completion of Step 1. Only the appointed chairperson can proceed to Step 2 after all voting evaluations are submitted.</p></div><span class="badge" :class="allVotingSubmitted ? 'badge-success' : 'badge-warning'">{{ allVotingSubmitted ? 'All evaluations submitted' : 'Waiting for evaluators' }}</span></header>
          <div v-if="demoMode" class="m-4 mb-0 alert alert-info"><Icon name="lucide:flask-conical" class="h-5 w-5" /><span><strong>Development mode:</strong> the full statutory quorum is shown for reference, but one conflict-free voting member is enough to proceed. Unfilled roles are greyed out.</span></div>
          <div class="overflow-x-auto"><table class="table table-sm"><thead><tr><th>Mandatory quorum role</th><th>Assigned user</th><th>Committee capacity</th><th>Evaluation progress</th><th>Status</th></tr></thead><tbody><tr v-for="assignment in mandatoryRoleAssignments" :key="assignment.role" :class="demoMode && !assignment.members.length ? 'opacity-45 bg-base-200/40' : ''"><td><p class="font-medium">{{ assignment.role }}</p><p class="text-xs text-base-content/45">Minimum {{ assignment.minimum }}<span v-if="assignment.expertise_area"> · {{ assignment.expertise_area }}</span></p></td><td><div v-if="assignment.members.length" class="space-y-2"><div v-for="member in assignment.members" :key="member.uuid || member.id"><div class="flex flex-wrap items-center gap-2"><span class="font-medium">{{ member.name }}</span><span v-if="member.is_chairperson" class="badge badge-info badge-xs">Chairperson</span></div><p class="text-xs text-base-content/45">{{ member.role }}</p></div></div><span v-else class="text-sm text-base-content/45">Not assigned</span></td><td><span v-if="assignment.members.length">{{ assignment.members.every(member => member.is_voting) ? 'Voting' : 'Non-voting adviser' }}</span><span v-else>—</span></td><td><div v-if="assignment.members.length" class="space-y-1"><p v-for="member in assignment.members" :key="`progress-${member.uuid || member.id}`" class="text-sm">{{ member.is_voting ? `${member.submitted_bid_count}/${member.expected_bid_count} bidders evaluated` : 'Advisory role — no scoring required' }}</p></div><span v-else>—</span></td><td><div v-if="assignment.members.length" class="space-y-1"><span v-for="member in assignment.members" :key="`status-${member.uuid || member.id}`" class="badge badge-sm" :class="member.completed ? 'badge-success' : member.submitted_bid_count ? 'badge-warning' : 'badge-ghost'">{{ member.completed ? (member.is_voting ? 'Evaluation submitted' : 'Assigned') : member.submitted_bid_count ? 'In progress' : 'Not evaluated' }}</span></div><span v-else class="badge badge-sm" :class="demoMode ? 'badge-ghost' : 'badge-error'">{{ demoMode ? 'Optional in dev mode' : 'Required' }}</span></td></tr></tbody></table></div>
          <footer class="flex flex-col gap-3 border-t border-base-200 p-4 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs text-base-content/55">Step 2 becomes available only after every required voting member has submitted an evaluation for every bidder.</p><button v-if="canBuildShortlist" type="button" class="btn btn-warning btn-sm shrink-0" @click="proceedToShortlist"><Icon name="lucide:arrow-right" class="h-4 w-4" /> Proceed to shortlisting</button><span v-else-if="actors.is_chairperson" class="badge badge-warning badge-outline">Waiting for all voting evaluations</span><span v-else class="badge badge-ghost">Chairperson action</span></footer>
        </section>

        <form v-if="twoEnvelope && activeStage === 'TECHNICAL' && workflowStep === 2 && canBuildShortlist" class="rounded-xl border border-warning/40 bg-warning/5" @submit.prevent="buildTechnicalShortlist">
          <header class="flex flex-wrap items-start justify-between gap-3 border-b border-warning/25 p-4"><div><p class="text-xs font-semibold uppercase tracking-wide text-warning">Step 2</p><h3 class="font-semibold">Chairperson technical shortlist</h3><p class="mt-1 text-xs text-base-content/55">Select Shortlist or Not shortlisted for every bidder. Use Review to inspect the bidder response and all evaluator assessments.</p></div><button type="button" class="btn btn-ghost btn-sm" @click="workflowStep = 1"><Icon name="lucide:arrow-left" class="h-4 w-4" /> Back to Step 1</button></header>
          <div class="overflow-x-auto bg-base-100"><table class="table"><thead><tr><th>Bidder</th><th>Eligibility</th><th>Evaluations received</th><th>Chairperson decision</th><th>Reason</th><th></th></tr></thead><tbody><tr v-for="bid in bids" :key="`shortlist-${bid.uuid}`"><td class="font-medium">{{ bid.company?.name || bid.uuid }}</td><td><span class="badge badge-sm" :class="bid.eligibility_summary?.compliant ? 'badge-success' : 'badge-error'">{{ bid.eligibility_summary?.compliant ? 'Compliant' : 'Not compliant' }}</span></td><td>{{ bid.evaluator_reviews?.length || 0 }} submitted</td><td><div class="flex flex-col gap-2"><label class="flex cursor-pointer items-center gap-2 text-sm"><input v-model="shortlistDecisions[bid.id].shortlisted" type="radio" class="radio radio-success radio-sm" :value="true" :name="`shortlist-${bid.uuid}`"> Shortlist</label><label class="flex cursor-pointer items-center gap-2 text-sm"><input v-model="shortlistDecisions[bid.id].shortlisted" type="radio" class="radio radio-error radio-sm" :value="false" :name="`shortlist-${bid.uuid}`"> Not shortlisted</label></div></td><td><textarea v-if="shortlistDecisions[bid.id].shortlisted === false" v-model.trim="shortlistDecisions[bid.id].reason" class="textarea textarea-bordered textarea-sm min-h-16 min-w-64" required placeholder="Reason bidder is not shortlisted" /><span v-else class="text-xs text-base-content/40">—</span></td><td><button type="button" class="btn btn-outline btn-warning btn-sm" @click="openShortlistReview(bid)"><Icon name="lucide:eye" class="h-4 w-4" /> Review</button></td></tr></tbody></table></div>
          <footer class="flex flex-col gap-3 border-t border-warning/25 p-4 sm:flex-row sm:items-center sm:justify-between"><p class="text-sm"><strong>{{ shortlistDecisionCount }} of {{ bids.length }}</strong> bidder decisions recorded</p><button class="btn btn-warning btn-sm" type="submit" :disabled="saving || !shortlistValid"><Icon name="lucide:list-checks" class="h-4 w-4" /> Confirm shortlist and lock Envelope 1</button></footer>
        </form>
        <div v-else-if="twoEnvelope && activeStage === 'TECHNICAL' && !actors.is_chairperson" class="alert alert-info"><Icon name="lucide:hourglass" class="h-5 w-5" /><span>{{ allVotingSubmitted ? 'All individual evaluations are submitted. Waiting for the chairperson to confirm the financial-opening shortlist.' : 'Complete your individual evaluation. The chairperson shortlist remains locked until every voting evaluator has submitted.' }}</span></div>

        <div v-if="twoEnvelope && technicalEnvelopeComplete && !financialEnvelopeOpened" class="rounded-xl border border-warning/40 bg-warning/5 p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 class="font-semibold">Qualified bidders are ready for financial opening</h3><p class="text-sm text-base-content/60">Envelope 1 results are locked. The evaluation chairperson can now open the financial proposals of compliant bidders who passed the technical threshold.</p></div><button v-if="canOpenFinancial" class="btn btn-warning btn-sm shrink-0" :disabled="saving" @click="openFinancial"><Icon name="lucide:unlock" class="h-4 w-4" /> Open qualified financial envelopes</button><span v-else class="badge badge-outline shrink-0">Waiting for chairperson</span></div>
        </div>

        <div v-if="!stageAvailable" class="alert alert-info"><Icon name="lucide:lock" class="h-5 w-5" />Technical consensus is locked. The evaluation chairperson must open the qualified financial envelopes before financial evaluation can begin.</div>
        <div v-else-if="activeStage === 'FINANCIAL'" class="alert alert-info"><Icon name="lucide:calculator" class="h-5 w-5" /><span>Financial proposal scores are calculated automatically from the evaluated amount. The cheapest qualified quotation receives the full financial allocation. Higher quotations receive proportionately fewer financial points using the published inverse-price formula. Technical and financial points are then added to determine the combined QCBS ranking.</span></div>
        <section v-if="activeStage === 'FINANCIAL' && financialEnvelopeOpened" class="rounded-xl border border-base-200 bg-base-100">
          <header class="flex flex-wrap items-start justify-between gap-3 border-b border-base-200 p-4"><div><h3 class="font-semibold">Automatic QCBS financial evaluation and ranking</h3><p class="mt-1 text-xs text-base-content/55">Bidders are displayed from the highest combined QCBS points to the lowest. Price rank is calculated independently from technical performance.</p></div><span class="badge badge-success">Financial envelope opened</span></header>
          <div class="overflow-x-auto"><table class="table table-sm"><thead><tr><th>Combined rank</th><th>Bidder</th><th>Quotation</th><th>Price rank</th><th>Technical points</th><th>Financial points</th><th>Combined points</th><th></th></tr></thead><tbody><tr v-for="(bid, index) in qcbsRankedBids" :key="`financial-rank-${bid.uuid}`"><td><span class="badge" :class="index === 0 ? 'badge-primary' : 'badge-ghost'">#{{ index + 1 }}</span></td><td class="font-medium">{{ bid.company?.name || bid.uuid }}<span v-if="index === 0" class="badge badge-success badge-outline badge-sm ml-2">Recommended by score</span></td><td class="font-semibold">{{ formatMoney(bid.financial_proposal?.amount, bid.financial_proposal?.currency_code) }}</td><td><span class="badge badge-sm" :class="financialPriceRank(bid) === 1 ? 'badge-success' : 'badge-ghost'">#{{ financialPriceRank(bid) }}</span><p v-if="financialPriceRank(bid) === 1" class="mt-1 text-xs text-success">Cheapest · full financial points</p></td><td>{{ formatScore(qcbsTechnicalPoints(bid)) }}</td><td class="font-semibold">{{ formatScore(qcbsFinancialPoints(bid)) }}</td><td class="font-bold">{{ formatScore(qcbsCombinedPoints(bid)) }}</td><td><button type="button" class="btn btn-outline btn-info btn-sm whitespace-nowrap" @click="activeQuotationBid = bid"><Icon name="lucide:receipt-text" class="h-4 w-4" />View full quotation</button></td></tr><tr v-if="!qcbsRankedBids.length"><td colspan="8" class="py-6 text-center text-base-content/45">No opened financial quotation amounts are available.</td></tr></tbody></table></div>
          <div v-if="(actors.is_chairperson || report?.actors?.is_chairperson) && (!recommendationReady || report?.status === 'DRAFT')" class="flex flex-wrap items-center justify-between gap-3 border-t border-primary/25 bg-primary/5 p-4">
            <div><p class="text-xs font-semibold uppercase tracking-wide text-primary">Step 3 · Financial opening and ranking</p><h4 class="mt-1 font-semibold">Automatic QCBS recommendation ready</h4><p class="mt-1 text-xs text-base-content/55">The highest-ranked qualified bidder will be submitted with the complete ranking and signed evaluation minutes.</p></div>
            <button type="button" class="btn btn-primary" :disabled="saving || !qcbsRankedBids.length" @click="showPmuSubmissionDialog = true"><Icon name="lucide:send" class="h-4 w-4" />Send to PMU</button>
          </div>
          <div v-else-if="!recommendationReady || report?.status === 'DRAFT'" class="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 p-4"><div><p class="font-medium">Waiting for the Evaluation Chairperson</p><p class="text-xs text-base-content/55">The chairperson must attach the signed evaluation committee minutes and submit the automatic QCBS recommendation to PMU.</p></div><span class="badge badge-warning badge-outline">PMU review locked</span></div>
          <div v-else-if="recommendationReady" class="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 p-4"><div><p class="font-medium">Recommendation workflow</p><p class="text-xs text-base-content/55">Current status: {{ recommendationStatusLabel }}</p></div><button type="button" class="btn btn-primary btn-sm" @click="showRecommendationApproval = true"><Icon name="lucide:clipboard-check" />{{ recommendationActionLabel }}</button></div>
        </section>
        <div v-if="bids.length === 0" class="rounded-lg border border-dashed border-base-300 p-6 text-center text-sm text-base-content/50">No submitted bids are available for evaluation.</div>
        <div v-else-if="activeStage !== 'FINANCIAL' && (!twoEnvelope || activeStage !== 'TECHNICAL')" class="space-y-3">
          <article v-for="bid in bids" :key="bid.uuid" class="overflow-hidden rounded-xl border border-base-200 bg-base-100">
            <header class="flex flex-wrap items-center gap-2 border-b border-base-200 bg-base-200/25 px-4 py-3"><span class="font-medium">{{ bid.company?.name || bid.uuid }}</span><span class="badge badge-sm" :class="bid.form.submitted ? 'badge-success' : 'badge-warning'">{{ bid.form.submitted ? 'Submitted' : 'Draft' }}</span><span v-if="twoEnvelope" class="badge badge-sm" :class="bid.eligibility_summary?.compliant ? 'badge-success' : 'badge-error'">{{ bid.eligibility_summary?.compliant ? 'Eligibility compliant' : 'Eligibility not compliant' }}</span><span class="ml-auto text-sm text-base-content/55">{{ bidTechnicalTotal(bid) }} technical points</span></header>
            <div class="space-y-4 p-4">
              <section v-if="!rfqMode && activeStage === 'TECHNICAL'" class="rounded-lg border border-base-200 bg-base-100">
                <header class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 p-3"><div><p class="font-semibold">A. Document eligibility</p><p class="text-xs text-base-content/55">Open every uploaded document and record a pass/fail decision. One non-compliant document makes the bidder non-compliant for Envelope 1.</p></div><span v-if="documentReviewsComplete(bid)" class="badge" :class="documentEligibilityPassed(bid) ? 'badge-success' : 'badge-error'">{{ documentEligibilityPassed(bid) ? 'Documents compliant' : 'Documents not compliant' }}</span><span v-else class="badge badge-warning">Review incomplete</span></header>
                <div v-if="bid.documents?.length" class="divide-y divide-base-200"><article v-for="document in bid.documents" :key="documentDecisionKey(document)" class="p-3" :class="bid.form.document_decisions[documentDecisionKey(document)]?.compliant === false ? 'bg-error/5' : bid.form.document_decisions[documentDecisionKey(document)]?.compliant === true ? 'bg-success/5' : ''"><div class="flex flex-wrap items-start justify-between gap-2"><button type="button" class="min-w-0 text-left" @click="activeEvidence = document"><p class="font-medium">{{ document.title || document.file_name }}</p><p class="truncate text-xs text-base-content/45">{{ document.file_name }}</p></button><button type="button" class="btn btn-outline btn-info btn-xs" @click="activeEvidence = document"><Icon name="lucide:eye" class="h-3.5 w-3.5" /> View document</button></div><div class="mt-3 flex flex-wrap gap-4"><label class="flex cursor-pointer items-center gap-2 text-sm"><input v-model="bid.form.document_decisions[documentDecisionKey(document)].compliant" type="radio" class="radio radio-success radio-sm" :name="`document-${bid.uuid}-${documentDecisionKey(document)}`" :value="true" :disabled="bid.form.submitted || !evaluationActive">Compliant</label><label class="flex cursor-pointer items-center gap-2 text-sm"><input v-model="bid.form.document_decisions[documentDecisionKey(document)].compliant" type="radio" class="radio radio-error radio-sm" :name="`document-${bid.uuid}-${documentDecisionKey(document)}`" :value="false" :disabled="bid.form.submitted || !evaluationActive">Non-compliant</label></div><textarea v-if="bid.form.document_decisions[documentDecisionKey(document)].compliant === false" v-model.trim="bid.form.document_decisions[documentDecisionKey(document)].comments" class="textarea textarea-bordered textarea-sm mt-3 min-h-16 w-full" :disabled="bid.form.submitted || !evaluationActive" placeholder="Reason this document is non-compliant" /></article></div><p v-else class="p-3 text-sm text-base-content/45">The bidder did not upload separate eligibility documents.</p>
              </section>
              <section v-if="twoEnvelope && activeStage === 'TECHNICAL'" class="rounded-lg border border-base-200 bg-base-200/20">
                <header class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 p-3"><div><p class="font-semibold">B. Mandatory eligibility criteria</p><p class="text-xs text-base-content/55">Eligibility is a pass/fail gate and does not contribute technical weighted points. {{ bid.eligibility_summary?.satisfied || 0 }} of {{ bid.eligibility_summary?.total || 0 }} criteria are satisfied.</p></div><span class="badge" :class="bid.eligibility_summary?.compliant ? 'badge-success' : 'badge-error'">{{ bid.eligibility_summary?.compliant ? 'Compliant' : 'Not compliant' }}</span></header>
                <div class="divide-y divide-base-200"><div v-for="row in bid.eligibility_responses || []" :key="row.uuid" class="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><p class="text-xs text-base-content/45">{{ row.group }}</p><p class="text-sm font-medium">{{ row.question }}</p><p class="mt-1 text-xs text-base-content/65">Bidder response: {{ displayBidderResponse(row) }}</p></div><button v-if="row.file?.url" type="button" class="btn btn-outline btn-info btn-xs" @click="activeEvidence = row.file"><Icon name="lucide:paperclip" class="h-3.5 w-3.5" /> View attachment</button></div></div>
              </section>
              <div v-if="!rfqMode && activeStage === 'TECHNICAL'" class="rounded-lg border border-info/25 bg-info/5 p-3"><p class="font-semibold">C. Technical evaluation</p><p class="text-xs text-base-content/55">Each group shows its contribution to the technical total. Question weight is the percentage allocation within that group.</p></div>
              <div v-if="rfqMode || activeStage !== 'FINANCIAL'" class="overflow-x-auto rounded-lg border border-base-200">
                <table class="table table-sm"><thead><tr><th>Criterion / bidder response</th><th>Stage</th><th>{{ activeStage === 'TECHNICAL' && !rfqMode ? 'Question weight' : 'Weight' }}</th><th class="w-32">Score / 100</th><th>Comment</th></tr></thead><tbody>
                  <template v-for="group in criterionGroups(bid)" :key="group.key">
                    <tr v-if="group.name" class="bg-info/10"><th colspan="5"><div class="flex flex-wrap items-center justify-between gap-2"><span>{{ group.name }}</span><span class="badge badge-info badge-outline">Group weight: {{ formatScore(group.weight) }} technical points</span></div></th></tr>
                    <tr v-for="item in group.items" :key="item.criterion.id">
                      <td><p class="font-medium">{{ item.response?.question || item.criterion.name }}</p><p v-if="item.criterion.minimum_score != null" class="text-xs text-base-content/50">Minimum raw score {{ item.criterion.minimum_score }}</p><div v-if="!rfqMode && activeStage === 'TECHNICAL'" class="mt-3 rounded-lg border border-info/20 bg-info/5 p-3"><p class="text-[0.7rem] font-semibold uppercase tracking-wide text-info">Bidder response</p><p class="mt-1 whitespace-pre-wrap text-sm text-base-content/75">{{ displayBidderResponse(item.response) }}</p><button v-if="item.response?.file?.url" type="button" class="btn btn-outline btn-info btn-xs mt-2" @click="activeEvidence = item.response.file"><Icon name="lucide:paperclip" class="h-3.5 w-3.5" /> View attached file · {{ item.response.file.file_name || 'Evidence' }}</button><p v-else class="mt-2 flex items-center gap-1 text-xs text-base-content/45"><Icon name="lucide:paperclip" class="h-3.5 w-3.5" /> No attachment submitted</p></div></td>
                      <td><span class="badge badge-sm badge-ghost">{{ item.criterion.stage }}</span></td><td><template v-if="group.name"><p class="font-semibold">{{ formatScore(questionWeight(item, group)) }}% of group</p><p class="text-xs text-base-content/50">{{ formatScore(item.criterion.weight) }} technical points</p></template><template v-else>{{ item.criterion.weight }}%</template></td>
                      <td><select v-if="rfqMode" v-model.number="bid.form.scores[item.criterion.id].score" class="select select-sm select-bordered w-40" :disabled="bid.form.submitted || !evaluationActive" required><option :value="null" disabled>Select decision</option><option :value="100">Compliant</option><option :value="0">Not compliant</option></select><select v-else-if="item.criterion.scoring_bands?.length" v-model.number="bid.form.scores[item.criterion.id].score" class="select select-sm select-bordered w-64" :disabled="bid.form.submitted || !evaluationActive" required><option :value="null" disabled>Select scoring band</option><option v-for="band in item.criterion.scoring_bands" :key="`${item.criterion.id}-${band.score}-${band.label}`" :value="Number(band.score)">{{ band.label }} — {{ weightedBandPoints(band, item.criterion) }}/{{ item.criterion.weight }} pts</option></select><input v-else v-model.number="bid.form.scores[item.criterion.id].score" type="number" min="0" max="100" step="0.01" class="input input-sm input-bordered w-28" :disabled="bid.form.submitted || !evaluationActive" required></td>
                      <td><input v-model.trim="bid.form.scores[item.criterion.id].comment" class="input input-sm input-bordered w-full" :disabled="bid.form.submitted || !evaluationActive" placeholder="Assessment note"></td>
                    </tr>
                  </template>
                </tbody></table>
              </div>
              <div class="grid gap-3 sm:grid-cols-2"><label v-if="rfqMode || activeStage === 'FINANCIAL'" class="fieldset"><span class="fieldset-legend">Evaluated amount</span><input v-model.number="bid.form.evaluated_amount" type="number" min="0" step="0.01" class="input input-bordered" :disabled="bid.form.submitted || !evaluationActive" required></label><label class="fieldset"><span class="fieldset-legend">Evaluator comments</span><textarea v-model.trim="bid.form.comments" class="textarea textarea-bordered" :disabled="bid.form.submitted || !evaluationActive" /></label></div>
              <div v-if="!bid.form.submitted" class="flex flex-wrap items-center justify-end gap-2"><span v-if="activeStage === 'TECHNICAL' && !documentReviewsComplete(bid)" class="mr-auto text-xs text-warning">Review every uploaded document before submitting.</span><button class="btn btn-outline btn-sm" :disabled="saving || !evaluationActive || !stageAvailable" @click="saveBid(bid, false)">Save draft</button><button class="btn btn-primary btn-sm" :disabled="saving || !evaluationActive || !stageAvailable || (activeStage === 'TECHNICAL' && !documentReviewsComplete(bid))" @click="saveBid(bid, true)"><Icon name="lucide:send" class="h-4 w-4" /> Submit assessment</button></div>
            </div>
          </article>
        </div>

        <form v-if="!rfqMode && activeStage !== 'FINANCIAL' && actors.is_chairperson && props.tender.status === 'UNDER_EVALUATION' && bids.length && stageAvailable && !(twoEnvelope && activeStage === 'TECHNICAL') && !recommendationSubmitted" class="rounded-lg border border-base-200 bg-base-200/20 p-4" @submit.prevent="buildConsensus">
          <h3 class="font-semibold">{{ activeStage === 'FINANCIAL' ? 'Final QCBS consensus' : 'Technical consensus' }}</h3><p class="mb-3 text-xs text-base-content/55">Available once every active voting evaluator has submitted every bid in this stage.</p>
          <div class="grid gap-3 sm:grid-cols-2"><label v-if="activeStage !== 'FINANCIAL'" class="fieldset"><span class="fieldset-legend">Recommended bidder</span><select v-model.number="consensus.recommended_supplier_bid_id" class="select select-bordered"><option :value="null">No recommendation</option><option v-for="bid in consensusEligibleBids" :key="bid.uuid" :value="bid.id">{{ bid.company?.name || bid.uuid }}</option></select></label><div v-else class="rounded-lg border border-info/30 bg-info/5 p-3"><p class="text-xs font-medium text-base-content/55">Recommended bidder</p><p class="mt-1 text-sm font-semibold">Automatically selected after calculation</p><p class="mt-1 text-xs text-base-content/50">The bidder with the highest combined QCBS score will be recommended.</p></div><label class="fieldset"><span class="fieldset-legend">Recommendation</span><input v-model.trim="consensus.recommendation" class="input input-bordered" required placeholder="Committee recommendation"></label><label class="fieldset sm:col-span-2"><span class="fieldset-legend">Consensus notes</span><textarea v-model.trim="consensus.consensus_notes" class="textarea textarea-bordered w-full" /></label></div>
          <div class="mt-3 flex justify-end"><button class="btn btn-info" type="submit" :disabled="saving"><Icon name="lucide:calculator" class="h-4 w-4" /> Calculate consensus and ranking</button></div>
        </form>

        <div v-if="activeStage !== 'FINANCIAL' && results.length" class="overflow-x-auto rounded-lg border border-base-200"><table class="table table-sm"><thead><tr><th>Rank</th><th>Bidder</th><th v-if="twoEnvelope">Eligibility gate</th><th>Technical</th><th>Financial</th><th>Total</th><th>{{ twoEnvelope && !financialEnvelopeOpened ? 'Envelope 1 result' : 'Result' }}</th></tr></thead><tbody><tr v-for="result in results" :key="result.id"><td>{{ result.rank }}</td><td>{{ bidderName(result.supplier_bid_id, result) }}</td><td v-if="twoEnvelope"><p class="text-xs">{{ result.eligibility_summary?.satisfied || 0 }}/{{ result.eligibility_summary?.total || 0 }} criteria</p><span class="badge badge-xs" :class="result.eligibility_summary?.compliant ? 'badge-success' : 'badge-error'">{{ result.eligibility_summary?.compliant ? 'Compliant' : 'Not compliant' }}</span></td><td>{{ result.consensus_technical_score }}</td><td>{{ financialEnvelopeOpened ? result.consensus_financial_score : 'Sealed' }}</td><td class="font-semibold">{{ financialEnvelopeOpened ? result.consensus_total_score : '—' }}</td><td><span class="badge badge-sm" :class="result.passed ? 'badge-success' : 'badge-error'">{{ result.passed ? 'Passed' : 'Failed' }}</span></td></tr></tbody></table></div>

        <Teleport to="body">
          <div v-if="showPmuSubmissionDialog" class="fixed inset-0 z-[96] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label="Send evaluation to PMU">
            <form class="w-full max-w-2xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl" @submit.prevent="finalizeAndSubmitRecommendation">
              <header class="flex items-start justify-between gap-3 border-b border-base-200 p-5"><div><p class="text-xs font-semibold uppercase tracking-wide text-primary">Step 3 submission</p><h3 class="text-lg font-semibold">Send evaluation to PMU</h3><p class="mt-1 text-sm text-base-content/55">Add a submission comment and attach the signed evaluation committee minutes.</p></div><button type="button" class="btn btn-circle btn-ghost btn-sm" aria-label="Close PMU submission dialog" :disabled="saving" @click="showPmuSubmissionDialog = false"><Icon name="lucide:x" class="h-5 w-5" /></button></header>
              <div class="space-y-4 p-5">
                <div class="rounded-xl border border-info/25 bg-info/5 p-4"><p class="text-xs text-base-content/50">System recommendation</p><p class="mt-1 font-semibold">{{ qcbsRankedBids[0]?.company?.name || 'Highest-ranked qualified bidder' }}</p><p class="mt-1 text-xs text-base-content/55">Based on the approved QCBS technical and financial scoring results.</p></div>
                <label class="fieldset"><span class="fieldset-legend">Comment to PMU *</span><textarea v-model.trim="pmuSubmissionComment" class="textarea textarea-bordered min-h-28 w-full" required maxlength="10000" placeholder="Summarise the committee's conclusion for PMU review" /></label>
                <label class="fieldset"><span class="fieldset-legend">Signed evaluation committee minutes *</span><input type="file" accept=".pdf,.doc,.docx" class="file-input file-input-bordered w-full" required @change="minutesFile = $event.target.files?.[0] || null"><span class="label text-xs">PDF or Word document, maximum 50 MB.</span></label>
              </div>
              <footer class="flex flex-wrap justify-end gap-2 border-t border-base-200 bg-base-200/30 p-4"><button type="button" class="btn btn-ghost" :disabled="saving" @click="showPmuSubmissionDialog = false">Cancel</button><button type="submit" class="btn btn-primary" :disabled="saving || !minutesFile || !pmuSubmissionComment"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:send" class="h-4 w-4" />Send to PMU</button></footer>
            </form>
          </div>
        </Teleport>

        <Teleport to="body">
          <div v-if="showSpocAlertDialog" class="fixed inset-0 z-[97] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label="Notify bidders of SPOC payment">
            <form class="w-full max-w-2xl overflow-hidden rounded-2xl border border-warning/40 bg-base-100 shadow-2xl" @submit.prevent="sendSpocAlert">
              <header class="flex items-start justify-between gap-3 border-b border-base-200 p-5"><div><p class="text-xs font-semibold uppercase tracking-wide text-warning">PMU payment control</p><h3 class="text-lg font-semibold">Notify bidders to pay the SPOC fee</h3><p class="mt-1 text-sm text-base-content/55">A fee invoice and notification will be issued to every participating bidder.</p></div><button type="button" class="btn btn-circle btn-ghost btn-sm" aria-label="Close SPOC payment alert" :disabled="saving" @click="showSpocAlertDialog = false"><Icon name="lucide:x" class="h-5 w-5" /></button></header>
              <div class="space-y-4 p-5">
                <div class="alert alert-warning"><Icon name="lucide:triangle-alert" /><span>An opened quotation exceeds {{ formatOptionalMoney(spocReview?.threshold, spocReview?.currency_code) }}, while the original EOI did not require a SPOC fee.</span></div>
                <label class="fieldset"><span class="fieldset-legend">Grace period ends *</span><input v-model="spocGracePeriodEndsAt" type="datetime-local" class="input input-bordered w-full" :min="minimumGraceDate" required></label>
                <label class="fieldset"><span class="fieldset-legend">Message to participating bidders *</span><textarea v-model.trim="spocAlertMessage" class="textarea textarea-bordered min-h-32 w-full" maxlength="10000" required /></label>
                <p class="text-xs text-base-content/50">The alert is recorded once for audit purposes. Payment status is read from each bidder's tender administration-fee invoice.</p>
              </div>
              <footer class="flex flex-wrap justify-end gap-2 border-t border-base-200 bg-base-200/30 p-4"><button type="button" class="btn btn-ghost" :disabled="saving" @click="showSpocAlertDialog = false">Cancel</button><button type="submit" class="btn btn-warning" :disabled="saving || !spocGracePeriodEndsAt || !spocAlertMessage"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:bell-ring" />Raise invoices and notify bidders</button></footer>
            </form>
          </div>
        </Teleport>

        <Teleport to="body">
          <div v-if="recommendationReady && showRecommendationApproval" class="fixed inset-0 z-[95] flex flex-col bg-base-200" role="dialog" aria-modal="true" aria-label="QCBS recommendation approval">
        <section class="m-3 flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-primary/25 bg-base-100 shadow-xl sm:m-6">
          <header class="flex flex-wrap items-start justify-between gap-3 border-b border-base-200 p-4"><div><p class="text-xs font-semibold uppercase tracking-wide text-primary">Recommendation approval</p><h3 class="font-semibold">QCBS recommendation and approval chain</h3><p class="mt-1 text-xs text-base-content/55">The recommendation must pass from the Evaluation Chairperson to the PMU and then to the Accounting Officer before contract negotiation starts.</p></div><div class="flex items-center gap-2"><span class="badge" :class="recommendationStatusClass">{{ recommendationStatusLabel }}</span><button type="button" class="btn btn-circle btn-ghost btn-sm" aria-label="Close recommendation approval" @click="showRecommendationApproval = false"><Icon name="lucide:x" class="h-5 w-5" /></button></div></header>
          <div class="grid gap-3 p-4 md:grid-cols-4">
            <div v-for="(step, index) in recommendationSteps" :key="step.key" class="rounded-lg border p-3" :class="step.complete ? 'border-success/30 bg-success/5' : step.active ? 'border-warning/40 bg-warning/5' : 'border-base-200 bg-base-200/30'"><div class="flex items-center gap-2"><span class="flex h-7 w-7 items-center justify-center rounded-full bg-base-100 text-xs font-bold">{{ index + 1 }}</span><p class="text-sm font-semibold">{{ step.label }}</p></div><p class="mt-2 text-xs text-base-content/55">{{ step.description }}</p><span class="badge badge-xs mt-2" :class="step.complete ? 'badge-success' : step.active ? 'badge-warning' : 'badge-ghost'">{{ step.complete ? 'Completed' : step.active ? 'Action required' : 'Locked' }}</span></div>
          </div>
          <div class="border-t border-base-200 p-4">
            <div class="mb-4 grid gap-3 sm:grid-cols-2"><div class="rounded-lg bg-base-200/40 p-3"><p class="text-xs text-base-content/50">Recommended bidder</p><p class="font-semibold">{{ bidderName(report.recommended_supplier_bid_id) }}</p></div><div class="rounded-lg bg-base-200/40 p-3"><p class="text-xs text-base-content/50">Committee recommendation</p><p class="text-sm">{{ report.recommendation }}</p></div></div>

            <div v-if="report.status === 'DRAFT' && report.pmu_return_reason" class="alert alert-warning mb-4"><Icon name="lucide:undo-2" /><span><strong>Returned by PMU:</strong> {{ report.pmu_return_reason }}</span></div>
            <div v-if="report.status === 'PMU_REVIEW' && report.accounting_officer_return_reason" class="alert alert-warning mb-4"><Icon name="lucide:undo-2" /><span><strong>Returned by Accounting Officer:</strong> {{ report.accounting_officer_return_reason }}</span></div>

            <div v-if="report.status === 'DRAFT' && report.actors?.is_chairperson" class="alert alert-info"><Icon name="lucide:arrow-up" /><span>Return to <strong>Step 3 · Financial opening and ranking</strong> to attach the signed evaluation committee minutes and submit the recommendation to PMU.</span></div>

            <div v-else-if="report.status === 'PMU_REVIEW' && report.actors?.is_pmu_head" class="space-y-4">
              <div v-if="report.minutes_url" class="flex items-center justify-between rounded-lg border border-base-200 p-3"><div><p class="text-sm font-medium">Signed committee minutes</p><p class="text-xs text-base-content/50">{{ report.minutes_filename }}</p></div><a :href="report.minutes_url" target="_blank" rel="noopener" class="btn btn-outline btn-xs"><Icon name="lucide:eye" />View minutes</a></div>

              <section class="overflow-hidden rounded-xl border" :class="spocReview?.returns_to_spoc ? 'border-warning/50' : 'border-success/30'">
                <header class="flex flex-wrap items-start justify-between gap-3 p-4" :class="spocReview?.returns_to_spoc ? 'bg-warning/10' : 'bg-success/5'">
                  <div><p class="text-xs font-semibold uppercase tracking-wide" :class="spocReview?.returns_to_spoc ? 'text-warning' : 'text-success'">Post-opening SPOC check</p><h4 class="font-semibold">EOI fee and actual quotation threshold</h4><p class="mt-1 text-xs text-base-content/55">The system compares opened financial quotations with the procurement entity class threshold and verifies the original EOI fee position.</p></div>
                  <div class="flex flex-wrap items-center justify-end gap-2"><span v-if="spocReview?.returns_to_spoc" class="badge badge-warning gap-1.5"><span class="inline-block h-2 w-2 animate-pulse rounded-full bg-warning-content" aria-hidden="true" />RFP returning to SPOC</span><span class="badge" :class="spocReview?.applicable ? (spocReview.all_paid ? 'badge-success' : 'badge-warning badge-outline') : 'badge-success badge-outline'">{{ spocStatusLabel }}</span></div>
                </header>
                <div v-if="spocReview?.returns_to_spoc" class="alert alert-warning rounded-none border-x-0 border-t border-warning/30"><Icon name="lucide:route" /><span><strong>This RFP is returning to SPOC review.</strong> At least one opened financial quotation exceeds the procurement entity class threshold.</span></div>
                <div class="grid gap-3 border-t border-base-200 p-4 sm:grid-cols-3">
                  <div><p class="text-xs text-base-content/50">Initial EOI SPOC fee</p><p class="font-semibold">{{ spocReview?.initial_eoi_spoc_required ? 'Required' : 'Not charged' }}</p></div>
                  <div><p class="text-xs text-base-content/50">PE class threshold</p><p class="font-semibold">{{ formatOptionalMoney(spocReview?.threshold, spocReview?.currency_code) }}</p></div>
                  <div><p class="text-xs text-base-content/50">Grace deadline</p><p class="font-semibold">{{ spocReview?.payment_due_at ? formatDateTime(spocReview.payment_due_at) : 'Not set' }}</p></div>
                </div>
                <div v-if="spocReview?.applicable" class="border-t border-base-200">
                  <div class="overflow-x-auto"><table class="table table-sm"><thead><tr><th>Participating bidder</th><th>Opened quotation</th><th>Threshold result</th><th>Invoice</th><th>Payment</th></tr></thead><tbody><tr v-for="participant in spocReview.participants" :key="participant.supplier_bid_uuid"><td class="font-medium">{{ participant.company?.name || participant.supplier_bid_uuid }}</td><td>{{ formatOptionalMoney(participant.quotation_amount, spocReview.currency_code) }}</td><td><span class="badge badge-sm" :class="participant.exceeds_threshold ? 'badge-warning' : 'badge-ghost'">{{ participant.exceeds_threshold ? 'Above threshold' : participant.quotation_amount == null ? 'Not opened / not shortlisted' : 'Within threshold' }}</span></td><td>{{ participant.invoice_number || 'Not raised' }}</td><td><span class="badge badge-sm" :class="participant.paid ? 'badge-success' : 'badge-error badge-outline'">{{ participant.paid ? 'Paid' : participant.invoice_status === 'NOT_RAISED' ? 'Awaiting alert' : 'Payment pending' }}</span></td></tr></tbody></table></div>
                  <div v-if="!spocReview.alert_sent_at" class="flex flex-wrap items-center justify-between gap-3 border-t border-warning/30 bg-warning/5 p-4"><p class="max-w-3xl text-sm">At least one opened quotation is above the configured threshold. Notify every participating bidder and provide a grace period for the SPOC administration fee.</p><button type="button" class="btn btn-warning btn-sm" @click="openSpocAlertDialog"><Icon name="lucide:bell-ring" />Notify all participating bidders</button></div>
                  <div v-else-if="!spocReview.all_paid" class="alert rounded-none border-0 border-t border-warning/30" :class="spocReview.grace_period_expired ? 'alert-error' : 'alert-warning'"><Icon :name="spocReview.grace_period_expired ? 'lucide:clock-alert' : 'lucide:hourglass'" /><span><strong>{{ spocReview.outstanding_count }} payment{{ spocReview.outstanding_count === 1 ? '' : 's' }} outstanding.</strong> {{ spocReview.grace_period_expired ? 'The grace period has expired. Forwarding remains blocked pending an authorised outcome.' : 'The recommendation cannot be forwarded until all required payments are confirmed.' }}</span></div>
                  <div v-else class="alert alert-success rounded-none border-0 border-t border-success/30"><Icon name="lucide:badge-check" /><span>All participating bidders have paid the SPOC administration fee. PMU may forward the recommendation.</span></div>
                </div>
              </section>

              <label class="fieldset"><span class="fieldset-legend">PMU review comments *</span><textarea v-model.trim="reviewComments" class="textarea textarea-bordered min-h-24 w-full" /></label>
              <div class="flex flex-wrap justify-end gap-2"><button type="button" class="btn btn-outline btn-warning btn-sm" :disabled="saving || !reviewComments" @click="pmuDecision('RETURN')"><Icon name="lucide:undo-2" />Return to Chairperson</button><button type="button" class="btn btn-info btn-sm" :disabled="saving || !reviewComments || spocReview?.forward_blocked" @click="pmuDecision('FORWARD')"><Icon name="lucide:send" />Send to Accounting Officer</button></div>
            </div>

            <div v-else-if="report.status === 'ACCOUNTING_OFFICER_REVIEW' && report.actors?.is_accounting_officer" class="space-y-3">
              <div class="alert alert-info"><Icon name="lucide:shield-check" /><span>Review the committee recommendation, signed minutes and PMU comments before deciding.</span></div>
              <div v-if="spocReview?.returns_to_spoc" class="overflow-hidden rounded-xl border border-warning/50 bg-warning/5">
                <div class="flex items-start gap-3 p-4"><Icon name="lucide:landmark" class="mt-0.5 h-6 w-6 shrink-0 text-warning" /><div><div class="flex flex-wrap items-center gap-2"><h4 class="font-bold">Mandatory SPOC submission</h4><span class="badge badge-warning badge-sm">Must be sent to SPOC</span></div><p class="mt-1 text-sm">The opened financial quotation exceeds the procurement entity’s {{ formatOptionalMoney(spocReview.threshold, spocReview.currency_code) }} consultancy threshold. Accounting Officer approval will submit this tender to SPOC; it will not activate contract negotiation.</p></div></div>
                <div class="grid gap-3 border-t border-warning/30 p-4 text-sm sm:grid-cols-3"><div><p class="text-xs text-base-content/50">SPOC route</p><p class="font-semibold">Post-opening review</p></div><div><p class="text-xs text-base-content/50">Fee position</p><p class="font-semibold">{{ spocReview.all_paid ? 'All required fees paid' : 'Payment verification pending' }}</p></div><div><p class="text-xs text-base-content/50">Next destination</p><p class="font-semibold">SPOC submissions board</p></div></div>
              </div>
              <p v-if="report.pmu_comments" class="rounded-lg bg-base-200/40 p-3 text-sm"><strong>PMU comments:</strong> {{ report.pmu_comments }}</p>
              <label class="fieldset"><span class="fieldset-legend">Accounting Officer comments</span><textarea v-model.trim="reviewComments" class="textarea textarea-bordered min-h-24 w-full" /></label>
              <div class="flex flex-wrap justify-end gap-2"><button type="button" class="btn btn-outline btn-warning btn-sm" :disabled="saving || !reviewComments" @click="accountingOfficerDecision('RETURN')"><Icon name="lucide:undo-2" />Return to PMU</button><button type="button" :class="['btn btn-sm', spocReview?.returns_to_spoc ? 'btn-warning' : 'btn-success']" :disabled="saving" @click="accountingOfficerDecision('APPROVE')"><Icon :name="spocReview?.returns_to_spoc ? 'lucide:send' : 'lucide:check-circle-2'" />{{ spocReview?.returns_to_spoc ? 'Approve and send to SPOC' : 'Approve recommendation' }}</button></div>
            </div>

            <div v-else-if="report.status === 'APPROVED_FOR_NEGOTIATION'" class="alert alert-success"><Icon name="lucide:handshake" /><span><strong>Contract negotiation is active.</strong> The Accounting Officer approved the recommended consultant. Negotiation must begin with the first-ranked bidder and the evaluated QCBS price cannot be changed.</span></div>
            <div v-else-if="report.status === 'SPOC_SUBMITTED'" class="alert alert-warning"><Icon name="lucide:landmark" /><span><strong>Submitted to SPOC.</strong> {{ report.spoc_submission?.reference_number }} is progressing through internal review, agenda deliberation, committee-record confirmation and resolution.</span></div>
            <div v-else-if="report.status === 'SPOC_RESUBMISSION_REQUIRED'" class="alert alert-warning"><Icon name="lucide:rotate-ccw" /><span><strong>SPOC did not certify the submission.</strong> A corrected resubmission is required before the procurement can proceed.</span></div>
            <div v-else-if="['SPOC_CERTIFIED_CANCELLATION','SPOC_NOT_CERTIFIED_CANCEL'].includes(report.status)" class="alert alert-error"><Icon name="lucide:ban" /><span>The SPOC resolution directs that this procurement be cancelled.</span></div>
            <div v-else class="alert alert-info"><Icon name="lucide:hourglass" /><span>{{ recommendationWaitingMessage }}</span></div>
          </div>
        </section>
          </div>
        </Teleport>

      </template>
    </div>
  </section>

  <Teleport to="body">
    <div v-if="activeShortlistBid" class="fixed inset-0 z-[90] flex flex-col bg-base-200" role="dialog" aria-modal="true" aria-label="Chairperson bidder shortlist review">
      <header class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-base-300 bg-base-100 px-4 py-3 shadow-sm sm:px-6">
        <div class="min-w-0"><p class="text-xs font-semibold uppercase tracking-wide text-warning">Step 2 · Chairperson technical shortlist</p><h2 class="truncate text-lg font-semibold">{{ activeShortlistBid.company?.name || activeShortlistBid.uuid }}</h2><p class="text-xs text-base-content/50">Compare the bidder response with all independent evaluator assessments before recording the shortlist decision.</p></div>
        <button type="button" class="btn btn-circle btn-ghost" aria-label="Close shortlist review" @click="closeShortlistReview"><Icon name="lucide:x" class="h-5 w-5" /></button>
      </header>

      <main class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div class="mx-auto grid max-w-[96rem] gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section class="space-y-4">
            <div class="rounded-xl border border-base-300 bg-base-100 p-4">
              <div class="flex flex-wrap items-center justify-between gap-2"><div><p class="text-xs font-semibold uppercase tracking-wide text-info">Bidder response</p><h3 class="font-semibold">Eligibility and technical submission</h3></div><span class="badge" :class="activeShortlistBid.eligibility_summary?.compliant ? 'badge-success' : 'badge-error'">{{ activeShortlistBid.eligibility_summary?.compliant ? 'Eligibility compliant' : 'Eligibility not compliant' }}</span></div>
              <div class="mt-3 grid grid-cols-2 gap-3"><div class="rounded-lg bg-base-200/60 p-3"><p class="text-xs text-base-content/50">Mandatory criteria</p><p class="text-lg font-semibold">{{ activeShortlistBid.eligibility_summary?.satisfied || 0 }}/{{ activeShortlistBid.eligibility_summary?.total || 0 }}</p></div><div class="rounded-lg bg-base-200/60 p-3"><p class="text-xs text-base-content/50">Evaluator assessments</p><p class="text-lg font-semibold">{{ activeShortlistBid.evaluator_reviews?.length || 0 }}</p></div></div>
            </div>

            <section class="rounded-xl border border-base-300 bg-base-100">
              <header class="border-b border-base-200 p-4"><h3 class="font-semibold">Uploaded eligibility documents</h3><p class="text-xs text-base-content/50">Open the original evidence and compare it with each evaluator's document decision.</p></header>
              <div v-if="activeShortlistBid.documents?.length" class="divide-y divide-base-200"><article v-for="document in activeShortlistBid.documents" :key="documentDecisionKey(document)" class="p-4"><div class="flex flex-wrap items-center justify-between gap-2"><div><p class="font-medium">{{ document.title || document.file_name }}</p><p class="text-xs text-base-content/45">{{ document.file_name }}</p></div><button type="button" class="btn btn-outline btn-info btn-xs" @click="activeEvidence = document"><Icon name="lucide:eye" class="h-3.5 w-3.5" /> View document</button></div><div class="mt-3 flex flex-wrap gap-2"><span v-for="review in activeShortlistBid.evaluator_reviews || []" :key="`${review.uuid}-${documentDecisionKey(document)}`" class="badge badge-sm" :class="reviewDocumentDecision(review, documentDecisionKey(document))?.compliant === true ? 'badge-success' : reviewDocumentDecision(review, documentDecisionKey(document))?.compliant === false ? 'badge-error' : 'badge-ghost'">{{ review.evaluator.name }}: {{ reviewDocumentDecision(review, documentDecisionKey(document))?.compliant === true ? 'Compliant' : reviewDocumentDecision(review, documentDecisionKey(document))?.compliant === false ? 'Non-compliant' : 'Not marked' }}</span></div></article></div>
              <p v-else class="p-4 text-sm text-base-content/50">No separate eligibility documents were uploaded.</p>
            </section>

            <section class="rounded-xl border border-base-300 bg-base-100">
              <header class="border-b border-base-200 p-4"><h3 class="font-semibold">Mandatory eligibility responses</h3></header>
              <div v-if="activeShortlistBid.eligibility_responses?.length" class="divide-y divide-base-200"><article v-for="row in activeShortlistBid.eligibility_responses" :key="row.uuid" class="p-4"><p class="text-xs font-medium uppercase tracking-wide text-base-content/45">{{ row.group }}</p><p class="mt-1 font-medium">{{ row.question }}</p><p class="mt-2 whitespace-pre-wrap text-sm text-base-content/70">{{ displayBidderResponse(row) }}</p><button v-if="row.file?.url" type="button" class="btn btn-outline btn-info btn-xs mt-3" @click="activeEvidence = row.file"><Icon name="lucide:paperclip" class="h-3.5 w-3.5" /> View attachment</button></article></div>
              <p v-else class="p-4 text-sm text-base-content/50">No mandatory eligibility responses were recorded.</p>
            </section>

            <section class="rounded-xl border border-base-300 bg-base-100">
              <header class="border-b border-base-200 p-4"><h3 class="font-semibold">Detailed technical response</h3><p class="text-xs text-base-content/50">Group and question weights are shown with the bidder's answer and evidence.</p></header>
              <div v-if="activeShortlistBid.technical_responses?.length" class="divide-y divide-base-200"><article v-for="row in activeShortlistBid.technical_responses" :key="row.uuid" class="p-4"><div class="flex flex-wrap items-center justify-between gap-2"><p class="text-xs font-semibold uppercase tracking-wide text-info">{{ row.group || 'Technical criteria' }}</p><span class="badge badge-info badge-outline badge-sm">Group {{ formatScore(row.group_weight) }} · Question {{ formatScore(row.question_weight) }}%</span></div><p class="mt-2 font-medium">{{ row.question }}</p><p class="mt-2 whitespace-pre-wrap rounded-lg bg-info/5 p-3 text-sm text-base-content/75">{{ displayBidderResponse(row) }}</p><button v-if="row.file?.url" type="button" class="btn btn-outline btn-info btn-xs mt-3" @click="activeEvidence = row.file"><Icon name="lucide:paperclip" class="h-3.5 w-3.5" /> View attached file</button></article></div>
              <p v-else class="p-4 text-sm text-base-content/50">No technical responses were recorded.</p>
            </section>
          </section>

          <section class="space-y-4">
            <div><p class="text-xs font-semibold uppercase tracking-wide text-primary">Evaluator assessments</p><h3 class="text-lg font-semibold">Independent Envelope 1 evaluations</h3><p class="text-sm text-base-content/55">These assessments become visible to the chairperson only after all voting evaluators submit.</p></div>
            <article v-for="review in activeShortlistBid.evaluator_reviews || []" :key="review.uuid" class="rounded-xl border border-base-300 bg-base-100">
              <header class="flex flex-wrap items-start justify-between gap-3 border-b border-base-200 p-4"><div><div class="flex flex-wrap items-center gap-2"><h4 class="font-semibold">{{ review.evaluator.name }}</h4><span v-if="review.evaluator.is_chairperson" class="badge badge-info badge-xs">Chairperson</span></div><p class="text-xs text-base-content/50">{{ review.evaluator.role }}<span v-if="review.evaluator.expertise_area"> · {{ review.evaluator.expertise_area }}</span></p></div><div class="text-right"><p class="text-xl font-bold">{{ formatScore(review.technical_total) }}</p><span class="badge badge-sm" :class="review.technical_passed ? 'badge-success' : 'badge-error'">{{ review.technical_passed ? 'Technical pass' : 'Technical fail' }}</span></div></header>
              <div class="overflow-x-auto"><table class="table table-sm"><thead><tr><th>Criterion</th><th>Weight</th><th>Score</th><th>Weighted</th><th>Evaluator note</th></tr></thead><tbody><tr v-for="score in review.scores || []" :key="`${review.uuid}-${score.criterion_id}`"><td class="min-w-56 font-medium">{{ score.criterion_name }}</td><td>{{ formatScore(score.weight) }}</td><td>{{ formatScore(score.score) }}/100</td><td class="font-semibold">{{ formatScore(score.weighted_score) }}</td><td class="min-w-56 whitespace-pre-wrap text-sm">{{ score.comment || 'No note provided.' }}</td></tr></tbody></table></div>
              <div class="border-t border-base-200 p-4"><p class="text-xs font-semibold uppercase tracking-wide text-base-content/45">Overall evaluator comments</p><p class="mt-1 whitespace-pre-wrap text-sm text-base-content/70">{{ review.comments || 'No overall comment provided.' }}</p></div>
            </article>
            <div v-if="!activeShortlistBid.evaluator_reviews?.length" class="alert alert-warning"><Icon name="lucide:triangle-alert" class="h-5 w-5" /><span>No submitted evaluator assessments are available for this bidder.</span></div>

            <section class="sticky bottom-0 rounded-xl border border-warning/50 bg-base-100 p-4 shadow-xl">
              <div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="font-semibold">Shortlist decision</h3><p class="text-xs text-base-content/50">Record whether this bidder proceeds to financial opening.</p></div><div class="flex flex-wrap gap-4"><label class="flex cursor-pointer items-center gap-2 text-sm"><input v-model="shortlistDecisions[activeShortlistBid.id].shortlisted" type="radio" class="radio radio-success radio-sm" :value="true" :disabled="saving">Proceed to financial</label><label class="flex cursor-pointer items-center gap-2 text-sm"><input v-model="shortlistDecisions[activeShortlistBid.id].shortlisted" type="radio" class="radio radio-error radio-sm" :value="false" :disabled="saving">Do not proceed</label></div></div>
              <textarea v-if="shortlistDecisions[activeShortlistBid.id].shortlisted === false" v-model.trim="shortlistDecisions[activeShortlistBid.id].reason" class="textarea textarea-bordered mt-3 min-h-20 w-full" :disabled="saving" required placeholder="Reason bidder will not proceed to financial opening" />
              <div class="mt-3 flex justify-end"><button type="button" class="btn btn-warning btn-sm" :disabled="typeof shortlistDecisions[activeShortlistBid.id].shortlisted !== 'boolean' || (shortlistDecisions[activeShortlistBid.id].shortlisted === false && !shortlistDecisions[activeShortlistBid.id].reason?.trim())" @click="closeShortlistReview"><Icon name="lucide:check" class="h-4 w-4" /> Save decision and close</button></div>
            </section>
          </section>
        </div>
      </main>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="activeEvidence" class="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-label="Bidder evidence document">
      <button type="button" class="absolute inset-0 bg-black/45 backdrop-blur-[1px]" aria-label="Close evidence drawer" @click="activeEvidence = null" />
      <aside class="relative flex h-full w-full flex-col bg-base-100 shadow-2xl sm:w-[min(78vw,64rem)]">
        <header class="flex items-center justify-between gap-3 border-b border-base-200 px-4 py-3 sm:px-5">
          <div class="min-w-0"><p class="text-xs font-semibold uppercase tracking-wide text-info">Bidder evidence</p><h3 class="truncate font-semibold">{{ activeEvidence.title || activeEvidence.file_name || 'Attached document' }}</h3><p v-if="activeEvidence.file_name" class="truncate text-xs text-base-content/50">{{ activeEvidence.file_name }}</p></div>
          <div class="flex shrink-0 items-center gap-1"><a :href="activeEvidence.url" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" title="Open in a new tab"><Icon name="lucide:external-link" class="h-4 w-4" /><span class="hidden sm:inline">Open separately</span></a><button type="button" class="btn btn-circle btn-ghost btn-sm" aria-label="Close evidence drawer" @click="activeEvidence = null"><Icon name="lucide:x" class="h-5 w-5" /></button></div>
        </header>
        <div class="min-h-0 flex-1 bg-base-200/50 p-3"><img v-if="activeEvidence.mime_type?.startsWith('image/')" :src="activeEvidence.url" :alt="activeEvidence.title || activeEvidence.file_name" class="mx-auto h-full max-w-full object-contain"><iframe v-else :src="activeEvidence.url" :title="activeEvidence.title || activeEvidence.file_name" class="h-full w-full rounded-lg border-0 bg-white" /></div>
      </aside>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="activeQuotationBid" class="fixed inset-0 z-[100] flex flex-col bg-base-200" role="dialog" aria-modal="true" aria-label="Full bidder quotation">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 bg-base-100 px-4 py-3 sm:px-6"><div><p class="text-xs font-semibold uppercase tracking-wide text-info">Full financial quotation</p><h2 class="text-lg font-semibold">{{ activeQuotationBid.company?.name || activeQuotationBid.uuid }}</h2></div><div class="flex items-center gap-3"><div class="text-right"><p class="text-xs text-base-content/50">Submitted total</p><p class="font-bold">{{ formatMoney(activeQuotationBid.financial_proposal?.amount, activeQuotationBid.financial_proposal?.currency_code) }}</p></div><button type="button" class="btn btn-circle btn-ghost" aria-label="Close full quotation" @click="activeQuotationBid = null"><Icon name="lucide:x" class="h-5 w-5" /></button></div></header>
      <main class="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        <div class="mx-auto max-w-7xl space-y-4">
          <div class="grid gap-3 sm:grid-cols-4">
            <div class="rounded-xl border border-base-200 bg-base-100 p-4"><p class="text-xs text-base-content/50">Combined rank</p><p class="mt-1 text-xl font-bold">#{{ qcbsRankedBids.findIndex(bid => bid.uuid === activeQuotationBid.uuid) + 1 }}</p></div>
            <div class="rounded-xl border border-base-200 bg-base-100 p-4"><p class="text-xs text-base-content/50">Technical points</p><p class="mt-1 text-xl font-bold">{{ formatScore(qcbsTechnicalPoints(activeQuotationBid)) }}</p></div>
            <div class="rounded-xl border border-base-200 bg-base-100 p-4"><p class="text-xs text-base-content/50">Financial points</p><p class="mt-1 text-xl font-bold">{{ formatScore(qcbsFinancialPoints(activeQuotationBid)) }}</p></div>
            <div class="rounded-xl border border-base-200 bg-base-100 p-4"><p class="text-xs text-base-content/50">Combined points</p><p class="mt-1 text-xl font-bold text-primary">{{ formatScore(qcbsCombinedPoints(activeQuotationBid)) }}</p></div>
          </div>

          <section class="overflow-hidden rounded-xl border border-base-200 bg-base-100">
            <header class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 px-4 py-3 sm:px-5">
              <div><h3 class="font-semibold">Submitted quotation schedule</h3><p class="text-xs text-base-content/50">Complete financial response opened from Envelope 2, shown by lot and priced line.</p></div>
              <span class="badge badge-outline">Currency: {{ activeQuotation?.currency_code || 'USD' }}</span>
            </header>

            <div v-if="quotationLots.length" class="divide-y divide-base-200">
              <article v-for="lot in quotationLots" :key="`quotation-lot-${lot.number}`">
                <header class="flex flex-wrap items-center justify-between gap-2 bg-base-200/30 px-4 py-3 sm:px-5">
                  <div><p class="text-xs font-semibold uppercase tracking-wide text-base-content/50">Lot {{ lot.number }}</p><h4 class="font-semibold">{{ lot.description }}</h4></div>
                  <div class="text-right"><p class="text-xs text-base-content/50">Lot subtotal</p><p class="font-mono font-bold">{{ formatMoney(lot.subtotal, activeQuotation?.currency_code) }}</p></div>
                </header>
                <div class="overflow-x-auto">
                  <table class="table table-sm">
                    <thead><tr><th class="w-12">#</th><th>Milestone / item</th><th>Due point / details</th><th class="text-right">Quantity / allocation</th><th class="text-right">Unit price</th><th class="text-right">Line total</th></tr></thead>
                    <tbody>
                      <tr v-for="(row, rowIndex) in lot.rows" :key="`${lot.number}-${rowIndex}`">
                        <td class="text-base-content/45">{{ rowIndex + 1 }}</td>
                        <td><p class="font-medium">{{ row.description }}</p><span class="badge badge-ghost badge-sm mt-1">{{ row.type === 'MILESTONE' ? 'Milestone' : 'Item' }}</span></td>
                        <td class="max-w-sm whitespace-normal text-base-content/65">{{ row.detail || '—' }}</td>
                        <td class="text-right font-mono">{{ row.type === 'MILESTONE' ? formatPercentage(row.allocation) : formatQuantity(row.quantity) }}</td>
                        <td class="text-right font-mono">{{ row.type === 'MILESTONE' ? '—' : formatOptionalMoney(row.unit_price, activeQuotation?.currency_code) }}</td>
                        <td class="text-right font-mono font-semibold">{{ formatOptionalMoney(row.amount, activeQuotation?.currency_code) }}</td>
                      </tr>
                      <tr v-if="!lot.rows?.length"><td colspan="6" class="py-6 text-center text-base-content/45">No priced lines were submitted for this lot.</td></tr>
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
            <div v-else class="p-8 text-center text-base-content/45">No line-item quotation breakdown was included in the submitted financial envelope.</div>

            <footer class="border-t border-base-200 bg-base-200/20 p-4 sm:p-5">
              <div class="ml-auto max-w-md overflow-hidden rounded-lg border border-base-300 bg-base-100">
                <div class="flex items-center justify-between gap-4 px-4 py-3 text-sm"><span class="text-base-content/60">Subtotal</span><span class="font-mono font-semibold">{{ formatMoney(activeQuotation?.subtotal, activeQuotation?.currency_code) }}</span></div>
                <div v-if="activeQuotation?.charges_vat" class="flex items-center justify-between gap-4 border-t border-base-200 px-4 py-3 text-sm"><span class="text-base-content/60">VAT ({{ formatPercentage(activeQuotation?.vat_percentage) }})</span><span class="font-mono font-semibold">{{ formatMoney(activeQuotation?.vat_amount, activeQuotation?.currency_code) }}</span></div>
                <div class="flex items-center justify-between gap-4 border-t border-primary/25 bg-primary/5 px-4 py-4"><span class="font-semibold">Grand total</span><span class="font-mono text-lg font-bold text-primary">{{ formatMoney(activeQuotation?.grand_total, activeQuotation?.currency_code) }}</span></div>
              </div>
            </footer>
          </section>
        </div>
      </main>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({ tender: { type: Object, required: true }, rfqMode: { type: Boolean, default: false } })
const emit = defineEmits(['updated'])
const rfqMode = computed(() => props.rfqMode)
const { getTenderEvaluatorSubmissions, saveTenderEvaluatorSubmission, buildTenderEvaluationConsensus, getTenderEvaluationResults, getTenderEvaluationReport, submitTenderEvaluationRecommendation, decideTenderEvaluationRecommendationAsPmu, sendTenderSpocPaymentAlert, decideTenderEvaluationRecommendationAsAccountingOfficer, decryptTenderFinancialBids } = useTenderHelper()
const { presignAndUpload } = useS3Upload()
const loading = ref(true), saving = ref(false), scheme = ref(null), bids = ref([]), results = ref([]), report = ref(null), evaluation = ref({}), actors = ref({}), activeEvidence = ref(null), activeShortlistBid = ref(null), activeQuotationBid = ref(null), workflowStep = ref(1), message = ref(''), messageOk = ref(true), isOnline = ref(true), draftStatus = ref(''), draftsReady = ref(false), minutesFile = ref(null), pmuSubmissionComment = ref(''), reviewComments = ref(''), showPmuSubmissionDialog = ref(false), showRecommendationApproval = ref(false), showSpocAlertDialog = ref(false), spocGracePeriodEndsAt = ref(''), spocAlertMessage = ref('')
const autoSaveTimers = new Map()
const consensus = reactive({ recommended_supplier_bid_id: null, recommendation: '', consensus_notes: '' })
const shortlistDecisions = reactive({})
const selectionCode = computed(() => props.tender.bidevaluationmethod?.code)
const twoEnvelope = computed(() => evaluation.value?.two_envelope === true)
const technicalEnvelopeComplete = computed(() => evaluation.value?.technical_status === 'LOCKED')
const financialEnvelopeOpened = computed(() => evaluation.value?.financial_opened === true || evaluation.value?.financial_status === 'OPEN')
const canOpenFinancial = computed(() => actors.value?.is_chairperson === true && actors.value?.can_open_financial === true)
const canBuildShortlist = computed(() => actors.value?.is_chairperson === true && actors.value?.can_build_technical_shortlist === true)
const activeStage = computed(() => selectionCode.value === 'QCBS' && scheme.value?.technical_status === 'LOCKED' ? 'FINANCIAL' : selectionCode.value === 'QBS' || selectionCode.value === 'QCBS' ? 'TECHNICAL' : 'ALL')
const stageAvailable = computed(() => activeStage.value !== 'FINANCIAL' || scheme.value?.financial_status === 'OPEN')
const evaluationActive = computed(() => evaluation.value?.is_active === true)
const demoMode = computed(() => evaluation.value?.demo_mode === true)
const requiredRoles = computed(() => evaluation.value?.required_roles || [])
const committeeProgress = computed(() => evaluation.value?.committee_progress || [])
const allVotingSubmitted = computed(() => evaluation.value?.all_voting_submitted === true)
const mandatoryRoleAssignments = computed(() => {
  const claimed = new Set()
  return requiredRoles.value.map((requirement) => {
    const roleName = String(requirement.role || '')
    const expertise = String(requirement.expertise_area || '').toUpperCase()
    let candidates
    if (expertise) {
      candidates = committeeProgress.value.filter(member => String(member.expertise_area || '').toUpperCase() === expertise && member.is_voting === (expertise !== 'PMU'))
    } else if (roleName.toLowerCase().includes('additional')) {
      candidates = committeeProgress.value.filter(member => member.is_voting && !claimed.has(member.id))
    } else {
      candidates = committeeProgress.value.filter(member => member.is_voting)
    }
    const members = roleName.toLowerCase().includes('additional') || !expertise ? candidates : candidates.slice(0, Number(requirement.minimum || 1))
    members.forEach(member => claimed.add(member.id))
    return { ...requirement, members }
  })
})
const stageCriteria = computed(() => (scheme.value?.criteria || []).filter(criterion => activeStage.value === 'ALL' || criterion.stage === activeStage.value))
const consensusEligibleBids = computed(() => activeStage.value === 'TECHNICAL' && twoEnvelope.value ? bids.value.filter(bid => bid.eligibility_summary?.compliant) : bids.value)
const shortlistValid = computed(() => bids.value.length > 0 && bids.value.every((bid) => {
  const decision = shortlistDecisions[bid.id]
  return typeof decision?.shortlisted === 'boolean' && (decision.shortlisted || Boolean(decision.reason?.trim()))
}))
const shortlistDecisionCount = computed(() => bids.value.filter(bid => typeof shortlistDecisions[bid.id]?.shortlisted === 'boolean').length)
const financialRankedBids = computed(() => bids.value.filter(bid => Number(bid.financial_proposal?.amount) > 0).slice().sort((left, right) => Number(left.financial_proposal.amount) - Number(right.financial_proposal.amount)))
const qcbsRankedBids = computed(() => financialRankedBids.value.slice().sort((left, right) => {
  return qcbsCombinedPoints(right) - qcbsCombinedPoints(left)
    || qcbsTechnicalPoints(right) - qcbsTechnicalPoints(left)
    || Number(left.financial_proposal?.amount || 0) - Number(right.financial_proposal?.amount || 0)
}))
const activeQuotation = computed(() => activeQuotationBid.value?.financial_proposal?.quotation || null)
const quotationLots = computed(() => Array.isArray(activeQuotation.value?.lots) ? activeQuotation.value.lots : [])
const recommendationReady = computed(() => activeStage.value === 'FINANCIAL' && Boolean(report.value?.recommended_supplier_bid_id))
const spocReview = computed(() => report.value?.spoc_payment_review || null)
const spocStatusLabel = computed(() => {
  if (spocReview.value?.returns_to_spoc && spocReview.value.all_paid) return 'SPOC fee paid'
  if (!spocReview.value?.applicable) return 'No escalation required'
  if (spocReview.value.all_paid) return 'All fees paid'
  if (!spocReview.value.alert_sent_at) return 'Threshold exceeded'
  return spocReview.value.grace_period_expired ? 'Grace period expired' : 'Awaiting payment'
})
const minimumGraceDate = computed(() => toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)))
const recommendationSubmitted = computed(() => recommendationReady.value && report.value?.status !== 'DRAFT')
const recommendationStatusLabel = computed(() => ({ DRAFT: 'Chairperson draft', PMU_REVIEW: 'PMU review', ACCOUNTING_OFFICER_REVIEW: 'Accounting Officer review', SPOC_SUBMITTED: 'SPOC review', SPOC_RESUBMISSION_REQUIRED: 'SPOC resubmission required', SPOC_CERTIFIED_CANCELLATION: 'Cancellation certified', SPOC_NOT_CERTIFIED_CANCEL: 'Cancellation directed', APPROVED_FOR_NEGOTIATION: 'Negotiation approved' }[report.value?.status] || 'Not started'))
const recommendationStatusClass = computed(() => report.value?.status === 'APPROVED_FOR_NEGOTIATION' ? 'badge-success' : report.value?.status === 'DRAFT' ? 'badge-warning' : 'badge-info')
const recommendationActionLabel = computed(() => report.value?.status === 'PMU_REVIEW' ? 'Open PMU review' : report.value?.status === 'ACCOUNTING_OFFICER_REVIEW' ? 'Open Accounting Officer approval' : report.value?.status === 'APPROVED_FOR_NEGOTIATION' ? 'View approved recommendation' : 'Submit recommendation to PMU')
const rfpEvaluationSteps = computed(() => {
  const reportStatus = report.value?.status
  const postAoStatuses = ['SPOC_SUBMITTED', 'SPOC_RESUBMISSION_REQUIRED', 'SPOC_CERTIFIED_CANCELLATION', 'SPOC_NOT_CERTIFIED_CANCEL', 'APPROVED_FOR_NEGOTIATION']
  const recommendationSent = ['PMU_REVIEW', 'ACCOUNTING_OFFICER_REVIEW', ...postAoStatuses].includes(reportStatus)
  const pmuComplete = ['ACCOUNTING_OFFICER_REVIEW', ...postAoStatuses].includes(reportStatus)
  const accountingOfficerComplete = postAoStatuses.includes(reportStatus)

  return [
    {
      number: 1,
      label: 'Eligibility and technical evaluation',
      description: 'Every voting evaluator reviews Envelope 1 and submits eligibility and technical findings.',
      state: allVotingSubmitted.value || technicalEnvelopeComplete.value ? 'complete' : 'active',
      status: allVotingSubmitted.value || technicalEnvelopeComplete.value ? 'Completed' : 'In progress',
    },
    {
      number: 2,
      label: 'Chairperson technical shortlist',
      description: 'The chairperson confirms the bidders proceeding to financial opening.',
      state: technicalEnvelopeComplete.value ? 'complete' : workflowStep.value === 2 || canBuildShortlist.value ? 'ready' : 'locked',
      status: technicalEnvelopeComplete.value ? 'Completed' : workflowStep.value === 2 ? 'Active' : canBuildShortlist.value ? 'Ready' : 'Locked',
    },
    {
      number: 3,
      label: 'Financial opening and ranking',
      description: 'Open shortlisted quotations, calculate the QCBS ranking, and submit the committee recommendation.',
      state: recommendationSent ? 'complete' : financialEnvelopeOpened.value || canOpenFinancial.value ? 'ready' : 'locked',
      status: recommendationSent ? 'Sent to PMU' : recommendationReady.value ? 'Recommendation ready' : financialEnvelopeOpened.value ? 'Ranking active' : canOpenFinancial.value ? 'Ready to open' : 'Sealed',
      opensApproval: false,
    },
    {
      number: 4,
      label: 'PMU review',
      description: 'The PMU reviews the ranking, signed committee minutes, and recommendation before forwarding it.',
      state: pmuComplete ? 'complete' : reportStatus === 'PMU_REVIEW' ? 'active' : 'locked',
      status: pmuComplete ? 'Completed' : reportStatus === 'PMU_REVIEW' ? 'Action required' : 'Locked',
      opensApproval: reportStatus === 'PMU_REVIEW',
    },
    {
      number: 5,
      label: 'Accounting Officer approval',
      description: spocReview.value?.returns_to_spoc ? 'The Accounting Officer approves onward submission to SPOC.' : 'The Accounting Officer gives final approval before contract negotiation can begin.',
      state: accountingOfficerComplete ? 'complete' : reportStatus === 'ACCOUNTING_OFFICER_REVIEW' ? 'active' : 'locked',
      status: accountingOfficerComplete ? 'Approved' : reportStatus === 'ACCOUNTING_OFFICER_REVIEW' ? 'Action required' : 'Locked',
      opensApproval: reportStatus === 'ACCOUNTING_OFFICER_REVIEW' || accountingOfficerComplete,
    },
    ...(spocReview.value?.returns_to_spoc ? [{
      number: 6,
      label: 'SPOC review and resolution',
      description: 'The regulator reviews the submission, deliberates by Round Robin or Sitting, confirms the committee record and issues its resolution.',
      state: reportStatus === 'APPROVED_FOR_NEGOTIATION' || String(reportStatus).startsWith('SPOC_') && reportStatus !== 'SPOC_SUBMITTED' ? 'complete' : reportStatus === 'SPOC_SUBMITTED' ? 'active' : 'locked',
      status: reportStatus === 'SPOC_SUBMITTED' ? 'In progress' : reportStatus === 'APPROVED_FOR_NEGOTIATION' ? 'Certified' : String(reportStatus).startsWith('SPOC_') ? 'Resolved' : 'Locked',
      opensApproval: reportStatus === 'SPOC_SUBMITTED',
    }] : []),
  ]
})
const recommendationSteps = computed(() => {
  const status = report.value?.status
  const position = { DRAFT: 0, PMU_REVIEW: 1, ACCOUNTING_OFFICER_REVIEW: 2, APPROVED_FOR_NEGOTIATION: 4 }[status] ?? 0
  return [
    { key: 'chair', label: 'Chairperson', description: 'Attach signed committee minutes and submit the ranked recommendation.', complete: position > 0, active: position === 0 },
    { key: 'pmu', label: 'PMU review', description: 'Review the evaluation record and forward or return it.', complete: position > 1, active: position === 1 },
    { key: 'ao', label: 'Accounting Officer', description: 'Approve the recommendation or return it to the PMU.', complete: position > 2, active: position === 2 },
    { key: 'negotiation', label: 'Contract negotiation', description: 'Unlocked only after Accounting Officer approval.', complete: position > 3, active: position === 3 },
  ]
})
const recommendationWaitingMessage = computed(() => report.value?.status === 'PMU_REVIEW' ? 'Waiting for the PMU Head to review the recommendation.' : report.value?.status === 'ACCOUNTING_OFFICER_REVIEW' ? 'Waiting for the Accounting Officer to decide the recommendation.' : 'Waiting for the authorised officer to complete this stage.')
const draftKey = computed(() => `egp:evaluation-draft:${actors.value?.user_uuid || 'current'}:${props.tender.uuid}:${activeStage.value}`)

function workflowStepClass(state) { return state === 'complete' ? 'border-success/40 bg-success/5' : state === 'active' ? 'border-info/40 bg-info/5' : state === 'ready' ? 'border-warning/50 bg-warning/5' : 'border-base-300 bg-base-200/30' }
function workflowStepBadgeClass(state) { return state === 'complete' ? 'badge-success' : state === 'active' ? 'badge-info' : state === 'ready' ? 'badge-warning' : 'badge-ghost' }

function hydrateBid(bid) {
  const existing = bid.evaluator_submission
  const existingScores = new Map((existing?.scores || []).map(score => [Number(score.tender_evaluation_criterion_id), score]))
  const existingDocuments = new Map((existing?.document_decisions || []).map(decision => [decision.document_uuid, decision]))
  const submitted = activeStage.value === 'TECHNICAL' ? existing?.technical_status === 'SUBMITTED' : activeStage.value === 'FINANCIAL' ? existing?.financial_status === 'SUBMITTED' : existing?.status === 'SUBMITTED'
  return { ...bid, form: { submitted, evaluated_amount: existing?.evaluated_amount == null ? (bid.financial_proposal?.amount == null ? null : Number(bid.financial_proposal.amount)) : Number(existing.evaluated_amount), comments: existing?.comments || '', document_decisions: Object.fromEntries((bid.documents || []).map(document => { const key = documentDecisionKey(document); const value = existingDocuments.get(key); return [key, { compliant: value?.compliant ?? null, comments: value?.comments || '' }] })), scores: Object.fromEntries((scheme.value?.criteria || []).map(criterion => { const value = existingScores.get(Number(criterion.id)); return [criterion.id, { score: value == null ? null : Number(value.score), comment: value?.comment || '' }] })) } }
}
function bidTechnicalTotal(bid) { return Math.round((scheme.value?.criteria || []).filter(c => c.stage === 'TECHNICAL').reduce((sum, c) => sum + Number(bid.form.scores[c.id]?.score || 0) * Number(c.weight) / 100, 0) * 100) / 100 }
function weightedBandPoints(band, criterion) { return Math.round(Number(band.score || 0) * Number(criterion.weight || 0)) / 100 }
function normalizeCriterionText(value) { return String(value || '').toLowerCase().replace(/&(?:#\d+|#x[\da-f]+|\w+);/gi, ' ').replace(/[^a-z0-9]+/g, ' ').trim() }
function criterionResponse(bid, criterion, index) {
  const responses = bid.technical_responses || []
  const criterionText = normalizeCriterionText(criterion.name)
  return responses.find((response) => {
    const responseText = normalizeCriterionText(response.question)
    return responseText && (responseText === criterionText || responseText.includes(criterionText) || criterionText.includes(responseText))
  }) || responses[index] || null
}
function criterionGroups(bid) {
  const items = stageCriteria.value.map((criterion, index) => ({ criterion, response: criterionResponse(bid, criterion, index) }))
  if (rfqMode.value || activeStage.value !== 'TECHNICAL') return [{ key: activeStage.value, name: null, weight: null, items }]
  const groups = new Map()
  items.forEach((item) => {
    const name = item.response?.group || item.criterion.name.split(':')[0] || 'Technical criteria'
    if (!groups.has(name)) groups.set(name, { key: name, name, weight: item.response?.group_weight, items: [] })
    const group = groups.get(name)
    group.items.push(item)
    if (group.weight == null && item.response?.group_weight != null) group.weight = item.response.group_weight
  })
  return [...groups.values()].map(group => ({ ...group, weight: group.weight ?? group.items.reduce((sum, item) => sum + Number(item.criterion.weight || 0), 0) }))
}
function questionWeight(item, group) { return item.response?.question_weight ?? (Number(group.weight) > 0 ? Number(item.criterion.weight || 0) / Number(group.weight) * 100 : 0) }
function documentDecisionKey(document) { return document?.decision_uuid || document?.requirement_uuid || document?.uuid }
function documentReviewsComplete(bid) { return (bid.documents || []).every(document => { const decision = bid.form.document_decisions?.[documentDecisionKey(document)]; return typeof decision?.compliant === 'boolean' && (decision.compliant || Boolean(decision.comments?.trim())) }) }
function documentEligibilityPassed(bid) { return documentReviewsComplete(bid) && Object.values(bid.form.document_decisions || {}).every(decision => decision.compliant === true) }
function displayBidderResponse(response) { return response?.answer || (response?.file ? 'Attachment provided as the bidder response.' : 'No response submitted.') }
function formatScore(value) { return Number(value || 0).toFixed(2).replace(/\.00$/, '') }
function formatMoney(value, currency = 'USD') { return Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2 }) }
function formatOptionalMoney(value, currency = 'USD') { return value == null || value === '' ? '—' : formatMoney(value, currency) }
function formatQuantity(value) { return value == null || value === '' ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }) }
function formatPercentage(value) { return value == null || value === '' ? '—' : `${formatQuantity(value)}%` }
function formatDateTime(value) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }
function toLocalDateTimeInput(value) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
function financialPriceRank(bid) { return financialRankedBids.value.findIndex(item => item.uuid === bid.uuid) + 1 }
function qcbsTechnicalPoints(bid) { return Number(results.value.find(result => Number(result.supplier_bid_id) === Number(bid.id))?.consensus_technical_score || 0) }
function qcbsFinancialPoints(bid) {
  const lowest = Number(financialRankedBids.value[0]?.financial_proposal?.amount || 0)
  const amount = Number(bid.financial_proposal?.amount || 0)
  const weight = Number((scheme.value?.criteria || []).filter(criterion => criterion.stage === 'FINANCIAL').reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0))
  return lowest > 0 && amount > 0 ? Math.round((lowest / amount) * weight * 10000) / 10000 : 0
}
function qcbsCombinedPoints(bid) { return qcbsTechnicalPoints(bid) + qcbsFinancialPoints(bid) }
function bidderName(id, result = null) { return result?.supplier_bid?.company?.name || bids.value.find(bid => Number(bid.id) === Number(id))?.company?.name || `Bid #${id}` }
function reviewDocumentDecision(review, documentUuid) { return (review?.document_decisions || []).find(decision => decision.document_uuid === documentUuid) }
function openShortlistReview(bid) { activeShortlistBid.value = bid }
function closeShortlistReview() { activeShortlistBid.value = null }
function proceedToShortlist() {
  if (canBuildShortlist.value) workflowStep.value = 2
}
function hydrateShortlistDecisions() {
  bids.value.forEach((bid) => {
    const result = results.value.find(item => Number(item.supplier_bid_id) === Number(bid.id))
    shortlistDecisions[bid.id] = { shortlisted: result ? Boolean(result.passed) : null, reason: result?.consensus_notes || '' }
  })
}
function failure(error, fallback) { return error?.value?.data?.message || error?.value?.response?._data?.message || fallback }
function submissionPayload(bid, submit = false) {
  const allowedIds = new Set(stageCriteria.value.map(criterion => Number(criterion.id)))
  return { stage: activeStage.value, scores: Object.entries(bid.form.scores).filter(([criterionId, score]) => allowedIds.has(Number(criterionId)) && score.score != null).map(([criterion_id, score]) => ({ criterion_id: Number(criterion_id), score: Number(score.score), comment: score.comment || null })), document_decisions: activeStage.value === 'FINANCIAL' ? undefined : Object.entries(bid.form.document_decisions || {}).filter(([, decision]) => typeof decision.compliant === 'boolean').map(([document_uuid, decision]) => ({ document_uuid, compliant: decision.compliant, comments: decision.comments || null })), evaluated_amount: activeStage.value === 'FINANCIAL' || rfqMode.value ? bid.form.evaluated_amount : null, comments: bid.form.comments || null, submit }
}
function readLocalDraft() {
  try { return JSON.parse(localStorage.getItem(draftKey.value) || 'null') } catch { return null }
}
function persistLocalDraft() {
  if (!draftsReady.value) return
  const draftBids = Object.fromEntries(bids.value.filter(bid => !bid.form.submitted).map(bid => [bid.uuid, { updated_at: new Date().toISOString(), form: { evaluated_amount: bid.form.evaluated_amount, comments: bid.form.comments, document_decisions: bid.form.document_decisions, scores: bid.form.scores } }]))
  if (Object.keys(draftBids).length) localStorage.setItem(draftKey.value, JSON.stringify({ version: 2, stage: activeStage.value, bids: draftBids }))
  else localStorage.removeItem(draftKey.value)
  draftStatus.value = isOnline.value ? 'Saved locally; server sync pending…' : 'Saved locally while offline.'
}
function restoreLocalDraft(hydratedBids) {
  const cached = readLocalDraft()
  if (cached?.version !== 2 || !cached?.bids) return hydratedBids
  let restored = false
  const merged = hydratedBids.map((bid) => {
    const local = cached.bids[bid.uuid]
    const serverUpdatedAt = bid.evaluator_submission?.updated_at ? Date.parse(bid.evaluator_submission.updated_at) : 0
    if (!local?.form || bid.form.submitted || Date.parse(local.updated_at || 0) <= serverUpdatedAt) return bid
    restored = true
    const scores = { ...bid.form.scores }
    Object.keys(scores).forEach((key) => { if (local.form.scores?.[key]) scores[key] = { ...scores[key], ...local.form.scores[key] } })
    const documentDecisions = { ...bid.form.document_decisions }
    Object.keys(documentDecisions).forEach((key) => { if (local.form.document_decisions?.[key]) documentDecisions[key] = { ...documentDecisions[key], ...local.form.document_decisions[key] } })
    return { ...bid, form: { ...bid.form, evaluated_amount: local.form.evaluated_amount ?? bid.form.evaluated_amount, comments: local.form.comments ?? bid.form.comments, scores, document_decisions: documentDecisions } }
  })
  if (restored) draftStatus.value = 'A newer local draft was restored.'
  return merged
}
function removeLocalBid(bidUuid) {
  const cached = readLocalDraft()
  if (!cached?.bids?.[bidUuid]) return
  delete cached.bids[bidUuid]
  if (Object.keys(cached.bids).length) localStorage.setItem(draftKey.value, JSON.stringify(cached))
  else localStorage.removeItem(draftKey.value)
}
function scheduleServerAutoSave(bid, delay = 1800) {
  clearTimeout(autoSaveTimers.get(bid.uuid))
  if (bid.form.submitted || !evaluationActive.value || !stageAvailable.value) return
  autoSaveTimers.set(bid.uuid, setTimeout(async () => {
    if (!navigator.onLine || saving.value) return
    const response = await saveTenderEvaluatorSubmission(props.tender.uuid, bid.uuid, submissionPayload(bid, false))
    if (response.status.value) draftStatus.value = 'Saved locally and synced to the server.'
    else draftStatus.value = 'Saved locally; server sync will retry when online.'
  }, delay))
}
function handleOnlineStatus() {
  isOnline.value = navigator.onLine
  draftStatus.value = isOnline.value ? 'Back online; syncing local drafts…' : 'Saved locally while offline.'
  if (isOnline.value) bids.value.forEach(bid => scheduleServerAutoSave(bid, 100))
}

async function load() {
  draftsReady.value = false
  autoSaveTimers.forEach(timer => clearTimeout(timer)); autoSaveTimers.clear()
  loading.value = true
  try {
    const [workspace, resultResponse, reportResponse] = await Promise.all([getTenderEvaluatorSubmissions(props.tender.uuid), getTenderEvaluationResults(props.tender.uuid), getTenderEvaluationReport(props.tender.uuid)])
    const payload = workspace.data.value?.data || {}
    scheme.value = payload.scheme || null
    evaluation.value = { ...(payload.evaluation || {}), required_roles: payload.required_roles || [], committee_progress: payload.committee_progress || [] }
    actors.value = payload.actors || {}
    bids.value = restoreLocalDraft((payload.bids || []).map(hydrateBid))
    results.value = resultResponse.data.value?.data || []
    report.value = reportResponse.data.value?.data || null
    hydrateShortlistDecisions()
    if (workspace.error.value || resultResponse.error.value) {
      messageOk.value = false
      message.value = failure(workspace.error.value ? workspace.error : resultResponse.error, 'You do not have permission to view this evaluation.')
      bids.value = []
      results.value = []
    }
  } finally { loading.value = false; await nextTick(); draftsReady.value = true }
}

async function saveBid(bid, submit) {
  if (!evaluationActive.value) {
    messageOk.value = false
    message.value = 'Complete the evaluation committee setup and start the evaluation before entering scores.'
    return
  }
  saving.value = true; message.value = ''
  clearTimeout(autoSaveTimers.get(bid.uuid))
  const response = await saveTenderEvaluatorSubmission(props.tender.uuid, bid.uuid, submissionPayload(bid, submit))
  messageOk.value = response.status.value; message.value = response.status.value ? (submit ? 'Assessment submitted.' : 'Assessment draft saved.') : failure(response.error, 'The assessment could not be saved.')
  if (response.status.value) { if (submit) removeLocalBid(bid.uuid); await load(); emit('updated') }
  saving.value = false
}
async function buildConsensus() {
  saving.value = true; message.value = ''
  const response = await buildTenderEvaluationConsensus(props.tender.uuid, { recommended_supplier_bid_id: consensus.recommended_supplier_bid_id || null, recommendation: consensus.recommendation || null, consensus_notes: consensus.consensus_notes || null })
  messageOk.value = response.status.value; message.value = response.status.value ? 'Consensus results and evaluation report generated.' : failure(response.error, 'Consensus could not be generated.')
  if (response.status.value) await load()
  saving.value = false
}
async function finalizeAndSubmitRecommendation() {
  if (!minutesFile.value || !pmuSubmissionComment.value.trim() || !qcbsRankedBids.value.length) return
  saving.value = true; message.value = ''
  if (!recommendationReady.value) {
    const consensusResponse = await buildTenderEvaluationConsensus(props.tender.uuid, {})
    if (!consensusResponse.status.value) {
      messageOk.value = false
      message.value = failure(consensusResponse.error, 'The automatic QCBS ranking could not be finalized.')
      saving.value = false
      return
    }
  }
  const upload = await presignAndUpload(minutesFile.value, 'tender-evaluation-minutes')
  if (!upload.ok) { messageOk.value = false; message.value = upload.error || 'Committee minutes upload failed.'; saving.value = false; return }
  const minutes = { path: upload.key, filename: minutesFile.value.name, mime_type: minutesFile.value.type || 'application/octet-stream', size: minutesFile.value.size }
  const response = await submitTenderEvaluationRecommendation(props.tender.uuid, minutes, pmuSubmissionComment.value.trim())
  messageOk.value = response.status.value; message.value = response.status.value ? 'Automatic QCBS recommendation and committee minutes sent to the PMU.' : failure(response.error, 'The recommendation could not be sent to the PMU.')
  if (response.status.value) { minutesFile.value = null; pmuSubmissionComment.value = ''; showPmuSubmissionDialog.value = false; await load(); emit('updated') }
  saving.value = false
}
async function pmuDecision(action) {
  saving.value = true; message.value = ''
  const response = await decideTenderEvaluationRecommendationAsPmu(props.tender.uuid, action, reviewComments.value)
  messageOk.value = response.status.value; message.value = response.status.value ? (action === 'FORWARD' ? 'Recommendation sent to the Accounting Officer.' : 'Recommendation returned to the Chairperson.') : failure(response.error, 'The PMU decision could not be recorded.')
  if (response.status.value) { reviewComments.value = ''; await load(); emit('updated') }
  saving.value = false
}
function openSpocAlertDialog() {
  spocGracePeriodEndsAt.value = toLocalDateTimeInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  spocAlertMessage.value = 'An opened financial quotation exceeded the applicable procurement entity class threshold. Please pay the SPOC administration fee by the stated deadline for this procurement process to proceed.'
  showSpocAlertDialog.value = true
}
async function sendSpocAlert() {
  if (!spocGracePeriodEndsAt.value || !spocAlertMessage.value.trim()) return
  saving.value = true; message.value = ''
  const response = await sendTenderSpocPaymentAlert(props.tender.uuid, new Date(spocGracePeriodEndsAt.value).toISOString(), spocAlertMessage.value.trim())
  messageOk.value = response.status.value
  message.value = response.status.value ? 'SPOC fee invoices and payment alerts sent to all participating bidders.' : failure(response.error, 'The SPOC payment alert could not be sent.')
  if (response.status.value) { showSpocAlertDialog.value = false; await load(); emit('updated') }
  saving.value = false
}
async function accountingOfficerDecision(action) {
  saving.value = true; message.value = ''
  const response = await decideTenderEvaluationRecommendationAsAccountingOfficer(props.tender.uuid, action, reviewComments.value || null)
  messageOk.value = response.status.value; message.value = response.status.value ? (action === 'APPROVE' ? 'Recommendation approved. Contract negotiation is now active.' : 'Recommendation returned to the PMU.') : failure(response.error, 'The Accounting Officer decision could not be recorded.')
  if (response.status.value) { reviewComments.value = ''; await load(); emit('updated') }
  saving.value = false
}
async function buildTechnicalShortlist() {
  if (!allVotingSubmitted.value || !shortlistValid.value) return
  saving.value = true; message.value = ''
  const response = await buildTenderEvaluationConsensus(props.tender.uuid, {
    shortlist_decisions: bids.value.map(bid => ({ supplier_bid_id: Number(bid.id), shortlisted: shortlistDecisions[bid.id].shortlisted, reason: shortlistDecisions[bid.id].reason || null })),
    recommendation: 'Chairperson technical shortlist for financial opening',
  })
  messageOk.value = response.status.value
  message.value = response.status.value ? 'Technical shortlist confirmed. Envelope 1 is locked for financial opening.' : failure(response.error, 'The technical shortlist could not be confirmed.')
  if (response.status.value) { await load(); emit('updated') }
  saving.value = false
}
async function openFinancial() {
  saving.value = true; message.value = ''
  const response = await decryptTenderFinancialBids(props.tender.uuid)
  messageOk.value = response.status.value; message.value = response.status.value ? 'Qualified financial envelopes opened. Financial evaluation can now begin.' : failure(response.error, 'The financial envelopes could not be opened.')
  if (response.status.value) { await load(); emit('updated') }
  saving.value = false
}
watch(bids, () => { if (!draftsReady.value) return; persistLocalDraft(); bids.value.forEach(bid => scheduleServerAutoSave(bid)) }, { deep: true })
onMounted(() => { isOnline.value = navigator.onLine; window.addEventListener('online', handleOnlineStatus); window.addEventListener('offline', handleOnlineStatus); load() })
onBeforeUnmount(() => { window.removeEventListener('online', handleOnlineStatus); window.removeEventListener('offline', handleOnlineStatus); autoSaveTimers.forEach(timer => clearTimeout(timer)) })
</script>
