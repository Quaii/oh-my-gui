import { useMemo, useState, useSyncExternalStore } from "react";
import type { Setting } from "../../lib/settings";
import { getPalettePrefs, setPalettePrefs, subscribePalette, SETTINGS_ONLY, isInChatPalette } from "../../lib/settings";
import { Btn, Group } from "./Controls";
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
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => [...commands].sort((a, b) => a.name.localeCompare(b.name)), [commands]);
  const filtered = sorted.filter((c) => !q || `${c.name} ${c.description ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const inChat = filtered.filter((c) => isInChatPalette(c.name, prefs));
  const onlySettings = filtered.filter((c) => !isInChatPalette(c.name, prefs));

  const toggle = (name: string) => {
    setPalettePrefs({ overrides: { ...prefs.overrides, [name]: !isInChatPalette(name, prefs) } });
  };

  const sourceKeys = settings.filter((s) => s.key.startsWith("commands.") || s.key === "skills.enableSkillCommands");

  const row = (c: any, on: boolean) => (
    <div key={c.name} className="flex items-start gap-3 rounded-lg border border-ink-800 bg-ink-850/40 px-3 py-1.5">
      <button onClick={() => toggle(c.name)} className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${on ? "border-accent-400 bg-accent-500" : "border-ink-600 bg-ink-950"}`} title={on ? "hide from chat palette" : "show in chat palette"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[12px] text-accent-300">/{c.name}</span>
          {!!(c.aliases ?? []).length && <span className="font-mono text-[10px] text-fog-600">{(c.aliases ?? []).map((a: string) => "/" + a).join(" ")}</span>}
          {!!c.subcommands?.length && <span className="text-[10px] text-fog-600">{c.subcommands.length} subcommands</span>}
        </div>
        <div className="truncate text-[11.5px] text-fog-500">{c.description}</div>
      </div>
      <Btn onClick={() => onRun(c.name)} title="run in chat">
        run
      </Btn>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="filter commands…"
          className="w-56 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-[12px] text-fog-100 focus:outline-none"
        />
        <div className="flex gap-1 rounded-lg bg-ink-850 p-0.5">
          {(["curated", "all"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setPalettePrefs({ mode: m })}
              className={`rounded-md px-2.5 py-1 text-[11.5px] ${prefs.mode === m ? "bg-ink-700 text-fog-100" : "text-fog-400 hover:text-fog-200"}`}
              title={m === "curated" ? "chat palette shows chat-relevant commands only" : "every command appears in the chat palette"}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-fog-500">
          {inChat.length} in chat · {onlySettings.length} settings only · {commands.length} total
        </span>
        <Btn onClick={() => setPalettePrefs({ overrides: {} })}>reset overrides</Btn>
      </div>

      <p className="text-[11.5px] leading-relaxed text-fog-500">
        The <span className="font-mono text-fog-300">/</span> menu in the composer only lists what is checked here. Everything unchecked stays reachable from this
        panel — nothing is removed from the runtime.
      </p>

      <Group title="In chat palette" hint={String(inChat.length)}>
        {inChat.length === 0 ? <div className="text-[11.5px] text-fog-500">none</div> : inChat.map((c) => row(c, true))}
      </Group>

      <Group title="Settings only" hint={String(onlySettings.length)}>
        {onlySettings.length === 0 ? <div className="text-[11.5px] text-fog-500">none</div> : onlySettings.map((c) => row(c, false))}
      </Group>

      <button onClick={() => setShowAll((v) => !v)} className="text-[11px] text-fog-500 hover:text-fog-300">
        {showAll ? "hide" : "show"} command source settings
      </button>
      {showAll && (
        <Group title="Command sources" hint="commands.* / skills.enableSkillCommands">
          <ConfigList settings={sourceKeys} onSave={onSave} onReset={onReset} />
        </Group>
      )}

      <details className="rounded-lg border border-ink-800 bg-ink-850/30 px-3 py-2 text-[11px] text-fog-500">
        <summary className="cursor-pointer text-fog-400">curated default hides {SETTINGS_ONLY.length} commands</summary>
        <div className="mt-2 flex flex-wrap gap-1">
          {SETTINGS_ONLY.map((n) => (
            <span key={n} className="rounded bg-ink-800/70 px-1.5 py-0.5 font-mono text-[10px] text-fog-400">
              /{n}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}
