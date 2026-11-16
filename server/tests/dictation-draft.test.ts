import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consumeDictation, appendDictation } from '../../web/src/lib/dictation-draft.ts';
test('dictation inserts once into its originating draft, including stop/event races', () => {
  const capture = { id: 'capture', owner: 'chat-a', consumed: false };
  assert.equal(consumeDictation(capture, { captureId: 'other', text: 'wrong chat' }), null);
  assert.equal(consumeDictation(capture, { captureId: 'capture', text: 'spoken text' }), 'spoken text');
  assert.equal(consumeDictation(capture, { captureId: 'capture', text: 'spoken text' }), null);
  assert.equal(appendDictation('An existing draft', 'spoken text'), 'An existing draft spoken text');
  assert.equal(appendDictation('Draft\n', 'more'), 'Draft\nmore');
});
test('failed capture is terminal and never inserts partial text', () => {
  const capture = { id: 'capture', owner: 'chat-a', consumed: false };
  assert.equal(consumeDictation(capture, { captureId: 'capture', text: 'partial', error: 'failed' }), null);
  assert.equal(capture.consumed, true);
});
