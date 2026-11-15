import { PanelSkeleton } from "@/components/ui/loading-shapes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";
import { ProviderIcon } from "../ProviderIcon";
import { useRemote, Notice } from "./ManagementShared";
import { Cpu, GitBranch, Layers, RefreshCw } from "lucide-react";

export function RuntimePanel({ chatKey }: { chatKey: string | null }) {
  const { data, loading, error, refresh } = useRemote(chatKey ? `/api/runtime?key=${encodeURIComponent(chatKey)}` : null);
  const agents = data?.subagents?.subagents ?? (Array.isArray(data?.subagents) ? data.subagents : []);
  return <div>
    <div className="mb-5 flex justify-end"><Button variant="outline" size="sm" onClick={refresh} disabled={loading}><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />Refresh runtime</Button></div>
    <Notice error={error} />
    <SkeletonReveal loading={loading && !data} skeleton={<PanelSkeleton panel="runtime"/>} label="Inspecting OMP runtime">
      {data && <div className="space-y-7">
        <div className="grid gap-3 sm:grid-cols-3">{[{ label: "OMP runtime", value: data.version, icon: Cpu }, { label: "Live sessions", value: data.bridges.filter((b: any) => b.alive).length, icon: Layers }, { label: "Parallel task limit", value: data.maxConcurrency ?? "Not reported", icon: GitBranch }].map(s => <div key={s.label} className="rounded-xl border border-border bg-card/50 p-5"><s.icon className="mb-4 size-5 text-muted-foreground" /><div className="text-[22px] font-semibold tracking-tight">{s.value}</div><div className="mt-1 text-xs text-muted-foreground">{s.label}</div></div>)}</div>
        <section className="rounded-xl border border-border bg-card/40 px-5"><dl>{[["Executable", data.executable], ["Agent directory", data.agentDir], ["Configuration", data.configPath], ["Platform", data.platform], ["Node.js", data.nodeVersion], ["Available settings", data.settingCount], ["Subagents in this session", agents.length], ["Subagent nesting limit", data.maxRecursionDepth], ["Task timeout", data.maxTaskRuntimeMs ? `${data.maxTaskRuntimeMs / 1000} seconds` : "No configured limit"], ["Session messages", data.state?.messageCount ?? "Not reported"], ["Queued messages", data.state?.queuedMessageCount ?? "Not reported"]].map(([label, value]) => <div className="setting-row" key={label}><dt className="text-[13px] text-muted-foreground">{label}</dt><dd className="break-all text-[13px]">{String(value ?? "Not reported")}</dd></div>)}</dl></section>
        <section><h2 className="mb-3 text-[15px] font-semibold">Provider logins</h2><p className="mb-4 text-xs text-muted-foreground">Authentication status only. Credentials stay in OMP’s credential store.</p><div className="divide-y divide-border rounded-xl border border-border bg-card/40 px-4">{data.providers.map((p: any) => <div key={p.id} className="flex items-center gap-3 py-4"><ProviderIcon provider={p.id} className="size-6" /><div className="min-w-0 flex-1"><div className="text-[13px] font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.id}</div></div><Badge variant={p.authenticated ? "default" : "secondary"}>{p.authenticated ? "Connected" : "Not signed in"}</Badge></div>)}</div></section>
        <Notice text="The parallel task limit is an OMP setting, not a provider quota. Queued messages and task activity are reported by the selected live session." />
      </div>}
    </SkeletonReveal>
  </div>;
}
