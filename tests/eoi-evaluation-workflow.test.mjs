import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileTemplate, parse } from '@vue/compiler-sfc';

const panelUrl = new URL('../app/components/tenders/ConsultancyEoiEvaluationPanel.vue', import.meta.url);
const panelSource = fs.readFileSync(panelUrl, 'utf8');
const parentSource = fs.readFileSync(new URL('../app/components/tenders/ConsultancyEoiPanel.vue', import.meta.url), 'utf8');
const apiSource = fs.readFileSync(new URL('../app/composables/useConsultancyEoiEvaluation.js', import.meta.url), 'utf8');
const tenderDetailSource = fs.readFileSync(new URL('../app/pages/tenders/[uuid]/index.vue', import.meta.url), 'utf8');
const bidOpeningSource = fs.readFileSync(new URL('../app/pages/tenders/[uuid]/bid-opening.vue', import.meta.url), 'utf8');
const closedTendersSource = fs.readFileSync(new URL('../app/pages/tenders/closed.vue', import.meta.url), 'utf8');
const openedTendersSource = fs.readFileSync(new URL('../app/pages/tenders/opened.vue', import.meta.url), 'utf8');
const statusListSource = fs.readFileSync(new URL('../app/components/tenders/StatusListPage.vue', import.meta.url), 'utf8');
const myEvaluationsSource = fs.readFileSync(new URL('../app/pages/evaluations/index.vue', import.meta.url), 'utf8');
const evaluationWorkspaceSource = fs.readFileSync(new URL('../app/pages/evaluations/[uuid].vue', import.meta.url), 'utf8');
const requestDetailsSource = fs.readFileSync(new URL('../app/components/tenders/RequestDetailsStep.vue', import.meta.url), 'utf8');
const { descriptor } = parse(panelSource);

test('EOI evaluation panel compiles', () => {
  const result = compileTemplate({
    source: descriptor.template.content,
    filename: panelUrl.pathname,
    id: 'consultancy-eoi-evaluation',
  });

  assert.deepEqual(result.errors, []);
});

test('shows the Accounting Officer SPOC warning only for a threshold-qualified EOI', () => {
  assert.match(
    panelSource,
    /v-if="workspace\.requires_spoc"[^>]*>[\s\S]*?This EOI is subject to SPOC review and cannot be approved directly\./,
  );
});

test('replaces direct one-step shortlisting with the committee workflow', () => {
  assert.ok(parentSource.includes('TendersConsultancyEoiEvaluationPanel'));
  assert.equal(parentSource.includes('evaluateTenderConsultancyEoi'), false);

  for (const stage of [
    'Appoint the evaluation committee',
    'Conflict-of-interest declaration',
    'Independent assessment',
    'Evaluation Chairperson review',
    'PMU Head review',
    'Accounting Officer review',
    'Evaluator conclusion',
  ]) {
    assert.ok(panelSource.includes(stage), `Missing EOI evaluation stage: ${stage}`);
  }
});

test('refreshes the tender after the EOI shortlist is approved', () => {
  assert.ok(parentSource.includes('@completed="handleEvaluationCompleted"'));
  assert.ok(parentSource.includes('async function handleEvaluationCompleted()'));
  assert.ok(parentSource.includes("emit('updated')"));
});

test('uses every committee EOI evaluation endpoint', () => {
  for (const endpoint of ['/initialize', '/committee', '/conflict', '/scores', '/documents/', '/consensus', '/return', '/pmu-submit', '/pmu-return', '/accounting-officer-decision']) {
    assert.ok(apiSource.includes(endpoint), `Missing EOI evaluation endpoint: ${endpoint}`);
  }
});

test('shows the EOI workflow on consultancy tender details only', () => {
  assert.ok(tenderDetailSource.includes("procurementgroup?.code ?? '').toUpperCase() === 'CONSULTANCY'"));
  assert.ok(tenderDetailSource.includes("key: 'eoi', label: 'EOI workflow'"));
  assert.ok(tenderDetailSource.includes("activeTab === 'eoi' && isConsultancy"));
  assert.ok(tenderDetailSource.includes('<TendersConsultancyEoiPanel'));
});

