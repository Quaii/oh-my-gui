import {DesktopWindowControls,dragDesktopWindow} from "../components/DesktopWindowControls";
import {PageTransition} from '../components/transitions/page-transition';
import {transitionUpdate} from '../lib/motion';
import {ErrorBoundary} from "../components/ErrorBoundary";
import { SessionWorkflows } from '../components/settings/SessionWorkflows';
import { RuntimeOutput } from '../components/RuntimeOutput';
import { ProviderAccounts } from '../components/settings/ProviderAccounts';
import { parseLaunchArgs, formatLaunchArgs, validateGuiLaunchArgs } from '../../../shared/launch-args';
import {supportsFastMode} from "../lib/model-capabilities";
import { SettingsNavigation, savedSettingsPanel, SettingGlyph, SETTINGS_ITEMS as ALL_ITEMS, type SettingsPanelId as PanelId } from "../components/settings/SettingsNavigation";
import { ProviderIcon } from "../components/ProviderIcon";
import { PanelSkeleton, ListSkeleton, ProviderSkeleton } from "@/components/ui/loading-shapes";
import { Switch } from "@/components/ui/switch";
import { Brand } from "../components/Brand";
import { Agent, AgentHeader, AgentContent, AgentInstructions, AgentTools, AgentTool } from "@/components/ui/agent";
import { AppearanceEditor } from "../components/settings/AppearanceEditor";
import { WorkspaceBackground } from "../components/Appearance";
import {ToolbarBlur} from "../components/ToolbarBlur";
import { RuntimePanel } from "../components/settings/RuntimePanel";
import { AppVersion } from '../components/settings/UpdatesPanel';
import { CustomProvidersPanel, ModelRolesPanel } from "../components/settings/ModelsPanel";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";
import { get, post, put } from "../lib/api";
import { fetchSettings, resetSetting, saveSetting, type Setting, type SettingsPayload } from "../lib/settings";
import { Btn, Empty, Group } from "../components/settings/Controls";
import { ConfigList } from "../components/settings/ConfigList";
import { McpPanel } from "../components/settings/McpPanel";
import { SkillsPanel } from "../components/settings/SkillsPanel";
import { ToolsPanel } from "../components/settings/ToolsPanel";
import { CommandsPanel } from "../components/settings/CommandsPanel";
import { AppearanceControls } from "../components/Appearance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, RotateCcw, Search } from "lucide-react";

const RoutingPanel = lazy(() => import("../components/settings/RoutingPanel"));
const UpdatesPanel = lazy(() => import('../components/settings/UpdatesPanel'));
const UsagePanel = lazy(() => import("../components/settings/UsagePanel"));
const PersonaPanel = lazy(() => import("../components/settings/PersonaPanel"));
const ExtensionsPanel = lazy(() => import("../components/settings/ExtensionsPanel"));
const ContextFilesPanel = lazy(() => import("../components/settings/ContextFilesPanel"));
const CapabilitiesPanel = lazy(() => import("../components/settings/CapabilitiesPanel"));
const NativeManager = lazy(() => import('../components/settings/NativeManager'));

const TAB_PANELS: Partial<Record<PanelId, string>> = {
  models: "model",
  providers: "providers",
  interaction: "interaction",
  tasks: "tasks",
  context: "context",
  memory: "memory",
  files: "files",
  shell: "shell",
  appearance: "appearance",
};



export interface SettingsPageProps {
  onBack: () => void;
  sidebarCollapsed:boolean;
  onToggleSidebar:()=>void;
  chat: any;
  config: any;
  onConfigSaved: (c: any) => void;
  onSend: (text: string) => void;
  flags: string[];
  setFlags: (f: string[]) => void;
  onRestart: () => void;
  info: any;
  onRefreshState: () => void;
}

