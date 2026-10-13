import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';

test('bulk deletion requires confirmation, selects across pages and refreshes after success', async () => {
  const { descriptor } = parse(fs.readFileSync(new URL('../app/components/annualprocurementplans/itemBulkDelete.vue', import.meta.url), 'utf8'));
  const script = compileScript(descriptor, { id: 'delete' });
  const template = compileTemplate({ source: descriptor.template.content, id: 'delete', filename: 'itemBulkDelete.vue', compilerOptions: { bindingMetadata: script.bindings } });
  assert.deepEqual(template.errors, []);
  const source = `
    import { ref, computed } from '${import.meta.resolve('vue')}';
    const watch = () => {}, onBeforeUnmount = () => {};
    export const state = { requests: [], refreshes: 0, fail: false };
    const useAnnualprocurementplanStore = () => ({ refreshItemViews: async () => { state.refreshes++; } });
    const usePeClient = () => async (url, options) => {
      state.requests.push({ url, options });
      if (options.method === 'DELETE') {
        if (state.fail) throw { data: { errors: { ids: ['Nothing was deleted. Item is protected.'] } } };
        return { data: { deleted: options.body.delete_all ? 3 : options.body.ids.length } };
      }
      return { data: { data: options.query.page === 1 ? [{ id: 1 }, { id: 2, is_locked: true }] : [{ id: 3 }], current_page: options.query.page, last_page: 2, total: 3 } };
    };
    ${script.content}
  `;
  const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const vm = module.default.setup({ planUuid: 'plan1' }, { expose() {} });
  vm.dialog.value = { showModal() {}, close() {} };
  await vm.open(); vm.selectPage(true);
  assert.deepEqual([...vm.selected.value], [1]);
  await vm.load(2); vm.selectPage(true);
  assert.deepEqual([...vm.selected.value], [1, 3]);
  await vm.deleteSelected();
  assert.equal(module.state.requests.filter(row => row.options.method === 'DELETE').length, 0);
  vm.confirming.value = true; module.state.fail = true;
  await vm.deleteSelected();
  assert.deepEqual([...vm.selected.value], [1, 3]);
  assert.ok(vm.error.value.includes('protected')); assert.equal(module.state.refreshes, 0);
  module.state.fail = false;
  await vm.deleteSelected();
  const request = module.state.requests.find(row => row.options.method === 'DELETE');
  assert.equal(request.url, '/api/v1/annual-procurement-plans/plan1/items/bulk');
  assert.deepEqual(request.options.body.ids, [1, 3]);
  assert.equal(vm.selected.value.length, 0); assert.equal(module.state.refreshes, 1);
  assert.equal(vm.confirming.value, false); assert.equal(vm.notice.value, '2 plan items deleted.');
  vm.search.value = 'filtered'; vm.deleteAll.value = true;
  await vm.changeDeleteAll();
  assert.equal(vm.search.value, ''); assert.equal(vm.selected.value.length, 0);
  const before = module.state.requests.length;
  await vm.deleteSelected(); assert.equal(module.state.requests.length, before);
  vm.confirming.value = true; await vm.deleteSelected();
  const allRequest = module.state.requests.filter(row => row.options.method === 'DELETE').at(-1);
  assert.deepEqual(allRequest.options.body, { delete_all: true, confirm_permanent: true });
  assert.equal(vm.notice.value, '3 plan items deleted.'); assert.equal(vm.deleteAll.value, false);
  assert.ok(descriptor.template.content.includes('It will permanently delete all rows in this plan'));
  assert.ok(descriptor.template.content.includes('This cannot be undone.'));
});
