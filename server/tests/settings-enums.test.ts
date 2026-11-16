import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('every supplemental native enum is selectable and choices remain unique', () => {
  const supplement = JSON.parse(readFileSync(new URL('../data/settings-enums.json', import.meta.url), 'utf8'));
  const metadata = JSON.parse(readFileSync(new URL('../data/settings-ui.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(supplement.values).length, 23);
  for (const [key, values] of Object.entries(supplement.values) as [string, string[]][]) {
    assert.ok(values.length, key);
    assert.equal(new Set(values).size, values.length, key);
    assert.deepEqual(metadata[key].values, values, key);
    if (metadata[key].options) assert.deepEqual(metadata[key].options.map((option: any) => option.value), values, key);
  }
});
