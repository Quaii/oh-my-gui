import { useMemo } from "react";
import type { Setting } from "../../lib/settings";
import { descriptionOf, labelOf } from "../../lib/settings";
import { Group, SettingRow, Empty } from "./Controls";

export interface ConfigListProps {
  settings: Setting[];
  query?: string;
  onSave: (key: string, value: unknown) => void;
  onReset: (key: string) => void;
  /** hide keys with no UI metadata (internal plumbing) */
  hideAdvanced?: boolean;
}

export function matchesQuery(s: Setting, q: string): boolean {
  if (!q) return true;
  const hay = `${s.key} ${labelOf(s)} ${s.ui?.group ?? ""} ${s.ui?.tab ?? ""} ${descriptionOf(s)} ${s.ui?.description ?? s.description ?? ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => hay.includes(part));
}

/** Renders a settings list grouped by the TUI group names, in schema order. */
export function ConfigList({ settings, query = "", onSave, onReset, hideAdvanced }: ConfigListProps) {
  const grouped = useMemo(() => {
    const filtered = settings.filter((s) => (!hideAdvanced || s.ui) && matchesQuery(s, query));
    const map = new Map<string, Setting[]>();
    for (const s of filtered) {
      const g = s.ui?.group ?? (s.ui ? "General" : "Advanced (no UI metadata)");
      const arr = map.get(g) ?? [];
      arr.push(s);
      map.set(g, arr);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a.startsWith("Advanced")) return 1;
      if (b.startsWith("Advanced")) return -1;
      return a.localeCompare(b);
    });
  }, [settings, query, hideAdvanced]);

  if (grouped.length === 0) return <Empty>No settings match.</Empty>;

  return (
    <div className="settings-stack">
      <p className="text-xs leading-relaxed text-muted-foreground">Global OMP settings. Launch overrides take priority. Startup changes need a restart. Terminal appearance and keybindings apply to the terminal.</p>
      {grouped.map(([group, list]) => (
        <Group key={group} title={group} hint={`${list.length}`}>
          {list.map((s) => (
            <SettingRow key={s.key} setting={s} onSave={(v) => onSave(s.key, v)} onReset={() => onReset(s.key)} />
          ))}
        </Group>
      ))}
    </div>
  );
}
