import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";

export const AGENT_DIR = process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), ".omp", "agent");

export interface McpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
  oauth?: Record<string, unknown>;
  timeout?: number;
  enabled?: boolean;
  exposure?: string;
  toolExposure?: string;
  description?: string;
  type?: string;
}

export interface McpScope {
  scope: "user" | "project";
  path: string;
  exists: boolean;
  servers: Record<string, McpServerConfig>;
  error?: string;
  /** Read-only extra files omp also picks up (project root mcp.json / .mcp.json). */
  extra?: { path: string; servers: Record<string, McpServerConfig>; error?: string }[];
}

export function userMcpPath(): string {
  return path.join(AGENT_DIR, "mcp.json");
}

export function projectMcpPath(cwd: string): string {
  return path.join(cwd, ".omp", "mcp.json");
}

async function readOne(file: string): Promise<{ servers: Record<string, McpServerConfig>; error?: string }> {
  try {
    const raw = await fs.readFile(file, "utf8");
    if (!raw.trim()) return { servers: {} };
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) return { servers: {}, error: "mcp.json must be a JSON object" };
    const servers = data.mcpServers;
    if (servers === undefined) return { servers: {} };
    if (typeof servers !== "object" || servers === null || Array.isArray(servers)) return { servers: {}, error: '"mcpServers" must be an object' };
    return { servers: servers as Record<string, McpServerConfig> };
  } catch (e: any) {
    if (e?.code === "ENOENT") return { servers: {} };
    return { servers: {}, error: String(e?.message ?? e) };
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function readMcp(cwd: string): Promise<{ user: McpScope; project: McpScope }> {
  const up = userMcpPath();
  const pp = projectMcpPath(cwd);
  const [u, p, ue, pe] = await Promise.all([readOne(up), readOne(pp), exists(up), exists(pp)]);

  const extra: McpScope["extra"] = [];
  for (const f of [path.join(cwd, "mcp.json"), path.join(cwd, ".mcp.json")]) {
    if (await exists(f)) {
      const r = await readOne(f);
      extra.push({ path: f, servers: r.servers, error: r.error });
    }
  }

  return {
    user: { scope: "user", path: up, exists: ue, servers: u.servers, error: u.error },
    project: { scope: "project", path: pp, exists: pe, servers: p.servers, error: p.error, extra },
  };
}

export async function writeMcp(scope: "user" | "project", cwd: string, servers: Record<string, McpServerConfig>): Promise<{ path: string; backup?: string }> {
  const file = scope === "user" ? userMcpPath() : projectMcpPath(cwd);
  await fs.mkdir(path.dirname(file), { recursive: true });
  let backup: string | undefined;
  if (await exists(file)) {
    backup = file + ".bak";
    await fs.copyFile(file, backup);
  }
  const body = JSON.stringify({ mcpServers: servers }, null, 2) + "\n";
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, body, "utf8");
  await fs.rename(tmp, file);
  return { path: file, backup };
}

/* ------------------------------------------------------------------ *
 * probe: connect to a server and list its tools without touching omp
 * ------------------------------------------------------------------ */

export interface ProbeResult {
  ok: boolean;
  serverInfo?: unknown;
  protocolVersion?: string;
  tools?: { name: string; description?: string }[];
  resources?: number;
  error?: string;
  ms: number;
}

function rpcLine(obj: unknown): string {
  return JSON.stringify(obj) + "\n";
}

