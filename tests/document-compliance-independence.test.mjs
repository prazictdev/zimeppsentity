import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const generalEvaluation = read('../app/components/tenders/EvaluationScoringPanel.vue')
const rfqEvaluation = read('../app/components/tenders/RfqCompliancePanel.vue')
const lcsEvaluation = read('../app/pages/evaluations/least-cost-selection/[uuid]/index.vue')
const eoiEvaluation = read('../app/components/tenders/ConsultancyEoiEvaluationPanel.vue')

test('all tender evaluation methods keep document requirement decisions independent and initially unselected', () => {
  assert.ok(generalEvaluation.includes('document?.decision_uuid || document?.requirement_uuid || document?.uuid'))
  assert.ok(generalEvaluation.includes('const value = existingDocuments.get(key)'))
  assert.equal(generalEvaluation.includes('existingDocuments.get(key) || existingDocuments.get(document.uuid)'), false)
  assert.ok(generalEvaluation.includes(':name="`document-${bid.uuid}-${documentDecisionKey(document)}`"'))
  assert.ok(generalEvaluation.includes('compliant: value?.compliant ?? null'))
  assert.ok(generalEvaluation.includes('version: 2'))

  assert.ok(rfqEvaluation.includes(':name="`document-${documentBid.uuid}-${documentDecisionKey(doc)}`"'))
  assert.ok(rfqEvaluation.includes("forms[bid.uuid].documents[key] ||= { compliant: null, comments: '' }"))
  assert.equal(rfqEvaluation.includes('legacyDecision'), false)
  assert.ok(rfqEvaluation.includes('draft?.version === 2'))

  assert.ok(lcsEvaluation.includes(':name="`document-${documentBid.uuid}-${documentDecisionKey(doc)}`"'))
  assert.ok(lcsEvaluation.includes("decisionForms[bid.uuid].documents[key] ||= { compliant: null, comments: '' }"))
  assert.equal(lcsEvaluation.includes('legacyDecision'), false)
  assert.ok(lcsEvaluation.includes('draft?.version === 2'))
})

test('EOI pass-fail document criteria also start pending and use a radio group per criterion', () => {
  assert.ok(eoiEvaluation.includes('passed: saved?.passed ?? null'))
  assert.ok(eoiEvaluation.includes(':name="`criterion-result-${response.uuid}-${criterion.uuid}`"'))
  assert.ok(eoiEvaluation.includes(':value="true"'))
  assert.ok(eoiEvaluation.includes(':value="false"'))
})
