import { test } from "node:test";
import assert from "node:assert/strict";
import { compareUsagePricing } from "../src/usage-pricing.ts";

test("pricing checks preserve zero rates, cache categories and provider identity", () => {
  const [codex, free, incomplete, unmatched] = compareUsagePricing([
    { provider: "openai-codex", model: "gpt-test", totalCost: 8, totalInputTokens: 1e6, totalOutputTokens: 1e6, totalCacheReadTokens: 1e6, totalCacheWriteTokens: 1e6 },
    { provider: "custom", model: "lab/demo:free", totalOutputTokens: 1e6 },
    { provider: "openai", model: "gpt-test", totalCacheWriteTokens: 1e6 },
    { provider: "custom", model: "gpt-test", totalInputTokens: 1e6 },
  ], { openai: { models: { "gpt-test": { cost: { input: 1, output: 4, cache_read: 0.5 } } } } }, { data: [
    { id: "openai/gpt-test", pricing: { prompt: "0.000002", completion: "0.000006", input_cache_read: "0.000001", input_cache_write: "0.000003" } },
    { id: "lab/demo:free", pricing: { prompt: "0", completion: "0" } },
    { id: "lab/demo", pricing: { prompt: "0.000002", completion: "0.000006" } },
  ] });
  assert.equal(codex.reference, 12);
  assert.equal(codex.recorded, 8);
  assert.equal(codex.source, "OpenRouter");
  assert.equal(free.reference, 0);
  assert.equal(incomplete.reference, 3);
  assert.equal(unmatched.reference, null);
  const [direct] = compareUsagePricing(
    [{ provider: "openai", model: "gpt-test", totalInputTokens: 1e6, totalCacheReadTokens: 1e6 }],
    { openai: { models: { "gpt-test": { cost: { input: 1, output: 4, cache_read: 0.5 } } } } },
  );
  assert.equal(direct.reference, 1.5);
  assert.equal(direct.source, "Models.dev");
  assert.equal(compareUsagePricing([{ provider: "openai", model: "gpt-test", totalCacheWriteTokens: 1e6 }],
    { openai: { models: { "gpt-test": { cost: { input: 1, output: 4 } } } } })[0].reference, null);
});
