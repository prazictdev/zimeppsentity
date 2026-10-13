import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';

const filename = new URL('../app/components/annualprocurementplans/workflowActions.vue', import.meta.url);
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'));
const script = compileScript(descriptor, { id: 'review-comment' }).content;
const code = `import { ref, computed } from '${import.meta.resolve('vue')}';
const useAnnualprocurementplanStore = () => globalThis.reviewCommentStore;
${script}`;
const { default: component } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

function setup(transitions) {
  globalThis.reviewCommentStore = { transitions, workflowActions: ['review_approve'] };
  return component.setup({ planUuid: 'plan-1' }, { expose() {} });
}

test('review uses the latest submission rather than approval or older submission comments', () => {
  const state = setup([
    { id: 4, action: 'submit_for_review', comment: 'Updated figures.', user: { name: 'Alice' } },
    { id: 9, action: 'approve_send_back', comment: 'Reviewer should check.' },
    { id: 1, action: 'submit_for_review', comment: 'Original figures.' },
  ]);
  assert.equal(state.latestSubmission.value.comment, 'Updated figures.');
  assert.equal(state.latestSubmission.value.user.name, 'Alice');
  assert.equal(state.comment.value, '');
});

test('a blank latest submission does not reuse an older comment', () => {
  const state = setup([
    { id: 1, action: 'submit_for_review', comment: 'Old comment.' },
    { id: 2, action: 'submit_for_review', comment: null },
  ]);
  assert.equal(state.latestSubmission.value.comment, null);
  assert.equal(setup([]).latestSubmission.value, null);
});

test('approval dialog compiles with a separate read-only submission comment', () => {
  const result = compileTemplate({ source: descriptor.template.content, filename: filename.pathname, id: 'review-comment' });
  assert.deepEqual(result.errors, []);
  assert.ok(descriptor.template.content.includes('activeAction === \'review_approve\''));
  assert.ok(descriptor.template.content.includes('No comment was provided with the latest submission.'));
  assert.ok(!descriptor.template.content.includes('v-html'));
});
