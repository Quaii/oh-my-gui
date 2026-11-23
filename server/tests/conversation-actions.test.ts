import { test } from "node:test";
import assert from "node:assert/strict";
import { conversationRestoreTargets, isDeviceMountNotice, pausedAdvisor } from "../../web/src/lib/conversation-actions.ts";
import { groupedTranscript } from "../../web/src/lib/transcript.ts";

test("advisor quota pauses get a status label without swallowing other errors", () => {
  const notice = 'Advisor "default" quota exhausted — pausing until reset.';
  assert.equal(pausedAdvisor(notice), "default");
  assert.equal(pausedAdvisor('Advisor "review" quota exhausted - pausing until reset'), "review");
  assert.equal(pausedAdvisor(notice + "\nRuntime error"), undefined);
  assert.equal(pausedAdvisor("Provider quota exhausted"), undefined);
});

test("routine device mount notices are hidden without suppressing errors or other output", () => {
  const notice = "xd://: mounted mcp__node_repl_js, mcp__node_repl_js_reset";
  assert.equal(isDeviceMountNotice(notice), true);
  assert.equal(isDeviceMountNotice("xd://: unmounted mcp__node_repl_js"), true);
  for (const kind of ["error", "warning"]) assert.equal(isDeviceMountNotice(notice, kind), false);
  for (const text of ["Mounted project folder", "xd://: mounted tool\nFailed to connect", "xd://: mounted tool; error", "xd://: mount failed"]) {
    assert.equal(isDeviceMountNotice(text), false);
  }
  const messages = [
    { role: "user", content: notice },
    { role: "custom", content: notice },
    { role: "assistant", content: "Done", timestamp: 3 },
    { role: "custom", content: notice, level: "error" },
  ];
  const grouped = groupedTranscript(messages);
  assert.deepEqual(grouped.map(item => item.index), [0, 2]);
  assert.deepEqual(grouped[1].message.turnMessages, [messages[2], messages[3]]);
  assert.equal(messages.length, 4);
});

test("restore actions use saved native entries and preserve grouped message indices", () => {
  const messages = [
    { role: "user", timestamp: 1, content: "Hello" },
    { role: "assistant", timestamp: 2, content: [{ type: "thinking", thinking: "Working" }] },
    { role: "assistant", timestamp: 3, content: "Done" },
    { role: "user", content: "Not saved yet" },
  ];
  const entries = messages.slice(0, 3).map((message, i) => ({ type: "message", id: `entry-${i}`, message }));
  const targets = conversationRestoreTargets(messages, entries);
  assert.deepEqual([...targets], [[0, "entry-0"], [1, "entry-1"], [2, "entry-2"]]);
  const reply = groupedTranscript(messages)[1];
  assert.equal(targets.get(reply.index), "entry-2");
  assert.equal(conversationRestoreTargets(messages, [...entries, { ...entries[2], id: "other-branch" }]).has(2), false);
  assert.equal(conversationRestoreTargets(messages, []).size, 0);
});
