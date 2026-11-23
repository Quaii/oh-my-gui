import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverComposerDraft, moveQueuedDraft, queueOwner, reorderQueuedDrafts } from "../../web/src/lib/composer-queue.ts";
import { chatReducer, initialChat } from "../../web/src/lib/store.ts";

const first = { id: "one", text: "Same text", images: [] };
const second = { id: "two", text: "Same text", images: [{ data: "aW1hZ2U=", mimeType: "image/png", name: "sample" }] };

test("queue reorders by draft ID and preserves duplicate prompts and attachments", () => {
  const items = [first, second];
  assert.deepEqual(moveQueuedDraft(items, second.id, -1), [second, first]);
  assert.equal(moveQueuedDraft(items, first.id, -1), items);
  assert.deepEqual(reorderQueuedDrafts(items, [second.id, first.id]), [second, first]);
  assert.equal(reorderQueuedDrafts(items, [second.id, second.id]), items);
  assert.equal(reorderQueuedDrafts(items, [second.id, "stale"]), items);
  assert.deepEqual(items, [first, second]);
});

test("follow-ups wait for native work and Steer sends exactly one interrupt request with attachments", async () => {
  const requests: Record<string, unknown>[] = [];
  const state = { sessionId: "session-one", isStreaming: true };
  const owner = queueOwner("new-bridge", state)!;
  assert.equal(owner, queueOwner("reopened-bridge", state));
  const options = {
    bridge: "reopened-bridge", owner, draft: second, canSend: () => true,
    call: async (command: Record<string, unknown>) => {
      requests.push(command);
      return { ok: true, data: state };
    },
  };
  assert.equal(await deliverComposerDraft({ ...options, interrupt: false }), "wait");
  assert.deepEqual(requests, [{ type: "get_state" }]);
  assert.equal(await deliverComposerDraft({ ...options, interrupt: true }), "sent");
  assert.deepEqual(requests.slice(1), [
    { type: "get_state" },
    { type: "abort_and_prompt", message: second.text, images: [{ type: "image", data: "aW1hZ2U=", mimeType: "image/png" }] },
  ]);
  assert.equal(await deliverComposerDraft({
    ...options, interrupt: false,
    call: async command => {
      requests.push(command);
      return { ok: true, data: { sessionId: state.sessionId } };
    },
  }), "sent");
  assert.deepEqual(requests.at(-1), { type: "prompt", message: second.text, images: [{ type: "image", data: "aW1hZ2U=", mimeType: "image/png" }] });
});

test("stopping or switching chats during a queue check cannot submit the draft", async () => {
  let allowed = true;
  const options = {
    bridge: "bridge", owner: "session:original", draft: first, interrupt: false,
    canSend: () => allowed,
    call: async (command: Record<string, unknown>) => {
      assert.equal(command.type, "get_state");
      allowed = false;
      return { ok: true, data: { sessionId: "original" } };
    },
  };
  assert.equal(await deliverComposerDraft(options), "wait");
  allowed = true;
  await assert.rejects(
    deliverComposerDraft({ ...options, call: async command => {
      assert.equal(command.type, "get_state");
      return { ok: true, data: { sessionId: "other-chat" } };
    } }),
    /different chat/,
  );
  await assert.rejects(
    deliverComposerDraft({ ...options, call: async command => command.type === "get_state"
      ? { ok: true, data: { sessionId: "original" } }
      : { ok: false, error: "Request held by the provider" } }),
    /Request held by the provider/,
  );
  assert.equal(chatReducer({ ...initialChat, running: true }, { type: "agent_end", yielded: false }).running, true);
});
