import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse, compileScript } from '@vue/compiler-sfc';
let instance = 0;
async function harness(frontend) {
  const { descriptor } = parse(fs.readFileSync(new URL(`../../${frontend}/app/components/unspscManualSelect.vue`, import.meta.url), 'utf8'));
  const script = compileScript(descriptor, { id: 'manual' }).content;
  const code = `
    import { ref, computed } from '${import.meta.resolve('vue')}';
    export const state = { calls: [], events: [], open: false, instance: ${instance++} };
    const onBeforeUnmount = () => {};
    const usePeClient = () => async (url, options) => {
      state.calls.push({ url, options });
      return { data: { item: { fingerprint: 'current-fingerprint' }, results: { data: [{ id: 7, code: '43211503', name: 'Notebook computers' }], total: 1, last_page: 1 } } };
    };
    const useSanctumClient = usePeClient;
    ${script}`;
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const vm = module.default.setup({ planUuid: 'plan-1', itemId: 11, description: 'Office laptops' }, { expose() {}, emit: (...event) => module.state.events.push(event) });
  vm.dialog.value = { showModal() { module.state.open = true; }, close() { module.state.open = false; } };
  return { vm, state: module.state };
}
for (const frontend of ['peclient', 'adminclient']) {
  test(`${frontend} searches by description and saves the selected code with its current fingerprint`, async () => {
    const { vm, state } = await harness(frontend);
    await vm.open();
    assert.equal(vm.query.value, 'Office laptops');
    assert.equal(state.calls[0].options.query.q, 'Office laptops');
    assert.ok(state.calls[0].url.endsWith('/11/search'));
    await vm.save();
    assert.equal(state.calls.length, 1);
    vm.chosen.value = 7;
    await vm.save();
    assert.ok(state.calls[1].url.endsWith('/11/code'));
    assert.deepEqual(state.calls[1].options.body, { unspsc_id: 7, fingerprint: 'current-fingerprint' });
    assert.equal(state.open, false);
    assert.equal(state.events[0][0], 'saved');
  });
}
