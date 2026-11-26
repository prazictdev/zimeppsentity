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

  const code = `import { computed } from '${import.meta.resolve('vue')}';\n${script.content}`;
  const { default: component } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const item = {
    spoc: true,
    bid_notice_publication_date: '2027-01-08',
    bid_closing_date: '2027-01-14',
    publish_award_notice: '2027-01-29',
    contract_signing: '2027-02-15',
    expected_delivery_date: '2027-02-20',
    lead_time_days: 5,
    schedule_requirements: {
      stages: [{ key: 'advertising', planned: 3 }],
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
  });
  assert.match(rows[1].note, /SPOC allowance: 5 days/);
  assert.deepEqual(rows.at(-1), {
    label: 'Delivery or completion', start: '2027-02-15', end: '2027-02-20', days: 5,
  });
  const waived = rowsFor({ ...item, schedule_requirements: { allowance_days: { spoc: null } } });
  assert.equal(waived[1].label, 'Evaluation');
});
