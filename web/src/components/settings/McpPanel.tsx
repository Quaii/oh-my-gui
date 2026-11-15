import { ListSkeleton } from "@/components/ui/loading-shapes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { get, put, post } from "../../lib/api";
import { Btn, Empty, Group, Toggle } from "./Controls";
import { X } from "lucide-react";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";

type ServerCfg = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
  enabled?: boolean;
  exposure?: string;
  description?: string;
};

interface ScopePayload {
  scope: "user" | "project";
  path: string;
  exists: boolean;
  servers: Record<string, ServerCfg>;
  error?: string;
  extra?: { path: string; servers: Record<string, ServerCfg>; error?: string }[];
}

interface ProbeResult {
  ok: boolean;
  tools?: { name: string; description?: string }[];
  resources?: number;
  serverInfo?: any;
  protocolVersion?: string;
  error?: string;
  ms: number;
}

export function McpPanel({ cwd, onRestart }: { cwd: string; onRestart: () => void }) {
  const [scope, setScope] = useState<"user" | "project">("user");
  const [data, setData] = useState<{ user: ScopePayload; project: ScopePayload } | null>(null);
  const [servers, setServers] = useState<Record<string, ServerCfg>>({});
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [openName, setOpenName] = useState<string | null>(null);
  const [rawMode, setRawMode] = useState(false);
  const [raw, setRaw] = useState("");
  const [probes, setProbes] = useState<Record<string, ProbeResult | "running">>({});
  const [live, setLive] = useState<Record<string, { transport: string; status: string; detail: string; source: string }> | null>(null);
  const [liveBusy, setLiveBusy] = useState(false);

  const refreshLive = useCallback(async () => {
    setLiveBusy(true);
    try {
      const r = await post<{ lines: string[]; timedOut: boolean }>("/api/slash", { cwd, command: "/mcp list", waitMs: 8000 });
      const map: Record<string, { transport: string; status: string; detail: string; source: string }> = {};
      for (const line of r.lines ?? []) {
        for (const row of line.split("\n")) {
          const m = row.match(/^(\S+)\s+\|\s+(\S+)\s+\|\s+(\S+)\s+\|\s+(.*)$/);
          if (m) map[m[1]] = { transport: m[2], status: m[3], detail: m[4].replace(/\s*\[.*\]$/, ""), source: (m[4].match(/\[([^\]]+)\]$/) ?? [])[1] ?? "" };
        }
      }
      setLive(map);
    } catch {
      setLive(null);
    } finally {
      setLiveBusy(false);
    }
  }, [cwd]);

  useEffect(() => {
    refreshLive();
  }, [refreshLive]);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await get<{ user: ScopePayload; project: ScopePayload }>(`/api/mcp?cwd=${encodeURIComponent(cwd)}`);
      setData(r);
      setServers(r[scope].servers ?? {});
      setRaw(JSON.stringify(r[scope].servers ?? {}, null, 2));
      setDirty(false);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }, [cwd, scope]);

  useEffect(() => {
    load();
  }, [load]);

  const current = data?.[scope];
  const names = useMemo(() => Object.keys(servers).sort(), [servers]);

  function mutate(next: Record<string, ServerCfg>) {
    setServers(next);
    setRaw(JSON.stringify(next, null, 2));
    setDirty(true);
    setNote(null);
  }

  function patch(name: string, p: Partial<ServerCfg>) {
    mutate({ ...servers, [name]: { ...servers[name], ...p } });
  }

  async function save() {
    setErr(null);
    try {
      const body = rawMode ? JSON.parse(raw) : servers;
      const r = await put<{ ok: boolean; path: string; backup?: string }>("/api/mcp", { scope, cwd, servers: body });
      setNote(`saved ${r.path}${r.backup ? " (backup .bak)" : ""}`);
      setDirty(false);
      await load();
      refreshLive();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }

  async function probe(name: string) {
    setProbes((p) => ({ ...p, [name]: "running" }));
    try {
      const r = await post<ProbeResult>("/api/mcp/probe", { server: servers[name] });
      setProbes((p) => ({ ...p, [name]: r }));
    } catch (e: any) {
      setProbes((p) => ({ ...p, [name]: { ok: false, error: String(e?.message ?? e), ms: 0 } }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-ink-850 p-0.5">
          {(["user", "project"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setScope(s);
                setOpenName(null);
              }}
              className={`rounded-md px-2.5 py-1 text-[11.5px] ${scope === s ? "bg-ink-700 text-fog-100" : "text-fog-400 hover:text-fog-200"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10.5px] text-fog-500">{current?.path}</span>
        <Btn onClick={refreshLive} disabled={liveBusy} title="ask the runtime for live server state (/mcp list)">
          {liveBusy ? "probing runtime…" : "live state"}
        </Btn>
        <div className="ml-auto flex items-center gap-2">
          <Btn
            onClick={() => {
              const name = prompt("Server name (e.g. filesystem)");
              if (!name) return;
              if (servers[name]) return setErr("server already exists");
              mutate({ ...servers, [name]: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", cwd], enabled: true } });
              setOpenName(name);
            }}
          >
            + server
          </Btn>
          <Btn onClick={() => setRawMode((v) => !v)}>{rawMode ? "form" : "json"}</Btn>
          <Btn tone="primary" onClick={save} disabled={!dirty}>
            {dirty ? "save" : "saved"}
          </Btn>
        </div>
      </div>

      {err && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-200">{err}</div>}
      {note && <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11.5px] text-emerald-200">{note}</div>}
      {current?.error && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11.5px] text-amber-200">{current.error}</div>}

      <SkeletonReveal loading={!data && !err} skeleton={<ListSkeleton rows={4}/>} label="Loading MCP servers">
      {rawMode ? (
        <>
          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setDirty(true);
            }}
            rows={20}
            spellCheck={false}
            className="w-full resize-y rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-fog-100 focus:border-ink-500 focus:outline-none"
          />
          <p className="text-[11px] text-fog-500">
            Raw <span className="font-mono">mcpServers</span> object. Servers appear as <span className="font-mono">mcp__name__tool</span> after a session restart.
          </p>
        </>
      ) : names.length === 0 ? (
        <Empty>
          No MCP servers in this scope. Add one, or write <span className="font-mono">mcpServers</span> JSON directly.
        </Empty>
      ) : (
        <div className="space-y-2">
          {names.map((name) => {
            const s = servers[name];
            const pr = probes[name];
            const isHttp = !!s.url;
            return (
              <div key={name} className="rounded-lg border border-ink-800 bg-ink-850/40">
                <div className="flex items-center gap-3 px-3 py-2">
                  <button onClick={() => setOpenName(openName === name ? null : name)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] text-fog-100">{name}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide ${isHttp ? "bg-sky-500/15 text-sky-300" : "bg-ink-700 text-fog-400"}`}>
                        {isHttp ? "http" : "stdio"}
                      </span>
                      {s.enabled === false && <span className="rounded-full bg-ink-700 px-1.5 py-0.5 text-[9.5px] text-fog-400">disabled</span>}
                      {live?.[name] && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9.5px] ${
                            live[name].status === "enabled" ? "bg-emerald-500/15 text-emerald-300" : "bg-ink-700 text-fog-400"
                          }`}
                          title={`runtime: ${live[name].status} · ${live[name].source}`}
                        >
                          {live[name].status}
                        </span>
                      )}
                    </div>
                    <div className="truncate font-mono text-[10.5px] text-fog-500">{isHttp ? s.url : `${s.command ?? ""} ${(s.args ?? []).join(" ")}`}</div>
                  </button>
                  <Btn onClick={() => probe(name)} disabled={pr === "running"}>
                    {pr === "running" ? "testing…" : "test"}
                  </Btn>
                  <Toggle value={s.enabled !== false} onChange={(v) => patch(name, { enabled: v })} />
                  <button
                    onClick={() => {
                      const next = { ...servers };
                      delete next[name];
                      mutate(next);
                    }}
                    className="rounded-md px-1.5 text-[13px] leading-none text-fog-500 hover:text-rose-300"
                    title="remove"
                  >
                    <X className="size-3" />
                  </button>
                </div>

                {pr && pr !== "running" && (
                  <div className={`mx-3 mb-2 rounded-md border px-2.5 py-2 text-[11px] ${pr.ok ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-200" : "border-rose-500/30 bg-rose-500/5 text-rose-200"}`}>
                    {pr.ok ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span>{pr.tools?.length ?? 0} tools</span>
                          {typeof pr.resources === "number" && <span>· {pr.resources} resources</span>}
                          <span className="text-fog-500">· {pr.ms}ms</span>
                          {pr.serverInfo?.name && <span className="text-fog-500">· {pr.serverInfo.name} {pr.serverInfo.version}</span>}
                        </div>
                        {!!pr.tools?.length && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {pr.tools.slice(0, 40).map((t) => (
                              <span key={t.name} title={t.description} className="rounded bg-ink-800/70 px-1.5 py-0.5 font-mono text-[10px] text-fog-300">
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <span>{pr.error}</span>
                    )}
                  </div>
                )}

                {openName === name && (
                  <div className="space-y-2 border-t border-ink-800 px-3 py-2">
                    <Row label="command">
                      <input value={s.command ?? ""} onChange={(e) => patch(name, { command: e.target.value })} className={inputCls} placeholder="npx" />
                    </Row>
                    <Row label="args">
                      <input
                        value={(s.args ?? []).join(" ")}
                        onChange={(e) => patch(name, { args: e.target.value.split(/\s+/).filter(Boolean) })}
                        className={inputCls}
                        placeholder="-y @modelcontextprotocol/server-filesystem C:/path"
                      />
                    </Row>
                    <Row label="url">
                      <input value={s.url ?? ""} onChange={(e) => patch(name, { url: e.target.value || undefined })} className={inputCls} placeholder="https://host/mcp (leave empty for stdio)" />
                    </Row>
                    <Row label="env">
                      <textarea
                        value={Object.entries(s.env ?? {}).map(([k, v]) => `${k}=${v}`).join("\n")}
                        onChange={(e) => {
                          const env: Record<string, string> = {};
                          for (const line of e.target.value.split("\n")) {
                            const i = line.indexOf("=");
                            if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1);
                          }
                          patch(name, { env });
                        }}
                        rows={2}
                        className={`${inputCls} resize-y`}
                        placeholder="API_KEY=..."
                      />
                    </Row>
                    <Row label="headers">
                      <textarea
                        value={Object.entries(s.headers ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n")}
                        onChange={(e) => {
                          const headers: Record<string, string> = {};
                          for (const line of e.target.value.split("\n")) {
                            const i = line.indexOf(":");
                            if (i > 0) headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
                          }
                          patch(name, { headers });
                        }}
                        rows={2}
                        className={`${inputCls} resize-y`}
                        placeholder="Authorization: Bearer ..."
                      />
                    </Row>
                    <Row label="timeout">
                      <input
                        type="number"
                        value={s.timeout ?? ""}
                        onChange={(e) => patch(name, { timeout: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-28 rounded-md border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-[11.5px] text-fog-100 focus:outline-none"
                        placeholder="ms"
                      />
                    </Row>
                    <Row label="exposure">
                      <input value={s.exposure ?? ""} onChange={(e) => patch(name, { exposure: e.target.value || undefined })} className={inputCls} placeholder="lazy | eager (optional)" />
                    </Row>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      </SkeletonReveal>
      {!!current?.extra?.length && (
        <Group title="Also loaded from project root" hint="read-only here">
          {current.extra.map((f) => (
            <div key={f.path} className="rounded-lg border border-ink-800 bg-ink-850/40 px-3 py-2">
              <div className="font-mono text-[11px] text-fog-400">{f.path}</div>
              <div className="text-[11.5px] text-fog-500">{Object.keys(f.servers).join(", ") || "no servers"}{f.error ? " · " + f.error : ""}</div>
            </div>
          ))}
        </Group>
      )}

      <div className="flex items-center gap-2 text-[11px] text-fog-500">
        <span>Changes apply to new sessions.</span>
        <Btn onClick={onRestart}>restart session</Btn>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-[11.5px] text-fog-100 focus:outline-none";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-16 shrink-0 pt-1 font-mono text-[10.5px] text-fog-500">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