async function probeStdio(cfg: McpServerConfig, timeoutMs: number): Promise<ProbeResult> {
  const started = Date.now();
  const command = cfg.command;
  if (!command) return { ok: false, error: "no command", ms: 0 };
  const env = { ...process.env, ...(cfg.env ?? {}) };
  const args = (cfg.args ?? []).map((a) => a.replace(/^~(?=$|\/)/, os.homedir()));
  const cwd = cfg.cwd ? cfg.cwd.replace(/^~(?=$|\/)/, os.homedir()) : undefined;

  return await new Promise<ProbeResult>((resolve) => {
    let settled = false;
    let buf = "";
    let tools: { name: string; description?: string }[] = [];
    let serverInfo: unknown;
    let protocolVersion: string | undefined;
    let resources = 0;
    const finish = (r: ProbeResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch {}
      resolve({ ...r, ms: Date.now() - started });
    };
    const timer = setTimeout(() => finish({ ok: false, error: "timed out after " + timeoutMs + "ms", ms: 0, tools }), timeoutMs);

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        shell: process.platform === "win32",
      });
    } catch (e: any) {
      clearTimeout(timer);
      return resolve({ ok: false, error: String(e?.message ?? e), ms: Date.now() - started });
    }

    let stderr = "";
    child.on("error", (e: any) => finish({ ok: false, error: String(e?.message ?? e), ms: 0 }));
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    child.on("exit", (code) => {
      if (!settled) finish({ ok: false, error: "process exited (code " + code + ")" + (stderr ? ": " + stderr.trim().slice(-400) : ""), ms: 0, tools });
    });

    child.stdout?.on("data", (d) => {
      buf += d.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let msg: any;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.id === 1 && msg.result) {
          serverInfo = msg.result.serverInfo;
          protocolVersion = msg.result.protocolVersion;
          child.stdin?.write(rpcLine({ jsonrpc: "2.0", method: "notifications/initialized" }));
          child.stdin?.write(rpcLine({ jsonrpc: "2.0", id: 2, method: "tools/list" }));
          child.stdin?.write(rpcLine({ jsonrpc: "2.0", id: 3, method: "resources/list" }));
        } else if (msg.id === 2) {
          tools = msg.result?.tools ?? [];
        } else if (msg.id === 3) {
          resources = (msg.result?.resources ?? []).length;
          finish({ ok: true, serverInfo, protocolVersion, tools, resources, ms: 0 });
        } else if (msg.error && msg.id === 1) {
          finish({ ok: false, error: msg.error.message ?? JSON.stringify(msg.error), ms: 0 });
        }
      }
    });

    child.stdin?.write(
      rpcLine({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "omp-web", version: "0.2.0" },
        },
      })
    );
  });
}

async function probeHttp(cfg: McpServerConfig, timeoutMs: number): Promise<ProbeResult> {
  const started = Date.now();
  const url = cfg.url;
  if (!url) return { ok: false, error: "no url", ms: 0 };
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    ...(cfg.headers ?? {}),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const post = async (body: unknown) => {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
    const text = await res.text();
    let json: any = null;
    // streamable HTTP may answer with SSE frames
    const dataLine = text.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
    try {
      json = JSON.parse(text);
    } catch {
      try {
        json = JSON.parse(dataLine);
      } catch {}
    }
    return { res, json, text };
  };
  try {
    const init = await post({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "omp-web", version: "0.2.0" } },
    });
    if (init.res.status === 401 || init.res.status === 403) {
      clearTimeout(timer);
      return { ok: false, error: "authentication required (HTTP " + init.res.status + ")", ms: Date.now() - started };
    }
    if (!init.json?.result) {
      clearTimeout(timer);
      return { ok: false, error: "unexpected initialize response (HTTP " + init.res.status + ")", ms: Date.now() - started };
    }
    await post({ jsonrpc: "2.0", method: "notifications/initialized" });
    const list = await post({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    clearTimeout(timer);
    return {
      ok: true,
      serverInfo: init.json.result.serverInfo,
      protocolVersion: init.json.result.protocolVersion,
      tools: list.json?.result?.tools ?? [],
      ms: Date.now() - started,
    };
  } catch (e: any) {
    clearTimeout(timer);
    return { ok: false, error: String(e?.message ?? e), ms: Date.now() - started };
  }
}

export async function probeServer(cfg: McpServerConfig, timeoutMs = 15000): Promise<ProbeResult> {
  if (cfg.url) return probeHttp(cfg, timeoutMs);
  return probeStdio(cfg, timeoutMs);
}
