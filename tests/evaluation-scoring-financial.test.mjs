import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileTemplate, parse } from '@vue/compiler-sfc';

const componentUrl = new URL('../app/components/tenders/EvaluationScoringPanel.vue', import.meta.url);
const componentSource = fs.readFileSync(componentUrl, 'utf8');
const tenderDetailSource = fs.readFileSync(new URL('../app/pages/tenders/[uuid]/index.vue', import.meta.url), 'utf8');
const { descriptor } = parse(componentSource);

test('calculates financial proposal scores instead of rendering a manual selection', () => {
  assert.ok(componentSource.includes("activeStage === 'FINANCIAL'"));
  assert.ok(componentSource.includes('calculated automatically from the evaluated amount'));
  assert.ok(componentSource.includes('v-model.number="bid.form.evaluated_amount"'));
  assert.ok(componentSource.includes('v-if="rfqMode || activeStage !== \'FINANCIAL\'"'));
  assert.ok(componentSource.includes('Automatic QCBS financial evaluation and ranking'));
  assert.ok(componentSource.includes('financialRankedBids'));
  assert.ok(componentSource.includes('qcbsRankedBids'));
  assert.ok(componentSource.includes('Cheapest · full financial points'));
  assert.ok(componentSource.includes('Combined points'));
  assert.ok(componentSource.includes('highest combined QCBS points to the lowest'));
});

test('evaluation scoring template compiles', () => {
  const result = compileTemplate({
    source: descriptor.template.content,
    filename: componentUrl.pathname,
    id: 'evaluation-scoring-financial',
  });

  assert.deepEqual(result.errors, []);
});

test('presents the two-envelope gate and chairperson financial opening action', () => {
  assert.ok(componentSource.includes('Two-envelope evaluation'));
  assert.ok(componentSource.includes('Eligibility and technical evaluation'));
  assert.ok(componentSource.includes('Step 2 · Chairperson technical shortlist'));
  assert.ok(componentSource.includes('Financial opening'));
  assert.ok(componentSource.includes('Eligibility is a pass/fail gate'));
  assert.ok(componentSource.includes("bid.eligibility_summary?.compliant ? 'Compliant' : 'Not compliant'"));
  assert.ok(componentSource.includes('Open qualified financial envelopes'));
  assert.ok(componentSource.includes('decryptTenderFinancialBids'));
});

test('shows the bidder response and attached evidence instead of repeating scoring weights', () => {
  assert.ok(componentSource.includes('Bidder response'));
  assert.ok(componentSource.includes('View attached file'));
  assert.ok(componentSource.includes('technical_responses'));
  assert.ok(componentSource.includes('displayBidderResponse(item.response)'));
  assert.equal(componentSource.includes('<p v-for="band in criterion.scoring_bands"'), false);
});

test('opens bidder evidence in a side drawer without leaving the evaluation', () => {
  assert.ok(componentSource.includes('<Teleport to="body">'));
  assert.ok(componentSource.includes('Bidder evidence document'));
  assert.ok(componentSource.includes('@click="activeEvidence = item.response.file"'));
  assert.ok(componentSource.includes('<iframe v-else :src="activeEvidence.url"'));
});

test('separates pass-fail eligibility from grouped weighted technical scoring', () => {
  assert.ok(componentSource.includes('B. Mandatory eligibility criteria'));
  assert.ok(componentSource.includes('Eligibility is a pass/fail gate'));
  assert.ok(componentSource.includes('C. Technical evaluation'));
  assert.ok(componentSource.includes('Group weight:'));
  assert.ok(componentSource.includes('% of group'));
  assert.ok(componentSource.includes('criterionGroups(bid)'));
  assert.equal(componentSource.includes('Eligibility score</span>'), false);
});

test('requires document eligibility decisions before technical submission', () => {
  assert.ok(componentSource.includes('A. Document eligibility'));
  assert.ok(componentSource.includes('View document'));
  assert.ok(componentSource.includes('Documents compliant'));
  assert.ok(componentSource.includes('Documents not compliant'));
  assert.ok(componentSource.includes('documentReviewsComplete(bid)'));
  assert.ok(componentSource.includes('document_decisions'));
  assert.equal(componentSource.includes(':name="`document-${bid.uuid}-${document.uuid}`"'), false);
});

