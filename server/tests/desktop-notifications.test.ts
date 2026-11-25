import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentNotificationEvents } from "../src/desktop-notifications.ts";

test("desktop notifications report one successful completion per agent turn", () => {
  const events = new AgentNotificationEvents();
  const completed = { type: "prompt_result", status: "completed", agentInvoked: true };
  events.accept({ type: "agent_start" });
  assert.equal(events.accept({ type: "agent_end", yielded: false }), undefined);
  assert.equal(events.accept({ ...completed, status: "aborted" }), undefined);
  assert.equal(events.accept({ ...completed, status: "error" }), undefined);
  assert.equal(events.accept({ ...completed, agentInvoked: false }), undefined);
  assert.equal(events.accept(completed), "turn-complete");
  assert.equal(events.accept(completed), undefined);
  assert.equal(events.accept({ type: "session_settled" }), undefined);
  events.accept({ type: "agent_start" });
  assert.equal(events.accept(completed), "turn-complete");
});

test("desktop question notifications use native ask dialogs", () => {
  const events = new AgentNotificationEvents();
  assert.equal(events.accept({ type: "extension_ui_request", method: "ask", id: "question-1" }), "question");
  assert.equal(events.accept({ type: "extension_ui_request", method: "ask" }), undefined);
  assert.equal(events.accept({ type: "extension_ui_request", method: "notify", id: "notice-1" }), undefined);
  assert.equal(events.accept({ type: "snapshot" }), undefined);
});
