import { PanelSkeleton } from "@/components/ui/loading-shapes";
import { useEffect, useState } from "react";
import { get, put } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";
import { useRemote, Notice } from "./ManagementShared";
export default function ContextFilesPanel({ cwd, onRestart, onManagePersonas }: { cwd: string; onRestart: () => void; onManagePersonas: () => void }) {
  const { data, loading, error } = useRemote(`/api/context?cwd=${encodeURIComponent(cwd)}`);
  const [id, setId] = useState(""); const [text, setText] = useState(""); const [original, setOriginal] = useState("");
  const [fileLoading, setFileLoading] = useState(false); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const [failure, setFailure] = useState("");
  useEffect(() => { if (data?.files?.length && !id) setId(data.files[0].id); }, [data]);
  useEffect(() => {
    if (!id) return; let active = true; setFileLoading(true); setFailure("");
    get(`/api/context/file?cwd=${encodeURIComponent(cwd)}&id=${encodeURIComponent(id)}`).then(result => { if (active) { setText(result.text); setOriginal(result.text); } }).catch(e => active && setFailure(e.message)).finally(() => active && setFileLoading(false));
    return () => { active = false; };
  }, [id, cwd]);
  async function save() {
    setBusy(true); setFailure("");
    try { await put("/api/context/file", { cwd, id, text }); setOriginal(text); setNotice("Saved with a .bak backup. Restart the session to load the updated context."); } catch (e: any) { setFailure(e.message); } finally { setBusy(false); }
  }
  return <section className="settings-stack"><Notice error={error || failure} text={notice} /><SkeletonReveal loading={loading} skeleton={<PanelSkeleton panel="context-files"/>} label="Loading context files"><div className="settings-card settings-card-stack">
    <div className="flex flex-wrap items-center gap-3"><Select value={id} onValueChange={setId}><SelectTrigger className="w-full max-w-sm" aria-label="Context or prompt file"><SelectValue placeholder="Choose a context file" /></SelectTrigger><SelectContent>{data?.files?.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.scope === "user" ? "User" : "Project"} · {f.name}{f.exists ? "" : " (create)"}</SelectItem>)}</SelectContent></Select><span className="text-xs text-muted-foreground">{text !== original ? "Unsaved changes" : "Saved"}</span></div>
    <SkeletonReveal loading={fileLoading} skeleton={<PanelSkeleton panel="context-files"/>} label="Reading context file"><Textarea aria-label="Context file content" value={text} onChange={e => setText(e.target.value)} rows={16} spellCheck={false} className="min-h-80 resize-y font-mono text-[12px] leading-relaxed" /></SkeletonReveal>
    <div className="flex gap-2"><Button disabled={busy || fileLoading || !id || text === original} onClick={save}>{busy ? "Saving…" : "Save file"}</Button><Button variant="outline" onClick={onRestart}>Restart session</Button></div>
    <p className="text-xs leading-relaxed text-muted-foreground">OMP discovers these user and project files according to your context settings. For a role or style you choose for one chat, open <button type="button" className="underline underline-offset-2" onClick={onManagePersonas}>Personas</button>.</p>
  </div></SkeletonReveal></section>;
}
