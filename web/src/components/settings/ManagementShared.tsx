import { useCallback, useEffect, useState } from "react";
import { get } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProviderIcon } from "../ProviderIcon";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";

export function useRemote<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError(""); setData(null);
    if (!url) return () => { active = false; };
    get<T>(url).then(value => { if (active) setData(value); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [url, version]);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  return { data, setData, loading, error, refresh };
}
export function Notice({ error, text }: { error?: string; text?: string }) {
  if (!error && !text) return null;
  return <div role={error ? "alert" : "status"} className={`mb-4 rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${error ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border bg-secondary/40 text-muted-foreground"}`}>{error || text}</div>;
}
export function ModelPicker({ models, provider, modelId, onChange, label = "Model" }: { models: any[]; provider: string; modelId: string; onChange: (provider: string, id: string) => void; label?: string }) {
  const [open,setOpen]=useState(false);
  const value = provider && modelId ? JSON.stringify([provider, modelId]) : "";
  const selected = models.find(m => m.provider === provider && m.id === modelId);
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={open} aria-label={label} className="h-9 w-full min-w-0 justify-between font-normal"><span className="flex min-w-0 items-center gap-2">{provider&&<ProviderIcon provider={provider}/>}<span className="truncate">{selected?.name || modelId || "Choose a model"}</span></span><ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground"/></Button></PopoverTrigger><PopoverContent className="w-[min(460px,calc(100vw-32px))] p-0" align="start"><Command><CommandInput placeholder="Search model or provider…"/><CommandList className="max-h-72"><CommandEmpty>No matching models.</CommandEmpty>{models.map(m=><CommandItem key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id} ${m.name || ""}`} onSelect={()=>{onChange(m.provider,m.id);setOpen(false);}}><ProviderIcon provider={m.provider}/><span className="min-w-0 flex-1 truncate">{m.name || m.id}</span><span className="text-xs text-muted-foreground">{m.provider}</span></CommandItem>)}</CommandList></Command></PopoverContent></Popover>;
}
