import { ModelsSkeleton,ListSkeleton,CustomProvidersSkeleton } from "@/components/ui/loading-shapes";
import { useEffect, useState } from "react";
import { del, put } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRemote, Notice, ModelPicker } from "./ManagementShared";
import { SettingsHeading } from "./SettingsHeading";
import { ProviderIcon } from "../ProviderIcon";
import { Plus, Server } from "lucide-react";
import type { Setting } from "@/lib/settings";

const LEVELS = ["inherit", "off", "minimal", "low", "medium", "high", "xhigh", "max"];
export function ThinkingPicker({ value, onChange, label = "Thinking level" }: { value: string; onChange: (value: string) => void; label?: string }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="h-9 w-32"><SelectValue /></SelectTrigger><SelectContent>{LEVELS.map(level => <SelectItem value={level} key={level}>{level === "inherit" ? "Inherit" : level}</SelectItem>)}</SelectContent></Select>;
}
export function ModelRolesPanel({ chatKey, settings, settingsLoading=false, onSave }: { chatKey: string | null; settings: Setting[]; settingsLoading?:boolean; onSave: (key: string, value: unknown) => Promise<void> }) {
  const { data, loading, error } = useRemote(chatKey ? `/api/models?key=${encodeURIComponent(chatKey)}` : null);
  const roleSetting = settings.find(s => s.key === "modelRoles");
  const [roles, setRoles] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  useEffect(() => setRoles((roleSetting?.value as Record<string, string>) ?? {}), [roleSetting?.value]);
  const names = [...new Set(["default", "smol", "slow", "vision", "plan", "commit", "task", "advisor", "tiny", "memory", "image", "web", "speech", "dictation", "judge", ...Object.keys(roles)])];
  const parse = (selector: string) => { const match = selector.match(/:(inherit|off|minimal|low|medium|high|xhigh|max)$/); const base = match ? selector.slice(0, -match[0].length) : selector; const slash = base.indexOf("/"); return { provider: slash >= 0 ? base.slice(0, slash) : "", modelId: slash >= 0 ? base.slice(slash + 1) : "", thinking: match?.[1] || "inherit" }; };
  return <section className="settings-card-stack"><SettingsHeading title="Models by role" description="Assign a model and thinking level to specific workloads." /><Notice error={error} text={saved ? "Model roles saved. New workloads use these assignments." : ""} /><SkeletonReveal loading={loading || settingsLoading} skeleton={<ModelsSkeleton/>} label="Loading available models"><div className="settings-stack"><div className="settings-card settings-card-list divide-y divide-border">{[false,true].map(advanced => <details key={String(advanced)} open={advanced ? undefined : true}><summary className={advanced ? "cursor-pointer py-3 text-sm font-medium" : "hidden"}>{advanced ? "Advanced model overrides" : "Default model"}</summary>{names.filter(role => advanced ? role !== "default" : role === "default").map(role => { const value = parse(roles[role] || ""); return <div key={role} className="grid gap-3 py-4 lg:grid-cols-[100px_minmax(0,1fr)_128px]"><Label className="capitalize">{role}</Label><div className="flex min-w-0 gap-2"><div className="min-w-0 flex-1"><ModelPicker models={data?.models || []} {...value} label={`${role} role model`} onChange={(provider, modelId) => { setRoles({ ...roles, [role]: `${provider}/${modelId}${value.thinking === "inherit" ? "" : ":" + value.thinking}` }); setSaved(false); }} /></div>{roles[role] && <Button variant="ghost" size="sm" onClick={() => { const next = { ...roles }; delete next[role]; setRoles(next); setSaved(false); }}>Reset</Button>}</div>{["image","web","speech","dictation","judge"].includes(role)?<span className="self-center text-xs text-muted-foreground">Kind model role</span>:<ThinkingPicker value={value.thinking} label={`${role} thinking level`} onChange={thinking => { if (!value.modelId) return; setRoles({ ...roles, [role]: `${value.provider}/${value.modelId}${thinking === "inherit" ? "" : ":" + thinking}` }); setSaved(false); }} />}</div>; })}</details>)}</div><details className="settings-card"><summary className="cursor-pointer text-sm">Advanced native selectors</summary><p className="my-3 text-xs text-muted-foreground">Use native aliases, comma-separated availability selectors, or kind-model IDs. Failure fallback chains are configured in the settings below.</p>{names.map(role=><label key={role} className="mb-3 flex items-center gap-3 text-xs"><span className="w-20 shrink-0">{role}</span><Input aria-label={`${role} native selector`} value={roles[role] || ""} onChange={e=>{const next={...roles};if(e.target.value)next[role]=e.target.value;else delete next[role];setRoles(next);setSaved(false);}}/></label>)}</details><Button className="self-start" disabled={busy} onClick={async () => { setBusy(true); try { await onSave("modelRoles", roles); setSaved(true); } finally { setBusy(false); } }}>{busy ? "Saving…" : "Save model roles"}</Button></div></SkeletonReveal></section>;
}