test('offers RFP preparation after an approved EOI shortlist returns to draft', () => {
  assert.ok(tenderDetailSource.includes('const canContinueRfp = computed'));
  assert.ok(tenderDetailSource.includes('tender.value?.eoi_evidence_reference'));
  assert.ok(tenderDetailSource.includes('tender.value?.shortlist_approved_at'));
  assert.ok(tenderDetailSource.includes('Continue RFP preparation'));
  assert.ok(tenderDetailSource.includes('`/tenders/new?draft=${uuid}`'));
});

test('shows and locks the approved EOI shortlist during RFP preparation', () => {
  assert.ok(parentSource.includes('Approved shortlisted bidders'));
  assert.ok(parentSource.includes('shortlistedResponses'));
  assert.ok(parentSource.includes('Only these firms may view and respond to the RFP.'));
  assert.ok(requestDetailsSource.includes('Approved EOI shortlist'));
  assert.ok(requestDetailsSource.includes('This RFP is restricted to the bidders approved through the EOI evaluation.'));
  assert.ok(requestDetailsSource.includes('selectedSupplierCompanies'));
});

test('enforces committee composition and shortlist constraints in the client', () => {
  assert.ok(panelSource.includes("member.role === 'TECHNICAL'"));
  assert.ok(panelSource.includes("member.role === 'FINANCIAL'"));
  assert.ok(panelSource.includes("role: 'PMU_ADVISER'"));
  assert.ok(panelSource.includes('shortlistedCount.value <= 6'));
  assert.ok(panelSource.includes('shortlistExceptionReason.value.trim()'));
  assert.ok(panelSource.includes('Reason for not shortlisting'));
  assert.ok(panelSource.includes('Signed evaluation committee minutes'));
  assert.ok(panelSource.includes('Send shortlist to PMU Head'));
});

test('appoints the EOI committee only from the linked APP committee setup', () => {
  assert.ok(panelSource.includes('committee_source'));
  assert.ok(panelSource.includes('evaluation_members'));
  assert.ok(panelSource.includes('pmu_members'));
  assert.ok(panelSource.includes('evaluation committee set on the linked Annual Procurement Plan'));
  assert.equal(panelSource.includes('useOrganisationUsersHelper'), false);
  assert.equal(panelSource.includes('Add member'), false);
});

test('allows a single linked evaluator only when the API reports development mode', () => {
  assert.ok(panelSource.includes('workspace.value?.development_mode'));
  assert.ok(panelSource.includes('Development mode permits one linked APP evaluator'));
  assert.ok(panelSource.includes('committee.length !== 1'));
  assert.ok(panelSource.includes('developmentMode.value ? []'));
  assert.ok(panelSource.includes('The PMU adviser cannot also serve as a voting evaluator.'));
});

test('labels consultancy EOI assignments in My Evaluations', () => {
  assert.ok(myEvaluationsSource.includes("EOI: 'Consultancy EOI'"));
  assert.ok(myEvaluationsSource.includes("EOI: 'lucide:briefcase-business'"));
  assert.ok(myEvaluationsSource.includes('consultancy EOI, RFQ and least-cost'));
});

test('opens consultancy EOI assignments in the evaluator workspace', () => {
  assert.ok(evaluationWorkspaceSource.includes("tender.evaluation_type === 'EOI'"));
  assert.ok(evaluationWorkspaceSource.includes('<TendersConsultancyEoiEvaluationPanel'));
  assert.ok(evaluationWorkspaceSource.includes("EOI: 'Consultancy EOI'"));
});

test('shows complete EOI response details and secure evidence actions during individual evaluation', () => {
  for (const field of ['response.statement_of_interest', 'response.similar_experience', 'response.key_experts_summary', 'response.contact_name', 'response.association_type']) {
    assert.ok(panelSource.includes(field), `missing ${field}`);
  }
  assert.ok(panelSource.includes('response.joint_venture_partners'));
  assert.ok(panelSource.includes('View upload'));
  assert.ok(panelSource.includes('evaluationApi.getEvidenceUrl'));
  assert.ok(panelSource.includes('evidenceDrawerOpen'));
  assert.ok(panelSource.includes('aria-label="Document preview"'));
  assert.ok(panelSource.includes('Open separately'));
  assert.ok(!panelSource.includes("window.open(url, '_blank', 'noopener')"));
});

