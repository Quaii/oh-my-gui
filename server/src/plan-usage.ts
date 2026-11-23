import type { PlanUsageAccount, PlanUsageSnapshot, PlanUsageWindow } from "../../shared/plan-usage.ts";
import { ompJson } from "./runtime.ts";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const text = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 100) : undefined;
const timestamp = (value: unknown) => {
  const epoch = number(value);
  return epoch !== undefined && epoch > 0 && epoch <= 8.64e15 ? epoch : undefined;
};
const providerId = (value: unknown) => {
  const id = text(value);
  return id && /^[a-z0-9][a-z0-9._-]*$/i.test(id) ? id.toLowerCase() : undefined;
};

function usageWindow(input: unknown): PlanUsageWindow | undefined {
  const limit = record(input);
  const window = record(limit.window);
  const amount = record(limit.amount);
  const used = number(amount.used);
  const total = number(amount.limit);
  const remaining = number(amount.remainingFraction);
  const usedFraction = number(amount.usedFraction)
    ?? (used !== undefined && total !== undefined && total > 0 ? used / total : undefined)
    ?? (used !== undefined && amount.unit === "percent" ? used / 100 : undefined)
    ?? (remaining !== undefined ? 1 - remaining : undefined);
  if (usedFraction === undefined) return;
  return {
    label: text(limit.label) || text(window.label) || "Usage limit",
    remaining: Math.max(0, Math.min(100, (1 - usedFraction) * 100)),
    resetsAt: timestamp(window.resetsAt),
    durationMs: number(window.durationMs),
    windowId: text(window.id) || text(record(limit.scope).windowId),
  };
}

/** Only typed display fields cross the API boundary, even on older OMP builds. */
export function normalizePlanUsage(input: unknown): PlanUsageAccount[] {
  const reports = Array.isArray(input) ? input : record(input).reports;
  if (!Array.isArray(reports)) throw Error("Unrecognized OMP usage report.");
  const accounts: PlanUsageAccount[] = [];
  for (const inputReport of reports) {
    const report = record(inputReport);
    const provider = providerId(report.provider);
    if (!provider || !Array.isArray(report.limits)) continue;
    const windows = report.limits.map(usageWindow).filter((entry): entry is PlanUsageWindow => !!entry);
    const plan = text(record(report.metadata).planType);
    accounts.push({
      provider,
      plan: plan && /^[a-z0-9][a-z0-9 _-]{0,39}$/i.test(plan) ? plan : undefined,
      fetchedAt: timestamp(report.fetchedAt),
      windows,
    });
  }
  const unreported = record(input).accountsWithoutUsage;
  if (Array.isArray(unreported)) {
    for (const row of unreported) {
      const provider = providerId(record(row).provider);
      if (provider) accounts.push({ provider, windows: [] });
    }
  }
  return accounts;
}

type AccountReader = {
  send: (command: Record<string, unknown>, timeout: number) => Promise<unknown>;
};

export async function listConnectedPlanAccounts(reader: AccountReader) {
  const result = record(await reader.send({ type: "get_login_providers" }, 3000).catch(() => undefined));
  if (!Array.isArray(result.providers)) return [];
  const providers = new Set<string>();
  for (const row of result.providers) {
    const { id, authenticated } = record(row);
    const provider = providerId(id);
    if (authenticated === true && provider) providers.add(provider);
  }
  return Promise.all([...providers].map(async provider => {
    const result = record(await reader.send({ type: "get_logout_accounts", providerId: provider }, 3000).catch(() => undefined));
    return { provider, count: Array.isArray(result.accounts) ? Math.max(1, result.accounts.length) : 1 };
  }));
}

export function includeConnectedPlanAccounts(
  snapshot: PlanUsageSnapshot,
  inventory: { provider: string; count: number }[],
): PlanUsageSnapshot {
  const accounts = [...snapshot.accounts];
  for (const { provider, count } of inventory) {
    const reported = accounts.filter(account => account.provider === provider).length;
    for (let i = reported; i < count; i++) accounts.push({ provider, windows: [] });
  }
  return { ...snapshot, accounts };
}

type Cache = {
  accounts: PlanUsageAccount[];
  retryAt: number;
  retryDelay: number;
  unavailable: boolean;
  pending?: Promise<PlanUsageSnapshot>;
};
const refreshInterval = 5 * 60_000;
const successTtl = 4 * 60_000;
const emptyCache = (): Cache => ({ accounts: [], retryAt: 0, retryDelay: refreshInterval, unavailable: false });
let cache = emptyCache();

export function invalidatePlanUsage() {
  cache = emptyCache();
}

export function planUsage(): Promise<PlanUsageSnapshot> {
  const current = cache;
  const snapshot = () => ({ accounts: current.accounts, unavailable: current.unavailable });
  if (current.pending) return current.pending;
  if (Date.now() < current.retryAt) return Promise.resolve(snapshot());
  current.pending = (async () => {
    try {
      const report: unknown = await ompJson(["usage", "--json", "--redact", "--no-extensions"], 25_000);
      current.accounts = normalizePlanUsage(report);
      current.unavailable = false;
      current.retryDelay = refreshInterval;
      current.retryAt = Date.now() + successTtl;
    } catch {
      current.unavailable = true;
      current.retryAt = Date.now() + current.retryDelay;
      current.retryDelay = Math.min(current.retryDelay * 2, 60 * 60_000);
    } finally {
      current.pending = undefined;
    }
    return snapshot();
  })();
  return current.pending;
}
