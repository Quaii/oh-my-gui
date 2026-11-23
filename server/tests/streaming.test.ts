import assert from 'node:assert/strict';import {test}from'node:test';import{coalesceAssistantBlocks,isThinkingTurn}from'../../web/src/lib/transcript.ts';
test('streaming thinking is one disclosure until a tool or reply boundary, without mutating native history',()=>{const blocks=[{type:'thinking',thinking:'First'},{type:'thinking',thinking:'Second'},{type:'toolCall',id:'one'},{type:'thinking',thinking:'Third'},{type:'text',text:'Hello '},{type:'text',text:'world'}];const grouped=coalesceAssistantBlocks(blocks);assert.equal(grouped.length,4);assert.equal(grouped[0].thinking,'First\n\nSecond');assert.equal(grouped[3].text,'Hello world');assert.equal(blocks[0].thinking,'First');});
test("the inline status advances after visible text or a tool call", () => {
  const thinking = { role: "assistant", content: [{ type: "thinking", thinking: "Plan" }] };
  assert.equal(isThinkingTurn([thinking]), true);
  assert.equal(isThinkingTurn([thinking, { role: "assistant", content: "Reply" }]), false);
  assert.equal(isThinkingTurn([{ role: "assistant", content: [{ type: "toolCall", name: "bash" }] }, thinking]), false);
});
