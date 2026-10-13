import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileTemplate, parse } from '@vue/compiler-sfc';

const pageUrl = new URL('../app/pages/evaluations/least-cost-selection/index.vue', import.meta.url);
const source = fs.readFileSync(pageUrl, 'utf8');
const { descriptor } = parse(source);

test('least-cost selection index route compiles', () => {
  const result = compileTemplate({ source: descriptor.template.content, filename: pageUrl.pathname, id: 'lcs-index' });
  assert.deepEqual(result.errors, []);
});

test('lists only assigned LCS evaluations and links to the nested workspace', () => {
  assert.ok(source.includes("filter(item => item.evaluation_type === 'LCS')"));
  assert.ok(source.includes('`/evaluations/least-cost-selection/${item.uuid}`'));
});
