import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse, compileScript } from '@vue/compiler-sfc';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

const sample = {
  can_scan: true, can_review: true, can_change_code: true, can_set_code: true, can_submit: false,
  affected_items: 1, total_items: 2, affected_value: 1000, affected_value_percent: 25,
  catalogue: { version: 'Test release', source: 'Test catalogue' },
  counts: { VERIFIED: 1, NEEDS_REVIEW: 1, MISMATCH: 0, INSUFFICIENT_DETAIL: 0 },
  last_page: 1,
  items: [{ id: 1, description: '<script>unsafe</script> Notebook computer', total_cost: 1000, status: 'NEEDS_REVIEW', reason: 'Reviewer confirmation required.', unspsc: { code: '43211503', name: 'Notebook computers' }, candidates: [{ code: '43211503', name: 'Notebook computers', reason: 'Portable computer purchase.', hierarchy: [{ code: '43211500', name: 'Computers' }] }] }],
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
  test(`${frontend} shows validation status, candidates and permitted review controls`, async () => {
    const html = await render(frontend, sample);
    for (const value of ['UNSPSC validation', '25% of plan value', '43211503', 'Computers', 'Record review']) assert.ok(html.includes(value), value);
    assert.ok(!html.includes('<script>unsafe</script>'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('Confidence'));
    assert.ok(!html.includes('Scan classifications'));
  });
  test(`${frontend} hides mutation controls from viewers`, async () => {
    const html = await render(frontend, { ...sample, can_review: false, can_scan: false, can_set_code: false });
    assert.ok(!html.includes('Record review'));
    assert.ok(!html.includes('Scan classifications'));
    assert.ok(!html.includes('Search / set UNSPSC'));
    assert.ok(html.includes('Reviewer confirmation required.'));
  });
  test(`${frontend} allows manual code selection without granting review authority`, async () => {
    const html = await render(frontend, { ...sample, can_review: false, can_set_code: true });
    assert.ok(html.includes('Search / set UNSPSC'));
    assert.ok(!html.includes('Record review'));
  });
}