export function SettingsPage(props: SettingsPageProps) {
  const { onBack, sidebarCollapsed, onToggleSidebar, chat, config, onConfigSaved, onSend, flags, setFlags, onRestart, info, onRefreshState } = props;

  const contentRef=useRef<HTMLDivElement>(null);
  const [panel,setPanel]=useState<PanelId>(savedSettingsPanel);
  useEffect(() => {
    const selectSavedPanel = () => setPanel(savedSettingsPanel());
    window.addEventListener('omp:settings-panel', selectSavedPanel);
    return () => window.removeEventListener('omp:settings-panel', selectSavedPanel);
  }, []);
  useEffect(() => {localStorage.setItem("ompfe.settings.panel", panel);contentRef.current?.scrollTo({top:0,behavior:"instant"});}, [panel]);
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState('');
  const [providersLoading,setProvidersLoading]=useState(true);
  const [providersError,setProvidersError]=useState("");
  const [providers, setProviders] = useState<any[]>([]);
  const [nameDraft, setNameDraft] = useState("");
  const [flagDraft, setFlagDraft] = useState(formatLaunchArgs(flags));
  const [cfg, setCfg] = useState<any>(config);
  const [raw, setRaw] = useState<string>(config?.text ?? "");
  const [savingCfg, setSavingCfg] = useState(false);

  useEffect(() => {
    setCfg(config);
    setRaw(config?.text ?? "");
  }, [config]);

  useEffect(() => {
    setLoading(true);
    fetchSettings()
      .then(setPayload)
      .catch((e) => setErr(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (panel === "providers" && chat.loaded) {
      setProvidersLoading(true);setProvidersError("");
      post("/api/cmd", { key: chat.key, cmd: { type: "get_login_providers" } })
        .then((r) => {if(!r.ok)throw Error(r.error);setProviders(r.data?.providers ?? []);})
        .catch(e=>setProvidersError(e.message)).finally(()=>setProvidersLoading(false));
    }
  }, [panel, chat.key, chat.loaded]);

  const cmd = useCallback(
    async (c: any) => {
      setErr(null);
      const r = await post("/api/cmd", { key: chat.key, cmd: c }).catch((e) => ({ ok: false, error: String(e) }));
      if (!r.ok) setErr((r as any).error);
      if (r.ok && r.data?.downloadUrl) setExportUrl(r.data.downloadUrl);
      onRefreshState();
      return r;
    },
    [chat.key, onRefreshState]
  );

  const save = useCallback(async (key: string, value: unknown) => {
    setErr(null);
    setPayload((p) =>
      p ? { ...p, settings: p.settings.map((s) => (s.key === key ? { ...s, value, explicit: true } : s)) } : p
    );
    try {
      const r = await saveSetting(key, value);
      if (!r.ok) {
        setErr(r.message);
        setPayload(await fetchSettings(true));
      } else {
        setNote(null);
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }, []);

  const reset = useCallback(async (key: string) => {
    setErr(null);
    try {
      const r = await resetSetting(key);
      if (!r.ok) setErr(r.message);
      setPayload(await fetchSettings(true));
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }, []);

  const settings: Setting[] = payload?.settings ?? [];
  const tab = TAB_PANELS[panel];
  const tabSettings = useMemo(() => (tab ? settings.filter((s) => s.ui?.tab === tab) : []), [settings, tab]);
  const searching = q.trim().length > 0;
  const current = ALL_ITEMS.find((i) => i.id === panel)?.label ?? "Settings";

  const st = chat.state;

  return (
    <div className="settings-layout flex h-full min-h-0 min-w-0 flex-1">
      <SettingsNavigation panel={panel} collapsed={sidebarCollapsed} onToggle={onToggleSidebar} onSelect={id=>transitionUpdate(()=>{setPanel(id);setQ("");})}/>

      <main className="settings-main workspace-main relative isolate flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <WorkspaceBackground />
      <header onMouseDown={dragDesktopWindow} className="settings-floating-toolbar flex h-16 items-center gap-3 px-5">
        <ToolbarBlur/>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label="Back to workspace"
          className="h-9 shrink-0 gap-2 rounded-xl text-muted-foreground"
        >
          <ArrowLeft className="size-4" /><span className="hidden sm:inline">Back to workspace</span>
        </Button>

        <div className="relative ml-auto hidden w-[300px] md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search settings…"
            aria-label="Search settings"
            className="h-9 rounded-xl border-0 bg-secondary/65 pl-8 text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-foreground/15"
          />
        </div>

        {/* mobile section picker */}
        <div className="ml-auto md:hidden">
          <Select value={panel} onValueChange={(v) => transitionUpdate(()=>{ setPanel(v as PanelId); setQ(""); })}>
            <SelectTrigger size="sm" className="w-[150px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_ITEMS.map((it) => (
                <SelectItem key={it.id} value={it.id} className="text-[12px]">
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" onClick={onRestart} aria-label="Restart session" className="restart-session-button h-9 rounded-xl"><RotateCcw className="size-3.5 shrink-0"/><span aria-hidden="true">Restart session</span></Button>
        </div>
        <DesktopWindowControls/>
      </header>
      {(note || err) && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-1.5">
          {note && <span className="truncate text-[11.5px] text-ok">{note}</span>}
          {exportUrl && <a href={exportUrl} className="text-xs underline" download>Download session HTML</a>}
          {err && (
            <span className="truncate text-[11.5px] text-destructive" title={err}>
              {err}
            </span>
          )}
        </div>
      )}


        {/* content */}
        <ScrollArea className="flex-1 min-h-0" viewportRef={contentRef} viewportClassName="settings-content min-h-0 min-w-0">
          <div className={`settings-page-content mx-auto w-full px-5 pb-10 sm:px-9 ${panel==="usage"&&!searching?"is-wide":"max-w-[920px]"}`}>
            <div className="mb-7"><h1 className="text-[24px] font-semibold tracking-tight">{searching ? "Search results" : current}</h1><p className="mt-2 text-[13px] text-muted-foreground">{panel === "usage" ? "Token trends, model usage, and activity across your workspace." : panel === "appearance" ? "Choose how your workspace looks and feels." : panel === "skills" ? "Discover and manage the skills available to OMP." : panel === "mcp" ? "Connect the tools and services your agent can use." : panel === "tools" ? "Manage the tools available to your agent." : panel === "session" ? "Controls for the current conversation." : "Configure this part of your workspace."}</p></div>
            <div className="mb-4 md:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search settings…"
                  aria-label="Search settings"
                  className="h-8 pl-8 text-[12px]"
                />
              </div>
            </div>

            <SkeletonReveal loading={loading && !payload && (searching || ["all", "interaction", "tasks", "memory", "files", "shell", "context"].includes(panel))} skeleton={<PanelSkeleton panel={searching?"all":panel}/>} label="Loading settings">
            <PageTransition id={searching?"search":panel} transition="fade" duration={160}>
            <ErrorBoundary key={panel}><Suspense fallback={<PanelSkeleton panel={panel}/>}>
            {searching ? (
              <ConfigList settings={settings} query={q} onSave={save} onReset={reset} />
            ) : panel === "runtime" ? (<RuntimePanel chatKey={chat.loaded ? chat.key : null}><details className="mb-5"><summary className="cursor-pointer py-3 text-sm">Launch configuration</summary><FlagsPanel flagDraft={flagDraft} setFlagDraft={setFlagDraft} onSave={() => { try { setFlags(validateGuiLaunchArgs(parseLaunchArgs(flagDraft))); onRestart(); } catch (error:any) { setErr(error.message); } }} /></details></RuntimePanel>
            ) : panel === "updates" ? (<UpdatesPanel/>
            ) : panel === "native" ? (<NativeManager cwd={info?.cwd || ''}/>
            ) : panel === "usage" ? (<UsagePanel />
            ) : panel === "routing" ? (<RoutingPanel chatKey={chat.loaded ? chat.key : null} />
            ) : panel === "personas" ? (<PersonaPanel />
            ) : panel === "extensions" ? (<ExtensionsPanel cwd={info?.cwd || ""} onRestart={onRestart} />
            ) : panel === "context-files" ? (<ContextFilesPanel cwd={info?.cwd || ""} onRestart={onRestart} />
            ) : panel === "capabilities" ? (<CapabilitiesPanel chatKey={chat.loaded ? chat.key : null} />
            ) : panel === "models" ? (<><ModelRolesPanel settingsLoading={loading && !payload} chatKey={chat.loaded ? chat.key : null} settings={settings} onSave={save} /><ConfigList settings={tabSettings.filter(s=>s.key!=="modelRoles")} onSave={save} onReset={reset} /></>
            ) : panel === "session" ? (
              <><SessionPanel st={st} chat={chat} cmd={cmd} nameDraft={nameDraft} setNameDraft={setNameDraft} /><details className="mt-6"><summary className="cursor-pointer py-3 text-sm">Advanced session diagnostics</summary><SessionWorkflows key={chat.key} chat={chat} cmd={cmd} /></details></>
            ) : panel === "flags" ? (
              <FlagsPanel
                flagDraft={flagDraft}
                setFlagDraft={setFlagDraft}
                onSave={() => {
                  try {
                    setFlags(validateGuiLaunchArgs(parseLaunchArgs(flagDraft)));
                    onRestart();
                  } catch (error: any) { setErr(error.message); }
                }}
              />
            ) : panel === "providers" ? (
              <><RuntimeOutput outputs={[]} links={chat.authLinks} /><CustomProvidersPanel onRestart={onRestart} /><ProvidersPanel
                providers={providers}
                loading={providersLoading}
                error={providersError}
                cmd={cmd}
                settings={settings.filter((s) => s.ui?.tab === "providers")}
                onSave={save}
                onReset={reset}
              /></>
            ) : panel === "tools" ? (
              <ToolsPanel settingsLoading={loading && !payload} settings={settings} chatKey={chat.loaded ? chat.key : null} onSave={save} onReset={reset} />
            ) : panel === "skills" ? (
              <SkillsPanel settingsLoading={loading && !payload} settings={settings} onSave={save} onReset={reset} />
            ) : panel === "mcp" ? (
              <McpPanel cwd={info?.cwd ?? ""} onRestart={onRestart} />
            ) : panel === "commands" ? (
              <CommandsPanel
                commands={chat.commands ?? []}
                settings={settings}
                onSave={save}
                onReset={reset}
                onRun={(name) => {
                  onBack();
                  onSend(`/${name} `);
                }}
              />
            ) : panel === "all" ? (
              <ConfigList settings={settings} onSave={save} onReset={reset} />
            ) : panel === "config" ? (
              <RawConfigPanel
                cfg={cfg}
                raw={raw}
                setRaw={setRaw}
                saving={savingCfg}
                setCfg={setCfg}
                setSaving={setSavingCfg}
                onSaved={onConfigSaved}
                onErr={setErr}
              />
            ) : panel === "about" ? (
              <AboutPanel info={info} chat={chat} />
            ) : tab ? (
              <div className="space-y-4">
                {panel === "appearance" && <><ThemeBlock /><AppearanceEditor /></>}
                {panel === "appearance" ? <details className="harness-display-settings"><summary className="cursor-pointer py-3 text-[13px] text-muted-foreground">Harness display settings</summary><ConfigList settings={tabSettings} onSave={save} onReset={reset} hideAdvanced /></details> : <ConfigList settings={tabSettings} onSave={save} onReset={reset} hideAdvanced />}
              </div>
            ) : (
              <Empty>Nothing here.</Empty>
            )}
            </Suspense></ErrorBoundary></PageTransition>
            </SkeletonReveal>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="setting-row settings-field">
      <Label className="flex items-center gap-2.5 text-[14px] font-medium text-foreground"><SettingGlyph settingKey={label.toLowerCase()} type="string"/>{label}</Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Pill({on,onClick,label}:{on:boolean;onClick:()=>void;children:React.ReactNode;label?:string}){return <Switch checked={on} onCheckedChange={onClick} aria-label={label || "Toggle setting"}/>;}

function SessionPanel({
  st,
  chat,
  cmd,
  nameDraft,
  setNameDraft,
}: {
  st: any;
  chat: any;
  cmd: (c: any) => Promise<any>;
  nameDraft: string;
  setNameDraft: (v: string) => void;
}) {
  return (
    <div>
      <Group title="Model">
        <Field label="Active model">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12.5px] text-fog-200">
              {st?.model?.provider}/{st?.model?.id}
            </span>
            <Btn onClick={() => cmd({ type: "cycle_model" })}>cycle</Btn>
          </div>
        </Field>
        <Field label="Thinking level">
          <Select
            value={st?.thinkingLevel ?? "off"}
            onValueChange={(v) => cmd({ type: "set_thinking_level", level: v })}
          >
            <SelectTrigger size="sm" className="w-[150px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(chat.thinkingLevels ?? ["off", "low", "medium", "high", "xhigh", "max"]).map((l: string) => (
                <SelectItem key={l} value={l} className="text-[12px]">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {supportsFastMode(st?.model)&&<Field label="Fast mode">
          <Pill label="Fast mode" on={!!st?.fastModeEnabled} onClick={() => cmd({ type: "set_fast_mode", enabled: !st?.fastModeEnabled })}>
            {st?.fastModeEnabled ? "on" : "off"}
          </Pill>
        </Field>}
        {st?.slowModeSupported && <Field label={`Slow mode${st?.slowModeScope === 'global' ? ' (global)' : ''}`}>
          <Pill label="Slow mode" on={!!st?.slowModeEnabled} onClick={() => cmd({ type: "set_slow_mode", enabled: !st?.slowModeEnabled })}>
            {st?.slowModeEnabled ? "on" : "off"}
          </Pill>
        </Field>}
      </Group>

      <Group title="Interaction">
        <Field label="Steering mode">
          <Select value={st?.steeringMode ?? "one-at-a-time"} onValueChange={(v) => cmd({ type: "set_steering_mode", mode: v })}>
            <SelectTrigger size="sm" className="w-[170px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["one-at-a-time", "all"].map((o) => (
                <SelectItem key={o} value={o} className="text-[12px]">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Follow-up mode">
          <Select value={st?.followUpMode ?? "one-at-a-time"} onValueChange={(v) => cmd({ type: "set_follow_up_mode", mode: v })}>
            <SelectTrigger size="sm" className="w-[170px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["one-at-a-time", "all"].map((o) => (
                <SelectItem key={o} value={o} className="text-[12px]">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Auto compaction">
          <Pill label="Auto compaction"
            on={!!st?.autoCompactionEnabled}
            onClick={() => cmd({ type: "set_auto_compaction", enabled: !st?.autoCompactionEnabled })}
          >
            {st?.autoCompactionEnabled ? "on" : "off"}
          </Pill>
        </Field>
        <Field label="Auto retry">
          <div className="flex gap-2"><Btn onClick={() => cmd({ type: "set_auto_retry", enabled: true })}>Enable</Btn><Btn onClick={() => cmd({ type: "set_auto_retry", enabled: false })}>Disable</Btn></div>
        </Field>
      </Group>

      <details className="my-5"><summary className="cursor-pointer py-3 text-sm text-muted-foreground">Agent setup and project instructions</summary><Agent><AgentHeader name="OMP" model={st?.model?.id}/><AgentContent><AgentInstructions>{(Array.isArray(st?.systemPrompt)?st.systemPrompt:[st?.systemPrompt]).filter((x:any)=>typeof x==="string").join("\n\n") || "The runtime has not reported a system prompt."}</AgentInstructions>{st?.dumpTools?.length>0&&<AgentTools>{st.dumpTools.map((t:any,i:number)=><AgentTool key={i} value={String(i)} tool={typeof t==="string"?{description:t}:{description:t.description||t.name,jsonSchema:t.parameters||t.inputSchema}}/>)}</AgentTools>}</AgentContent></Agent></details>
      <Group title="Session">
        <Field label="Name">
          <div className="flex gap-2">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={chat.title ?? "unnamed"}
              className="h-7 max-w-[280px] text-[12.5px]"
            />
            <Btn onClick={() => cmd({ type: "set_session_name", name: nameDraft || null })}>rename</Btn>
          </div>
        </Field>
        <Field label="Actions">
          <div className="flex flex-wrap gap-1.5">
            <Btn onClick={() => cmd({ type: "compact" })}>compact now</Btn>
            <Btn onClick={() => cmd({ type: "new_session" })}>new session</Btn>
            <Btn onClick={() => cmd({ type: "fork" })}>fork</Btn>
            <Btn onClick={() => cmd({ type: "export_html" })}>export html</Btn>
            <Btn tone="danger" onClick={() => cmd({ type: "abort" })}>
              abort run
            </Btn>
          </div>
        </Field>
        <Field label="Session id">
          <span className="font-mono text-[12px] text-muted-foreground">{st?.sessionId ?? "-"}</span>
        </Field>
        <Field label="Usage">
          <span className="font-mono text-[12px] text-muted-foreground">
            {st?.contextUsage?.tokens ?? st?.contextUsage?.used ?? "-"} / {st?.model?.contextWindow ?? "-"} tokens
            {chat.tokensPerSecond ? ` · ${chat.tokensPerSecond} tok/s` : ""}
          </span>
        </Field>
      </Group>
    </div>
  );
}

function FlagsPanel({
  flagDraft,
  setFlagDraft,
  onSave,
}: {
  flagDraft: string;
  setFlagDraft: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
        Extra CLI flags passed to <span className="font-mono text-fog-200">omp --mode rpc-ui</span> when a session starts. Quote paths or values containing spaces.
        Changing them restarts the current session process (the transcript stays on disk).
      </p>
      <Textarea
        value={flagDraft}
        onChange={(e) => setFlagDraft(e.target.value)}
        rows={4}
        spellCheck={false}
        placeholder="--approval-mode write --no-lsp --tools read,bash,edit,write"
        className="resize-y font-mono text-[12.5px]"
      />
      <Btn tone="primary" onClick={onSave}>
        save &amp; restart session
      </Btn>
      <div className="space-y-1 rounded-xl border border-border bg-card/50 p-3 font-mono text-[11.5px] text-muted-foreground">
        {[
          "--approval-mode always-ask|always-ask-cached|write|yolo",
          "--auto-approve",
          "--tools read,bash,edit,write",
          "--no-tools / --no-lsp / --no-skills / --no-extensions",
          "--thinking off|low|medium|high|xhigh|max",
          "--advisor  (passive review runtime)",
          "--plan-yolo / --prewalk",
          "--max-cost 5 / --max-time 30m",
          "--session-dir <path> / --no-session",
          "--model openai/gpt-5.2  --provider <id>",
        ].map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function ProvidersPanel({
  providers,
  loading,
  error,
  cmd,
  settings,
  onSave,
  onReset,
}: {
  providers: any[];
  loading:boolean;
  error:string;
  cmd: (c: any) => Promise<any>;
  settings: Setting[];
  onSave: (key: string, value: unknown) => void;
  onReset: (key: string) => void;
}) {
  const [filter,setFilter]=useState("");
  return (
    <div className="space-y-4"><div className="flex items-center justify-between gap-4"><h2 className="text-sm font-semibold">Provider accounts</h2><Input value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter providers" placeholder="Find a provider…" className="h-9 max-w-64 rounded-xl"/></div>
      <SkeletonReveal loading={loading} skeleton={<ProviderSkeleton/>} label="Loading provider accounts"><div className="space-y-1.5">
        {providers.filter(p=>`${p.name} ${p.id}`.toLowerCase().includes(filter.toLowerCase())).map((p) => (
          <div key={p.id} className="rounded-xl bg-card/50 px-4 py-3"><div className="flex items-center gap-3"><ProviderIcon provider={p.id} className="size-6"/>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] text-fog-100">{p.name}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{p.id}</div>
            </div>
            <Badge variant={p.authenticated ? "default" : "secondary"} className="text-[10.5px] font-normal">
              {p.authenticated ? "signed in" : "not signed in"}
            </Badge>
            {p.available && <Btn onClick={() => cmd({ type: "login", providerId: p.id })}>login</Btn>}
            </div><ProviderAccounts providerId={p.id} cmd={cmd}/>
          </div>
        ))}
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{!loading&&!error&&providers.length===0&&<Empty>No providers available.</Empty>}
      </div></SkeletonReveal>
      <p className="text-[11px] text-muted-foreground">
        Provider auth lives in the <span className="font-mono">~/.omp/agent</span> credential store. Use{" "}
        <span className="font-mono">omp auth export</span> to back it up.
      </p>
      <ConfigList settings={settings} onSave={onSave} onReset={onReset} hideAdvanced />
    </div>
  );
}

function RawConfigPanel({
  cfg,
  raw,
  setRaw,
  saving,
  setCfg,
  setSaving,
  onSaved,
  onErr,
}: {
  cfg: any;
  raw: string;
  setRaw: (v: string) => void;
  saving: boolean;
  setCfg: (c: any) => void;
  setSaving: (v: boolean) => void;
  onSaved: (c: any) => void;
  onErr: (e: string | null) => void;
}) {
  const [mode, setMode] = useState<"form" | "yaml">("form");
  async function saveConfig(next: { text?: string; data?: any }) {
    setSaving(true);
    onErr(null);
    try {
      const res = await put("/api/config", next);
      onSaved(res);
      setCfg(res);
      setRaw(res.text);
    } catch (e: any) {
      onErr(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="truncate font-mono text-[11.5px] text-muted-foreground">{cfg?.path}</span>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as "form" | "yaml")}
          variant="outline"
          size="sm"
          className="ml-auto"
        >
          <ToggleGroupItem value="form" className="px-2 text-[11.5px]">
            form
          </ToggleGroupItem>
          <ToggleGroupItem value="yaml" className="px-2 text-[11.5px]">
            yaml
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {mode === "yaml" ? (
        <>
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={22}
            spellCheck={false}
            className="resize-y font-mono text-[12.5px] leading-relaxed"
          />
          <div className="flex gap-2">
            <Btn tone="primary" onClick={() => saveConfig({ text: raw })} disabled={saving}>
              {saving ? "saving…" : "save yaml"}
            </Btn>
            <Btn onClick={() => setRaw(cfg?.text ?? "")}>revert</Btn>
          </div>
        </>
      ) : (
        <>
          <ConfigTree value={cfg?.data ?? {}} onChange={(data) => setCfg({ ...cfg, data })} />
          <Btn tone="primary" onClick={() => saveConfig({ data: cfg?.data ?? {} })} disabled={saving}>
            {saving ? "saving…" : "save settings"}
          </Btn>
        </>
      )}
      <p className="text-[11px] text-muted-foreground">
        This is the raw <span className="font-mono">config.yml</span> file. Typed settings above write through{" "}
        <span className="font-mono">omp config set</span>; both land in the same file.
      </p>
    </div>
  );
}

function AboutPanel({ info, chat }: { info: any; chat: any }) {
  return (
    <div className="space-y-2 font-mono text-[12px] text-fog-300">
      <AppVersion/>
      <section className="mb-8 font-sans"><h2 className="mb-2 text-base font-semibold text-foreground">Credits</h2><p className="mb-4 text-sm text-muted-foreground">The libraries and creators behind this workspace.</p><div className="divide-y divide-border rounded-xl border bg-card/40 px-4">{[["shadcn/ui","Accessible interface primitives","https://ui.shadcn.com/"],["Rare UI","Chat, themes, tasks, code, and project components","https://www.rareui.com/"],["23rd","Interactive shader backgrounds","https://www.23rd.dev/"],["React Bits · David Haz","63 ambient background renderers · locally captured previews","https://reactbits.dev/"],["Transitions.dev","Loading and reveal motion","https://transitions.dev/library.html"],["Lucide","Workspace icon set","https://lucide.dev/"],["Phosphor","Workspace icon set","https://phosphoricons.com/"],["Tabler","Workspace icon set · MIT","https://tabler.io/icons"],["Heroicons","Workspace icon set · MIT","https://heroicons.com/"],["Remix Icon","Workspace icon set · Apache 2.0","https://remixicon.com/"],["Bootstrap Icons","Workspace icon set · MIT","https://icons.getbootstrap.com/"],["Lobe Icons","AI provider marks","https://github.com/lobehub/lobe-icons"],["Material Icon Theme","File type icons","https://github.com/material-extensions/vscode-material-icon-theme"],["Unslop · Damir Sokolovsky","Interface review workflow · CC BY 4.0","https://github.com/heydamir/unslop"]].map(([name,description,url])=><a key={name} href={url} target="_blank" rel="noreferrer" className="flex flex-wrap items-center justify-between gap-2 py-4 text-[13px] hover:text-foreground"><span className="font-medium text-foreground">{name}</span><span className="text-xs text-muted-foreground">{description}</span></a>)}</div></section><h2 className="mb-4 font-sans text-base font-semibold text-foreground">Installation details</h2><div>omp binary: {info?.omp}</div>
      <div>agent dir: {info?.agentDir}</div>
      <div>session dir: {info?.sessionsDir}</div>
      <div>cwd: {info?.cwd}</div>
      <div>protocol: {JSON.stringify(chat.ready ?? {})}</div>
      <div className="pt-3 font-sans text-[11.5px] leading-relaxed text-muted-foreground">
        Settings write to <span className="font-mono">~/.omp/agent/config.yml</span> through the omp CLI itself, MCP
        servers to <span className="font-mono">~/.omp/agent/mcp.json</span> (user) or{" "}
        <span className="font-mono">&lt;cwd&gt;/.omp/mcp.json</span> (project). Nothing here reimplements the runtime.
      </div>
    </div>
  );
}

function ConfigTree({ value, onChange, path = "" }: { value: any; onChange: (v: any) => void; path?: string }) {
  if (value === null || typeof value !== "object") {
    return <PrimitiveInput value={value} onChange={onChange} />;
  }
  const isArray = Array.isArray(value);
  return (
    <div className={`space-y-1.5 ${path ? "border-l border-border pl-3" : ""}`}>
      {Object.entries(value).map(([k, v]) => (
        <div key={k} className="rounded-xl border border-border bg-card/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-fog-300">{k}</span>
            <span className="text-[10.5px] text-muted-foreground">
              {Array.isArray(v) ? `array(${v.length})` : v === null ? "null" : typeof v}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = { ...value };
                delete next[k];
                onChange(next);
              }}
              className="ml-auto h-6 px-1.5 text-[10.5px] font-normal text-muted-foreground hover:text-destructive"
            >
              remove
            </Button>
          </div>
          <div className="mt-1.5">
            {v !== null && typeof v === "object" ? (
              <ConfigTree value={v} path={`${path}.${k}`} onChange={(nv) => onChange({ ...value, [k]: nv })} />
            ) : (
              <PrimitiveInput value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} />
            )}
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const key = prompt("New key name");
          if (!key) return;
          onChange({ ...value, [key]: isArray ? [] : "" });
        }}
        className="h-7 border-dashed text-[11px] font-normal"
      >
        + add key
      </Button>
    </div>
  );
}

function PrimitiveInput({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  if (typeof value === "boolean") {
    return (
      <Button
        variant={value ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(!value)}
        className="h-6 px-2 text-[11px] font-mono"
      >
        {String(value)}
      </Button>
    );
  }
  if (typeof value === "number") {
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-40 font-mono text-[12px]"
      />
    );
  }
  if (Array.isArray(value)) {
    return (
      <Textarea
        value={value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean))}
        rows={Math.min(6, Math.max(2, value.length))}
        className="resize-y font-mono text-[12px]"
      />
    );
  }
  return (
    <Input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 font-mono text-[12px]"
    />
  );
}

/* ------------------------------------------------------------------ */

function ThemeBlock() {
  return (
    <Group title="Workspace theme">
      <div className="p-2 py-5"><AppearanceControls expanded/></div>
    </Group>
  );
}