test('keeps evaluator work in local storage and auto-syncs when online', () => {
  assert.ok(componentSource.includes('egp:evaluation-draft:'));
  assert.ok(componentSource.includes('persistLocalDraft'));
  assert.ok(componentSource.includes('restoreLocalDraft'));
  assert.ok(componentSource.includes('scheduleServerAutoSave'));
  assert.ok(componentSource.includes("window.addEventListener('online'"));
  assert.ok(componentSource.includes('Saved locally while offline.'));
});

test('prevents scoring and autosave before evaluation is started', () => {
  assert.ok(componentSource.includes('const evaluationActive = computed'));
  assert.ok(componentSource.includes('Complete the evaluation committee setup'));
  assert.ok(componentSource.includes('!evaluationActive.value || !stageAvailable.value'));
  assert.ok(componentSource.includes('bid.form.submitted || !evaluationActive'));
});

test('gates the RFP financial-opening shortlist behind all evaluator submissions and the chairperson', () => {
  assert.ok(componentSource.includes('RFP evaluation roles and submission progress'));
  assert.ok(componentSource.includes('requiredRoles'));
  assert.ok(componentSource.includes('committeeProgress'));
  assert.ok(componentSource.includes('mandatoryRoleAssignments'));
  assert.ok(componentSource.includes('Mandatory quorum role'));
  assert.ok(componentSource.includes('Development mode:'));
  assert.ok(componentSource.includes('Optional in dev mode'));
  assert.ok(componentSource.includes('Evaluation submitted'));
  assert.ok(componentSource.includes('allVotingSubmitted'));
  assert.ok(componentSource.includes('canBuildShortlist'));
  assert.ok(componentSource.includes('Proceed to shortlisting'));
  assert.ok(componentSource.includes('workflowStep === 2'));
  assert.ok(componentSource.includes('v-else-if="activeStage !== \'FINANCIAL\' && (!twoEnvelope || activeStage !== \'TECHNICAL\')"'));
  assert.ok(componentSource.includes("actors.value?.is_chairperson === true && actors.value?.can_build_technical_shortlist === true"));
  assert.ok(componentSource.includes('Chairperson technical shortlist'));
  assert.ok(componentSource.includes('Confirm shortlist and lock Envelope 1'));
  assert.ok(componentSource.includes('buildTechnicalShortlist'));
  assert.ok(tenderDetailSource.includes("key: 'evaluation', label: 'RFP evaluation'"));
  assert.ok(tenderDetailSource.includes("activeTab === 'evaluation' && isRfpEvaluationStage"));
});

test('opens a full-screen bidder review from the Step 2 shortlist table', () => {
  assert.ok(componentSource.includes('Chairperson decision'));
  assert.ok(componentSource.includes('Not shortlisted'));
  assert.ok(componentSource.includes('@click="openShortlistReview(bid)"'));
  assert.ok(componentSource.includes('activeShortlistBid'));
  assert.ok(componentSource.includes('fixed inset-0 z-[90] flex flex-col'));
  assert.ok(componentSource.includes('Detailed technical response'));
  assert.ok(componentSource.includes('Independent Envelope 1 evaluations'));
  assert.ok(componentSource.includes('evaluator_reviews'));
  assert.ok(componentSource.includes('Save decision and close'));
  assert.ok(componentSource.includes(':key="`shortlist-${bid.uuid}`"'));
});

test('shows bidder assessments without a collapsible bidder-name accordion', () => {
  assert.equal(componentSource.includes('<details v-for="bid in bids"'), false);
  assert.equal(componentSource.includes('collapse-title'), false);
  assert.ok(componentSource.includes('<article v-for="bid in bids"'));
});

test('keeps the financial workspace inside the automatic QCBS ranking card', () => {
  assert.ok(componentSource.includes("activeStage !== 'FINANCIAL' && (!twoEnvelope || activeStage !== 'TECHNICAL')"));
  assert.ok(componentSource.includes("activeStage !== 'FINANCIAL' && actors.is_chairperson"));
  assert.ok(componentSource.includes("activeStage !== 'FINANCIAL' && results.length"));
  assert.ok(componentSource.includes('Automatic QCBS recommendation ready'));
  assert.ok(componentSource.includes('@click="showPmuSubmissionDialog = true"'));
  assert.ok(componentSource.includes('@submit.prevent="finalizeAndSubmitRecommendation"'));
  assert.ok(!componentSource.includes('Committee recommendation *'));
  assert.ok(!componentSource.includes('Finalize ranking and recommendation'));
  assert.ok(componentSource.includes('showRecommendationApproval = true'));
});

