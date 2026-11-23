import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import { workspacePath } from "../../shared/workspace.ts";
import type { DiscoveredMcpServer, McpDiscovery, McpImportScope } from "../../shared/mcp-discovery.ts";
import { appendMcpServers, projectMcpPath, readMcp, userMcpPath, type McpServerConfig } from "./mcp.ts";

type Source = {
  source: "Codex" | "Claude Code" | "ZCode";
  scope: McpImportScope;
  file: string;
  servers: (document: Record<string, unknown>) => unknown;
};
type Candidate = { preview: DiscoveredMcpServer; config: McpServerConfig };
type Locations = { home?: string; codexHome?: string; claudeHome?: string; project?: string };
const environmentName = /^[A-Za-z_][A-Za-z0-9_]*$/;
const environmentReference = /^(?:Bearer )?\$\{[A-Za-z_][A-Za-z0-9_]*\}$/i;
const credentialName = /token|secret|password|credential|authorization|cookie|api[-_]?key|private[-_]?key|(?:^|[-_])auth(?:$|[-_])/i;
const credentialArgument = /^(?:--?)?(?:access[-_]?token|token|secret|password|api[-_]?key|authorization|credentials?)(?:=|$)/i;
const importedName = /^[A-Za-z0-9_.:-]+(?: [A-Za-z0-9_.:-]+)*$/;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sources({
  home = os.homedir(),
  codexHome = process.env.CODEX_HOME || path.join(home, ".codex"),
  claudeHome = process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude"),
  project,
}: Locations): Source[] {
  const claudeJson = path.join(home, ".claude.json");
  const codex = (doc: Record<string, unknown>) => doc.mcp_servers;
  const claude = (doc: Record<string, unknown>) => doc.mcpServers;
  const zcode = (doc: Record<string, unknown>) => record(doc.mcp).servers;
  return [
    { source: "Codex", scope: "user", file: path.join(codexHome, "config.toml"), servers: codex },
    { source: "Claude Code", scope: "user", file: claudeJson, servers: claude },
    { source: "Claude Code", scope: "user", file: path.join(claudeHome, "mcp.json"), servers: claude },
    { source: "Claude Code", scope: "user", file: path.join(claudeHome, "settings.json"), servers: claude },
    { source: "ZCode", scope: "user", file: path.join(home, ".zcode", "cli", "config.json"), servers: zcode },
    ...(project ? [
      { source: "Codex", scope: "project", file: path.join(project, ".codex", "config.toml"), servers: codex },
      { source: "Claude Code", scope: "project", file: path.join(project, ".mcp.json"), servers: claude },
      { source: "Claude Code", scope: "project", file: path.join(project, ".claude", "mcp.json"), servers: claude },
      { source: "Claude Code", scope: "project", file: path.join(project, ".claude", ".mcp.json"), servers: claude },
      { source: "Claude Code", scope: "project", file: claudeJson, servers: (doc: Record<string, unknown>) => {
        const match = Object.entries(record(doc.projects)).find(([folder]) => workspacePath(folder) === workspacePath(project));
        return record(match?.[1]).mcpServers;
      } },
      { source: "ZCode", scope: "project", file: path.join(project, ".zcode", "config.json"), servers: zcode },
    ] satisfies Source[] : []),
  ];
}