test('records consultant compliance and gives the chair every evaluator conclusion', () => {
  assert.ok(panelSource.includes('Calculated from mandatory compliance and the published overall score threshold.'));
  assert.ok(panelSource.includes('automaticCompliance'));
  assert.ok(panelSource.includes('Qualifying score'));
  assert.ok(panelSource.includes('Achievement band'));
  assert.ok(panelSource.includes('Automatic score'));
  assert.ok(panelSource.includes('scoreFromBand'));
  assert.ok(panelSource.includes('belowOverallThreshold'));
  assert.ok(panelSource.includes('Automatically calculated consensus score'));
  assert.ok(panelSource.includes('hasScoredCriteria'));
  assert.ok(panelSource.includes('calculatedConsensusScore'));
  assert.ok(panelSource.includes('Compliant'));
  assert.ok(panelSource.includes('Non-compliant'));
  assert.ok(panelSource.includes('evaluatorDecisionForm'));
  assert.ok(panelSource.includes('evaluator_decisions'));
  assert.ok(panelSource.includes('View criterion scores and comments from all evaluators'));
  assert.ok(panelSource.includes('evaluatorScoresFor'));
  assert.ok(panelSource.includes('Document assessment'));
  assert.ok(panelSource.includes('Criterion assessment'));
  assert.ok(panelSource.includes('Explain why this item is non-compliant.'));
});

test('restores a returned evaluation and shows the chairperson correction message', () => {
  assert.ok(panelSource.includes('Evaluation returned for correction'));
  assert.ok(panelSource.includes('Message from the Evaluation Chairperson'));
  assert.ok(panelSource.includes('currentMember.return_reason'));
  assert.ok(panelSource.includes('currentMember.value?.returned_at'));
  assert.ok(panelSource.includes('Your previous evaluation has been restored below.'));
});

test('gives the PMU Head the chairperson shortlist and all individual evaluations', () => {
  assert.ok(panelSource.includes('Review all shortlisted and non-shortlisted respondents'));
  assert.ok(panelSource.includes('chairDecisionCount(true)'));
  assert.ok(panelSource.includes('chairDecisionCount(false)'));
  assert.ok(panelSource.includes("'Shortlisted' : 'Not shortlisted'"));
  assert.ok(panelSource.includes('Chairperson’s reason for not shortlisting'));
  assert.ok(panelSource.includes('Individual evaluator'));
  assert.ok(panelSource.includes('View individual criterion evaluations'));
  assert.ok(panelSource.includes('View bidder response and uploads'));
  assert.ok(panelSource.indexOf('View bidder response and uploads') > panelSource.indexOf('View individual criterion evaluations'));
  assert.ok(panelSource.includes('Original submitted EOI response'));
  assert.ok(panelSource.includes('Documents uploaded by the bidder'));
  assert.ok(panelSource.includes('response.submission_documents'));
  assert.ok(panelSource.includes('response.submitted_by_user'));
  assert.ok(panelSource.includes('View document'));
  assert.ok(panelSource.includes("'pmu-response-' + response.uuid"));
  assert.ok(panelSource.includes('consensusDecisionFor'));
  assert.ok(panelSource.includes('evaluatorDecisionsFor'));
  assert.ok(panelSource.includes('evaluatorScoresFor'));
});

test('gives the Accounting Officer the same complete review package as the PMU Head', () => {
  assert.ok(panelSource.includes('canReviewRecommendation'));
  assert.ok(panelSource.includes('isAccountingOfficerReview'));
  assert.ok(panelSource.includes("workspace.value?.status === 'PMU_REVIEW'"));
  assert.ok(panelSource.includes("workspace.value?.status === 'ACCOUNTING_OFFICER_REVIEW'"));
  assert.ok(panelSource.includes("isAccountingOfficerReview ? 'Accounting Officer review' : 'PMU Head review'"));
  assert.ok(panelSource.includes('bidder responses and uploads'));
  assert.ok(panelSource.includes('Accounting Officer comments'));
  assert.ok(panelSource.includes('Send back to PMU Head'));
  assert.ok(panelSource.includes('returnToPmu'));
  assert.ok(panelSource.includes("'RETURN_PMU'"));
  assert.ok(panelSource.includes('Returned by the Accounting Officer for correction'));
  assert.ok(panelSource.includes('workspace.accounting_officer_return_reason'));
  assert.ok(panelSource.includes('Approve EOI shortlist'));
  assert.ok(panelSource.includes('Send EOI for SPOC'));
});

