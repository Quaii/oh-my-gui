import { test } from "node:test";
import assert from "node:assert/strict";
import { openSessionFile, readChatSnapshot } from "../src/snapshot.ts";

test("a selected session file uses switch_session rather than the directory-only open_session", async () => {
  await openSessionFile({ send: async command => {
    assert.deepEqual(command, { type: "switch_session", sessionPath: "C:/sessions/thread.jsonl" });
    return { cancelled: false };
  } }, "C:/sessions/thread.jsonl");
  await assert.rejects(openSessionFile({ send: async () => ({ cancelled: true }) }, "thread.jsonl"), /cancelled/);
});

test("history larger than OMP's page limit is preserved", async () => {
  const messages = Array.from({ length: 401 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: String(i) }));
  const snapshot = await readChatSnapshot({ send: async command => {
    assert.notEqual(command.type, "get_messages_page", "must not request an oversized RPC page");
    return command.type === "get_state" ? { messageCount: 401 } : { messages };
  } });
  assert.equal(snapshot.totalMessages, 401);
  assert.deepEqual(snapshot.messages, messages);
});

test("transcript errors are surfaced instead of becoming an empty chat", async () => {
  await assert.rejects(readChatSnapshot({ send: async command => {
    if (command.type === "get_messages") throw new Error("transcript unavailable");
    return {};
  } }), /transcript unavailable/);
  await assert.rejects(readChatSnapshot({ send: async () => ({}) }), /invalid transcript/);
});

test('v2 pages history with a stable cursor and total', async () => {
  const messages = Array.from({ length: 401 }, (_, i) => ({ role: 'user', content: String(i) }));
  const snapshot = await readChatSnapshot({ protocolVersion: 2, send: async command => {
    if (command.type === 'get_state') return { messageCount: 401 };
    assert.equal(command.type, 'get_messages_page');
    assert.equal(command.limit, 100);
    const start = Number(command.cursor || 0), end = Math.min(start + 100, 401);
    return { messages: messages.slice(start, end), totalMessages: 401, nextCursor: end < 401 ? String(end) : undefined };
  } });
  assert.deepEqual(snapshot.messages, messages);
});
test('stale pages are discarded before a full snapshot fallback', async () => {
  let pages = 0;
  const snapshot = await readChatSnapshot({ protocolVersion: 2, send: async command => {
    if (command.type === 'get_state') return {};
    if (command.type === 'get_messages') return { messages: [{ content: 'fresh' }] };
    if (pages++) throw Object.assign(new Error('stale'), { code: 'stale_cursor' });
    return { messages: [{ content: 'old' }], totalMessages: 2, nextCursor: 'next' };
  } });
  assert.deepEqual(snapshot.messages, [{ content: 'fresh' }]);
});
test('invalid pages do not silently produce partial history', async () => {
  await assert.rejects(readChatSnapshot({ protocolVersion: 2, send: async command => command.type === 'get_state' ? {} : { messages: [], totalMessages: 2 } }), /incomplete/);
});