function normalize(value: unknown) {
  const raw = record(value);
  const command = typeof raw.command === "string" ? raw.command.trim() : "";
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  const type: DiscoveredMcpServer["transport"] = command ? "stdio" : raw.type === "sse" ? "sse" : "http";
  const config: McpServerConfig = { type, enabled: false };
  let needsSetup = !!(raw.auth || raw.oauth || raw.http_headers_helper);
  let blocked: string | undefined;

  const settings = (value: unknown) => Object.fromEntries(Object.entries(record(value)).filter(([key, item]) => {
    const keep = typeof item === "string" && !item.startsWith("!") && !/[\r\n]/.test(item) &&
      (!credentialName.test(key) || environmentReference.test(item));
    if (!keep) needsSetup = true;
    return keep;
  })) as Record<string, string>;

  if (command && !url) {
    config.command = command;
    if (Array.isArray(raw.args) && raw.args.every(arg => typeof arg === "string")) {
      config.args = raw.args;
      if (raw.args.some(arg => credentialArgument.test(arg) || /[?&](?:token|api[_-]?key|password|signature)=/i.test(arg))) {
        blocked = "Contains credential arguments. Add this server manually.";
      }
    } else if (raw.args !== undefined) {
      blocked = "Unsupported command arguments.";
    }
    if (typeof raw.cwd === "string" && raw.cwd) config.cwd = raw.cwd;
    config.env = settings(raw.env);
    if (Array.isArray(raw.env_vars)) {
      for (const name of raw.env_vars) {
        if (typeof name === "string" && environmentName.test(name) && !Object.hasOwn(config.env, name)) {
          Object.defineProperty(config.env, name, { value: `\${${name}}`, enumerable: true });
        }
      }
    }
  } else {
    try {
      const endpoint = new URL(url);
      if (!["https:", "http:"].includes(endpoint.protocol) || endpoint.username || endpoint.password ||
          [...endpoint.searchParams.keys()].some(key => credentialName.test(key) || /^sig(?:nature)?$/i.test(key))) {
        throw Error("Unsupported endpoint");
      }
      config.url = url;
    } catch {
      blocked = "Requires an HTTP or SSE URL without embedded credentials.";
    }
    config.headers = settings(raw.headers ?? raw.http_headers);
    for (const [key, name] of Object.entries(record(raw.env_http_headers))) {
      if (typeof name === "string" && environmentName.test(name)) {
        Object.defineProperty(config.headers, key, { value: `\${${name}}`, configurable: true, enumerable: true });
      }
    }
    if (typeof raw.bearer_token_env_var === "string" && environmentName.test(raw.bearer_token_env_var)) {
      config.headers.Authorization = `Bearer \${${raw.bearer_token_env_var}}`;
    }
  }
  if ((raw.environment_id && raw.environment_id !== "local") || raw.type === "websocket")
    blocked = "Uses a transport or execution environment that OMP cannot import.";
  if ((Array.isArray(raw.enabled_tools) && raw.enabled_tools.length) ||
      (Array.isArray(raw.disabled_tools) && raw.disabled_tools.length) || Object.keys(record(raw.tools)).length)
    blocked = "Has per-tool settings that require manual setup in OMP.";
  if (typeof raw.timeout === "number" && Number.isFinite(raw.timeout) && raw.timeout >= 0) config.timeout = raw.timeout;
  else if (typeof raw.tool_timeout_sec === "number" && Number.isFinite(raw.tool_timeout_sec) && raw.tool_timeout_sec >= 0) config.timeout = raw.tool_timeout_sec * 1000;
  return { config, type, blocked, needsSetup };
}

async function scan(locations: Locations) {
  const { project } = locations;
  const native = await readMcp(project ?? "", { includeProject: !!project });
  const existing = new Set([
    ...Object.keys(native.user.servers),
    ...(native.user.enabledServers ?? []),
    ...Object.keys(native.project.servers),
    ...(native.project.extra ?? []).flatMap(source => Object.keys(source.servers)),
  ]);
  const unreadable = new Set<string>();
  const candidates = await Promise.all(sources(locations).map(async source => {
    try {
      const stat = await fs.stat(source.file);
      if (!stat.isFile() || stat.size > 16 * 1024 * 1024) throw Error("Invalid config file");
      const raw = await fs.readFile(source.file, "utf8");
      const text = raw.replace(/^\uFEFF/, "");
      const document = record(source.source === "Codex" ? parseToml(text) : JSON.parse(text));
      return Object.entries(record(source.servers(document))).flatMap(([name, value]): Candidate[] => {
        if (name.length > 100 || !importedName.test(name) || ["__proto__", "constructor", "prototype"].includes(name)) return [];
        const { config, type, blocked, needsSetup } = normalize(value);
        // Tying the selection to the source entry makes changes require a fresh preview.
        const id = createHash("sha256").update(JSON.stringify([source.file, source.scope, name, value])).digest("hex");
        const preview = { id, name, source: source.source, file: source.file, scope: source.scope, transport: type, configured: existing.has(name), blocked, needsSetup };
        return [{ preview, config }];
      });
    } catch (error: any) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") unreadable.add(source.file);
      return [];
    }
  }));
  return { candidates: candidates.flat(), unreadable: [...unreadable].sort() };
}

export async function discoverMcp(locations: Locations): Promise<McpDiscovery> {
  const { candidates, unreadable } = await scan(locations);
  return { servers: candidates.map(({ preview }) => preview), unreadable, projectAvailable: !!locations.project };
}

export async function importMcp(locations: Locations, scope: McpImportScope, ids: string[]) {
  if (scope === "project" && !locations.project) throw Error("Open a registered project to import there.");
  const { candidates } = await scan(locations);
  const byId = new Map(candidates.map(item => [item.preview.id, item]));
  const entries: Record<string, McpServerConfig> = Object.create(null);
  const skipped: string[] = [];
  for (const id of new Set(ids)) {
    const item = byId.get(id);
    if (!item) throw Error("A source configuration changed. Refresh discovery and select the servers again.");
    const { name, scope: sourceScope, configured, blocked } = item.preview;
    if (blocked || sourceScope !== scope) throw Error("One of the selected servers cannot be imported into this scope.");
    if (configured || Object.hasOwn(entries, name)) skipped.push(name);
    else entries[name] = item.config;
  }
  const file = scope === "project" ? projectMcpPath(locations.project!) : userMcpPath();
  const result = await appendMcpServers(file, entries);
  return { imported: result.imported, skipped: [...new Set([...skipped, ...result.skipped])] };
}
