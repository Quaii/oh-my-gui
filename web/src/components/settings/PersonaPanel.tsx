import { PanelSkeleton } from "@/components/ui/loading-shapes";
import { useState } from "react";
import type { Persona, WebControlConfig } from "../../../../shared/control";
import { put } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";
import { Plus, UserRound } from "lucide-react";
import { useRemote, Notice } from "./ManagementShared";

export default function PersonaPanel() {
  const { data, setData, loading, error } = useRemote<WebControlConfig>("/api/control");
  const [draft, setDraft] = useState<Persona | null>(null);
  const [launch, setLaunch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(""); const [failure, setFailure] = useState("");
  async function save() {
    if (!draft || !data) return;
    setBusy(true); setFailure("");
    try {
      const personas = [...data.personas.filter(p => p.id !== draft.id), draft];
      const result = await put<WebControlConfig>("/api/control", { personas, defaultPersona: launch ? draft.id : data.defaultPersona === draft.id ? null : data.defaultPersona });
      setData(result); setNotice("Persona saved. Launch selection applies to new conversations; existing conversations keep their saved persona.");
    } catch (e: any) { setFailure(e.message); } finally { setBusy(false); }
  }
  return <div><Notice error={error || failure} text={notice} /><SkeletonReveal loading={loading} skeleton={<PanelSkeleton panel="personas"/>} label="Loading persona library">
    <div className="mb-5 flex justify-between gap-3"><p className="text-[13px] text-muted-foreground">Opt-in system instructions, stored with the conversation.</p><Button variant="outline" size="sm" onClick={() => { setDraft({ id: crypto.randomUUID(), name: "", prompt: "", placement: "first", stripIdentity: false }); setLaunch(false); }}><Plus className="size-4" />New persona</Button></div>
    <div className="mb-6 grid gap-3 sm:grid-cols-2">{data?.personas.map(p => <button key={p.id} onClick={() => { setDraft({ ...p }); setLaunch(data.defaultPersona === p.id); }} className={`rounded-xl border p-4 text-left transition-colors ${draft?.id === p.id ? "border-transparent bg-primary/10" : "border-border bg-card/40 hover:bg-card"}`}><UserRound className="mb-3 size-5 text-muted-foreground" /><span className="block text-sm font-medium">{p.name}</span><span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.prompt}</span>{data.defaultPersona === p.id && <span className="mt-3 block text-xs text-primary">Selected for new conversations</span>}</button>)}</div>
    {!data?.personas.length && !draft && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Create a persona to define an optional role, communication style, or working approach.</div>}
    {draft && <div className="space-y-5 rounded-2xl border border-border bg-card/40 p-5">
      <label className="block space-y-2 text-[13px] font-medium">Name<Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Senior engineering reviewer" /></label>
      <label className="block space-y-2 text-[13px] font-medium">Persona prompt<Textarea value={draft.prompt} onChange={e => setDraft({ ...draft, prompt: e.target.value })} rows={9} placeholder="Describe the role, tone, and working practices…" className="text-[13px] leading-relaxed" /></label>
      <div className="setting-row"><Label>Placement</Label><Select value={draft.placement} onValueChange={v => setDraft({ ...draft, placement: v as Persona["placement"] })}><SelectTrigger aria-label="Persona placement" className="w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="first">Before OMP instructions</SelectItem><SelectItem value="append">After OMP instructions</SelectItem></SelectContent></Select></div>
      <label className="setting-row"><span><span className="block text-[13px] font-medium">Replace the default identity sentence</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Removes only “You are omp’s trusted coding assistant.” Tool schemas and project rules are preserved.</span></span><Switch checked={draft.stripIdentity} onCheckedChange={v => setDraft({ ...draft, stripIdentity: v })} aria-label="Replace default OMP identity sentence" /></label>
      <label className="setting-row"><span><span className="block text-[13px] font-medium">Use for new conversations</span><span className="mt-1 block text-xs text-muted-foreground">Only one launch persona can be selected. No persona is enabled by default.</span></span><Switch checked={launch} onCheckedChange={setLaunch} aria-label="Use persona for new conversations" /></label>
      <div className="flex gap-2"><Button onClick={save} disabled={busy || !draft.name.trim() || !draft.prompt.trim()}>{busy ? "Saving…" : "Save persona"}</Button><Button variant="ghost" onClick={() => setDraft(null)}>Close editor</Button></div>
    </div>}
  </SkeletonReveal></div>;
}
