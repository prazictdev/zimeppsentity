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
