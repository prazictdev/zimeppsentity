import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const component = readFileSync(new URL('../app/components/tenders/RfqEvaluationPanel.vue', import.meta.url), 'utf8')

test('presents RFQ evaluation as a committee-free PMU evaluator workflow', () => {
  assert.ok(component.includes("{ key: 'EVALUATOR', label: 'PMU evaluator' }"))
  assert.ok(component.includes("if (!evaluation.value) return 'EVALUATOR'"))
  assert.equal(component.includes("{ key: 'COMMITTEE', label: 'Committee' }"), false)
})
