import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse, compileScript } from '@vue/compiler-sfc';
import { createRenderer, h } from 'vue';

// The in-memory renderer exercises Vue's native form directives without a browser.
globalThis.Document ??= class Document {};
globalThis.ShadowRoot ??= class ShadowRoot {};

function componentModule(file, mocks = '', imports = {}) {
  const { descriptor } = parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
  let code = compileScript(descriptor, { id: file, inlineTemplate: true }).content;
  code = `import { ref, computed, watch, nextTick } from 'vue';\n${mocks}\n${code}`;
  code = code.replace(/from (["'])([^"']+)\1/g, (match, quote, name) => {
    const resolved = imports[name] ?? (name === 'vue' ? import.meta.resolve('vue') : null);
    return resolved ? `from '${resolved}'` : match;
  });
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}

const detailsModule = componentModule('../app/components/committees/details.vue');
const editorModule = componentModule('../app/components/committees/editor.vue', `
  const useCommitteeStore = () => ({ companies: [{ id: 1, name: 'Test PE', roles: [], users: [] }] });
  const useCheckPermission = () => ({ canAdd: ref(true), canEdit: ref(true) });
`, {
  './details.vue': detailsModule,
  '~/utils/CommitteeSchema': new URL('../app/utils/CommitteeSchema.js', import.meta.url).href,
});
const { default: Editor } = await import(editorModule);

const content = node => `${node.text} ${node.children.map(content).join(' ')}`;
function element(type, text = '') {
  return {
    type, text, tagName: type.toUpperCase(), children: [], props: {}, parent: null,
    get options() { return this.children.filter(child => child.type === 'option'); },
    getRootNode() { return this.parent ? this.parent.getRootNode() : this; },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; },
    showModal() { this.openedContent = content(this); },
    close() {},
  };
}

function mountEditor() {
  const renderer = createRenderer({
    createElement: type => element(type),
    createText: text => element('text', text),
    createComment: text => element('comment', text),
    setText: (node, text) => { node.text = text; },
    setElementText: (node, text) => { node.text = text; node.children = []; },
    parentNode: node => node.parent,
    nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
    patchProp: (node, key, previous, value) => { node.props[key] = value; node[key] = value; },
    insert(node, parent, anchor = null) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1);
      node.parent = parent;
      const index = anchor ? parent.children.indexOf(anchor) : -1;
      if (index < 0) parent.children.push(node);
      else parent.children.splice(index, 0, node);
    },
    remove(node) {
      const index = node.parent?.children.indexOf(node);
      if (index >= 0) node.parent.children.splice(index, 1);
    },
  });
  const root = element('root');
  const errors = [];
  const app = renderer.createApp(Editor);
  app.component('Icon', { render: () => h('span') });
  app.config.errorHandler = error => errors.push(error);
  const editor = app.mount(root);
  return { editor, dialog: root.children[0], errors, unmount: () => app.unmount() };
}

for (const type of ['EVALUATION', 'DISPOSAL', 'PMU']) {
  test(`renders ${type} details and members before opening the native dialog`, async () => {
    const mounted = mountEditor();
    try {
      await mounted.editor.open({
        uuid: type, name: `${type} committee`, type, status: 'ACTIVE', company_id: 1,
        company: { name: 'Test PE' },
        members: [{ name: 'Jane Member', email: 'jane@example.com', qualifications: null, workhistory: null }],
      }, true);
      assert.deepEqual(mounted.errors, []);
      assert.match(mounted.dialog.openedContent, new RegExp(`${type} committee`));
      assert.match(mounted.dialog.openedContent, /Committee members/);
      assert.match(mounted.dialog.openedContent, /Jane Member/);
      await mounted.editor.open({ uuid: 'empty', name: 'Empty committee', type, status: 'ACTIVE', company_id: 1, members: null }, true);
      assert.deepEqual(mounted.errors, []);
      assert.match(mounted.dialog.openedContent, /Empty committee/);
      assert.match(mounted.dialog.openedContent, /No committee members/);
      assert.doesNotMatch(mounted.dialog.openedContent, /Jane Member/);
    } finally {
      mounted.unmount();
    }
  });
}

test('keeps unsaved member qualification edits separate from the displayed committee', async () => {
  const mounted = mountEditor();
  const committee = {
    uuid: 'editable', name: 'Evaluation committee', type: 'EVALUATION', company_id: 1,
    members: [{ name: 'Jane', email: 'jane@example.com', gender: 'female', qualifications: [{ qualification: 'Diploma' }], workhistory: [] }],
  };
  try {
    await mounted.editor.open(committee, false);
    const nodes = node => [node, ...node.children.flatMap(nodes)];
    const input = nodes(mounted.dialog).find(node => node.type === 'input' && node.value === 'Diploma');
    assert.ok(input);
    input.props['onUpdate:modelValue']('Degree');
    assert.equal(committee.members[0].qualifications[0].qualification, 'Diploma');
    assert.deepEqual(mounted.errors, []);
  } finally {
    mounted.unmount();
  }
});

test('adds a blank member from the active committee view without changing saved members', async () => {
  const mounted = mountEditor();
  const committee = {
    uuid: 'active', name: 'Evaluation committee', type: 'EVALUATION', status: 'ACTIVE', company_id: 1,
    members: [{ name: 'Jane', email: 'jane@example.com', gender: 'female' }],
  };
  try {
    await mounted.editor.open(committee, true);
    const nodes = node => [node, ...node.children.flatMap(nodes)];
    const button = nodes(mounted.dialog).find(node => node.type === 'button' && content(node).includes('Add Member'));
    assert.ok(button);
    await button.props.onClick();
    assert.match(content(mounted.dialog), /Edit committee/);
    assert.match(content(mounted.dialog), /Member 2/);
    assert.match(content(mounted.dialog), /Save committee/);
    assert.equal(committee.members.length, 1);
    assert.deepEqual(mounted.errors, []);
    await mounted.editor.open({ ...committee, status: 'ARCHIVED' }, true);
    assert.doesNotMatch(content(mounted.dialog), /Add Member/);
  } finally {
    mounted.unmount();
  }
});
