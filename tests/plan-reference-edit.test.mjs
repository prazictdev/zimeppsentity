import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileTemplate, parse } from '@vue/compiler-sfc';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('reference correction dialog submits only the reference number', () => {
  const source = read('../app/components/annualprocurementplans/itemReferenceEdit.vue');
  const { descriptor, errors } = parse(source, { filename: 'itemReferenceEdit.vue' });
  assert.deepEqual(errors, []);

  const compiled = compileTemplate({
    source: descriptor.template.content,
    filename: 'itemReferenceEdit.vue',
    id: 'plan-reference-edit',
  });
  assert.deepEqual(compiled.errors, []);
  assert.match(source, /store\.editItem\(props\.planUuid, props\.item\.id, \{\s*reference_no:/s);
  assert.doesNotMatch(source, /description\s*:/);
  assert.match(source, /Only its APP reference number can be changed/);
});

test('plan items expose reference correction until final approval', () => {
  const detail = read('../app/components/annualprocurementplans/detail.vue');
  const row = read('../app/components/annualprocurementplans/planItemRow.vue');

  assert.match(detail, /:can-correct-reference="canCorrectReference"/);
  assert.match(detail, /!\['AUTHORIZED', 'ACTIVE', 'ARCHIVED'\]\.includes\(plan\.value\.status\)/);
  assert.match(row, /AnnualprocurementplansItemReferenceEdit/);
  assert.match(row, /isApprovedExemptionItem \|\| !canEditPlan/);
  assert.match(row, /canEditPlan && !isApprovedExemptionItem/);
});
