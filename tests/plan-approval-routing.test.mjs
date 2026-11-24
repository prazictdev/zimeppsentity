import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflowSource = fs.readFileSync(new URL('../app/components/annualprocurementplans/workflowActions.vue', import.meta.url), 'utf8');
const storeSource = fs.readFileSync(new URL('../app/stores/annualprocurementplans.js', import.meta.url), 'utf8');

test('offers all three plan approval routes and role-filtered assignment lists', () => {
  assert.match(workflowSource, /SINGLE_REVIEWER_SINGLE_APPROVER/);
  assert.match(workflowSource, /MULTIPLE_REVIEWERS_SINGLE_APPROVER/);
  assert.match(workflowSource, /MULTIPLE_REVIEWERS_MULTIPLE_APPROVERS/);
  assert.match(workflowSource, /plan_reviewer role/);
  assert.match(workflowSource, /plan_approver role/);
  assert.match(workflowSource, /Every selected user must act before their stage concludes/);
});

test('submits selected reviewers and approvers through the plan transition store', () => {
  assert.match(workflowSource, /reviewer_ids: selectedReviewerIds\.value/);
  assert.match(workflowSource, /approver_ids: selectedApproverIds\.value/);
  assert.match(storeSource, /transitionPlan\(planUuid, \{ action, comment, \.\.\.context \}\)/);
  assert.match(storeSource, /eligible_reviewers: payload\.eligible_reviewers/);
  assert.match(storeSource, /eligible_approvers: payload\.eligible_approvers/);
});
