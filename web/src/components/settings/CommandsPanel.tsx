import { useMemo, useState, useSyncExternalStore } from "react";
import type { Setting } from "../../lib/settings";
import { getPalettePrefs, setPalettePrefs, subscribePalette, isInChatPalette } from "../../lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Group, Segmented, Toggle } from "./Controls";
import { ConfigList } from "./ConfigList";

export function CommandsPanel({
  commands,
  settings,
  onSave,
  onReset,
  onRun,
}: {
  commands: any[];
  settings: Setting[];
  onSave: (key: string, value: unknown) => void;
  onReset: (key: string) => void;
  onRun: (name: string) => void;
}) {
  const prefs = useSyncExternalStore(subscribePalette, getPalettePrefs, getPalettePrefs);
  const [q, setQ] = useState("");

  const sorted = useMemo(() => [...commands].sort((a, b) => a.name.localeCompare(b.name)), [commands]);
  const filtered = sorted.filter((c) => !q || `${c.name} ${c.description ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const inChat = filtered.filter((c) => isInChatPalette(c.name, prefs));
  const onlySettings = filtered.filter((c) => !isInChatPalette(c.name, prefs));

  const toggle = (name: string) => {
    setPalettePrefs({ overrides: { ...prefs.overrides, [name]: !isInChatPalette(name, prefs) } });
  };

  const sourceKeys = settings.filter((s) => s.key.startsWith("commands.") || s.key === "skills.enableSkillCommands");

  const row = (c: any, on: boolean) => (
    <div key={c.name} className="flex items-center gap-[var(--space-content)] border-b border-border py-[var(--space-row)] last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="break-all font-mono text-sm font-medium text-foreground">/{c.name}</span>
          {!!c.aliases?.length && <span className="break-words font-mono text-xs text-muted-foreground">{c.aliases.map((a: string) => "/" + a).join(" ")}</span>}
          {!!c.subcommands?.length && <span className="text-xs text-muted-foreground">{c.subcommands.length} subcommands</span>}
        </div>
        {c.description && <p className="mt-1 break-words text-xs text-muted-foreground">{c.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Toggle value={on} onChange={() => toggle(c.name)} label={`Show /${c.name} in the composer’s slash menu`} />
        <Button variant="outline" size="sm" onClick={() => onRun(c.name)} aria-label={`Run /${c.name} in chat`}>Run</Button>
      </div>
    </div>
  );

  return (
    <div className="settings-stack">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter commands…"
          aria-label="Filter commands"
          className="w-56 max-w-full"
        />
        <Segmented value={prefs.mode} options={[{ value: "curated", label: "Curated" }, { value: "all", label: "All" }]}
          onChange={mode => setPalettePrefs({ mode: mode === "all" ? "all" : "curated" })} />
        <Button variant="ghost" size="sm" disabled={!Object.keys(prefs.overrides).length} onClick={() => setPalettePrefs({ overrides: {} })}>Reset overrides</Button>
      </div>

      <p className="text-xs text-muted-foreground">Turn on a command to show it in the composer’s <code>/</code> menu. You can run commands from either list.</p>

      <Group title="In composer">
        {inChat.length === 0 ? <p className="py-[var(--space-row)] text-xs text-muted-foreground">No matching commands.</p> : inChat.map((c) => row(c, true))}
      </Group>

      <Group title="Settings only">
        {onlySettings.length === 0 ? <p className="py-[var(--space-row)] text-xs text-muted-foreground">No matching commands.</p> : onlySettings.map((c) => row(c, false))}
      </Group>

      <details>
        <summary className="cursor-pointer text-sm font-medium">Command source settings</summary>
        <div className="mt-[var(--space-content)]">
          <ConfigList settings={sourceKeys} onSave={onSave} onReset={onReset} />
        </div>
      </details>
    </div>
  );
}
