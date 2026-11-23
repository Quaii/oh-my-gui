import { useEffect, useState } from "react";
import type { DiscoveredMcpServer, McpDiscovery, McpImportScope } from "../../../../shared/mcp-discovery";
import { Button } from "@/components/ui/button";
import { api } from "../../lib/api";
import { Empty } from "./Controls";

type ImportResult = { imported: string[]; skipped: string[] };

export function McpDiscoveryPanel({
  cwd, scope, dirty, nativeNames, busy, onImport,
}: {
  cwd: string;
  scope: McpImportScope;
  dirty: boolean;
  nativeNames: Set<string>;
  busy: boolean;
  onImport: (ids: string[]) => Promise<ImportResult>;
}) {
  const [data, setData] = useState<McpDiscovery>();
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult>();

  useEffect(() => {
    const request = new AbortController();
    setData(undefined);
    setError("");
    setSelected([]);
    api<McpDiscovery>(`/api/mcp/discover?cwd=${encodeURIComponent(cwd)}`, { signal: request.signal })
      .then(value => { if (!request.signal.aborted) setData(value); })
      .catch(error => { if (!request.signal.aborted) setError(error.message); });
    return () => request.abort();
  }, [cwd, revision]);

  function unavailable(server: DiscoveredMcpServer) {
    if (server.configured) return "Already configured";
    if (nativeNames.has(server.name)) return "Discovered by OMP";
    if (server.blocked) return server.blocked;
    if (scope === "project" && !data?.projectAvailable) return "Open a registered project first";
    if (server.scope !== scope) return `Switch to ${server.scope} scope to import`;
    return undefined;
  }

  const choices = (data?.servers ?? []).filter(row => selected.includes(row.id) && !unavailable(row));
  const names = new Set(choices.map(row => row.name));

  async function importSelected() {
    setError("");
    setResult(undefined);
    try {
      setResult(await onImport(choices.map(row => row.id)));
      setRevision(value => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not import MCP servers.");
    }
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold">Discovered in other apps</h2>
        <p className="mt-1 text-xs text-muted-foreground">Codex, Claude Code, and ZCode. Imports start disabled for review.</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => { setResult(undefined); setRevision(value => value + 1); }} disabled={busy || (!data && !error)}>Refresh</Button>
    </div>
    {!data && !error && <p role="status" className="text-sm text-muted-foreground">Looking for MCP servers…</p>}
    {data?.servers.length === 0 && <Empty>No servers found in the supported apps.</Empty>}
    {!!data?.servers.length && <div className="settings-group-body settings-card settings-card-list">
      {data.servers.map(server => {
        const reason = unavailable(server);
        const checked = choices.some(choice => choice.id === server.id);
        const duplicate = !checked && names.has(server.name);
        return <label key={server.id} className="flex min-w-0 cursor-pointer items-start gap-3 border-b border-border py-3 last:border-0">
          <input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={checked}
            disabled={busy || !!reason || duplicate}
            onChange={event => setSelected(previous => event.target.checked ? [...previous, server.id] : previous.filter(id => id !== server.id))} />
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-medium">{server.name}</span>
            <span className="block text-xs text-muted-foreground" title={server.file}>
              {server.source} · {server.scope === "project" ? "Project" : "User"} · {server.transport.toUpperCase()}
            </span>
            {(reason || duplicate || server.needsSetup) && <span className="block text-xs text-muted-foreground">
              {reason || (duplicate ? "Another entry with this name is selected" : "Needs credentials or additional setup")}
            </span>}
          </span>
        </label>;
      })}
    </div>}
    {!!data?.unreadable.length && <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">Could not read {data.unreadable.length} configuration {data.unreadable.length === 1 ? "file" : "files"}</summary>
      <ul className="mt-2 space-y-1 break-all">{data.unreadable.map(file => <li key={file}>{file}</li>)}</ul>
    </details>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {result && <p role="status" className="text-sm text-muted-foreground">
      {result.imported.length ? `Imported ${result.imported.length} as disabled.` : "No new servers imported."}
      {!!result.skipped.length && ` Skipped existing names: ${result.skipped.join(", ")}.`}
    </p>}
    {!!data?.servers.length && <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" onClick={() => void importSelected()} disabled={busy || dirty || !choices.length}>
        {choices.length ? `Import ${choices.length} into ${scope === "user" ? "User" : "Project"}` : "Import selected"}
      </Button>
      {dirty && <span className="text-xs text-muted-foreground">Save your changes before importing.</span>}
    </div>}
  </div>;
}
