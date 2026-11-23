import {test} from "node:test";
import assert from "node:assert/strict";
import { conversationSections, groupedTranscript, isThinkingTurn, splitAssistantTurn, transcriptItems } from "../../web/src/lib/transcript.ts";
test("hidden results and empty thinking do not reserve transcript rows; assistant steps keep native indices",()=>{
 const items=transcriptItems([{role:"user",content:"Hi"},{role:"assistant",content:[{type:"thinking",thinking:""}]},{role:"assistant",content:[{type:"toolCall",name:"bash"}]},{role:"toolResult",content:"output"},{role:"assistant",content:[{type:"text",text:"Done"}]}]);
 assert.deepEqual(items.map(i=>i.index),[0,2,4]);assert.equal(items[2].continuation,true);assert.equal(items[1].continuation,false);
});

test("interleaved notes and tools share a stable activity row across streaming and replay", () => {
  const user = { role: "user", content: "Check the workspace." };
  const before = { role: "system", content: "Runtime note" };
  const progress = { role: "assistant", content: [{ type: "text", text: "Checking." }, { type: "toolCall", id: "check", name: "bash" }] };
  const output = { role: "toolResult", toolCallId: "check", content: "Pass" };
  const reminder = { role: "developer", content: "Some tasks are unfinished." };
  const final = { role: "assistant", content: "The check passed.", timestamp: 6 };
  const after = { role: "hookMessage", content: "Another note" };
  const nextUser = { role: "user", content: "Next task" };
  const messages = [user, before, progress, output, reminder];

  const live = groupedTranscript(messages, final);
  assert.equal(live.length, 2);
  assert.equal(live[1].firstIndex, 1);
  assert.equal(live[1].index, 5);
  assert.equal(live[1].streaming, true);

  const saved = groupedTranscript([...messages, final, after, nextUser]);
  assert.deepEqual(saved.map(row => row.index), [0, 5, 7]);
  assert.equal(saved[1].firstIndex, live[1].firstIndex);
  const split = splitAssistantTurn(saved[1].message.turnMessages);
  assert.deepEqual(split.activity, [before, progress, reminder, after]);
  assert.deepEqual(split.reply.content, [{ type: "text", text: "The check passed." }]);
  assert.equal(split.reply.timestamp, 6);
});

test("an unfinished command does not turn its preamble into a final reply", () => {
  const assistant = { role: "assistant", content: [
    { type: "thinking", thinking: "Think" },
    { type: "text", text: "I'll run the checks." },
    { type: "toolCall", id: "check", name: "bash" },
  ] };
  assert.equal(splitAssistantTurn([assistant]).reply, undefined);
  const { activity, reply } = splitAssistantTurn([
    { ...assistant, content: [...assistant.content, { type: "text", text: "Checks complete." }] },
  ]);
  assert.deepEqual(activity[0].content, assistant.content);
  assert.deepEqual(reply.content, [{ type: "text", text: "Checks complete." }]);
});

test("note-only entries group without swallowing the next conversation turn", () => {
  const notes = [{ role: "hookMessage", content: "First note" }, { role: "custom", text: "Second note" }];
  const rows = groupedTranscript([...notes, { role: "user", content: "Hi" }, { role: "assistant", content: "Hello" }]);
  assert.deepEqual(rows.map(row => row.message.role), ["turnActivity", "user", "assistant"]);
  assert.deepEqual(rows[0].message.turnMessages, notes);
  assert.equal(splitAssistantTurn(rows[0].message.turnMessages).reply, undefined);
});

test("timeline previews use each request and its reply without exposing tool output or progress notes", () => {
  const records = [
    { role: "user", content: [{ type: "text", text: " Check\nthis " }] },
    { role: "assistant", content: [{ type: "text", text: "Running checks" }, { type: "toolCall", name: "bash" }] },
    { role: "toolResult", content: "Raw output" },
    { role: "assistant", content: "Checks passed" },
    { role: "custom", text: "System note" },
    { role: "user", content: [{ type: "image" }] },
  ];
  assert.deepEqual(conversationSections(records), [
    { id: "msg-0", label: "Check this", preview: "Checks passed" },
    { id: "msg-5", label: "Image request" },
  ]);
});

test("Thinking anchors below the user before the first visible token and becomes activity in place", () => {
  const messages = [{ role: "user", content: "Check this" }];
  const empty = { role: "assistant", content: [] };
  const thinking = { role: "assistant", content: [{ type: "thinking", thinking: "Consider the request." }] };
  const work = { role: "assistant", content: [{ type: "toolCall", id: "check", name: "read" }] };
  assert.equal(groupedTranscript(messages, undefined, false).length, 1);
  const pending = groupedTranscript(messages, empty, true)[1];
  const firstToken = groupedTranscript(messages, thinking, true)[1];
  const activity = groupedTranscript([...messages, thinking], work, true)[1];
  assert.equal(pending.firstIndex, 1);
  assert.equal(firstToken.firstIndex, pending.firstIndex);
  assert.equal(activity.firstIndex, pending.firstIndex);
  assert.equal(isThinkingTurn(pending.message.turnMessages), true);
  assert.equal(isThinkingTurn(firstToken.message.turnMessages), true);
  assert.equal(isThinkingTurn(activity.message.turnMessages), false);
});
