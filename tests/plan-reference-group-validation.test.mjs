import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc';

const { descriptor } = parse(fs.readFileSync(new URL('../app/components/annualprocurementplans/analyzePlan.vue', import.meta.url), 'utf8'));

test('APP validation provides a procurement group correction for mixed references', async () => {
  const template = compileTemplate({ source: descriptor.template.content, filename: 'analyzePlan.vue', id: 'reference-groups' });
  assert.deepEqual(template.errors, []);
  assert.ok(descriptor.template.content.includes("rule.key.startsWith('r6')"));
  assert.ok(descriptor.template.content.includes('v-model.number="fixPayloads[fixKey(rule, i)].procurementgroup_id"'));

  let script = compileScript(descriptor, { id: 'reference-groups' }).content;
  script = `import { ref, reactive, computed, watch, nextTick } from 'vue';
const useAnnualprocurementplanStore = () => ({ chatMessages: [] });
${script}`.replace(/from (["'])vue\1/g, `from '${import.meta.resolve('vue')}'`);
  const { default: component } = await import(`data:text/javascript;base64,${Buffer.from(script).toString('base64')}`);
  const state = component.setup({ planUuid: 'plan', canEdit: true }, { expose() {} });

  assert.deepEqual(
    state.initialPayload(
      { key: 'r6_reference_number_mixed_procurement_groups' },
      { procurementgroup_id: 22 },
    ),
    { procurementgroup_id: 22 },
  );
});

test('Fix opens a delivery time input and saving refreshes the incomplete schedule report', async () => {
  const script = compileScript(descriptor, { id: 'schedule-fix' }).content;
  const code = `import { ref, reactive, computed, watch, nextTick } from '${import.meta.resolve('vue')}';
    export const calls = [];
    const useAnnualprocurementplanStore = () => ({
      chatMessages: [],
      bulkEditItems: async (plan, updates) => { calls.push({ plan, updates }); return { ok: true, errors: [] }; },
      runAnalysis: async plan => { calls.push({ analyse: plan }); },
    });
    ${script}`;
  const { default: component, calls } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const state = component.setup({ planUuid: 'plan', canEdit: true }, { expose() {} });
  const rule = { key: 'r7_statutory_schedule_incomplete' };
  const item = { item_id: 7, bid_notice_publication_date: '2026-11-25', contract_signing: '2026-12-24', missing_schedule_fields: ['lead time days'] };

  await state.openFix(rule, 0, item);
  const key = state.fixKey(rule, 0);
  assert.deepEqual(state.fixPayloads[key], { lead_time_days: null });
  assert.deepEqual(state.deliveryOptions, [7, 14, 30]);
  const displayDate = date => new Intl.DateTimeFormat('en-ZW', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(date));
  assert.equal(state.deliveryDateFromSigning(item.contract_signing, null), null);
  assert.equal(state.deliveryDateFromSigning(item.contract_signing, 7), displayDate('2026-12-31'));
  assert.equal(state.deliveryDateFromSigning(item.contract_signing, 14), displayDate('2027-01-07'));
  assert.equal(state.allFixesReady.value, false);
  await state.saveAllFixes(key);
  assert.deepEqual(calls, []);

  state.fixPayloads[key].lead_time_days = 14;
  await state.saveAllFixes(key);
  assert.deepEqual(calls, [
    { plan: 'plan', updates: [{ item_id: 7, lead_time_days: 14 }] },
    { analyse: 'plan' },
  ]);
  assert.equal(state.isFixOpen(rule, 0), false);
});
