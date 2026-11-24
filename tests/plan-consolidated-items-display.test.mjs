import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileTemplate, parse } from '@vue/compiler-sfc';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('renders consolidated plan lines with an expandable source-item list', () => {
  const source = read('../app/components/annualprocurementplans/consolidatedPlanItemRow.vue');
  const { descriptor, errors } = parse(source, { filename: 'consolidatedPlanItemRow.vue' });
  assert.deepEqual(errors, []);

  const compiled = compileTemplate({
    source: descriptor.template.content,
    filename: 'consolidatedPlanItemRow.vue',
    id: 'consolidated-plan-item-row',
  });
  assert.deepEqual(compiled.errors, []);
  assert.match(source, />Consolidated</);
  assert.match(source, /Built from \{\{ group\.item_count \}\} plan items/);
  assert.match(source, /:aria-expanded="expanded"/);
  assert.match(source, /v-for="\(item, index\) in group\.children"/);
  assert.match(source, /Items inside this consolidated line/);
});

test('loads grouped APP items and keeps the actions column unfrozen', () => {
  const helper = read('../app/composables/useAnnualprocurementplanHelper.js');
  const store = read('../app/stores/annualprocurementplans.js');
  const detail = read('../app/components/annualprocurementplans/detail.vue');
  const row = read('../app/components/annualprocurementplans/planItemRow.vue');

  assert.match(helper, /items\/grouped/);
  assert.match(store, /planConsolidatedItems\.value = payload\.consolidated/);
  assert.match(detail, /AnnualprocurementplansConsolidatedPlanItemRow/);
  assert.doesNotMatch(detail, /sticky right-0/);
  assert.doesNotMatch(row, /sticky right-0/);
});
