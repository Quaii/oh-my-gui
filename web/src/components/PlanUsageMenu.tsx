import { useEffect, useState } from "react";
import { isFiveHourWindow, type PlanUsageSnapshot } from "../../../shared/plan-usage";
import { api } from "../lib/api";
import { ChartNoAxesCombined } from "./NavigationIcons";
import { ProviderIcon } from "./ProviderIcon";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const providerNames: Record<string, string> = {
  "openai-codex": "ChatGPT (Codex)",
  "openai-codex-device": "ChatGPT (Codex)",
  anthropic: "Claude",
};
const percentage = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 });
const resetTime = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });

export function PlanUsageMenu({ provider, connected, chatKey }: { provider?: string; connected?: boolean; chatKey?: string }) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<PlanUsageSnapshot>();

  useEffect(() => {
    if (!connected && !open) return;
    const lifetime = new AbortController();
    const endpoint = chatKey ? `/api/plan-usage?${new URLSearchParams({ key: chatKey })}` : "/api/plan-usage";
    const refresh = async () => {
      try {
        const next = await api<PlanUsageSnapshot>(endpoint, {
          signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(30_000)]),
        });
        if (!lifetime.signal.aborted) setSnapshot(next);
      } catch {
        if (!lifetime.signal.aborted) {
          setSnapshot(previous => ({ accounts: previous?.accounts ?? [], unavailable: true }));
        }
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5 * 60_000);
    return () => {
      lifetime.abort();
      window.clearInterval(timer);
    };
  }, [connected, open, chatKey]);

  const currentAccounts = snapshot?.accounts.filter(account => account.provider === provider) ?? [];
  const fiveHourWindows = currentAccounts.length === 1 && !snapshot?.unavailable
    ? currentAccounts[0].windows.filter(isFiveHourWindow)
    : [];
  const summary = fiveHourWindows.length
    ? percentage.format(Math.min(...fiveHourWindows.map(window => window.remaining)) / 100)
    : undefined;
  const accountCounts = new Map<string, number>();
  for (const account of snapshot?.accounts ?? []) {
    accountCounts.set(account.provider, (accountCounts.get(account.provider) ?? 0) + 1);
  }
  const accountOrdinals = new Map<string, number>();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label={summary ? `Plan usage, ${summary} left in the five-hour window` : "Plan usage"}
              className="floating-toolbar-button h-9 min-w-9 shrink-0 gap-1.5 px-2.5 text-xs text-muted-foreground"
            >
              <ChartNoAxesCombined className="size-4" />
              {summary && <span className="hidden tabular-nums sm:inline">5h · {summary}</span>}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>Plan usage</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        sideOffset={8}
        aria-label="Plan usage"
        className="w-80 overflow-y-auto max-h-[min(460px,var(--radix-popover-content-available-height))]"
      >
        <h2 className="text-sm font-semibold">Plan usage</h2>
        {!snapshot && <p role="status" className="mt-3 text-xs text-muted-foreground">Checking provider limits…</p>}
        {snapshot?.unavailable && (
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            {snapshot.accounts.some(account => account.windows.length) ? "Could not refresh. Showing the last reading." : "Could not read plan usage from OMP."}
          </p>
        )}
        {snapshot && !snapshot.unavailable && !snapshot.accounts.length && (
          <p className="mt-3 text-xs text-muted-foreground">No connected accounts found.</p>
        )}
        {snapshot?.accounts.map(account => {
          const ordinal = (accountOrdinals.get(account.provider) ?? 0) + 1;
          accountOrdinals.set(account.provider, ordinal);
          const multiple = (accountCounts.get(account.provider) ?? 0) > 1;
          return (
            <section key={`${account.provider}:${ordinal}`} className="mt-3 space-y-2 border-t pt-3">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <ProviderIcon provider={account.provider} />
                <span className="min-w-0 wrap-anywhere">{providerNames[account.provider] ?? account.provider}{multiple ? ` · Account ${ordinal}` : ""}</span>
                {account.plan && <span className="ml-auto text-xs capitalize text-muted-foreground">{account.plan}</span>}
              </h3>
              {!account.windows.length && <p className="text-xs text-muted-foreground">No limits reported.</p>}
              {[...account.windows].sort((a, b) => Number(isFiveHourWindow(b)) - Number(isFiveHourWindow(a))).map((window, i) => {
                const remaining = percentage.format(window.remaining / 100);
                return (
                  <div key={i} className="space-y-1 text-xs">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 wrap-anywhere">{window.label}</span>
                      <span className="shrink-0 tabular-nums">{remaining} left</span>
                    </div>
                    <div role="meter" aria-label={window.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={window.remaining}
                      aria-valuetext={`${remaining} left`} className="h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${window.remaining}%` }} />
                    </div>
                    {window.resetsAt !== undefined && (
                      <p className="text-[11px] text-muted-foreground">
                        {window.resetsAt > Date.now() ? "Resets" : "Last reported reset"} {resetTime.format(window.resetsAt)}
                      </p>
                    )}
                  </div>
                );
              })}
              {account.fetchedAt !== undefined && (
                <p className="text-[11px] text-muted-foreground">Checked {resetTime.format(account.fetchedAt)}</p>
              )}
            </section>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
