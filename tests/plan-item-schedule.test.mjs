import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc';

test('the item dialog shows working days and saved milestones, with SPOC only when applicable', async () => {
  const filename = 'itemView.vue';
  const source = readFileSync(new URL('../app/components/annualprocurementplans/itemView.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source, { filename });
  const script = compileScript(descriptor, { id: 'schedule' });
  const template = compileTemplate({
    source: descriptor.template.content,
    id: 'schedule',
    filename,
    compilerOptions: { bindingMetadata: script.bindings },
  });
  assert.deepEqual(template.errors, []);

  const code = `import { computed, ref } from '${import.meta.resolve('vue')}';
    export const requests = [];
    const usePeClient = () => async (url, options) => {
      requests.push({ url, ...options });
      return { data: { bid_closing_date: options.body.date } };
    };
    const useAnnualprocurementplanStore = () => ({ refreshItemViews: async () => {} });
    ${script.content}`;
  const { default: component, requests } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const item = {
    id: 12,
    spoc: true,
    bid_notice_publication_date: '2027-01-08',
    bid_closing_date: '2027-01-14',
    publish_award_notice: '2027-01-29',
    contract_signing: '2027-02-15',
    expected_delivery_date: '2027-02-20',
    lead_time_days: 5,
    schedule_requirements: {
      stages: [{ key: 'advertising', planned: 3 }],
      minimum_bid_closing_date: '2027-01-14',
      allowance_days: { evaluation: 10, spoc: 5, standstill: 14, negotiation: 3 },
    },
  };
  const rowsFor = item => component.setup({ item }, { expose() {} }).scheduleRows.value;
  const rows = rowsFor(item);
  assert.deepEqual(rows[0], {
    label: 'Advertising period',
    note: 'Bid notice publication to bid closing',
    start: '2027-01-08',
    end: '2027-01-14',
    days: 3,
    unit: 'working day',
    startEditor: { field: 'bid_notice_publication_date', label: 'Bid notice publication date' },
    endEditor: { field: 'bid_closing_date', label: 'Bid closing date' },
  });
  assert.match(rows[1].note, /SPOC allowance: 5 days/);
  assert.deepEqual(rows.at(-1), {
    label: 'Delivery or completion', start: '2027-02-15', end: '2027-02-20', days: 5,
    endEditor: { field: 'expected_delivery_date', label: 'Expected delivery date' },
  });
  const waived = rowsFor({ ...item, schedule_requirements: { allowance_days: { spoc: null } } });
  assert.equal(waived[1].label, 'Evaluation');

  const editor = component.setup({ item, planUuid: 'draft-plan', canEditSchedule: true }, { expose() {} });
  const closing = editor.dateCells(editor.scheduleRows.value[0])[1];
  editor.editScheduleDate(closing);
  assert.equal(editor.minimumClosingDate.value, '2027-01-14');
  editor.draftDate.value = '2027-01-18';
  await editor.saveScheduleDate();
  assert.deepEqual(requests[0].body, { field: 'bid_closing_date', date: '2027-01-18' });
  assert.equal(editor.scheduleRows.value[0].end, '2027-01-18');
});
