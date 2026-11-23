import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('service standards management page compiles and supports entity CRUD controls', () => {
  const source = read('../app/pages/minimum-service-delivery-standards/index.vue');
  const { descriptor } = parse(source);
  const script = compileScript(descriptor, { id: 'minimum-service-delivery-standards' });
  const template = compileTemplate({
    source: descriptor.template.content,
    id: 'minimum-service-delivery-standards',
    filename: 'index.vue',
    compilerOptions: { bindingMetadata: script.bindings },
  });

  assert.deepEqual(template.errors, []);
  assert.match(source, /useCheckPermission\('minimumservicedeliverystandards'\)/);
  assert.match(source, />Add standard</);
  assert.match(source, /archiveStandard\(standard\)/);
  assert.match(source, /It will remain on existing plan items/);
});

test('plan item forms use a service standard dropdown and optional comments', () => {
  for (const path of ['../app/components/annualprocurementplans/itemForm.vue', '../app/components/exemptions/itemForm.vue']) {
    const source = read(path);
    assert.match(source, /minimum_service_delivery_standard_id/);
    assert.match(source, /minimumServiceDeliveryStandards/);
    assert.match(source, /form.comments/);
    assert.doesNotMatch(source, /form.msds/);
  }
});
