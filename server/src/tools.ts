import { execFile } from "node:child_process";

import { OMP_BINARY as OMP_BIN } from "./omp.ts";

export interface BuiltinTool {
  name: string;
  description: string;
  defaultEnabled: boolean;
}

let cache: { at: number; tools: BuiltinTool[] } | null = null;

function helpText(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(OMP_BIN, ["--help"], { timeout: 25000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
      if (err && !stdout) reject(err);
      else resolve(String(stdout ?? ""));
    });
  });
}

/** Parse the "Built-in Tools" block out of `omp --help`. */
export function parseBuiltinTools(help: string): BuiltinTool[] {
  const lines = help.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith("Built-in Tools"));
  if (start < 0) return [];
  const out: BuiltinTool[] = [];
  let defaultEnabled = true;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line) && !line.startsWith("#")) break; // next top-level section
    const heading = line.match(/^\s*#\s*(.+)$/);
    if (heading) {
      defaultEnabled = /enabled by default/i.test(heading[1]);
      continue;
    }
    const m = line.match(/^\s{2}([a-z0-9_]+)\s+-\s+(.+)$/);
    if (m) out.push({ name: m[1], description: m[2].trim(), defaultEnabled });
  }
  return out;
}

export async function listBuiltinTools(): Promise<BuiltinTool[]> {
  if (cache && Date.now() - cache.at < 60000) return cache.tools;
  const tools = parseBuiltinTools(await helpText());
  cache = { at: Date.now(), tools };
  return tools;
}

