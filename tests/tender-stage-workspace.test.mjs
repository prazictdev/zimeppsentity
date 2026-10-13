import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileTemplate, parse } from '@vue/compiler-sfc';

const pageUrl = new URL('../app/pages/tenders/[uuid]/index.vue', import.meta.url);
const pageSource = fs.readFileSync(pageUrl, 'utf8');
const { descriptor } = parse(pageSource);

test('tender detail template compiles', () => {
  const result = compileTemplate({ source: descriptor.template.content, filename: pageUrl.pathname, id: 'tender-stage-workspace' });
  assert.deepEqual(result.errors, []);
});

test('organizes tender detail into stage-specific workspaces', () => {
  for (const stage of ['PREPARATION', 'GOVERNANCE', 'MARKET', 'OPENING', 'EVALUATION', 'AWARD', 'CONTRACT']) {
    assert.ok(pageSource.includes(`key: '${stage}'`));
  }
  assert.ok(pageSource.includes('Current stage'));
  assert.ok(pageSource.includes('Actions for this stage'));
  assert.ok(pageSource.includes('defaultStageTab'));
  assert.ok(pageSource.includes("currentStage.value.key === 'EVALUATION'"));
  assert.ok(pageSource.includes("statuses: ['UNDER_EVALUATION']"));
  assert.ok(pageSource.includes("statuses: ['EVALUATED', 'INTENTION_TO_AWARD', 'STANDSTILL', 'AWARDED']"));
  assert.ok(pageSource.includes("const awardTab = { key: 'award', label: 'Award and standstill'"));
  assert.ok(pageSource.includes("activeTab === 'award' && currentStage.key === 'AWARD'"));
  assert.ok(pageSource.includes("const controlsTab = { key: 'controls', label: 'Procurement controls'"));
  assert.ok(pageSource.includes('historyTab, controlsTab'));
  assert.ok(pageSource.includes("activeTab === 'controls'"));
});

test('loads the large tender specification only when its information tab is opened', () => {
  assert.ok(pageSource.includes("if (tab === 'overview' && !detailsLoaded.value"));
  assert.ok(pageSource.includes("if (activeTab.value === 'overview') loadDetails()"));
});

test('does not show the ambiguous complete evaluation lifecycle action', () => {
  assert.ok(pageSource.includes("const hiddenStageActions = ['complete_evaluation']"));
  assert.equal(pageSource.includes("label: 'Complete evaluation'"), false);
});
