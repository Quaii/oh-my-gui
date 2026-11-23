import {normalizeSkills} from "../../../../shared/skills";
import { PanelSkeleton } from "@/components/ui/loading-shapes";
import { NativeSettingsSkeleton } from "@/components/ui/native-settings-skeleton";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { Btn, Empty, Group } from "./Controls";
import { ConfigList } from "./ConfigList";
import type { Setting } from "../../lib/settings";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";
import { Search, RefreshCw } from "lucide-react";

interface SkillInfo {
  name: string;
  description?: string;
  filePath?: string;
  baseDir?: string;
  source?: string;
  hide?: boolean;
}

export function SkillsPanel({
  settings,
  settingsLoading=false,
  onSave,
  onReset,
}: {
  settings: Setting[];
  settingsLoading?:boolean;
  onSave: (key: string, value: unknown) => void;
  onReset: (key: string) => void;
}) {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [source,setSource]=useState("all");
  const [visibility,setVisibility]=useState("all");
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setBusy(true);
    try {
      const r = await api<{ skills: SkillInfo[]; ignored: string[] }>(`/api/skills${refresh ? "?refresh=1" : ""}`, {signal:AbortSignal.timeout(45_000)});
      setSkills(normalizeSkills(r));
      setIgnored(Array.isArray(r.ignored) ? r.ignored.filter(v=>typeof v === "string") : []);
      setErr(null);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? skills.filter((s) => `${s.name} ${s.description ?? ""} ${s.source ?? ""}`.toLowerCase().includes(needle))
      : skills;
    return [...list].filter(s=>(source==="all" || (s.source || "unknown")===source) && (visibility==="all" || (visibility==="hidden")===ignored.includes(s.name))).sort((a, b) => a.name.localeCompare(b.name));
  }, [skills, q, source, visibility, ignored]);

  const savedIgnored=settings.find(s=>s.key==="skills.ignoredSkills")?.value;
  useEffect(()=>{if(Array.isArray(savedIgnored))setIgnored(savedIgnored as string[]);},[savedIgnored]);
  const disabled = new Set(ignored);

  function toggle(skill: SkillInfo) {
    const next = disabled.has(skill.name) ? ignored.filter((n) => n !== skill.name) : [...ignored, skill.name];
    setIgnored(next);
    onSave("skills.ignoredSkills", next);
  }

  const discoveryKeys = settings.filter((s) => s.key.startsWith("skills.") && s.key !== "skills.ignoredSkills");

  return (
    <div className="space-y-4">
      <div className="settings-toolbar flex flex-wrap items-center gap-3"><div className="relative min-w-[200px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search skills" aria-label="Search skills" className="pl-9"/></div><Select value={source} onValueChange={setSource}><SelectTrigger aria-label="Skill source" className="w-40"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem>{[...new Set(skills.map(s=>s.source || "unknown"))].map(v=><SelectItem value={v} key={v}>{v}</SelectItem>)}</SelectContent></Select><Select value={visibility} onValueChange={setVisibility}><SelectTrigger aria-label="Skill visibility" className="w-36"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All skills</SelectItem><SelectItem value="visible">Enabled</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent></Select><Btn onClick={()=>load(true)} disabled={busy}><RefreshCw className={`size-4 ${busy?"animate-spin":""}`}/>{busy?"Scanning":"Rescan"}</Btn></div><p className="text-xs text-muted-foreground">{busy?"Discovering skills":`${skills.length} skills · ${ignored.length} hidden`}</p>
      {err && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-200">{err}</div>}

      <SkeletonReveal loading={busy} skeleton={<PanelSkeleton panel="skills"/>} label="Discovering installed skills">
      {filtered.length === 0 ? (
        <Empty>{skills.length ? "No skills match these filters." : err ? "Skill discovery could not be completed." : "No skills found."}</Empty>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((s) => (
            <div key={s.name + (s.filePath ?? "")} className="skill-row flex items-start gap-4 rounded-xl border border-border/60 bg-card/50 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`setting-label ${disabled.has(s.name) ? "text-muted-foreground" : "text-foreground"}`}>{s.name}</span>
                  {s.source && <Badge variant="secondary" className="text-[10px] font-normal">{s.source}</Badge>}
                </div>
                {s.description && <div className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">{s.description}</div>}
                {s.filePath && <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground/70" title={s.filePath}>{s.filePath}</div>}
              </div>
              <Switch checked={!disabled.has(s.name)} onCheckedChange={() => toggle(s)} aria-label={`Enable ${s.name}`} className="mt-1" />
            </div>
          ))}
        </div>
      )}
      </SkeletonReveal>

      <div className="pt-2">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fog-500">Skill discovery</div>
        <SkeletonReveal loading={settingsLoading} skeleton={<NativeSettingsSkeleton prefix="skills."/>} label="Loading skill discovery settings"><ConfigList settings={discoveryKeys} onSave={onSave} onReset={onReset} /></SkeletonReveal>
      </div>
    </div>
  );
}
