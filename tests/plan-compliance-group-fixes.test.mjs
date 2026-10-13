import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';

const { descriptor } = parse(fs.readFileSync(new URL('../app/components/annualprocurementplans/analyzePlan.vue', import.meta.url), 'utf8'));
test('plan analysis omits UNSPSC validation and retains the NSPL scan requirement', () => {
  const result = compileTemplate({ source: descriptor.template.content, filename: 'analyzePlan.vue', id: 'plan-analysis' });
  assert.deepEqual(result.errors, []);
  assert.ok(!result.code.includes('PlanClassificationValidation'));
  assert.ok(descriptor.template.content.includes('The NSPL scan must be completed'));
});
let code = compileScript(descriptor, { id: 'group-fixes' }).content;
code = `import { ref, reactive, computed, watch, nextTick } from 'vue';
const useAnnualprocurementplanStore = () => globalThis.groupFixTestStore;
${code}`.replace(/from (["'])vue\1/g, `from '${import.meta.resolve('vue')}'`);
const { default: component } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

for (const [key, field, value] of [
  ['r2_cmb_over_threshold_no_spoc', 'spoc', true],
]) {
  test(`group toggle stages and saves all ${key} items`, async () => {
    let sent;
    globalThis.groupFixTestStore = {
      chatMessages: [],
      bulkEditItems: async (uuid, updates) => { sent = { uuid, updates }; return { ok: true, errors: [] }; },
    };
    const state = component.setup({ planUuid: 'plan', canEdit: true }, { expose() {} });
    const rule = { key, violations: [{ item_id: 11, actual: 2000 }, { item_id: 12, actual: 3000 }] };
    state.toggleGroupFix(rule, true);
    assert.equal(state.isGroupFixSelected(rule), true);
    assert.equal(state.pendingFixCount.value, 2);
    state.toggleGroupFix(rule, false);
    assert.equal(state.pendingFixCount.value, 0);
    state.toggleGroupFix(rule, true);
    await state.saveAllFixes();
    assert.equal(sent.uuid, 'plan');
    assert.deepEqual(sent.updates.map(row => row.item_id), [11, 12]);
    assert.ok(sent.updates.every(row => row[field] === value));
    assert.equal(state.pendingFixCount.value, 0);
  });
}

test('group toggle cannot stage fixes without edit access', () => {
  globalThis.groupFixTestStore = { chatMessages: [] };
  const state = component.setup({ planUuid: 'plan', canEdit: false }, { expose() {} });
  state.toggleGroupFix({ key: 'r2_cmb_over_threshold_no_spoc', violations: [{ item_id: 1 }] }, true);
  assert.equal(state.pendingFixCount.value, 0);
});
