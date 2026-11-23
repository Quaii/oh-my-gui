import { PanelSkeleton } from "@/components/ui/loading-shapes";
import { SettingsHeading } from "./SettingsHeading";
import { useState } from "react";
import { post } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { useRemote, Notice } from "./ManagementShared";

const suggestedCatalogs = [
  { id: "claude-plugins-official", name: "Claude Plugins", repo: "anthropics/claude-plugins-official" },
  { id: "anthropic-agent-skills", name: "Anthropic Agent Skills", repo: "anthropics/skills" },
  { id: "compound-engineering-plugin", name: "Compound Engineering", repo: "EveryInc/compound-engineering-plugin" },
];

type Marketplace = { name: string; source: string };
type CatalogPlugin = { id: string; name: string; version?: string; description: string };
type Pending = { action: "install" | "install-from-marketplace" | "uninstall" | "marketplace-add" | "marketplace-remove"; target: string };
type Scope = "user" | "project";

export default function ExtensionsPanel({ cwd, projectPath, onRestart }: { cwd: string; projectPath?: string; onRestart: () => void }) {
  const installedList = useRemote(`/api/plugins?cwd=${encodeURIComponent(cwd)}`);
  const registry = useRemote<{ sources: Marketplace[] }>("/api/plugins/marketplaces");
  const [marketplace, setMarketplace] = useState("");
  const active = registry.data?.sources.find(item => item.name === marketplace) ?? registry.data?.sources[0];
  const catalog = useRemote<{ plugins: CatalogPlugin[] }>(
    active ? `/api/plugins/marketplaces?catalog=${encodeURIComponent(active.name)}` : null,
  );
  const [filter, setFilter] = useState("");
  const [catalogSource, setCatalogSource] = useState("");
  const [packageSource, setPackageSource] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [scope, setScope] = useState<Scope>("user");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [diagnostics, setDiagnostics] = useState("");
  const installed = Object.entries(installedList.data?.plugins ?? {}).flatMap(([group, entries]) =>
    Array.isArray(entries) ? entries.map(item => ({ ...(typeof item === "string" ? { name: item } : item), group })) : [],
  );
  const plugins = catalog.data?.plugins.filter(plugin => plugin.id.endsWith(`@${active?.name}`)) ?? [];
  const query = filter.trim().toLowerCase();
  const shownPlugins = plugins.filter(plugin => `${plugin.name} ${plugin.description}`.toLowerCase().includes(query));

  function confirm(action: Pending["action"], target: string, initialScope: Scope = "user") {
    setScope(initialScope);
    setFailure("");
    setPending({ action, target: target.trim() });
  }

  async function run(action: string, target = "", scope: Scope = "user") {
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      const result = await post("/api/plugins/action", { action, target, scope, cwd: scope === "project" ? projectPath : cwd });
      if (action === "doctor") setDiagnostics(result.output || "");
      else if (action.startsWith("marketplace-")) {
        registry.refresh();
        catalog.refresh();
        if (action === "marketplace-add") {
          const suggested = suggestedCatalogs.find(item => item.repo === target);
          if (suggested) {
            setMarketplace(suggested.id);
            setFilter("");
          }
          setCatalogSource("");
        }
        setNotice(action === "marketplace-add" ? "Marketplace added." : action === "marketplace-remove" ? "Marketplace removed." : "Marketplace refreshed.");
      } else {
        installedList.refresh();
        if (action === "install") setPackageSource("");
        setNotice("Extensions updated. Reload the session to apply the change.");
      }
      setPending(null);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "OMP could not complete the action.");
    } finally {
      setBusy(false);
    }
  }

  const isInstall = pending?.action === "install" || pending?.action === "install-from-marketplace";
  const title = isInstall ? "Install plugin?"
    : pending?.action === "marketplace-add" ? "Add marketplace?"
    : pending?.action === "marketplace-remove" ? "Remove marketplace?" : "Remove extension?";

  return <div className="settings-stack">
    <Notice error={pending ? undefined : failure} text={notice} />
    <section className="settings-card settings-card-stack">
      <SettingsHeading title="Marketplace" description="Add a catalog from a publisher you trust, then browse its plugins." />
      <Notice error={registry.error} />
      {registry.loading && <p role="status" className="text-xs text-muted-foreground">Loading marketplaces…</p>}
      {registry.data && <div className="divide-y divide-border">
        {suggestedCatalogs.filter(item => !registry.data?.sources.some(source => source.name === item.id || source.source.replace(/\.git$/, "").endsWith(item.repo))).map(item =>
          <div key={item.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.name}</p>
              <a className="block truncate text-xs text-muted-foreground hover:underline" href={`https://github.com/${item.repo}`} target="_blank" rel="noreferrer">{item.repo}</a>
            </div>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => confirm("marketplace-add", item.repo)}>Add catalog</Button>
          </div>,
        )}
      </div>}
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Marketplace source" placeholder="owner/repo, URL, or local path" value={catalogSource} onChange={e => setCatalogSource(e.target.value)} className="min-w-0 flex-1" />
        <Button variant="outline" disabled={busy || !catalogSource.trim()} onClick={() => confirm("marketplace-add", catalogSource)}>Add source</Button>
      </div>
      {!!registry.data?.sources.length && <details>
        <summary className="cursor-pointer text-sm font-medium">Manage catalogs</summary>
        <div className="mt-2 divide-y divide-border">
          {registry.data.sources.map(item => <div key={item.name} className="flex flex-wrap items-center gap-2 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground" title={item.source}>{item.source}</p>
            </div>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("marketplace-update", item.name)}>Refresh</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm("marketplace-remove", item.name)}>Remove</Button>
          </div>)}
        </div>
      </details>}
    </section>
    {active && <section className="settings-card settings-card-stack">
      <SettingsHeading title="Browse plugins" />
      <div className="flex flex-wrap gap-2" aria-label="Configured catalogs">
        {registry.data?.sources.map(item => <Button key={item.name} size="sm" variant={active.name === item.name ? "secondary" : "outline"} aria-pressed={active.name === item.name} onClick={() => { setMarketplace(item.name); setFilter(""); }}>{item.name}</Button>)}
      </div>
      <Notice error={catalog.error} />
      {catalog.loading && <p role="status" className="text-xs text-muted-foreground">Loading plugins…</p>}
      {plugins.length > 0 && <Input aria-label="Filter marketplace plugins" placeholder="Filter plugins…" value={filter} onChange={event => setFilter(event.target.value)} />}
      {catalog.data && <div className="divide-y divide-border">
        {shownPlugins.map(plugin => <div key={plugin.id} className="settings-card-row py-3">
          <div className="min-w-0">
            <h3 className="break-all text-sm font-medium">{plugin.name}{plugin.version && <span className="ml-2 text-xs font-normal text-muted-foreground">{plugin.version}</span>}</h3>
            {plugin.description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{plugin.description}</p>}
          </div>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => confirm("install-from-marketplace", plugin.id, projectPath ? "project" : "user")}>Install</Button>
        </div>)}
        {!shownPlugins.length && <p className="text-xs text-muted-foreground">{query ? "No matching plugins." : "This catalog has no plugins available."}</p>}
      </div>}
    </section>}
    <section className="settings-card settings-card-stack">
      <SettingsHeading title="Installed extensions" action={<Button variant="outline" size="sm" onClick={onRestart}>Reload session</Button>} />
      <Notice error={installedList.error} />
      <SkeletonReveal loading={installedList.loading} skeleton={<PanelSkeleton panel="extensions" />} label="Loading installed extensions">
        <div className="divide-y divide-border">
          {installed.map((item, index) => {
            const id = item.id || item.name || item.package || item.source;
            if (!id) return null;
            const itemScope = item.scope === "project" || item.group === "project" ? "project" : "user";
            return <div key={`${id}-${itemScope}-${index}`} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <h3 className="break-all text-sm font-medium">{id}</h3>
                <p className="text-xs text-muted-foreground">{item.description || item.group}</p>
              </div>
              <Badge variant="secondary">{item.enabled === false ? "Disabled" : "Installed"}</Badge>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(item.enabled === false ? "enable" : "disable", id, itemScope)}>{item.enabled === false ? "Enable" : "Disable"}</Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => confirm("uninstall", id, itemScope)}>Remove</Button>
            </div>;
          })}
          {!installed.length && <p className="text-xs text-muted-foreground">No extensions installed.</p>}
        </div>
      </SkeletonReveal>
      <details>
        <summary className="cursor-pointer text-sm font-medium">Install from a source</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input aria-label="Extension package source" placeholder="Package or repository" value={packageSource} onChange={event => setPackageSource(event.target.value)} className="min-w-0 flex-1" />
          <Button disabled={busy || !packageSource.trim()} onClick={() => confirm("install", packageSource)}>Install</Button>
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-medium">Diagnostics</summary>
        <Button className="mt-3" variant="outline" size="sm" disabled={busy} onClick={() => run("doctor")}>Check installation</Button>
        {diagnostics && <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{diagnostics}</pre>}
      </details>
    </section>
    <Dialog open={!!pending} onOpenChange={open => { if (!open && !busy) { setPending(null); setFailure(""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription className="break-all">{pending?.target}</DialogDescription></DialogHeader>
        <Notice error={failure} />
        {isInstall && <p className="text-xs text-muted-foreground">Plugin code runs with OMP’s access to this device.</p>}
        {pending?.action === "install-from-marketplace" && projectPath && <fieldset className="space-y-2 text-sm">
          <legend className="mb-2 text-xs text-muted-foreground">Install scope</legend>
          <label className="flex items-center gap-2"><input type="radio" name="plugin-scope" checked={scope === "project"} onChange={() => setScope("project")} />This project</label>
          <label className="flex items-center gap-2"><input type="radio" name="plugin-scope" checked={scope === "user"} onChange={() => setScope("user")} />All projects</label>
        </fieldset>}
        {pending?.action === "marketplace-add" && <p className="text-xs text-muted-foreground">Adding the catalog makes its plugins available to browse. Each installation requires a separate action.</p>}
        {pending?.action === "marketplace-remove" && <p className="text-xs text-muted-foreground">Plugins already installed from this catalog stay installed.</p>}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => { setPending(null); setFailure(""); }}>Cancel</Button>
          <Button disabled={busy} onClick={() => pending && run(pending.action, pending.target, scope)}>{busy ? "Working…" : isInstall ? "Install" : pending?.action === "marketplace-add" ? "Add catalog" : "Remove"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