test('opens committee minutes in the document side drawer', () => {
  assert.ok(panelSource.includes('@click="openCommitteeMinutes"'));
  assert.ok(panelSource.includes('function openCommitteeMinutes()'));
  assert.ok(panelSource.includes("supplier_name: 'Signed evaluation committee minutes'"));
  assert.ok(panelSource.includes('fileMimeType(workspace.value.minutes_filename)'));
  assert.ok(panelSource.includes('aria-label="Document preview"'));
});

test('allows PMU to return the shortlist to the Evaluation Chairperson', () => {
  assert.ok(panelSource.includes('Comments *'));
  assert.ok(panelSource.includes('Send back to Chairperson'));
  assert.ok(panelSource.includes('Send to Accounting Officer'));
  assert.ok(panelSource.includes('returnToChairperson'));
  assert.ok(panelSource.includes('evaluationApi.pmuReturn(props.tenderUuid, pmuComments.value)'));
  assert.equal(panelSource.includes('pmuReturnReason'), false);
  assert.ok(panelSource.includes('workspace.pmu_return_reason'));
  assert.ok(panelSource.includes('Returned by the PMU Head for correction'));
  assert.ok(panelSource.includes("evaluationApi.pmuReturn"));
  assert.ok(apiSource.includes('pmuReturn:'));
});

test('routes closed EOI responses through controlled bid opening before evaluation', () => {
  assert.ok(panelSource.includes('eoiOpeningComplete'));
  assert.ok(panelSource.includes(`/bid-opening`));
  assert.ok(bidOpeningSource.includes("opening_phase === 'EOI'"));
  assert.ok(bidOpeningSource.includes('Controlled EOI opening'));
  assert.ok(bidOpeningSource.includes('Continue to EOI evaluation'));
});

test('shows EOI, RFQ and RFP phases in the closed-tender opening queue', () => {
  assert.ok(closedTendersSource.includes('status="AWAITING_OPENING"'));
  assert.ok(statusListSource.includes('Awaiting EOI opening'));
  assert.ok(statusListSource.includes('Awaiting RFQ opening'));
  assert.ok(statusListSource.includes('Awaiting RFP opening'));
  assert.ok(statusListSource.includes("tender.opening_status === 'AWAITING_EOI_OPENING'"));
  assert.ok(statusListSource.includes("tender.opening_status === 'AWAITING_RFQ_OPENING'"));
});

test('shows opened EOI responses in the evaluation queue', () => {
  assert.ok(openedTendersSource.includes('status="AWAITING_EVALUATION"'));
  assert.ok(statusListSource.includes('Awaiting EOI evaluation'));
  assert.ok(statusListSource.includes('Awaiting RFQ evaluation'));
  assert.ok(statusListSource.includes('Awaiting RFP evaluation'));
  assert.ok(statusListSource.includes('Evaluate EOI'));
});

test('always releases the EOI evaluation loading state when either request fails', () => {
  assert.ok(panelSource.includes('Promise.allSettled'));
  assert.ok(panelSource.includes('finally {'));
  assert.ok(panelSource.includes('loading.value = false'));
  assert.ok(apiSource.includes('timeout: 15000'));
});

test('always releases the parent EOI workflow loader and offers a retry', () => {
  assert.ok(parentSource.includes('Promise.allSettled'));
  assert.ok(parentSource.includes('loadFailed.value = true'));
  assert.ok(parentSource.includes('finally {'));
  assert.ok(parentSource.includes('The EOI workflow could not be loaded.'));
  assert.ok(parentSource.includes('@click="load"'));
});

test('treats the reactive committee as an array and normalizes optional API collections', () => {
  assert.equal(panelSource.includes('committee.value.length'), false);
  assert.ok(panelSource.includes('if (committee.length < 3)'));
  assert.ok(panelSource.includes('const asArray = value => Array.isArray(value) ? value : []'));
  assert.ok(panelSource.includes('pmu_members: asArray(source.pmu_members)'));
});
