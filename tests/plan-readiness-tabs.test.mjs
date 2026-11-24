import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { getPlanCompletionStages } from '../app/utils/planCompletion.js';

test('removes the misleading item compliance readiness tab', () => {
  const stages = getPlanCompletionStages({
    report: { can_submit: true, tier1: { checks: [] } },
    itemCount: 1,
    pmuCount: 1,
    unresolved: 0,
    classificationComplete: true,
    consolidationComplete: true,
  });

  assert.equal(stages.some(stage => stage.label === 'Item compliance'), false);
  assert.equal(stages.some(stage => stage.key === 'analysis'), false);
  assert.equal(stages.find(stage => stage.key === 'classification')?.complete, true);
  assert.equal(stages.find(stage => stage.key === 'consolidation')?.complete, true);
});

test('uses a green background treatment for completed readiness tabs', () => {
  const source = fs.readFileSync(new URL('../app/components/annualprocurementplans/completion.vue', import.meta.url), 'utf8');

  assert.match(source, /stage\.complete === true \? 'btn-success btn-soft border-success\/30'/);
  assert.match(source, /stage\.complete === true \? 'lucide:circle-check'/);
  assert.match(source, /store\.runAnalysis\(props\.planUuid\)/);
  assert.match(source, /classificationComplete: classification\.can_submit === true/);
  assert.match(source, /consolidationComplete: consolidations\.every/);
  assert.match(source, /groupedItems\.consolidated\.reduce/);
});
