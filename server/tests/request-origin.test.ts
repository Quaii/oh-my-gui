import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loopbackApiRequest } from '../src/request-origin.ts';
test('native execution rejects remote, null and rebound browser origins', () => {
  assert.equal(loopbackApiRequest('localhost:5317', 'http://localhost:5317'), true);
  assert.equal(loopbackApiRequest('127.0.0.1:4317', undefined), true);
  assert.equal(loopbackApiRequest('[::1]:4317', 'http://[::1]:4317'), true);
  for (const [host, origin] of [['evil.example', 'http://evil.example'], ['localhost:4317', 'https://evil.example'], ['localhost:4317', 'null'], ['localhost:4317', 'http://localhost:5317'], ['evil@127.0.0.1', 'http://evil.example']]) assert.equal(loopbackApiRequest(host, origin), false);
});
