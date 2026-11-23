import { Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ListSkeleton,ToolsSkeleton } from "@/components/ui/loading-shapes";
import { useEffect, useMemo, useState } from "react";
import { get } from "../../lib/api";
import { Btn, Empty, Group } from "./Controls";
import { ConfigList } from "./ConfigList";
import type { Setting } from "../../lib/settings";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";
import { Input } from "@/components/ui/input";

interface BuiltinTool {
  name: string;
  description: string;
  defaultEnabled: boolean;
}

/** tool name -> config key that gates it */
const TOOL_KEYS: Record<string, string> = {
  ast_edit: "astEdit.enabled",
  ast_grep: "astGrep.enabled",
  security_scan: "security.enabled",
  generate_image: "generate_image.enabled",
  web_search: "web_search.enabled",
  manage_skill: "skills.enableSkillCommands",
};

export function ToolsPanel({
  settings,
  settingsLoading=false,
  chatKey,
  onSave,
  onReset,
}: {
  settings: Setting[];
  settingsLoading?:boolean;
  chatKey: string | null;
  onSave: (key: string, value: unknown) => void;
  onReset: (key: string) => void;
}) {
  const [tools, setTools] = useState<BuiltinTool[]>([]);
  const [live, setLive] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get<{ tools: BuiltinTool[]; live: string[] | null }>(`/api/tools${chatKey ? `?key=${encodeURIComponent(chatKey)}` : ""}`)
      .then((r) => {
        setTools(r.tools ?? []);
        setLive(r.live ?? null);
      })
      .catch((e) => setErr(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [chatKey]);

  const byKey = useMemo(() => new Map(settings.map((s) => [s.key, s])), [settings]);
  const keyFor = (name: string) => TOOL_KEYS[name] ?? `${name}.enabled`;

  const filtered = tools.filter((t) => !q || `${t.name} ${t.description}`.toLowerCase().includes(q.toLowerCase()));
  const gated = filtered.filter((t) => byKey.has(keyFor(t.name)));
  const alwaysOn = filtered.filter((t) => !byKey.has(keyFor(t.name)));

  const approval = settings.filter((s) => s.key === "tools.approvalMode" || s.key === "tools.approval");
  const other = settings.filter((s) => s.key.startsWith("tools.") && !["tools.approvalMode", "tools.approval"].includes(s.key));

  return (
    <div className="settings-stack">
      <div className="settings-toolbar flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools…"
          aria-label="Search tools"
          className="min-w-52 flex-1 text-[13px]"
        />
        <span className="text-[11px] text-fog-500">{tools.length} built-in tools{live ? ` · ${live.length} active in this session` : ""}</span>
      </div>

      {err && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-200">{err}</div>}

      {approval.length>0&&<ConfigList settings={approval} onSave={onSave} onReset={onReset} />}
      <SkeletonReveal loading={loading || settingsLoading} skeleton={<ToolsSkeleton/>} label="Loading available tools">

      <Group title="Available tools">
        {gated.length === 0 ? (
          <Empty>No gated tools.</Empty>
        ) : (
          gated.map((t) => {
            const s = byKey.get(keyFor(t.name))!;
            const on = s.type === "boolean" ? !!s.value : String(s.value) !== "off" && !!s.value;
            const active = live?.includes(t.name);
            return (
              <div key={t.name} className="flex items-start gap-3 border-b border-border/50 py-4 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="setting-label break-all text-foreground">{t.name}</span>
                    {active && <Check className="size-3 text-muted-foreground" aria-label="Active in the current session"/>}
                    
                  </div>
                  <div className="setting-description">{t.description}</div>
                </div>
                <Switch checked={on} onCheckedChange={value=>onSave(s.key,s.type==="boolean"?value:value?"on":"off")} aria-label={`Enable ${t.name}`} />
              </div>
            );
          })
        )}
      </Group>

      <Group title="Runtime-managed tools"><p className="py-3 text-xs text-muted-foreground">Availability depends on the runtime, launch flags, and permissions. Checks mark tools reported by this session.</p><div className="grid gap-x-8 py-2 sm:grid-cols-2">{alwaysOn.map(t=><div key={t.name} title={t.description} className="flex items-center gap-3 py-3 text-[13px]"><span className="setting-label break-all">{t.name}</span>{live?.includes(t.name)&&<Check className="ml-auto size-3.5 text-muted-foreground" aria-label="Reported by this session"/>}</div>)}</div></Group>

      </SkeletonReveal>
      <div className="pt-2">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fog-500">Tool behavior</div>
        {other.length>0&&<ConfigList settings={other} onSave={onSave} onReset={onReset} hideAdvanced />}
      </div>
    </div>
  );
}
