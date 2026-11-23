import {normalizeSkills} from "../../../../shared/skills";
import { PanelSkeleton } from "@/components/ui/loading-shapes";
import { NativeSettingsSkeleton } from "@/components/ui/native-settings-skeleton";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, post } from "../../lib/api";
import { Btn, Empty } from "./Controls";
import { ConfigList } from "./ConfigList";
import type { Setting } from "../../lib/settings";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { FolderOpen } from "../NavigationIcons";
import { Notice } from "./ManagementShared";
import { Search, RefreshCw } from "lucide-react";

interface SkillInfo {
  name: string;
  description?: string;
  filePath?: string;
  source?: string;
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
  const [folderError, setFolderError] = useState("");

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

  async function openFolder({ name, filePath }: SkillInfo) {
    if (!filePath) return;
    setFolderError("");
    try {
      await post("/api/skills/open-folder", { name, filePath });
    } catch (error) {
      setFolderError(error instanceof Error ? error.message : "Could not open the skill folder.");
    }
  }

  const discoveryKeys = settings.filter((s) => s.key.startsWith("skills.") && s.key !== "skills.ignoredSkills");

  return (
    <div className="settings-stack">
      <div className="flex flex-col gap-2">
        <p className="text-right text-xs text-muted-foreground">
          {busy ? "Discovering skills" : `${skills.length} skills · ${disabled.size} hidden`}
        </p>
        <div className="settings-toolbar flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={event => setQ(event.target.value)} placeholder="Search skills" aria-label="Search skills" className="pl-9" />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger aria-label="Skill source" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {[...new Set(skills.map(skill => skill.source || "unknown"))].map(value => <SelectItem value={value} key={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger aria-label="Skill visibility" className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All skills</SelectItem>
              <SelectItem value="visible">Enabled</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
          <Btn onClick={() => load(true)} disabled={busy}>
            <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Scanning" : "Rescan"}
          </Btn>
        </div>
      </div>
      {err && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-200">{err}</div>}
      <Notice error={folderError}/>

      <SkeletonReveal loading={busy} skeleton={<PanelSkeleton panel="skills"/>} label="Discovering installed skills">
      {filtered.length === 0 ? (
        <Empty>{skills.length ? "No skills match these filters." : err ? "Skill discovery could not be completed." : "No skills found."}</Empty>
      ) : (
        <div className="settings-card-stack">
          {filtered.map((s) => (
            <div key={s.name + (s.filePath ?? "")} className="skill-row settings-card settings-card-row">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className={`setting-label min-w-0 wrap-anywhere ${disabled.has(s.name) ? "text-muted-foreground" : "text-foreground"}`}>{s.name}</span>
                  <div className="flex min-w-0 items-center gap-1">
                    {s.source && <Badge variant="secondary" className="min-w-0 text-[10px] font-normal"><span className="truncate">{s.source}</span></Badge>}
                    {s.filePath && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="skill-folder-button shrink-0 text-muted-foreground"
                            aria-label={`Open folder for ${s.name}`}
                            onClick={() => void openFolder(s)}
                          >
                            <FolderOpen className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open folder</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                {s.description && <div className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">{s.description}</div>}
              </div>
              <Switch checked={!disabled.has(s.name)} onCheckedChange={() => toggle(s)} aria-label={`Enable ${s.name}`} />
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
