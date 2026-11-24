import { PanelSkeleton } from "@/components/ui/loading-shapes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { useRemote, Notice } from "./ManagementShared";
import { Cpu, GitBranch, Layers, RefreshCw } from "lucide-react";

export function RuntimePanel({ chatKey, children }: { chatKey: string | null; children?: import("react").ReactNode }) {
  const { data, loading, error, refresh } = useRemote(chatKey ? `/api/runtime?key=${encodeURIComponent(chatKey)}` : null);
  const agents = data?.subagents?.subagents ?? (Array.isArray(data?.subagents) ? data.subagents : []);
  return <div className="settings-stack">
    <div className="flex justify-end">
      <Button variant="outline" size="sm" onClick={refresh} disabled={loading}><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />Refresh runtime</Button>
    </div>
    <Notice error={error} />
    <SkeletonReveal loading={loading && !data} skeleton={<PanelSkeleton panel="runtime"/>} label="Inspecting OMP runtime">
      {data && <div className="settings-stack">
        <div className="grid gap-[var(--space-content)] sm:grid-cols-3">{[{ label: "OMP runtime", value: data.version, icon: Cpu }, { label: "Live sessions", value: data.bridges.filter((b: any) => b.alive).length, icon: Layers }, { label: "Parallel task limit", value: data.maxConcurrency ?? "Not reported", icon: GitBranch }].map(s => <div key={s.label} className="settings-card"><s.icon className="mb-4 size-5 text-muted-foreground" /><div className="text-[22px] font-semibold tracking-tight">{s.value}</div><div className="mt-1 text-xs text-muted-foreground">{s.label}</div></div>)}</div>
        <section className="settings-card settings-card-list"><dl>{[["Executable", data.executable], ["Agent directory", data.agentDir], ["Configuration", data.configPath], ["Platform", data.platform], ["Node.js", data.nodeVersion], ["Available settings", data.settingCount], ["Subagents in this session", agents.length], ["Subagent nesting limit", data.maxRecursionDepth], ["Task timeout", data.maxTaskRuntimeMs ? `${data.maxTaskRuntimeMs / 1000} seconds` : "No configured limit"], ["Session messages", data.state?.messageCount ?? "Not reported"], ["Queued messages", data.state?.queuedMessageCount ?? "Not reported"]].map(([label, value]) => <div className="setting-row" key={label}><dt className="text-[13px] text-muted-foreground">{label}</dt><dd className="break-all text-[13px]">{String(value ?? "Not reported")}</dd></div>)}</dl></section>
        <Notice text="The parallel task limit is an OMP setting, not a provider quota. Queued messages and task activity are reported by the selected live session." />
      </div>}
    </SkeletonReveal>
    {children}
  </div>;
}
