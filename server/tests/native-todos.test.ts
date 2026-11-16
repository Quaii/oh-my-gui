import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTodoPhases } from '../../web/src/lib/native-todos.ts';
test('task imports validate native status and preserve only native fields', () => {
  assert.deepEqual(validateTodoPhases([{ name: 'Plan', tasks: [{ content: 'Review', status: 'pending', inventedId: 2 }] }]), [{ name: 'Plan', tasks: [{ content: 'Review', status: 'pending' }] }]);
  for (const value of [{}, [{ tasks: [] }], [{ name: 'Tasks', tasks: [{ content: 'Task', status: 'done' }] }]]) assert.throws(() => validateTodoPhases(value));
});
