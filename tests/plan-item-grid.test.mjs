import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';
import { gridDraftKey, newGridRow, gridPayload, loadGridDraft, saveGridDraft, uploadGridRows } from '../app/utils/planItemGrid.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
}
const row = id => ({ ...newGridRow(`row-${id}`), description: 'Office laptop', unspsc_id: 9 });

test('restores local rows and UNSPSC selections only for their user and plan', () => {
  const local = storage(), key = gridDraftKey(1, 'plan1');
  const rows = [{ ...row(1), unspsc_label: '43211503 · Notebook computers' }];
  saveGridDraft(local, key, rows);
  assert.deepEqual(loadGridDraft(local, key), rows);
  assert.deepEqual(loadGridDraft(local, gridDraftKey(2, 'plan1')), []);
  assert.deepEqual(loadGridDraft(local, gridDraftKey(1, 'plan2')), []);
  local.setItem(key, '{broken');
  assert.throws(() => loadGridDraft(local, key));
  assert.equal(local.getItem(key), '{broken');
});

test('uploads 250 rows in batches and removes only acknowledged rows from local storage', async () => {
  const rows = Array.from({ length: 250 }, (_, i) => row(i)), local = storage(), batches = [];
  const uploaded = await uploadGridRows(rows, async items => {
    batches.push(items.length);
    assert.ok(loadGridDraft(local, 'draft').slice(0, items.length).every(row => row._sent));
    assert.ok(items.every(item => !('_sent' in item) && !('unspsc_label' in item)));
    return { data: { uploaded_uuids: items.map(item => item.uuid) } };
  }, () => saveGridDraft(local, 'draft', rows));
  assert.equal(uploaded, 250); assert.deepEqual(batches, [100, 100, 50]); assert.deepEqual(loadGridDraft(local, 'draft'), []);
});

test('retains interrupted batches with identical UUIDs and payload for safe retries', async () => {
  const rows = [row(1)], local = storage();
  await assert.rejects(uploadGridRows(rows, async () => { throw new Error('Connection lost'); }, () => saveGridDraft(local, 'draft', rows)));
  const restored = loadGridDraft(local, 'draft');
  assert.equal(restored[0]._sent, true); assert.deepEqual(gridPayload(restored[0]), gridPayload(row(1)));
  await uploadGridRows(restored, async items => ({ data: { uploaded_uuids: items.map(item => item.uuid) } }), () => {});
  assert.equal(restored.length, 0);
});

test('validation failures unlock rows for correction and storage failures prevent sending', async () => {
  const rows = [row(1)]; let sent = false;
  await assert.rejects(uploadGridRows(rows, async () => { throw { statusCode: 422 }; }, () => {}));
  assert.equal(rows[0]._sent, false);
  await assert.rejects(uploadGridRows(rows, async () => { sent = true; }, () => { throw new Error('Storage full'); }));
  assert.equal(sent, false); assert.equal(rows.length, 1);
});

test('grid component compiles and adds local rows, selects UNSPSC, and restores draft', async () => {
  const { descriptor } = parse(fs.readFileSync(new URL('../app/components/annualprocurementplans/itemAdd.vue', import.meta.url), 'utf8'));
  const script = compileScript(descriptor, { id: 'grid' });
  const template = compileTemplate({ source: descriptor.template.content, id: 'grid', filename: 'itemAdd.vue', compilerOptions: { bindingMetadata: script.bindings } });
  assert.deepEqual(template.errors, []);
  const code = `
    import { ref, computed } from '${import.meta.resolve('vue')}';
    export const local = new Map();
    const window = { localStorage: { getItem: key => local.get(key), setItem: (key, value) => local.set(key, value) } };
    export let leaveGuard;
    const onMounted = () => {}, onBeforeUnmount = () => {}, onBeforeRouteLeave = guard => { leaveGuard = guard; }, watch = () => {};
    export const session = ref({ data: { user: { id: 3 }, permissions: [] } });
    const useSanctumUser = () => session;
    const useAnnualprocurementplanStore = () => ({ fetchItemLookups: async () => {} });
    const usePeClient = () => async () => ({ data: { data: [{ id: 9, code: '43211503', name: 'Notebook computers' }], current_page: 1, last_page: 1 } });
    ${script.content.replace("'../../utils/planItemGrid'", JSON.stringify(new URL('../app/utils/planItemGrid.js', import.meta.url).href))}
  `;
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const vm = module.default.setup({ planUuid: 'plan1' }, { expose() {} });
  vm.searchDialog.value = { showModal() {}, close() {} };
  await vm.initializeDraft();
  assert.equal(vm.ready.value, true);
  assert.equal(vm.errorMessage.value, '');
  vm.rowCount.value = 3; vm.addRows();
  assert.ok(module.local.has(gridDraftKey(3, 'plan1')));
  assert.equal(vm.rows.value.length, 3);
  assert.equal(module.leaveGuard(), true);
  vm.submitting.value = true;
  assert.equal(module.leaveGuard(), false);
  vm.submitting.value = false;
  vm.rows.value[0].description = 'Office laptop';
  vm.openSearch(vm.rows.value[0]); await vm.search(1);
  vm.choose(vm.hits.value[0]);
  assert.equal(vm.rows.value[0].unspsc_id, 9);
  await vm.initializeDraft(); assert.equal(vm.rows.value[0].unspsc_id, 9); assert.equal(vm.rows.value.length, 3);
  const keptIds = [vm.rows.value[0].uuid, vm.rows.value[2].uuid];
  vm.removeRow(vm.rows.value[1]);
  await vm.initializeDraft();
  assert.deepEqual(vm.rows.value.map(row => row.uuid), keptIds);
  assert.equal(vm.rows.value[0].unspsc_id, 9);
  vm.rows.value[0]._sent = true;
  vm.removeRow(vm.rows.value[0]);
  assert.equal(vm.rows.value.length, 2);
  module.session.value = { data: { user: { id: 4 } } };
  await vm.initializeDraft(); assert.equal(vm.rows.value.length, 0);
  module.session.value = null;
  await vm.initializeDraft(); assert.equal(vm.ready.value, false);
  assert.equal(vm.errorMessage.value, 'Sign in before preparing a draft.');
});
