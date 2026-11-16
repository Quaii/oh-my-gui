import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HostRpcAdapter } from '../src/host-adapters.ts';
test('host requests report real updates/results, and missing adapters fail instead of hanging', async () => {
  const records: any[] = [];
  const host = new HostRpcAdapter(record => records.push(record));
  host.tool('fixture', async (_request, _signal, update) => { update({ content: [{ type: 'text', text: 'Reading fixture' }] }); return { content: [{ type: 'text', text: 'fixture result' }] }; });
  await host.accept({ type: 'host_tool_call', id: 'call', toolName: 'fixture' });
  assert.deepEqual(records.map(record => record.type), ['host_tool_update', 'host_tool_result']);
  await host.accept({ type: 'host_uri_request', id: 'unknown', url: 'unsupported://file', operation: 'read' });
  assert.equal(records.at(-1).isError, true);
});
test('cancelled host work cannot deliver a late result', async () => {
  const records: any[] = [];
  const host = new HostRpcAdapter(record => records.push(record));
  let finish: () => void = () => {};
  host.tool('fixture', async () => { await new Promise<void>(resolve => finish = resolve); return { content: [] }; });
  const task = host.accept({ type: 'host_tool_call', id: 'call', toolName: 'fixture' });
  await host.accept({ type: 'host_tool_cancel', targetId: 'call' });
  finish(); await task;
  assert.equal(records.length, 0);
});
