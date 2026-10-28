import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toJsonSchema } from '@langchain/core/utils/json_schema';
import { guideDraftSchema } from '../lib/agent/guide-evidence';

for (const name of ['effortEstimate', 'approvalWait'] as const) {
  const schema = guideDraftSchema.shape[name];

  test(`${name} exposes duration fields without a oneOf wrapper`, () => {
    // Regression: Gemini's schema sanitizer discarded the old oneOf and all its nested fields.
    const wire = toJsonSchema(schema);
    assert.ok('type' in wire && wire.type === 'object');
    assert.equal('oneOf' in wire, false);
    assert.ok('properties' in wire);
    assert.ok('required' in wire);
    assert.deepEqual(Object.keys(wire.properties ?? {}).sort(), ['explanation', 'sourceIds', 'status', 'value']);
    assert.deepEqual(wire.required, ['status', 'value', 'explanation', 'sourceIds']);
  });

  test(`${name} preserves unknown-vs-known validation`, () => {
    const unknown = { status: 'unknown', value: null, explanation: 'No published timeline found.', sourceIds: [] };
    assert.equal(schema.safeParse(unknown).success, true);
    assert.equal(schema.safeParse({ ...unknown, value: 'null' }).success, false);
    assert.equal(schema.safeParse({ ...unknown, status: 'estimated' }).success, false);
    assert.equal(schema.safeParse({ ...unknown, status: 'documented' }).success, false);
    assert.equal(schema.safeParse({ ...unknown, status: 'estimated', value: '1–2 hours' }).success, true);
    assert.equal(schema.safeParse('null').success, false);
  });
}
