import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';

const { descriptor } = parse(fs.readFileSync(new URL('../app/components/annualprocurementplans/status.vue', import.meta.url), 'utf8'));
const code = `import {ref, computed, watch} from '${import.meta.resolve('vue')}';
  export let response = {data: ref({data: null}), error: ref(null)};
  export const respond = (invoice, error = null) => {response = {data: ref({data: invoice}), error: ref(error)};};
  const useAnnualprocurementplanHelper = () => ({getInvoice: async () => response});
  ${compileScript(descriptor, {id: 'payment'}).content}`;
const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('payment status follows the invoice and handles missing and failed invoice requests', async () => {
  const state = module.default.setup({planUuid: 'plan-a', plan: {status: 'AUTHORIZED', paymentstatus: 'PENDING'}}, {expose() {}});
  await state.loadInvoice();
  assert.equal(state.invoice.value, null);
  assert.equal(state.error.value, '');
  for (const [invoice, status] of [
    [{status: 'UNPAID', total_receipted: 0, remaining_balance: 100}, 'UNPAID'],
    [{status: 'UNPAID', total_receipted: 40, remaining_balance: 60}, 'PARTIALLY_PAID'],
    [{status: 'AWAITING', total_receipted: 0, remaining_balance: 100}, 'AWAITING'],
    [{status: 'PAID', total_receipted: 100, remaining_balance: 0}, 'PAID'],
  ]) {
    module.respond(invoice);
    await state.loadInvoice();
    assert.equal(state.paymentStatus.value, status);
  }
  module.respond(null, {statusCode: 500});
  await state.loadInvoice();
  assert.match(state.error.value, /Unable to retrieve/);
  assert.equal(state.invoice.value, null);
  assert.equal(state.loading.value, false);
  module.respond(null, {statusCode: 404});
  await state.loadInvoice();
  assert.equal(state.error.value, '');
});

test('status and invoice page templates compile', () => {
  for (const path of ['components/annualprocurementplans/status.vue', 'components/annualprocurementplans/detail.vue', 'pages/appinvoices/index.vue']) {
    const {descriptor} = parse(fs.readFileSync(new URL(`../app/${path}`, import.meta.url), 'utf8'));
    assert.deepEqual(compileTemplate({source: descriptor.template.content, filename: path, id: path}).errors, []);
  }
});

test('View Invoice destination filters the plan and opens its invoice', async () => {
  const {descriptor} = parse(fs.readFileSync(new URL('../app/pages/appinvoices/index.vue', import.meta.url), 'utf8'));
  const code = `import {ref, computed} from '${import.meta.resolve('vue')}';
    export let mounted;
    export const opened = [];
    export const requests = [];
    const onMounted = callback => {mounted = callback;};
    const definePageMeta = () => {};
    const useHead = () => {};
    const useRoute = () => ({query: {plan_uuid: 'plan-a', view: 'invoice'}});
    const useAnnualprocurementplanStore = () => ({items: [{uuid: 'plan-a'}]});
    const useAnnualprocurementplanHelper = () => ({listAllInvoices: async params => {
      requests.push(params);
      return {error: ref(null), data: ref({data: {data: [{id: 1, annualprocurementplan: {uuid: 'plan-a'}}]}})};
    }});
    const document = {getElementById: id => ({showModal() {opened.push(id);}})};
    ${compileScript(descriptor, {id: 'invoice-route'}).content}`;
  const page = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const state = page.default.setup({}, {expose() {}});
  await page.mounted();
  assert.equal(page.requests[0].plan_uuid, 'plan-a');
  assert.equal(state.activeInvoice.value.id, 1);
  assert.deepEqual(page.opened, ['view_invoice_modal']);
});
