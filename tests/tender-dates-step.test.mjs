import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc';

test('tender dates keep the selected closing date and submit the clarification deadline and visits', async () => {
  const filename = 'DatesManagementStep.vue';
  const source = readFileSync(new URL('../app/components/tenders/DatesManagementStep.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source, { filename });
  const script = compileScript(descriptor, { id: 'tender-dates' });
  assert.deepEqual(compileTemplate({
    source: descriptor.template.content,
    id: 'tender-dates',
    filename,
    compilerOptions: { bindingMetadata: script.bindings },
  }).errors, []);

  const code = `import { computed, reactive, ref, toRef, watch } from '${import.meta.resolve('vue')}';
    const onMounted = () => {};
    const useToast = () => ({ success() {} });
    const useTenderStepDraft = () => ({ schedulePersist() {} });
    const useTenderHelper = () => ({
      getTenderDates: async () => ({ error: { value: null }, data: { value: { data: { suggested_closing_date: '2027-01-11' } } } }),
    });
    ${script.content.replace(/^import.*useTenderHelper.*$/m, '')}`;
  const { default: component } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const state = component.setup({ tenderUuid: 'draft' }, { expose() {}, emit() {} });
  state.applyPayload({ timeline: { minimum_advertising_days: 5 }, suggested_closing_date: '2027-01-11',
    dates: { publication_start_date: '2027-01-04', closing_date: '2027-01-14', clarification_deadline: '2027-01-13T13:00:00Z' } });
  await state.recalculateClosing();
  assert.equal(state.suggestedClosingDate.value, '2027-01-11');
  assert.equal(state.form.closing_date, '2027-01-14');
  assert.equal(state.form.clarification_deadline, '2027-01-13T15:00');

  state.form.has_site_visits = true;
  state.ensureSiteVisit();
  state.addSiteVisit();
  assert.equal(state.form.site_visits.length, 2);
  Object.assign(state.form.site_visits[0], { address: '15 Main Street', city: 'Harare', date: '2027-01-07', time: '09:00' });
  const payload = state.buildPayload();
  assert.equal(payload.closing_date, '2027-01-14');
  assert.equal(payload.clarification_deadline, '2027-01-13T15:00:00+02:00');
  assert.equal(payload.site_visits[0].city, 'Harare');
  state.form.has_site_visits = false;
  assert.deepEqual(state.buildPayload().site_visits, []);
});
