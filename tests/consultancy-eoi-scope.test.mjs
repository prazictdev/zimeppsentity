import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc';

const componentUrl = new URL('../app/components/tenders/ConsultancyEoiPanel.vue', import.meta.url);
const componentSource = fs.readFileSync(componentUrl, 'utf8');
const { descriptor } = parse(componentSource);
const code = `
  import { computed, reactive, ref, watch } from '${import.meta.resolve('vue')}';
  export let mounted;
  const onMounted = callback => { mounted = callback; };
  const onBeforeUnmount = () => {};
  const apiMessage = () => '';
  const useSanctumUser = () => ref({ data: { user: { name: 'Jane', lastname: 'Moyo', email: 'jane@example.test' } } });
  const noticeResponse = { data: ref({ data: null }), error: ref(null) };
  const itemsResponse = {
    data: ref({
      data: [{
        id: 41,
        description: 'Digital transformation consultancy',
        consultancy_brief: {
          background: 'Legacy systems require replacement.',
          objective: 'Prepare a transformation roadmap.',
          scope_of_services: 'Assess the current state and design the target architecture.',
          tasks: [{ title: 'Assessment' }],
          deliverables: [{ title: 'Roadmap' }],
        },
      }],
    }),
    error: ref(null),
  };
  const successfulAction = async () => ({ data: ref({ data: null }), status: ref(true), error: ref(null) });
  const useTenderHelper = () => ({
    getTenderItems: async () => itemsResponse,
    getTenderConsultancyEoi: async () => noticeResponse,
    downloadTenderConsultancyEoiPdf: successfulAction,
    saveTenderConsultancyEoi: successfulAction,
    transitionTenderConsultancyEoi: successfulAction,
    publishTenderConsultancyEoi: successfulAction,
    closeTenderConsultancyEoi: successfulAction,
    evaluateTenderConsultancyEoi: successfulAction,
  });
  ${compileScript(descriptor, { id: 'consultancy-eoi-scope' }).content}
`;
const component = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('retrieves the scope of services directly from Step 2 tender items', async () => {
  const state = component.default.setup(
    { tenderUuid: 'tender-uuid', tender: { title: 'Consultancy tender' } },
    { emit() {}, expose() {} },
  );

  await component.mounted();

  assert.equal(state.scopeSnapshot.value.length, 1);
  assert.equal(
    state.scopeSnapshot.value[0].scope_of_services,
    'Assess the current state and design the target architecture.',
  );
  assert.equal(state.scopeSnapshot.value[0].objective, 'Prepare a transformation roadmap.');
});

test('defaults the EOI contact person to the authenticated user', () => {
  const state = component.default.setup(
    { tenderUuid: 'tender-uuid', tender: { title: 'Consultancy tender' } },
    { emit() {}, expose() {} },
  );

  assert.equal(state.form.contact_person, 'Jane Moyo');
});

test('consultancy EOI template compiles with the Step 2 scope binding', () => {
  const result = compileTemplate({
    source: descriptor.template.content,
    filename: componentUrl.pathname,
    id: 'consultancy-eoi-scope',
  });

  assert.deepEqual(result.errors, []);
});

test('places shortlisting flags after the criterion requirement fields', () => {
  const template = descriptor.template.content;
  assert.ok(template.includes('Overall qualifying score'));
  assert.ok(template.includes('Published score bands'));
  assert.ok(template.includes('Scoring total'));
  const minimumAssignments = template.indexOf('Minimum assignments (optional)');
  const requiredEvidence = template.indexOf('Required evidence');
  const mandatory = template.indexOf('Mandatory for shortlisting');
  const supportingDocument = template.indexOf('Supporting document required');

  assert.ok(minimumAssignments >= 0);
  assert.ok(requiredEvidence > minimumAssignments);
  assert.ok(mandatory > requiredEvidence);
  assert.ok(supportingDocument > requiredEvidence);
});

test('renders a detailed preview and offers saved-draft PDF generation', () => {
  const template = descriptor.template.content;

  for (const heading of [
    'Assignment overview',
    'Scope of services',
    'Shortlisting criteria',
    'Participation and selection',
    'Fee, submission and contact',
    'Download saved draft PDF',
  ]) {
    assert.ok(template.includes(heading), `Missing preview detail: ${heading}`);
  }
});

test('routes EOI publication through review and approval actions', () => {
  assert.ok(componentSource.includes('Submit for review'));
  assert.ok(componentSource.includes('Approve review'));
  assert.ok(componentSource.includes('Approve EOI'));
  assert.ok(componentSource.includes('Publish EOI'));
  assert.equal(componentSource.includes('@click="publish"'), false);
});
