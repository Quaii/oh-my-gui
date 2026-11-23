import { PanelSkeleton } from "@/components/ui/loading-shapes";
import { useState } from "react";
import { post } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";
import { useRemote, Notice } from "./ManagementShared";
import { Download, RefreshCw } from "lucide-react";

export default function ExtensionsPanel({ cwd, onRestart }: { cwd: string; onRestart: () => void }) {
  const { data, loading, error, refresh } = useRemote("/api/plugins");
  const [q, setQ] = useState(""); const [source, setSource] = useState(""); const [output, setOutput] = useState(""); const [busy, setBusy] = useState(false); const [failure, setFailure] = useState("");
  const [catalog, setCatalog] = useState<any>(null); const [pending, setPending] = useState<{ action: string; target: string } | null>(null);
  const installed = Object.entries(data?.plugins ?? {}).flatMap(([group, entries]) => Array.isArray(entries) ? entries.map(p => ({ ...(typeof p === "string" ? { name: p } : p), group })) : []);
  async function action(kind: string, target = "") {
    setBusy(true); setFailure("");
    try {
      const result = await post("/api/plugins/action", { action: kind, target, cwd });
      setOutput(result.output || "Completed.");
      if (kind === "discover") setCatalog(result.data);
      else refresh();
    } catch (e: any) { setFailure(e.message); } finally { setBusy(false); setPending(null); }
  }
  return <div><Notice error={error || failure} /><SkeletonReveal loading={loading && !data} skeleton={<PanelSkeleton panel="extensions"/>} label="Loading installed extensions"><div className="settings-stack">
    <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => action("discover")} disabled={busy}>Browse marketplaces</Button><Button variant="outline" size="sm" onClick={() => action("marketplace-list")} disabled={busy}>Marketplace sources</Button><Button variant="outline" size="sm" onClick={() => action("doctor")} disabled={busy}>Check installation</Button><Button variant="outline" size="sm" onClick={onRestart}><RefreshCw className="size-3.5" />Reload in current session</Button></div>
    <div className="settings-card"><h2 className="mb-2 text-sm font-semibold">Install an extension</h2><p className="mb-4 text-xs leading-relaxed text-muted-foreground">Enter a package, repository, or marketplace ID. Reload the session to use its commands and tools.</p><div className="flex flex-wrap gap-2"><Input aria-label="Extension package source" placeholder="Package or repository source" value={source} onChange={e => setSource(e.target.value)} className="min-w-0 flex-1" /><Button onClick={() => setPending({ action: "install", target: source })} disabled={!source.trim() || busy}><Download className="size-4" />Install</Button></div><details className="mt-4 text-xs text-muted-foreground"><summary className="cursor-pointer">Add a marketplace</summary><div className="mt-3 flex gap-2"><Input aria-label="Marketplace source" placeholder="Marketplace repository URL" value={source} onChange={e => setSource(e.target.value)} /><Button variant="outline" onClick={() => setPending({ action: "marketplace-add", target: source })} disabled={!source.trim() || busy}>Add source</Button></div></details></div>
    <Input aria-label="Filter installed extensions" placeholder="Filter extensions…" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
    <div className="settings-card-stack empty:hidden">{installed.filter(p => JSON.stringify(p).toLowerCase().includes(q.toLowerCase())).map((p, i) => { const id = p.name || p.id || p.package || p.source || String(i); return <div key={id} className="flex flex-wrap items-center gap-3 settings-card"><div className="min-w-0 flex-1"><h3 className="setting-label truncate">{id}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{p.description || p.source || p.path || p.group}</p></div><Badge variant="secondary">{p.enabled === false ? "Disabled" : "Installed"}</Badge><Button variant="ghost" size="sm" onClick={() => action(p.enabled === false ? "enable" : "disable", id)} disabled={busy}>{p.enabled === false ? "Enable" : "Disable"}</Button><Button variant="ghost" size="sm" onClick={() => setPending({ action: "uninstall", target: id })} disabled={busy}>Remove</Button></div>; })}</div>
    {!installed.length && !loading && <p className="py-6 text-sm text-muted-foreground">No extensions installed. Add a package or configure a marketplace above.</p>}
    {catalog && <div><h2 className="mb-3 text-sm font-semibold">Marketplace results</h2><pre className="max-h-96 overflow-auto settings-card text-xs">{JSON.stringify(catalog, null, 2)}</pre></div>}
    {output && <div><p className="mb-2 text-xs text-muted-foreground">{busy ? "Working…" : "OMP result"}</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap settings-card text-xs leading-relaxed">{output}</pre></div>}
    <p className="text-xs leading-relaxed text-muted-foreground">Extension commands, tools, status messages, questions, and text output are supported. Custom terminal-rendered widgets need a web renderer; they are not silently treated as browser components.</p>
  </div></SkeletonReveal><Dialog open={!!pending} onOpenChange={v => !v && !busy && setPending(null)}><DialogContent><DialogHeader><DialogTitle>{pending?.action === "uninstall" ? "Remove extension?" : "Add this extension source?"}</DialogTitle><DialogDescription>{pending?.target}</DialogDescription></DialogHeader><p className="text-sm leading-relaxed text-muted-foreground">Extensions run code with OMP’s access to this machine. Install sources you trust.</p><DialogFooter><Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>Cancel</Button><Button onClick={() => pending && action(pending.action, pending.target)} disabled={busy}>{busy ? "Working…" : "Confirm"}</Button></DialogFooter></DialogContent></Dialog></div>;
}
