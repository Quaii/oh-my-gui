import { PanelSkeleton } from "@/components/ui/loading-shapes";
import { useRef, useState } from "react";
import type { Persona, WebControlConfig } from "../../../../shared/control";
import { put } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Plus } from "lucide-react";
import { useRemote, Notice } from "./ManagementShared";

export default function PersonaPanel({ onSaved, onStart }: {
  onSaved: (config: WebControlConfig) => void;
  onStart: (persona: Persona) => void;
}) {
  const { data, setData, loading, error } = useRemote<WebControlConfig>("/api/control");
  const [draft, setDraft] = useState<Persona | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(""); const [failure, setFailure] = useState("");
  async function save() {
    if (!draft || !data) return;
    setBusy(true); setFailure("");
    try {
      const personas = [...data.personas.filter(p => p.id !== draft.id), draft];
      const result = await put<WebControlConfig>("/api/control", { personas });
      setData(result); onSaved(result); setNotice("Persona saved.");
    } catch (e: any) { setFailure(e.message); } finally { setBusy(false); }
  }
  async function importMarkdown(file: File) {
    const id = draft?.id;
    setFailure("");
    try {
      if (!/\.(md|markdown)$/i.test(file.name) || file.size > 240_000) throw Error("Choose a Markdown file of up to 60,000 characters.");
      const prompt = await file.text();
      if (!prompt.trim() || prompt.length > 60_000) throw Error("The Markdown file needs between 1 and 60,000 characters.");
      setDraft(current => current && current.id === id ? {
        ...current, prompt, name: current.name.trim() || file.name.replace(/\.(md|markdown)$/i, ""),
      } : current);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Could not read the Markdown file.");
    }
  }
  const saved = data?.personas.find(persona => persona.id === draft?.id);
  const canStart = saved && JSON.stringify(saved) === JSON.stringify(draft);
  return <div><Notice error={error || failure} text={notice} /><SkeletonReveal loading={loading} skeleton={<PanelSkeleton panel="personas"/>} label="Loading persona library"><div className="settings-stack">
    <div className="flex justify-between gap-3"><p className="text-[13px] text-muted-foreground">Choose a persona for one new chat. It applies from the first message and is stored with that conversation.</p><Button variant="ghost" size="sm" className="floating-action-button shrink-0" onClick={() => setDraft({ id: crypto.randomUUID(), name: "", prompt: "", placement: "first", stripIdentity: false })}><Plus className="size-4" />New persona</Button></div>
    <div className="grid gap-[var(--space-content)] empty:hidden sm:grid-cols-2">{data?.personas.map(p => <button key={p.id} onClick={() => setDraft({ ...p })} className="settings-card settings-card-action text-left transition-colors" aria-pressed={draft?.id === p.id}><span className="setting-label block">{p.name}</span><span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.prompt}</span></button>)}</div>
    {!data?.personas.length && !draft && <section className="persona-empty settings-card"><h3 className="setting-label">Create your first persona</h3><p className="mt-2 max-w-lg text-[13px] leading-relaxed text-muted-foreground">Define an optional role, communication style, or working approach for new conversations.</p></section>}
    {draft && <div className="persona-editor settings-card settings-card-stack">
      <label className="block space-y-2 text-[13px] font-medium">Name<Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Senior engineering reviewer" /></label>
      <div className="space-y-2">
        <label className="block space-y-2 text-[13px] font-medium">Persona prompt<Textarea value={draft.prompt} onChange={e => setDraft({ ...draft, prompt: e.target.value })} rows={9} maxLength={60_000} placeholder="Describe the role, tone, and working practices…" className="text-[13px] leading-relaxed" /></label>
        <input ref={fileInput} hidden type="file" accept=".md,.markdown,text/markdown" onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void importMarkdown(file);
        }} />
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>Import Markdown</Button>
      </div>
      <div className="setting-row"><Label>Placement</Label><Select value={draft.placement} onValueChange={v => setDraft({ ...draft, placement: v as Persona["placement"] })}><SelectTrigger aria-label="Persona placement" className="w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="first">Before OMP instructions</SelectItem><SelectItem value="append">After OMP instructions</SelectItem></SelectContent></Select></div>
      <label className="setting-row"><span><span className="block text-[13px] font-medium">Replace the default identity sentence</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Removes only “You are omp’s trusted coding assistant.” Tool schemas and project rules are preserved.</span></span><Switch checked={draft.stripIdentity} onCheckedChange={v => setDraft({ ...draft, stripIdentity: v })} aria-label="Replace default OMP identity sentence" /></label>
      <div className="flex flex-wrap gap-2"><Button onClick={save} disabled={busy || !draft.name.trim() || !draft.prompt.trim()}>{busy ? "Saving…" : "Save persona"}</Button>{saved && <Button variant="outline" disabled={!canStart || busy} onClick={() => onStart(saved)}>Start new chat</Button>}<Button variant="ghost" onClick={() => setDraft(null)}>Close editor</Button></div>
    </div>}
  </div></SkeletonReveal></div>;
}