test('opens each company full quotation from the QCBS ranking table', () => {
  assert.ok(componentSource.includes('View full quotation'));
  assert.ok(componentSource.includes('@click="activeQuotationBid = bid"'));
  assert.ok(componentSource.includes('Full financial quotation'));
  assert.ok(componentSource.includes('Submitted quotation schedule'));
  assert.ok(componentSource.includes('Milestone / item'));
  assert.ok(componentSource.includes('Quantity / allocation'));
  assert.ok(componentSource.includes('Unit price'));
  assert.ok(componentSource.includes('Line total'));
  assert.ok(componentSource.includes('v-for="lot in quotationLots"'));
  assert.ok(componentSource.includes('Grand total'));
  assert.ok(!componentSource.includes('quotationDetailRows'));
});

test('routes the final QCBS recommendation through chairperson, PMU and Accounting Officer approval', () => {
  assert.ok(componentSource.includes('rfpEvaluationSteps'));
  assert.ok(componentSource.includes("label: 'Financial opening and ranking'"));
  assert.ok(componentSource.includes("label: 'PMU review'"));
  assert.ok(componentSource.includes("label: 'Accounting Officer approval'"));
  assert.ok(componentSource.includes("reportStatus === 'PMU_REVIEW' ? 'active' : 'locked'"));
  assert.ok(componentSource.includes("reportStatus === 'ACCOUNTING_OFFICER_REVIEW' ? 'active' : 'locked'"));
  assert.ok(componentSource.includes('QCBS recommendation and approval chain'));
  assert.ok(componentSource.includes('Signed evaluation committee minutes'));
  assert.ok(componentSource.includes('Step 3 · Financial opening and ranking'));
  assert.ok(componentSource.includes('@submit.prevent="finalizeAndSubmitRecommendation"'));
  assert.ok(componentSource.indexOf('Step 3 · Financial opening and ranking') > componentSource.indexOf('Automatic QCBS financial evaluation and ranking'));
  assert.ok(componentSource.includes('PMU review locked'));
  assert.ok(componentSource.includes('aria-label="Send evaluation to PMU"'));
  assert.ok(componentSource.includes('Comment to PMU *'));
  assert.ok(componentSource.includes('Signed evaluation committee minutes *'));
  assert.ok(componentSource.includes('Send to PMU'));
  assert.ok(componentSource.includes('Send to Accounting Officer'));
  assert.ok(componentSource.includes('Approve recommendation'));
  assert.ok(componentSource.includes('Contract negotiation is active.'));
  assert.ok(componentSource.includes("report.status === 'APPROVED_FOR_NEGOTIATION'"));
  assert.ok(componentSource.includes('submitTenderEvaluationRecommendation'));
  assert.ok(componentSource.includes('decideTenderEvaluationRecommendationAsPmu'));
  assert.ok(componentSource.includes('decideTenderEvaluationRecommendationAsAccountingOfficer'));
});

test('gates PMU forwarding on post-opening SPOC fee alerts and bidder payments', () => {
  assert.ok(componentSource.includes('Post-opening SPOC check'));
  assert.ok(componentSource.includes('RFP returning to SPOC'));
  assert.ok(componentSource.includes('This RFP is returning to SPOC review.'));
  assert.ok(componentSource.includes('spocReview?.returns_to_spoc'));
  assert.ok(componentSource.includes('EOI fee and actual quotation threshold'));
  assert.ok(componentSource.includes('Notify all participating bidders'));
  assert.ok(componentSource.includes('Raise invoices and notify bidders'));
  assert.ok(componentSource.includes('spocReview?.forward_blocked'));
  assert.ok(componentSource.includes('Grace period expired'));
  assert.ok(componentSource.includes('sendTenderSpocPaymentAlert'));
});

test('does not render consultancy negotiation in the evaluation workspace', () => {
  assert.equal(componentSource.includes('Consultancy negotiation'), false);
  assert.equal(componentSource.includes('saveTenderConsultancyNegotiation'), false);
  assert.equal(componentSource.includes('getTenderConsultancyNegotiations'), false);
});
