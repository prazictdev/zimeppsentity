import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse, compileScript } from '@vue/compiler-sfc';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

for (const [folder, prefix] of [
  ['evaluationcommittees', 'Evaluationcommittees'],
  ['procurementmanagementunits', 'Procurementmanagementunits'],
  ['disposalcommittees', 'Disposalcommittees'],
]) {
  test(`${folder} stays read-only even when all legacy edit flags are supplied`, async () => {
    const { descriptor } = parse(fs.readFileSync(new URL(`../app/components/${folder}/index.vue`, import.meta.url), 'utf8'));
    const member = { id: 1, uuid: 'member', name: 'Jane Member', email: 'jane@example.com', qualifications_count: 0, workhistory_count: 0 };
    const meta = { current_page: 1, last_page: 1, per_page: 25, total: 1 };
    const store = {
      committeeMembers: [member], committeeMembersMeta: meta,
      pmuMembers: [member], pmuMembersMeta: meta,
      disposalCommitteeMembers: [member], disposalCommitteeMembersMeta: meta,
    };
    let code = compileScript(descriptor, { id: folder, inlineTemplate: true, templateOptions: { ssr: true } }).content;
    code = `import { ref, onMounted } from 'vue';\nconst useAnnualprocurementplanStore = () => (${JSON.stringify(store)});\n${code}`;
    code = code.replace(/from (["'])(vue(?:\/server-renderer)?)\1/g, (_, quote, name) => `from '${import.meta.resolve(name)}'`);
    const { default: component } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    const app = createSSRApp(component, { planUuid: 'plan', canAdd: true, canEdit: true, canDelete: true });
    app.component('Icon', { render: () => h('span') });
    for (const action of ['Add', 'Edit', 'Delete']) {
      app.component(`${prefix}${action}`, { render: () => h('button', { 'data-member-mutation': action }, action) });
    }
    app.component(`${prefix}MemberDetail`, {
      props: { canEdit: Boolean, canDelete: Boolean },
      setup: props => () => h('span', { 'data-view-only': !props.canEdit && !props.canDelete }, 'View member'),
    });
    const html = await renderToString(app);
    assert.match(html, /Jane Member/);
    assert.match(html, /<table/);
    assert.doesNotMatch(html, /data-member-mutation/);
    if (folder !== 'disposalcommittees') assert.match(html, /data-view-only="true"/);
  });
}
