import { execFile } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { OMP_BINARY as OMP_BIN } from "./omp.ts";
const UI_META_PATH = fileURLToPath(new URL("../data/settings-ui.json", import.meta.url));

export interface SettingUi {
  label?: string;
  tab?: string;
  group?: string;
  description?: string;
  env?: string;
  values?: string[];
  options?: { value: string; label: string }[];
}

export interface Setting {
  key: string;
  type: string;
  value: unknown;
  description: string;
  ui?: SettingUi;
  /** True when the global config.yml layer sets this key explicitly. */
  explicit?: boolean;
}

export interface SettingsPayload {
  settings: Setting[];
  tabs: string[];
  groups: Record<string, string[]>;
  path: string;
}

function omp(args: string[], timeoutMs = 25000): Promise<{ ok: boolean; out: string; err: string }> {
  return new Promise((resolve) => {
    execFile(OMP_BIN, args, { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      resolve({ ok: !error, out: String(stdout ?? ""), err: String(stderr ?? "") || (error ? String(error.message) : "") });
    });
  });
}

function loadUiMeta(): Record<string, SettingUi> {
  try {
    return JSON.parse(fs.readFileSync(UI_META_PATH, "utf8"));
  } catch {
    return {};
  }
}

const TAB_ORDER = [
  "interaction",
  "model",
  "providers",
  "tools",
  "tasks",
  "context",
  "memory",
  "files",
  "shell",
  "appearance",
];

let cache: { at: number; payload: SettingsPayload } | null = null;

export function invalidateSettings(): void {
  cache = null;
}

export async function readSettings(force = false): Promise<SettingsPayload> {
  if (!force && cache && Date.now() - cache.at < 20000) return cache.payload;
  const [list, global] = await Promise.all([
    omp(["config", "list", "--json"]),
    omp(["config", "list", "--scope=global", "--json"]),
  ]);
  if (!list.ok) throw new Error(list.err || "omp config list failed");
  const values = JSON.parse(list.out);
  let explicit: Record<string, unknown> = {};
  try {
    explicit = global.ok ? JSON.parse(global.out) : {};
  } catch {}
  const ui = loadUiMeta();

  const settings: Setting[] = [];
  for (const [key, entry] of Object.entries<any>(values)) {
    const meta = ui[key];
    const setting: Setting = {
      key,
      type: entry?.type ?? (entry?.value === undefined ? "string" : typeof entry.value),
      value: entry?.value,
      description: entry?.description ?? "",
    };
    if (meta) setting.ui = meta;
    if (key in explicit) setting.explicit = true;
    settings.push(setting);
  }
  settings.sort((a, b) => a.key.localeCompare(b.key));

  const groups: Record<string, string[]> = {};
  for (const s of settings) {
    const tab = s.ui?.tab ?? "other";
    const group = s.ui?.group ?? "General";
    (groups[tab] ??= []).includes(group) || groups[tab].push(group);
  }
  const tabs = Object.keys(groups).sort((a, b) => {
    const ia = TAB_ORDER.indexOf(a);
    const ib = TAB_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  for (const t of tabs) groups[t].sort((a, b) => a.localeCompare(b));

  const payload: SettingsPayload = { settings, tabs, groups, path: "" };
  cache = { at: Date.now(), payload };
  return payload;
}

function encodeValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

export async function setSetting(key: string, value: unknown): Promise<{ ok: boolean; message: string }> {
  const r = await omp(["config", "set", key, encodeValue(value)]);
  invalidateSettings();
  return { ok: r.ok, message: (r.out || r.err).trim() };
}

export async function resetSetting(key: string): Promise<{ ok: boolean; message: string }> {
  const r = await omp(["config", "reset", key]);
  invalidateSettings();
  return { ok: r.ok, message: (r.out || r.err).trim() };
}

export async function getSetting(key: string): Promise<unknown> {
  const r = await omp(["config", "get", key, "--json"]);
  if (!r.ok) return undefined;
  try {
    return JSON.parse(r.out)?.value;
  } catch {
    return undefined;
  }
}

