import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse, compileScript } from '@vue/compiler-sfc';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

const sample = {
  can_scan: true, can_review: true, can_change_code: true, can_set_code: true, can_submit: false,
  affected_items: 1, attention_items: 0, eligible_items: 1, eligible_groups: 1, total_items: 2, affected_value: 1000, affected_value_percent: 25,
  catalogue: { version: 'Test release', source: 'Test catalogue' },
  counts: { VERIFIED: 1, NEEDS_REVIEW: 1, MISMATCH: 0, INSUFFICIENT_DETAIL: 0 },
  last_page: 1,
  items: [{ id: 1, description: '<script>unsafe</script> Notebook computer', total_cost: 1000, status: 'NEEDS_REVIEW', reason: 'Reviewer confirmation required.', bulk_eligible: true, bulk_exception: null, review_group_size: 3, unspsc: { code: '43211503', name: 'Notebook computers' }, candidates: [{ code: '43211503', name: 'Notebook computers', reason: 'Portable computer purchase.', hierarchy: [{ code: '43211500', name: 'Computers' }] }] }],
};

async function render(frontend, report) {
  const url = new URL(`../../${frontend}/app/components/planClassificationValidation.vue`, import.meta.url);
  const source = fs.readFileSync(url, 'utf8').replace('const report = ref(null);', `const report = ref(${JSON.stringify(report).replaceAll('<', '\\u003c')});`);
  const { descriptor } = parse(source);
  let code = compileScript(descriptor, { id: 'classification', inlineTemplate: true, templateOptions: { ssr: true } }).content;
  code = `import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'; const usePeClient = () => () => {}; const useSanctumClient = usePeClient;\n${code}`;
  code = code.replace(/from (["'])(vue(?:\/server-renderer)?)\1/g, (_, quote, name) => `from '${import.meta.resolve(name)}'`);
  const { default: component } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const app = createSSRApp(component, { planUuid: 'sample' });
  app.component('Icon', { render: () => h('span') });
  app.component('UnspscManualSelect', { render: () => h('button', 'Search / set UNSPSC') });
  return renderToString(app);
}

for (const frontend of ['peclient', 'adminclient']) {
  test(`${frontend} saves an individual override on a locked item with insufficient detail`, async () => {
    const url = new URL(`../../${frontend}/app/components/planClassificationValidation.vue`, import.meta.url);
    const { descriptor } = parse(fs.readFileSync(url, 'utf8'));
    const script = compileScript(descriptor, { id: 'manual-save' }).content;
    const code = `import { ref, reactive, computed } from '${import.meta.resolve('vue')}';
      const watch = () => {}, onMounted = () => {}, onBeforeUnmount = () => {};
      export const requests = [];
      export const queries = [];
      const usePeClient = () => async (url, options) => {
        if (options.method === 'PATCH') {
          requests.push(options.body);
          if (requests.length === 1) throw { data: { errors: { fingerprint: ['Refresh and try again.'] } } };
        }
        if (options.query) queries.push(options.query);
        return { data: { can_change_code: false } };
      };
      const useSanctumClient = usePeClient;
      ${script}`;
    const { default: component, requests, queries } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    const state = component.setup({ planUuid: 'plan' }, { expose() {}, emit() {} });
    state.page.value = 3;
    await state.showStatus('ATTENTION');
    assert.deepEqual(queries[0], { page: 1, status: 'ATTENTION' });
    state.begin({
      id: 1, status: 'INSUFFICIENT_DETAIL', fingerprint: 'current', unspsc: { code: '25121503' },
      description_warning: 'Describe the actual product.',
    });
    assert.equal(state.form.status, 'INSUFFICIENT_DETAIL');
    assert.equal(state.verificationBlocker.value, '');
    state.form.status = 'VERIFIED';
    state.form.reason = 'too short';
    await state.save();
    assert.match(state.reviewError.value, /10 characters/);
    assert.equal(requests.length, 0);
    state.form.reason = 'Reviewed the signed requisition and confirmed the selected commodity.';
    await state.save();
    assert.equal(state.reviewError.value, 'Refresh and try again.');
    assert.equal(state.selected.value.id, 1);
    assert.deepEqual(requests[0], { status: 'VERIFIED', reason: state.form.reason, fingerprint: 'current' });
    await state.save();
    assert.equal(state.selected.value, null);
    assert.equal(state.resultMessage.value, 'Classification review saved.');
  });
  test(`${frontend} shows validation status, candidates and permitted review controls`, async () => {
    const html = await render(frontend, sample);
    for (const value of ['UNSPSC validation', '25% of plan value', '43211503', 'Computers', 'Confirm all eligible classifications', '3 identical classifications']) assert.ok(html.includes(value), value);
    assert.ok(!html.includes('<script>unsafe</script>'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('Confidence'));
    assert.ok(!html.includes('Scan classifications'));
    assert.ok(!html.includes('Select all eligible on this page'));
    assert.ok(!html.includes('Review exception'));
    const exceptionHtml = await render(frontend, {
      ...sample,
      eligible_items: 0,
      eligible_groups: 0,
      attention_items: 1,
      can_change_code: false,
      items: [{
        ...sample.items[0],
        bulk_eligible: false,
        bulk_exception: 'Resolve this flagged classification individually.',
        status: 'INSUFFICIENT_DETAIL',
        description_warning: 'Describe the actual product.',
      }],
    });
    assert.ok(exceptionHtml.includes('Review exception'));
    assert.ok(exceptionHtml.includes('Show the flagged item'));
    assert.ok(exceptionHtml.includes('you can verify it in the individual review'));
  });
  test(`${frontend} hides mutation controls from viewers`, async () => {
    const html = await render(frontend, { ...sample, can_review: false, can_scan: false, can_set_code: false });
    assert.ok(!html.includes('Review exception'));
    assert.ok(!html.includes('Scan classifications'));
    assert.ok(!html.includes('Search / set UNSPSC'));
    assert.ok(html.includes('Reviewer confirmation required.'));
  });
  test(`${frontend} allows manual code selection without granting review authority`, async () => {
    const html = await render(frontend, { ...sample, can_review: false, can_set_code: true });
    assert.ok(html.includes('Search / set UNSPSC'));
    assert.ok(!html.includes('Review exception'));
  });
}
