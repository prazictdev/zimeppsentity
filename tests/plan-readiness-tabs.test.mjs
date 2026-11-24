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
  });

  assert.equal(stages.some(stage => stage.label === 'Item compliance'), false);
  assert.equal(stages.some(stage => stage.key === 'analysis'), false);
});

test('uses a green background treatment for completed readiness tabs', () => {
  const source = fs.readFileSync(new URL('../app/components/annualprocurementplans/completion.vue', import.meta.url), 'utf8');

  assert.match(source, /stage\.complete === true \? 'btn-success btn-soft border-success\/30'/);
  assert.match(source, /stage\.complete === true \? 'lucide:circle-check'/);
});
