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

test('serializes the selected service standard and optional comments without a free-text MSDS field', () => {
  const payload = gridPayload({
    ...row(1),
    minimum_service_delivery_standard_id: 14,
    comments: 'Deliver support within four business hours.',
  });
  assert.equal(payload.minimum_service_delivery_standard_id, 14);
  assert.equal(payload.comments, 'Deliver support within four business hours.');
  assert.equal('msds' in payload, false);
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
  const componentSource = fs.readFileSync(new URL('../app/components/annualprocurementplans/itemAdd.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(componentSource);
  const script = compileScript(descriptor, { id: 'grid' });
  const template = compileTemplate({ source: descriptor.template.content, id: 'grid', filename: 'itemAdd.vue', compilerOptions: { bindingMetadata: script.bindings } });
  assert.deepEqual(template.errors, []);
  assert.match(componentSource, />Add items &amp; details<\/li>/);
  assert.match(componentSource, />Match UNSPSC<\/li>/);
  assert.match(componentSource, />NSPL validation<\/li>/);
  assert.match(componentSource, /workflowStep >= 4[^\n]+>Upload to plan<\/li>/);
  assert.match(componentSource, /detailIncompleteRows\.value\) return 1;[\s\S]+if \(unclassifiedRows\.value\) return 2;[\s\S]+if \(nsplUnvalidatedRows\.value\) return 3;[\s\S]+return 4;/);
  assert.match(componentSource, /ref="addItemsDialog" class="modal"/);
  assert.match(componentSource, /<button class="btn btn-primary btn-sm"[^>]+@click="openAddItems"[\s\S]*?<AnnualprocurementplansItemImport/);
  const addItemsDialog = componentSource.match(/<dialog ref="addItemsDialog"[\s\S]*?<\/dialog>/)?.[0] ?? '';
  assert.doesNotMatch(addItemsDialog, /AnnualprocurementplansItemImport/);
  assert.match(addItemsDialog, /Create blank rows for manual entry/);
  assert.match(componentSource, /ref="uploadDialog" class="modal"/);
  assert.match(componentSource, /ref="fullscreenDialog" class="modal"/);
  assert.match(componentSource, /<Teleport :to="fullscreenGridHost" :disabled="!fullscreenOpen">/);
  assert.match(componentSource, /'Full screen'/);
  assert.doesNotMatch(componentSource, /await runLocalMatching\(prepared\)/);
  assert.match(componentSource, /v-if="showUnspscStep">UNSPSC \*<\/th>/);
  assert.match(componentSource, /v-model="row.minimum_service_delivery_standard_id"/);
  assert.match(componentSource, /v-model="row.comments"/);
  assert.doesNotMatch(componentSource, /v-model="row.msds"/);
  assert.doesNotMatch(componentSource, /Add and complete the items you plan to procure/);
  assert.doesNotMatch(componentSource, /Add or import items, then complete their procurement details/);
  assert.doesNotMatch(componentSource, /Complete each item below/);
  const code = `
    import { ref, computed } from '${import.meta.resolve('vue')}';
    export const local = new Map();
    const window = { localStorage: { getItem: key => local.get(key), setItem: (key, value) => local.set(key, value) } };
    export let leaveGuard;
    const onMounted = () => {}, onBeforeUnmount = () => {}, onBeforeRouteLeave = guard => { leaveGuard = guard; }, watch = () => {};
    export const session = ref({ data: { user: { id: 3 }, permissions: [] } });
    const useSanctumUser = () => session;
    const useAnnualprocurementplanStore = () => ({
      fetchItemLookups: async () => {},
      procurementmethods: [{ id: 11, code: 'RFP', name: 'Request for proposals' }],
      procurementgroups: [{ id: 22, code: 'CONSULTANCY', name: 'Consultancy' }],
    });
    const useExemptionStore = () => ({});
    const usePeClient = () => async url => url.endsWith('/unspsc-catalogue')
      ? { data: { revision: 'test', items: [{ id: 9, code: '43211503', name: 'Notebook computers' }] } }
      : { data: {} };
    ${script.content
      .replace("'../../utils/planItemGrid'", JSON.stringify(new URL('../app/utils/planItemGrid.js', import.meta.url).href))
      .replace("'../../utils/unspscBrowserCatalogue'", JSON.stringify(new URL('../app/utils/unspscBrowserCatalogue.js', import.meta.url).href))}
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
  assert.equal(vm.workflowStep.value, 1);
  vm.rows.value.forEach((draftRow, index) => {
    draftRow.description = `Office laptop ${index + 1}`;
    draftRow.expected_delivery_date = '2027-01-15';
  });
  assert.equal(vm.workflowStep.value, 2);
  vm.rows.value.forEach(draftRow => { draftRow.unspsc_id = 9; });
  assert.equal(vm.workflowStep.value, 3);
  vm.validateNsplReadiness();
  assert.equal(vm.workflowStep.value, 4);
  vm.rows.value[0].unit_cost = 25;
  assert.equal(vm.workflowStep.value, 3);
  vm.validateNsplReadiness();
  assert.equal(vm.workflowStep.value, 4);
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
  const eoiRow = vm.rows.value[0];
  eoiRow.procurementmethod_id = 11;
  eoiRow.procurementgroup_id = 22;
  eoiRow.quantity = 1;
  eoiRow.unit_cost = 50000;
  eoiRow.eoi_publication_date = '';
  eoiRow.eoi_closing_date = '';
  vm.reconcilePlanningApplicability(eoiRow);
  assert.equal(eoiRow.eoi, true);
  assert.ok(vm.detailIncompleteRows.value > 0);
  assert.equal(vm.workflowStep.value, 1);
  eoiRow.eoi_publication_date = '2027-01-01';
  eoiRow.eoi_closing_date = '2027-01-15';
  assert.equal(vm.detailIncompleteRows.value, 0);
  module.session.value = { data: { user: { id: 4 } } };
  await vm.initializeDraft(); assert.equal(vm.rows.value.length, 0);
  module.session.value = null;
  await vm.initializeDraft(); assert.equal(vm.ready.value, false);
  assert.equal(vm.errorMessage.value, 'Sign in before preparing a draft.');
});

test('downloads the Excel template for the current plan so entity lookups stay scoped', () => {
  const source = fs.readFileSync(new URL('../app/components/annualprocurementplans/itemImport.vue', import.meta.url), 'utf8');
  assert.match(source, /annual-procurement-plans\/\$\{props\.planUuid\}\/items\/template/);
  assert.doesNotMatch(source, /client\('\/api\/v1\/annual-procurement-plans\/items\/template'/);
});
