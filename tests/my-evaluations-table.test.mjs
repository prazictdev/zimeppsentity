import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compileTemplate, parse } from '@vue/compiler-sfc';

const pageUrl = new URL('../app/pages/evaluations/index.vue', import.meta.url);
const source = fs.readFileSync(pageUrl, 'utf8');
const { descriptor } = parse(source);

test('My Evaluations table compiles', () => {
  const result = compileTemplate({ source: descriptor.template.content, filename: pageUrl.pathname, id: 'my-evaluations' });
  assert.deepEqual(result.errors, []);
});

test('shows assigned evaluations in a searchable and filterable table', () => {
  assert.ok(source.includes('<table class="table table-zebra">'));
  assert.ok(source.includes('v-model="filters.search"'));
  assert.ok(source.includes('v-model="filters.type"'));
  assert.ok(source.includes('v-model="filters.status"'));
  assert.ok(source.includes('v-for="item in filteredEvaluations"'));
  assert.ok(source.includes('Tender number, title, method or role'));
  assert.ok(source.includes('No evaluations match the current filters'));
  assert.ok(source.includes('Open evaluation'));
});
