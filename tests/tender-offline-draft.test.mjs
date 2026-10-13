import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileTemplate, parse } from '@vue/compiler-sfc';

const componentUrl = new URL('../app/components/tenders/RequestDetailsStep.vue', import.meta.url);
const source = fs.readFileSync(componentUrl, 'utf8');
const { descriptor } = parse(source);

test('request details template compiles with offline recovery notices', () => {
  const result = compileTemplate({
    source: descriptor.template.content,
    filename: componentUrl.pathname,
    id: 'tender-offline-draft',
  });

  assert.deepEqual(result.errors, []);
  assert.ok(source.includes('You are offline'));
  assert.ok(source.includes('Recovered browser draft'));
});

test('automatically persists and restores a user-scoped browser draft', () => {
  assert.ok(source.includes('useSanctumUser()'));
  assert.ok(source.includes('peclient:tender-wizard:${userId}:request:'));
  assert.ok(source.includes('window.localStorage.setItem(localDraftStorageKey.value'));
  assert.ok(source.includes('window.localStorage.getItem(localDraftStorageKey.value'));
  assert.ok(source.includes('watch(\n  [form, supportingDocumentFile, selectedSupplierCompanies]'));
  assert.ok(source.includes('await restoreLocalDraft()'));
});

test('keeps the browser draft after failures and clears it after a successful server save', () => {
  const clearCalls = source.match(/clearLocalDraft\(\)/g) ?? [];
  assert.ok(clearCalls.length >= 3);
  assert.ok(source.includes("clearLocalDraft()\n      emit('saved', { uuid: props.tenderUuid })"));
  assert.ok(source.includes("clearLocalDraft()\n    emit('saved', { uuid: data.value?.data?.uuid"));
});
