import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const detailSource = fs.readFileSync(new URL('../app/components/annualprocurementplans/detail.vue', import.meta.url), 'utf8');
const statusSource = fs.readFileSync(new URL('../app/components/annualprocurementplans/status.vue', import.meta.url), 'utf8');

test('keeps the plan summary content in one horizontal row', () => {
  assert.match(detailSource, /overflow-x-auto rounded-box/);
  assert.match(detailSource, /flex min-w-max items-center border-l-4 border-primary/);
  assert.match(detailSource, /<dl class="flex shrink-0 items-stretch">/);
  assert.match(detailSource, /AnnualprocurementplansAnalyzePlan/);
  assert.match(detailSource, /AnnualprocurementplansWorkflowActions/);
});

test('renders plan and payment status inline with the summary metrics', () => {
  assert.match(statusSource, /class="flex shrink-0 items-center"/);
  assert.doesNotMatch(statusSource, /flex-col/);
  assert.doesNotMatch(statusSource, /border-t/);
});
