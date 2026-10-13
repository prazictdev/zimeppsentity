import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileTemplate, parse } from '@vue/compiler-sfc';

const componentUrl = new URL('../app/components/tenders/CommitteePanel.vue', import.meta.url);
const componentSource = fs.readFileSync(componentUrl, 'utf8');
const { descriptor } = parse(componentSource);

test('keeps committee appointment available after tender opening', () => {
  const editableExpression = componentSource.match(/const editable = computed\(\(\) => ([^\n]+)\)/)?.[1] ?? '';

  assert.ok(editableExpression.includes('canEdit.value'));
  assert.equal(editableExpression.includes("'OPENED'"), false);
  assert.ok(editableExpression.includes("'UNDER_EVALUATION'"));
});

test('committee panel template compiles', () => {
  const result = compileTemplate({
    source: descriptor.template.content,
    filename: componentUrl.pathname,
    id: 'tender-committee-appointment',
  });

  assert.deepEqual(result.errors, []);
});

test('shows demo committee readiness and pending conflict declarations clearly', () => {
  assert.ok(componentSource.includes('Appointment alone does not make the committee ready'));
  assert.ok(componentSource.includes('pendingDeclarationCount'));
  assert.ok(componentSource.includes("demoMode ? 'one in demo mode' : 'three'"));
  assert.ok(componentSource.includes('Record declaration'));
});
