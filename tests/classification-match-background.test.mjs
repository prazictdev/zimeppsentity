import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse, compileScript } from '@vue/compiler-sfc';

let instance = 0;
async function harness(scanType = 'UNSPSC') {
  const { descriptor } = parse(fs.readFileSync(new URL('../app/components/annualprocurementplans/classificationMatch.vue', import.meta.url), 'utf8'));
  const script = compileScript(descriptor, { id: 'background' }).content;
  const code = `
    import { ref, computed } from '${import.meta.resolve('vue')}';
    export const state = { run: null, poll: null, accepted: [], batches: [], skipped: [], fail: null, failBatch: null, closed: false, refreshed: 0, requestedTypes: [], instance: ${instance++} };
    const onMounted = () => {}; const onBeforeUnmount = () => {}; const watch = () => {};
    const setTimeout = fn => { state.poll = fn; return 1; }; const clearTimeout = () => { state.poll = null; };
    const useAnnualprocurementplanStore = () => ({ fetchGroupedItems: async () => { state.refreshed++; } });
    const useAnnualprocurementplanHelper = () => ({
      getClassificationMatches: async (plan, type) => { state.requestedTypes.push(type); return { data: ref({ data: { run: state.run } }), error: ref(null) }; },
      startClassificationMatch: async () => ({ data: ref({ data: { run: state.run } }), status: ref(true), error: ref(null) }),
      acceptClassificationMatches: async (plan, runId, matches) => {
        state.batches.push({ runId, matches });
        if (state.batches.length === state.failBatch) return { status: ref(false), error: ref({ data: { message: 'Request failed. Refresh before retrying.' } }) };
        for (const row of matches) state.accepted.push({ plan, id: row.id, decision: 'CONFIRMED', ...(row.nspl_product_id ? { nsplProductId: row.nspl_product_id } : {}) });
        const failures = matches.filter(row => row.id === state.fail).map(row => ({ id: row.id, message: 'Item changed. Scan again.' }));
        const skipped = matches.filter(row => state.skipped.includes(row.id)).length;
        return { data: ref({ data: { accepted: matches.length - failures.length - skipped, skipped, failures } }), status: ref(true), error: ref(null) };
      },
      decideClassificationMatch: async (plan, id, decision, nsplProductId) => {
        state.accepted.push({ plan, id, decision, ...(nsplProductId ? { nsplProductId } : {}) });
        return { status: ref(id !== state.fail), error: ref(id === state.fail ? { data: { message: 'Item changed. Scan again.' } } : null) };
      }
    });
    ${script}`;
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const vm = module.default.setup({ planUuid: 'plan-1', canEdit: true, scanType }, { expose() {} });
  vm.dialog.value = { close() { module.state.closed = true; } };
  return { vm, state: module.state };
}

const matches = [
  { id: 1, status: 'PENDING', suggested_unspsc_id: 9, item: { id: 11 } },
  { id: 2, status: 'PENDING', suggested_nspl_product_id: 8, item: { id: 12 } },
  { id: 3, status: 'PENDING', item: { id: 13 } },
  { id: 4, status: 'CONFIRMED', suggested_unspsc_id: 9, item: { id: 14 } },
];

test('NSPL pricing shows alternatives and follows the chosen product', async () => {
  const { vm } = await harness('NSPL');
  const match = { id: 1, nspl_candidates: [
    { id: 10, code: 'A', price_analysis: { status: 'WITHIN_RANGE', within_range: true } },
    { id: 20, code: 'B', price_analysis: { status: 'ABOVE_RANGE', within_range: false } },
  ] };
  assert.equal(vm.priceComparisons(match).length, 2);
  vm.nsplSelections.value[1] = 20;
  assert.equal(vm.priceComparisons(match)[0].code, 'B');
  assert.equal(vm.priceStatus(vm.priceComparisons(match)[0].analysis), 'Above +10%');
  match.suggested_nspl_product = { id: 10, code: 'A' };
  match.price_analysis = { status: 'WITHIN_RANGE', within_range: true };
  assert.equal(vm.priceComparisons(match)[0].code, 'A');
  assert.equal(vm.priceStatus(match.price_analysis), 'Within ±10%');
  assert.equal(vm.priceStatus({ status: 'UNAVAILABLE' }), 'Cannot compare');
  assert.equal(vm.formatPrice(null, 'USD'), 'Not available');
  assert.equal(vm.formatPrice(0, 'USD'), 'USD 0.00');
});

