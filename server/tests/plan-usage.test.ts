import assert from "node:assert/strict";
import { test } from "node:test";
import { includeConnectedPlanAccounts, listConnectedPlanAccounts, normalizePlanUsage } from "../src/plan-usage.ts";
import { isFiveHourWindow } from "../../shared/plan-usage.ts";

test("plan usage exposes quota windows and keeps native identity and raw fields private", () => {
  const fetchedAt = 1_800_000_000_000;
  const resetsAt = fetchedAt + 3600_000;
  const result = normalizePlanUsage({
    reports: [{
      provider: "openai-codex",
      fetchedAt,
      metadata: { planType: "plus", email: "private@example.test" },
      raw: { credential: "never sent" },
      limits: [
        { label: "Rolling limit", window: { id: "5h", durationMs: 18_000_000, resetsAt }, amount: { usedFraction: 0.75, used: 30, limit: 100 }, scope: { accountId: "private" } },
        { label: "Weekly", amount: { used: 0, limit: 40 } },
        { label: "Unknown", amount: { unit: "percent" } },
      ],
    }],
    accountsWithoutUsage: [{ provider: "anthropic", email: "private@example.test" }],
  });
  assert.deepEqual(result, [{
    provider: "openai-codex",
    plan: "plus",
    fetchedAt,
    windows: [
      { label: "Rolling limit", remaining: 25, resetsAt, durationMs: 18_000_000, windowId: "5h" },
      { label: "Weekly", remaining: 100, resetsAt: undefined, durationMs: undefined, windowId: undefined },
    ],
  }, { provider: "anthropic", windows: [] }]);
  assert.deepEqual(result[0].windows.filter(isFiveHourWindow).map(window => window.remaining), [25]);
});

test("plan usage accepts older reports and clamps quota overage", () => {
  const [report] = normalizePlanUsage([{
    provider: "anthropic",
    limits: [
      { window: { label: "Weekly" }, amount: { used: 110, unit: "percent" } },
      { label: "5 hour", amount: { remainingFraction: 0.5 } },
      { label: "Unavailable", amount: { usedFraction: NaN } },
    ],
  }]);
  assert.deepEqual(report.windows.map(({ label, remaining }) => [label, remaining]), [
    ["Weekly", 0],
    ["5 hour", 50],
  ]);
  assert.deepEqual(report.windows.filter(isFiveHourWindow).map(window => window.remaining), [50]);
  assert.deepEqual(normalizePlanUsage({ reports: [] }), []);
  assert.throws(() => normalizePlanUsage({ reports: null }), /Unrecognized/);
});

test("connected account inventory adds missing entries without exposing identities or duplicating reported accounts", async () => {
  const inventory = await listConnectedPlanAccounts({
    async send(command) {
      if (command.type === "get_login_providers") {
        return { providers: [
          { id: "openai-codex", authenticated: true },
          { id: "anthropic", authenticated: true },
          { id: "google", authenticated: false },
        ] };
      }
      return { accounts: command.providerId === "anthropic"
        ? [{ label: "Private", active: true }, { label: "Also private", active: false }]
        : [{ label: "Private" }] };
    },
  });
  const existing = { provider: "openai-codex", windows: [{ label: "5 hour", remaining: 50 }] };
  assert.deepEqual(includeConnectedPlanAccounts({ accounts: [existing], unavailable: false }, inventory), {
    accounts: [existing, { provider: "anthropic", windows: [] }, { provider: "anthropic", windows: [] }],
    unavailable: false,
  });
});
