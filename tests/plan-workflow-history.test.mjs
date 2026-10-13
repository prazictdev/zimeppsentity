import test from 'node:test';
import assert from 'node:assert/strict';
import { adminAuthorizationComments, latestEntityReturnComment } from '../app/utils/planWorkflowHistory.js';

test('excludes handler comments as well as entries outside admin authorization', () => {
  const history = [
    { id: 1, from_status: 'PENDING_REVIEW', to_status: 'PENDING_INTERNAL_APPROVAL', comment: 'Internal review' },
    { id: 2, from_status: 'PENDING_INTERNAL_APPROVAL', to_status: 'PENDING_ADMIN_AUTHORIZATION', comment: 'Internal approval' },
    { id: 3, from_status: 'PENDING_ADMIN_AUTHORIZATION', to_status: 'PENDING_MANAGER_REVIEW', action: 'handler_recommend', comment: 'Admin recommendation' },
    { id: 4, from_status: 'PENDING_MANAGER_REVIEW', to_status: 'PENDING_ADMIN_AUTHORIZATION', comment: 'Return to handler' },
    { id: 5, from_status: 'PENDING_APPROVER_DECISION', to_status: 'DRAFT', comment: 'Approver comment' },
    { id: 6, from_status: 'PENDING_ADMIN_AUTHORIZATION', to_status: 'PENDING_MANAGER_REVIEW', action: 'handler_recommend', comment: 'Revised recommendation' },
  ];
  assert.deepEqual(adminAuthorizationComments(history), []);
  assert.equal(history.length, 6);
});

test('shows approver clarification and correction comments addressed to the entity', () => {
  const returned = { from_status: 'PENDING_APPROVER_DECISION', action: 'approver_send_back_to_pe', comment: 'Please clarify the quantities and correct the totals.' };
  const internal = { ...returned, action: 'approver_send_back_to_manager', comment: 'Internal reconsideration' };
  assert.deepEqual(adminAuthorizationComments([returned, internal, { ...returned, comment: ' ' }]), [returned]);
});

test('omits empty comments and handles an empty history', () => {
  assert.deepEqual(adminAuthorizationComments(), []);
  const history = [null, '', '  ', undefined].map(comment => ({ from_status: 'PENDING_ADMIN_AUTHORIZATION', comment }));
  assert.deepEqual(adminAuthorizationComments(history), []);
});

test('return alert uses the latest action from the full history regardless of order', () => {
  const returned = { id: 10, action: 'approver_send_back_to_pe', comment: 'Clarify quantities.\nCorrect totals.' };
  const old = { id: 9, action: 'handler_recommend', comment: 'Internal comment' };
  assert.equal(latestEntityReturnComment([old, returned]), returned.comment);
  assert.equal(latestEntityReturnComment([returned, old]), returned.comment);
  assert.equal(latestEntityReturnComment([returned, { id: 11, action: 'submit_for_review' }]), null);
  assert.equal(latestEntityReturnComment([]), null);
  assert.equal(latestEntityReturnComment([{ ...returned, comment: ' ' }]), null);
  assert.equal(latestEntityReturnComment([{ ...returned, comment: null }]), null);
});
