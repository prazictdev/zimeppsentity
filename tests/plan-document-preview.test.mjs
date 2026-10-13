import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse, compileScript } from '@vue/compiler-sfc';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

const filename = new URL('../app/components/plandocuments/viewer.vue', import.meta.url);
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'));
const props = { planUuid: 'plan', documentUuid: 'doc', url: 'https://files.example.test/private.pdf', mimeType: 'application/pdf', name: 'Attachment' };

async function loadComponent(inlineTemplate = false) {
  const script = compileScript(descriptor, { id: 'document-preview', inlineTemplate }).content;
  const source = `import { ref, computed } from '${import.meta.resolve('vue')}';\n${script}`
    .replace(/from ["']vue["']/g, `from '${import.meta.resolve('vue')}'`);
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
}

test('closed document viewers do not render or request their preview URLs', async () => {
  const component = await loadComponent(true);
  const app = createSSRApp(component, props);
  app.component('Icon', { render: () => null });
  const html = await renderToString(app);
  assert.ok(!html.includes('<iframe'));
  assert.ok(!html.includes(props.url));
});

test('opening enables the preview and closing disables it', async () => {
  const component = await loadComponent();
  let opened = 0;
  let closed = 0;
  globalThis.document = { getElementById: () => ({ showModal: () => opened++, close: () => closed++ }) };
  try {
    const state = component.setup(props, { expose() {} });
    assert.equal(state.isOpen.value, false);
    state.open();
    assert.equal(state.isOpen.value, true);
    assert.equal(opened, 1);
    state.close();
    assert.equal(state.isOpen.value, false);
    assert.equal(closed, 1);
    assert.ok(descriptor.template.content.includes('@close="isOpen = false"'));
  } finally {
    delete globalThis.document;
  }
});
