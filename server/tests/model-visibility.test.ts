import { test } from "node:test";
import assert from "node:assert/strict";
import { chatModelKey, visibleChatModels } from "../../web/src/lib/model-visibility.ts";

test("model visibility filters only the selected provider and model ID", () => {
  const first = { provider: "first", id: "family/model" };
  const second = { provider: "second", id: "family/model" };
  const models = [first, second];
  assert.deepEqual(visibleChatModels(models, [chatModelKey(first)]), [second]);
  assert.deepEqual(visibleChatModels(models, [chatModelKey(first), chatModelKey(second)]), []);
  assert.deepEqual(visibleChatModels(models, []), models);
});
