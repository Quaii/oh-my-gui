export type PlanUsageWindow = {
  label: string;
  remaining: number;
  resetsAt?: number;
  durationMs?: number;
  windowId?: string;
};

export type PlanUsageAccount = {
  provider: string;
  plan?: string;
  fetchedAt?: number;
  windows: PlanUsageWindow[];
};

export type PlanUsageSnapshot = {
  accounts: PlanUsageAccount[];
  unavailable: boolean;
};

export function isFiveHourWindow(window: PlanUsageWindow) {
  if (window.durationMs !== undefined) return window.durationMs === 5 * 60 * 60_000;
  return [window.windowId, window.label].some(value => /^5[\s_-]*(?:h|hr|hrs|hour|hours)$/i.test(value?.trim() ?? ""));
}
