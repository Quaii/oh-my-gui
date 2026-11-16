import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatReducer, initialChat } from '../../web/src/lib/store.ts';
import { flattenNativeTree } from '../../web/src/lib/native-tree.ts';
test('side-question streams coalesce the current topic turn without changing chat history', () => {
  const first = { id: 'topic', question: 'Why?', answer: 'First', status: 'complete', followUps: [{ question: 'And?', answer: '', status: 'running' }] };
  let state = chatReducer(initialChat, { type: 'btw_record', record: first });
  state = chatReducer(state, { type: 'btw_delta', recordId: 'topic', delta: 'Second' });
  assert.equal(state.sideQuestions[0].answer, 'First');
  assert.equal(state.sideQuestions[0].followUps[0].answer, 'Second');
  assert.deepEqual(state.messages, []);
});
test('native goal wrapper, subagent ownership and terminal states remain authoritative', () => {
  let state = chatReducer(initialChat, { type: 'goal_updated', goal: { objective: 'Goal' }, state: { enabled: true, mode: 'active', goal: { objective: 'Goal' } } });
  assert.equal(state.state?.goal.goal.objective, 'Goal');
  state = chatReducer(state, { type: 'subagent_lifecycle', payload: { id: 'agent', parentToolCallId: 'owner', status: 'started' } });
  assert.equal(state.subagents[0].status, 'running');
  state = chatReducer(state, { type: 'subagent_progress', payload: { parentToolCallId: 'stale-owner', progress: { id: 'agent', status: 'completed' } } });
  assert.equal(state.subagents[0].status, 'running');
  state = chatReducer(state, { type: 'subagent_lifecycle', payload: { id: 'agent', parentToolCallId: 'owner', status: 'aborted' } });
  state = chatReducer(state, { type: 'subagents_snapshot', subagents: [] });
  assert.equal(state.subagents[0].status, 'aborted');
});
test('branch tree flattening preserves labels, parent depth and long chains', () => {
  const tree: any = { entry: { id: 'root' }, label: 'Start', children: [] };
  let tail = tree;
  for (let i = 0; i < 12000; i++) { const next = { entry: { id: String(i) }, children: [] }; tail.children.push(next); tail = next; }
  const entries = flattenNativeTree([tree]);
  assert.equal(entries.length, 12001);
  assert.equal(entries[0].label, 'Start');
  assert.equal(entries.at(-1).depth, 12000);
});
