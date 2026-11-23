import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RpcFrameDecoder } from '../src/rpc-frames.ts';
import { UiReplay } from '../src/ui-replay.ts';
import { chatReducer, initialChat } from '../../web/src/lib/store.ts';
import { initialAnswers, changeAnswer, dialogDeadline } from '../../web/src/lib/native-dialog.ts';

function chunks(value: unknown) {
  const bytes = Buffer.from(JSON.stringify(value));
  const parts = [bytes.subarray(0, 5), bytes.subarray(5, 13), bytes.subarray(13)];
  return parts.map((part, index) => ({ type: 'rpc_chunk', chunkId: 'test', index, count: parts.length, byteLength: bytes.length, data: part.toString('base64') }));
}
test('v2 reassembles Unicode across arbitrary UTF-8 boundaries', () => {
  const decoder = new RpcFrameDecoder();
  const record = { type: 'response', data: { message: 'λ🪶日本語' } };
  const frames = chunks(record);
  assert.equal(decoder.accept(frames[0]), null);
  assert.equal(decoder.accept(frames[1]), null);
  assert.deepEqual(decoder.accept(frames[2]), record);
});
test('corrupt, interleaved and oversized chunks fail visibly and reset decoding', () => {
  const decoder = new RpcFrameDecoder(1000);
  const frames = chunks({ type: 'notice', message: 'test' });
  assert.throws(() => decoder.accept(frames[1]), /zero/);
  decoder.accept(frames[0]);
  assert.throws(() => decoder.accept({ type: 'notice' }), /interrupted/);
  assert.throws(() => decoder.accept({ ...frames[0], byteLength: 1001 }), /metadata/);
  assert.throws(() => decoder.accept({ ...frames[0], data: '====' }), /metadata/);
  decoder.accept(frames[0]);
  assert.throws(() => decoder.accept(frames[2]), /order/);
  assert.throws(() => decoder.accept(null as any), /logical/);
  assert.deepEqual(decoder.accept({ type: 'notice' }), { type: 'notice' });
});
test('startup UI survives subscription, cancellation and reconnect without duplicate output', () => {
  const replay = new UiReplay();
  replay.accept({ type: 'extension_ui_request', id: 'question', method: 'select', options: ['a'], initialIndex: 0, selectionMarker: 'checkbox', checkedIndices: [0] });
  replay.accept({ type: 'command_output', text: 'native output' });
  let chat = replay.snapshot().reduce(chatReducer, initialChat);
  assert.equal(chat.dialogs[0].selectionMarker, 'checkbox');
  assert.deepEqual(chat.dialogs[0].checkedIndices, [0]);
  chat = replay.snapshot().reduce(chatReducer, chat);
  assert.equal(chat.dialogs.length, 1);
  assert.equal(chat.outputs.length, 1);
  chat = chatReducer(chat, replay.accept({ type: 'extension_ui_request', method: 'cancel', targetId: 'question' }));
  assert.equal(chat.dialogs.length, 0);
  assert.equal(replay.dialogs.size, 0);
});
test('replay retains only the latest presentation update and bounds native output', () => {
  const replay = new UiReplay();
  for (let i = 0; i < 80; i++) replay.accept({ type: 'command_output', text: String(i) });
  for (let i = 0; i < 3; i++) replay.accept({ type: 'extension_ui_request', method: 'set_editor_text', text: String(i) });
  const updates = replay.snapshot().filter(record => record.method === 'set_editor_text');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].text, '2');
  assert.ok(replay.snapshot().length <= 64);
});
test('ended provider sign-in removes its browser link and callback prompt, including on reconnect', () => {
  const replay = new UiReplay();
  const authProvider = 'zai-coding-plan';
  replay.accept({ type: 'extension_ui_request', method: 'open_url', id: 'first', url: 'https://example.test/', authProvider });
  replay.accept({ type: 'extension_ui_request', method: 'open_url', id: 'latest', url: 'https://example.test/', launchUrl: 'http://127.0.0.1:12345/redirect', authProvider });
  replay.accept({ type: 'extension_ui_request', method: 'open_url', id: 'other', url: 'https://example.test/' });
  replay.accept({ type: 'extension_ui_request', method: 'input', id: 'callback', authProvider });
  const before = replay.snapshot().reduce(chatReducer, initialChat);
  assert.deepEqual(before.authLinks.map(link => link.id), ['latest', 'other']);
  assert.equal(before.authLinks[0].url, 'http://127.0.0.1:12345/redirect');
  assert.equal(before.dialogs[0].authProvider, authProvider);

  const finish = replay.accept({ type: 'provider_login_finished', providerId: authProvider, connected: false });
  const after = chatReducer(before, finish);
  const reconnected = replay.snapshot().reduce(chatReducer, initialChat);
  assert.deepEqual(after.authLinks.map(link => link.id), ['other']);
  assert.deepEqual(after.dialogs, []);
  assert.deepEqual(reconnected.authLinks, after.authLinks);
  assert.deepEqual(reconnected.dialogs, after.dialogs);
});
test('structured questions preserve ids, recommendations, multi-select and free text', () => {
  let answers = initialAnswers([{ id: 'q', options: [{ label: 'A' }, { label: 'B' }], recommended: 1 }]);
  assert.deepEqual(answers, [{ id: 'q', selectedOptions: ['B'] }]);
  answers = changeAnswer(answers, 0, 'A', true);
  assert.deepEqual(answers[0].selectedOptions, ['B', 'A']);
  answers = changeAnswer(answers, 0, 'B', true);
  assert.deepEqual(answers[0].selectedOptions, ['A']);
  assert.deepEqual(changeAnswer([{ id: 'q', selectedOptions: [], customInput: 'custom' }], 0, 'B', false)[0], { id: 'q', selectedOptions: ['B'], customInput: '' });
  assert.equal(dialogDeadline({ timeout: 100, receivedAt: 20 }), 120);
  assert.equal(dialogDeadline({ receivedAt: 20 }), null);
});