const newProvider = () => ({ id: "", originalId: "", baseUrl: "http://127.0.0.1:1234/v1", api: "openai-completions", auth: "none", discovery: "openai-models-list", apiKey: "", apiKeyConfigured: false, models: [] as any[] });
export function CustomProvidersPanel({ onRestart }: { onRestart: () => void }) {
  const { data, loading, error, setData } = useRemote("/api/model-config");
  const [draft, setDraft] = useState<any>(null); const [busy, setBusy] = useState(false); const [failure, setFailure] = useState(""); const [notice, setNotice] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const hasModels = draft && (draft.models.length > 0 || draft.discovery);
  async function save() {
    setBusy(true); setFailure("");
    try { setData(await put("/api/model-config", draft)); setDraft(null); setNotice("Provider saved. Restart the session to refresh its model catalog."); } catch (e: any) { setFailure(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    setFailure("");
    try {
      setData(await del(`/api/model-config?provider=${encodeURIComponent(draft.originalId)}`));
      setConfirmRemove(false);
      setDraft(null);
      setNotice("Provider removed from OMP. Restart the session to refresh its model catalog.");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not remove this provider.");
    } finally {
      setBusy(false);
    }
  }
  return <section className="settings-card-stack"><SettingsHeading title="Custom API providers" description="Connect an API endpoint. Saved keys stay on this device." action={<Button variant="outline" size="sm" onClick={() => { setDraft(newProvider()); setFailure(""); }}><Plus className="size-4" />Add provider</Button>} /><Notice error={error} text={notice} /><SkeletonReveal loading={loading} skeleton={<CustomProvidersSkeleton/>} label="Loading provider configuration"><div className="settings-card-stack">{data?.providers.map((p: any) => <button key={p.id} onClick={() => { setDraft({ ...p, originalId: p.id, models: [...p.models], apiKey: "" }); setFailure(""); }} className="settings-card settings-card-action flex w-full items-center gap-3 text-left transition-colors"><ProviderIcon provider={p.id} website={p.baseUrl} className="size-6" /><div className="min-w-0 flex-1"><span className="block text-sm font-medium">{p.id}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{p.baseUrl}</span></div><span className="text-xs text-muted-foreground">{p.models.length} models{p.discovery ? " · discovery" : ""}</span></button>)}</div>{!data?.providers.length && <div className="settings-card border-dashed text-sm text-muted-foreground">Add a local OpenAI-compatible server, Ollama, LM Studio, or a custom endpoint.</div>}{notice && <Button variant="outline" size="sm" className="mt-4" onClick={onRestart}>Restart session</Button>}</SkeletonReveal>
    <Dialog open={!!draft} onOpenChange={v => { if (!v && !busy) { setConfirmRemove(false); setDraft(null); } }}><DialogContent className="provider-config-dialog max-h-[85vh] max-w-2xl overflow-y-auto overflow-x-hidden"><DialogHeader><DialogTitle>{confirmRemove ? "Remove provider?" : draft?.id || "Add custom provider"}</DialogTitle><DialogDescription>{confirmRemove ? `Remove ${draft?.originalId} and its model registrations from OMP. Files stored by the provider stay on disk.` : "Connect an API endpoint using models.yml."}</DialogDescription></DialogHeader><Notice error={failure} />{confirmRemove ? <DialogFooter>
      <Button variant="outline" autoFocus disabled={busy} onClick={() => { setConfirmRemove(false); setFailure(""); }}>Cancel</Button>
      <Button variant="destructive" disabled={busy} onClick={remove}>{busy ? "Removing…" : "Remove provider"}</Button>
    </DialogFooter> : draft && <div className="space-y-5">
      <label className="block space-y-2 text-[13px] font-medium">Provider ID<Input value={draft.id} onChange={e => setDraft({ ...draft, id: e.target.value })} placeholder="local-studio" /></label>
      <label className="block space-y-2 text-[13px] font-medium">Base URL<Input value={draft.baseUrl} onChange={e => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="http://127.0.0.1:1234/v1" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label className="mb-2">API protocol</Label><Select value={draft.api} onValueChange={api => setDraft({ ...draft, api })}><SelectTrigger aria-label="API protocol"><SelectValue /></SelectTrigger><SelectContent>{data?.apis.map((api: string) => <SelectItem key={api} value={api}>{api}</SelectItem>)}</SelectContent></Select></div><div><Label className="mb-2">Authentication</Label><Select value={draft.auth} onValueChange={auth => setDraft({ ...draft, auth })}><SelectTrigger aria-label="Provider authentication"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None — local endpoint</SelectItem><SelectItem value="apiKey">API key / environment variable</SelectItem></SelectContent></Select></div></div>
      {draft.auth === "apiKey" && <label className="block space-y-2 text-[13px] font-medium">API key or environment variable name<Input type="password" autoComplete="new-password" value={draft.apiKey} onChange={e => setDraft({ ...draft, apiKey: e.target.value })} placeholder={draft.apiKeyConfigured ? "Leave blank to keep the saved key" : "MY_PROVIDER_API_KEY"} /></label>}
      <div><Label className="mb-2">Model discovery</Label><Select value={draft.discovery || "off"} onValueChange={v => setDraft({ ...draft, discovery: v === "off" ? "" : v })}><SelectTrigger aria-label="Model discovery"><SelectValue /></SelectTrigger><SelectContent>{["off", "openai-models-list", "ollama", "llama.cpp", "lm-studio", "proxy"].map(d => <SelectItem key={d} value={d}>{d === "off" ? "Manual model list" : d}</SelectItem>)}</SelectContent></Select></div>
      <section><div className="mb-3 flex items-center justify-between"><Label>Manual models</Label><Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, models: [...draft.models, { id: "", name: "", contextWindow: 128000, maxTokens: 16384, reasoning: false, input: ["text"] }] })}><Plus className="size-3" />Add model</Button></div>{draft.models.map((m: any, i: number) => <div key={i} className="mb-3 space-y-3 rounded-xl border border-border p-4"><Input aria-label={`Model ${i + 1} ID`} value={m.id} onChange={e => setDraft({ ...draft, models: draft.models.map((x: any, j: number) => j === i ? { ...x, id: e.target.value, name: x.name || e.target.value } : x) })} placeholder="Model ID, e.g. qwen3-coder" /><div className="grid grid-cols-2 gap-3">{["contextWindow", "maxTokens"].map(k => <label key={k} className="text-xs text-muted-foreground">{k === "contextWindow" ? "Context window" : "Max output tokens"}<Input className="mt-1" type="number" min={1} value={m[k] || ""} onChange={e => setDraft({ ...draft, models: draft.models.map((x: any, j: number) => j === i ? { ...x, [k]: Number(e.target.value) } : x) })} /></label>)}</div><label className="flex items-center justify-between text-xs">Supports thinking<Switch checked={!!m.reasoning} onCheckedChange={v => setDraft({ ...draft, models: draft.models.map((x: any, j: number) => j === i ? { ...x, reasoning: v } : x) })} aria-label={`Model ${i + 1} supports thinking`} /></label><Button variant="ghost" size="sm" onClick={() => setDraft({ ...draft, models: draft.models.filter((_: any, j: number) => j !== i) })}>Remove model</Button></div>)}</section>
      {!hasModels && draft.originalId && <p className="text-xs text-muted-foreground">To remove the last model with discovery off, remove the provider.</p>}
      <DialogFooter className="sm:justify-between">
        {draft.originalId && <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => { setFailure(""); setConfirmRemove(true); }}>Remove provider</Button>}
        <Button className="sm:ml-auto" onClick={save} disabled={busy || !draft.id || !draft.baseUrl || !hasModels}>{busy ? "Saving…" : "Save provider"}</Button>
      </DialogFooter>
    </div>}</DialogContent></Dialog>
  </section>;
}
