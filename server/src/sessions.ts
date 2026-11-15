import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

export const AGENT_DIR = process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), ".omp", "agent");
export const SESSIONS_DIR = path.join(AGENT_DIR, "sessions");
export const CONFIG_PATH = path.join(AGENT_DIR, "config.yml");

export interface SessionSummary {
  /** Absolute path to the .jsonl file. */
  path: string;
  id: string;
  cwd: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
  parentSession?: string;
  version?: number;
  /** True when a live bridge currently owns this file. */
  live?: boolean;
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((c: any) => (c && c.type === "text" ? c.text : c && c.type === "image" ? "[image]" : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
}

async function readJsonl(file: string, maxLines = 4000): Promise<any[]> {
  const raw = await fs.readFile(file, "utf8");
  const out: any[] = [];
  let start = 0;
  let lines = 0;
  while (start < raw.length && lines < maxLines) {
    const nl = raw.indexOf("\n", start);
    const end = nl === -1 ? raw.length : nl;
    const line = raw.slice(start, end).trim();
    start = end + 1;
    lines++;
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch {}
  }
  return out;
}

export async function readSession(file: string): Promise<SessionSummary | null> {
  try {
    const stat = await fs.stat(file);
    const entries = await readJsonl(file);
    if (!entries.length) return null;
    const headerType = entries.find((e) => e && e.type === "session") ?? null;
    let name: string | undefined = headerType?.name;
    let preview = "";
    let messageCount = 0;
    for (const e of entries) {
      if (e.type === "session_info" || e.type === "session_info_changed") {
        if (typeof e.name === "string") name = e.name;
      }
      if (e.type === "title" && typeof e.title === "string" && e.title.trim()) name = e.title;
      if (e.type === "message" && e.message) {
        messageCount++;
        if (!preview && e.message.role === "user" && !e.message.synthetic) preview = textOf(e.message.content).slice(0, 200);
      }
    }
    return {
      path: file,
      id: headerType?.id ?? path.basename(file, ".jsonl"),
      cwd: headerType?.cwd ?? "",
      name,
      createdAt: headerType?.timestamp ?? stat.birthtime.toISOString(),
      updatedAt: stat.mtime.toISOString(),
      messageCount,
      preview: preview.replace(/\s+/g, " ").trim(),
      parentSession: headerType?.parentSession,
      version: headerType?.version,
    };
  } catch {
    return null;
  }
}

export async function listSessions(cwd?: string): Promise<SessionSummary[]> {
  let dirs: string[] = [];
  try {
    dirs = (await fs.readdir(SESSIONS_DIR, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => path.join(SESSIONS_DIR, d.name));
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const dir of dirs) {
    try {
      for (const f of await fs.readdir(dir)) if (f.endsWith(".jsonl")) files.push(path.join(dir, f));
    } catch {}
  }
  const all = (await Promise.all(files.map(readSession))).filter(Boolean) as SessionSummary[];
  const filtered = cwd ? all.filter((s) => normalize(s.cwd) === normalize(cwd)) : all;
  filtered.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return filtered;
}

export function normalize(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export async function deleteSession(file: string): Promise<void> {
  const resolved = path.resolve(file);
  if (!normalize(resolved).startsWith(normalize(SESSIONS_DIR))) throw new Error("refusing to delete outside sessions dir");
  await fs.unlink(resolved);
}