test('closing the dialog keeps polling and reveals matches only after completion', async () => {
  const { vm, state } = await harness();
  state.run = { status: 'PROCESSING', matches };
  await vm.start();
  assert.equal(state.closed, true);
  assert.equal(vm.matches.value.length, 0);
  assert.equal(typeof state.poll, 'function');
  vm.close();
  assert.equal(typeof state.poll, 'function');
  state.run = { status: 'COMPLETED', matches };
  await state.poll();
  assert.equal(vm.matches.value.length, 4);
  assert.equal(state.poll, null);
});

test('accept selected applies only chosen pending suggestions and reports failures', async () => {
  const { vm, state } = await harness();
  state.run = { status: 'COMPLETED', matches };
  await vm.load();
  vm.selectedIds.value = [2, 3, 4];
  state.fail = 2;
  await vm.acceptMany(false);
  assert.deepEqual(state.accepted, [{ plan: 'plan-1', id: 2, decision: 'CONFIRMED' }]);
  assert.ok(vm.errorMessage.value.includes('Item changed'));
  assert.ok(vm.decisionSummary.value.includes('0 suggestion(s) accepted'));
});

test('accept all excludes empty and previously decided suggestions', async () => {
  const { vm, state } = await harness();
  state.run = { status: 'COMPLETED', matches };
  await vm.load();
  await vm.acceptMany(true);
  assert.deepEqual(state.accepted.map(row => row.id), [1, 2]);
  assert.equal(state.refreshed, 1);
  assert.ok(vm.decisionSummary.value.includes('2 suggestion(s) accepted'));
});

test('shows already processed suggestions as skipped without an error', async () => {
  const { vm, state } = await harness();
  state.run = { id: 88, status: 'COMPLETED', matches };
  state.skipped = [1, 2];
  await vm.load();
  await vm.acceptMany(true);
  assert.equal(vm.errorMessage.value, '');
  assert.ok(vm.decisionSummary.value.includes('2 already decided suggestion(s) skipped'));
  assert.equal(state.refreshed, 1);
});

test('accepts 5000 suggestions using ten bulk requests and refreshes only once', async () => {
  const { vm, state } = await harness();
  state.run = { id: 88, status: 'COMPLETED', matches: Array.from({ length: 5000 }, (_, index) => ({
    id: index + 1, status: 'PENDING', suggested_unspsc_id: 9, item: { id: index + 1 },
  })) };
  await vm.load();
  await vm.acceptMany(true);
  assert.equal(state.batches.length, 10);
  assert.ok(state.batches.every(batch => batch.matches.length === 500 && batch.runId === 88));
  assert.equal(state.accepted.length, 5000);
  assert.equal(state.refreshed, 1);
  assert.ok(vm.decisionSummary.value.includes('5000 suggestion(s) accepted'));
});

test('requests each scan type independently and accepts a chosen NSPL alternative', async () => {
  const unspsc = await harness('UNSPSC');
  const nspl = await harness('NSPL');
  await unspsc.vm.load();
  nspl.state.run = { status: 'COMPLETED', matches: [{ id: 5, status: 'PENDING', nspl_candidates: [{ id: 22 }], item: { id: 15 } }] };
  await nspl.vm.load();
  assert.deepEqual(unspsc.state.requestedTypes, ['UNSPSC']);
  assert.deepEqual(nspl.state.requestedTypes, ['NSPL']);
  assert.equal(nspl.vm.pendingMatches.value.length, 0);
  nspl.vm.nsplSelections.value[5] = 22;
  await nspl.vm.acceptMany(true);
  assert.deepEqual(nspl.state.accepted, [{ plan: 'plan-1', id: 5, decision: 'CONFIRMED', nsplProductId: 22 }]);
});

test('stops on a failed batch and refreshes results to avoid blind retries', async () => {
  const { vm, state } = await harness();
  state.failBatch = 2;
  state.run = { id: 88, status: 'COMPLETED', matches: Array.from({ length: 1200 }, (_, index) => ({
    id: index + 1, status: 'PENDING', suggested_unspsc_id: 9, item: { id: index + 1 },
  })) };
  await vm.load();
  await vm.acceptMany(true);
  assert.equal(state.batches.length, 2);
  assert.equal(state.refreshed, 1);
  assert.equal(vm.deciding.value, null);
  assert.ok(vm.decisionSummary.value.includes('500 suggestion(s) accepted'));
  assert.ok(vm.errorMessage.value.includes('Request failed'));
});
