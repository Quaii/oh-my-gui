import { get, post } from "./api";
import { settingDescriptions } from "./settings-copy";

export interface SettingUi {
  label?: string;
  tab?: string;
  group?: string;
  description?: string;
  env?: string;
  rpcDefault?: boolean;
  values?: string[];
  options?: { value: string; label: string }[];
}

export interface Setting {
  key: string;
  type: string;
  value: unknown;
  description: string;
  ui?: SettingUi;
  explicit?: boolean;
}

export interface SettingsPayload {
  settings: Setting[];
  tabs: string[];
  groups: Record<string, string[]>;
}

export async function fetchSettings(refresh = false): Promise<SettingsPayload> {
  return get<SettingsPayload>(`/api/settings${refresh ? "?refresh=1" : ""}`);
}

export async function saveSetting(key: string, value: unknown) {
  return post<{ ok: boolean; message: string }>("/api/settings", { key, value });
}

export async function resetSetting(key: string) {
  return post<{ ok: boolean; message: string }>("/api/settings", { key, reset: true });
}

export function labelOf(s: Setting): string {
  return s.ui?.label ?? s.key;
}

export function descriptionOf(s: Setting): string {
  return (Object.hasOwn(settingDescriptions, s.key) ? settingDescriptions[s.key] : undefined)
    ?? s.ui?.description ?? s.description;
}

export function prettyKey(key: string): string {
  return key
    .split(".")
    .map((p) => p.replace(/([a-z0-9])([A-Z])/g, "$1 $2"))
    .join(" · ");
}

/* ------------------------------------------------------------------ *
 * Slash-command curation: which commands show up in the chat "/" menu
 * ------------------------------------------------------------------ */

export type PaletteMode = "curated" | "all";

export interface PalettePrefs {
  mode: PaletteMode;
  /** explicit per-command overrides: true = show in chat, false = settings only */
  overrides: Record<string, boolean>;
}

/**
 * Commands whose job is configuration or diagnostics rather than chatting.
 * They are hidden from the composer palette in "curated" mode and live in
 * Settings instead. Users can flip any of them back on in Settings → Commands.
 */
export const SETTINGS_ONLY: string[] = [
  "advisor",
  "browser",
  "changelog",
  "computer",
  "effort",
  "extended-context",
  "forget-approvals",
  "jobs",
  "mcp",
  "model",
  "modelpreset",
  "prewalk",
  "ratchet",
  "security",
  "setup",
  "skillful",
  "ssh",
  "stats",
  "switch",
  "theme",
  "tools",
  "trace",
  "usage",
];

const SETTINGS_ONLY_SET = new Set(SETTINGS_ONLY);
const LS_PALETTE = "ompfe.palette";

function readPrefs(): PalettePrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_PALETTE) || "{}");
    return {
      mode: raw.mode === "all" ? "all" : "curated",
      overrides: raw.overrides && typeof raw.overrides === "object" ? raw.overrides : {},
    };
  } catch {
    return { mode: "curated", overrides: {} };
  }
}

let prefs: PalettePrefs = typeof localStorage === "undefined" ? { mode: "curated", overrides: {} } : readPrefs();
const listeners = new Set<() => void>();

export function getPalettePrefs(): PalettePrefs {
  return prefs;
}

export function setPalettePrefs(next: Partial<PalettePrefs>): void {
  prefs = { ...prefs, ...next };
  try {
    localStorage.setItem(LS_PALETTE, JSON.stringify(prefs));
  } catch {}
  for (const l of listeners) l();
}

export function subscribePalette(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isInChatPalette(name: string, p: PalettePrefs = prefs): boolean {
  const override = p.overrides[name];
  if (typeof override === "boolean") return override;
  if (p.mode === "all") return true;
  return !SETTINGS_ONLY_SET.has(name);
}

export function filterChatCommands<T extends { name?: string }>(commands: T[], p: PalettePrefs = prefs): T[] {
  return commands.filter((c) => isInChatPalette(c.name ?? "", p));
}
