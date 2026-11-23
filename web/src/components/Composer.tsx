import { PermissionControl } from "./PermissionControl";
import { QueueControls } from './QueueControls';
import { VoiceControls } from './VoiceControls';
import { appendDictation } from '../lib/dictation-draft';
import { useWordCompletion } from '../lib/use-word-completion';
import {supportsFastMode} from "../lib/model-capabilities";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { ContextUsage } from "./ContextUsage";
import { Attachment, AttachmentContent, AttachmentTitle, AttachmentDescription, AttachmentMedia, AttachmentActions, AttachmentAction } from "@/components/ui/attachment";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProviderIcon } from "./ProviderIcon";
import { PromptBox } from "@/components/ui/prompt-box";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChatState } from "../lib/store";
import { ArrowDownRight, Check, Brain, ChevronDown, Clock, Paperclip, Search, X, Zap } from "lucide-react";

export interface ComposerProps {
  chat: ChatState;
  launchFlags: string[];
  stats?: any;
  commands: any[];
  models: any[];
  thinkingLevels: string[];
  onSend: (text: string, images: any[]) => Promise<boolean>;
  onAbort: () => void;
  onModelChange: (provider: string, id: string) => void;
  onThinkingChange: (level: string) => void;
  onToggleFast: () => void;
  onSlash: (name: string) => void;
  streamingBehavior: "steer" | "followUp";
  setStreamingBehavior: (v: "steer" | "followUp") => void;
  /** Text pushed in from "edit and resend"; n increments to force a reset. */
  seed?: { text: string; n: number } | null;
  onSeedConsumed?: () => void;
}

const PLACEHOLDERS = ["Give OMP a task, or ask a question…", "Describe the next feature you want to build…", "Ask OMP to explore this codebase…"];

const MAX_IMAGES = 6;
const MAX_BYTES = 8 * 1024 * 1024;
const DRAFT_PREFIX = "ompfe.draft.";

function draftKey(key: string | null | undefined) {
  return key ? DRAFT_PREFIX + key : null;
}

export function Composer(props: ComposerProps) {
  const { chat, commands, models, thinkingLevels, onSend, onAbort, streamingBehavior, setStreamingBehavior } = props;
  const [submitting,setSubmitting]=useState(false);
  const [permissionsPending,setPermissionsPending]=useState(false);
  const [text, setText] = useState("");
  const [images, setImages] = useState<any[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [extensionBackup, setExtensionBackup] = useState<string | null>(null);
  const editorEvent = useRef<string | null>(null);
  const [palette, setPalette] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [modelOpen, setModelOpen] = useState(false);
  const [thinkOpen, setThinkOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);
  const latestDraft = useRef(text);
  latestDraft.current = text;

  const st = chat.state;
  const running = !!st?.isStreaming || chat.running;
  const model = st?.model;
  const key = draftKey(chat.key);
  const [cursor, setCursor] = useState(0), [focused, setFocused] = useState(false), [composing, setComposing] = useState(false);
  const completion = useWordCompletion(chat.key, text, cursor, focused && !composing && chat.loaded);

  /* ---- per-thread draft persistence (spec §2.3 / §6.2) ---- */
  useEffect(() => {
    if (!key) return;
    try {
      setText(localStorage.getItem(key) ?? "");
    } catch {
      setText("");
    }
    setImages([]);
    setExtensionBackup(null);
    setPalette({ open: false, index: 0 });
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      try {
        if (latestDraft.current) localStorage.setItem(key, latestDraft.current);
        else localStorage.removeItem(key);
      } catch {}
    };
  }, [key]);

  useEffect(() => {
    if (!key) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        if (text) localStorage.setItem(key, text);
        else localStorage.removeItem(key);
      } catch {}
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [text, key]);

  useEffect(() => {
    if (!props.seed) return;
    setText(props.seed.text);
    props.onSeedConsumed?.();
    requestAnimationFrame(() => taRef.current?.focus());
  }, [props.seed?.n]);

  useEffect(() => {
    const update = chat.editorUpdate;
    if (!update || editorEvent.current === `${chat.key}:${update.id}`) return;
    editorEvent.current = `${chat.key}:${update.id}`;
    setExtensionBackup(text);
    setText(update.text);
    requestAnimationFrame(() => taRef.current?.focus());
  }, [chat.editorUpdate, chat.key, text]);
  useEffect(() => {
    const receive = (event: Event) => {
      const result = event as CustomEvent<{ owner: string; text: string }>;
      if (result.detail.owner !== chat.key) return;
      event.preventDefault();
      setText(previous => appendDictation(previous, result.detail.text));
    };
    window.addEventListener('omp:dictation-result', receive);
    return () => window.removeEventListener('omp:dictation-result', receive);
  }, [chat.key]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const slashMatches = useMemo(() => {
    if (!text.startsWith("/")) return [];
    const q = text.slice(1).toLowerCase();
    return commands
      .filter((c) => c.name.toLowerCase().includes(q) || (c.aliases ?? []).some((a: string) => a.includes(q)))
      .slice(0, 12);
  }, [text, commands]);

  const filteredModels = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = models.map((m) => ({
      provider: m.provider,
      id: m.id,
      name: m.name ?? m.id,
      context: m.contextWindow,
    }));
    if (!q) return list;
    return list.filter((m) => `${m.provider}/${m.id} ${m.name}`.toLowerCase().includes(q));
  }, [models, filter]);

  useEffect(() => {
    setPalette((p) => ({ ...p, open: text.startsWith("/") && slashMatches.length > 0, index: 0 }));
  }, [text]);

  const submit = useCallback(
    (value?: string) => {
      const prompt = (value ?? text).trim();
      if (!prompt && images.length === 0) return;
      if(submitting||permissionsPending)return;
      const sentImages=images;setSubmitting(true);
      void onSend(prompt, images).then(ok=>{if(!ok){setText(current=>current || prompt);setImages(current=>current.length?current:sentImages);}else setExtensionBackup(null);}).finally(()=>setSubmitting(false));
      setText("");
      setImages([]);
      setPalette({ open: false, index: 0 });
      if (key) {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    },
    [text, images, onSend, key, submitting, permissionsPending]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // never swallow IME composition keys
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Tab' && !palette.open && completion.prediction && completion.prediction.text === text && cursor === text.length) {
      e.preventDefault();
      const accepted = completion.dismiss(true);
      if (accepted) { setText(text + accepted.suffix); setCursor(text.length + accepted.suffix.length); }
      return;
    }
    if (e.key === 'Escape' && completion.prediction) { completion.dismiss(); return; }
    if (!palette.open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPalette((p) => ({ ...p, index: (p.index + 1) % slashMatches.length }));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setPalette((p) => ({ ...p, index: (p.index - 1 + slashMatches.length) % slashMatches.length }));
      return;
    }
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const cmd = slashMatches[palette.index];
      if (cmd) {
        setText(`/${cmd.name} `);
        setPalette({ open: false, index: 0 });
        taRef.current?.focus();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setPalette({ open: false, index: 0 });
    }
  }

  async function attach(files: FileList | null) {
    if (!files) return;
    const next: any[] = [];
    for (const f of Array.from(files)) {
      if (images.length + next.length >= MAX_IMAGES) {
        setNotice(`up to ${MAX_IMAGES} images per message`);
        break;
      }
      if (!f.type.startsWith("image/")) {
        setNotice(`${f.name}: only images can be attached`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        setNotice(`${f.name}: over ${MAX_BYTES / 1024 / 1024} MB`);
        continue;
      }
      const buf = await f.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      next.push({ type: "image", data: btoa(bin), mimeType: f.type, name: f.name, size: f.size });
    }
    if (next.length) setImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
    if (fileRef.current) fileRef.current.value = "";
  }

  const queued = [...(chat.queue.steering ?? []), ...(chat.queue.followUp ?? [])];

  const chip = "composer-chip";
  const chipOn = "text-primary [&_svg]:text-primary";
  const menu =
    "composer-menus absolute bottom-full left-0 z-40 mb-2 overflow-hidden rounded-xl border border-border bg-popover elevate";

  return (
    <div className="w-full">
      {palette.open && (
        <div className="mb-2 overflow-hidden rounded-xl border border-border bg-popover elevate">
          <div className="label-cap px-3 pt-2 pb-1">commands</div>
          <div className="max-h-64 overflow-auto pb-1">
            {slashMatches.map((c, i) => (
              <button
                key={c.name}
                onMouseEnter={() => setPalette((p) => ({ ...p, index: i }))}
                onClick={() => {
                  setText(`/${c.name} `);
                  setPalette({ open: false, index: 0 });
                  taRef.current?.focus();
                }}
                className={`flex w-full items-center gap-3 px-3 py-1.5 text-left transition-colors t-fast ${
                  i === palette.index ? "bg-ink-750" : ""
                }`}
              >
                <span className="font-mono text-[12.5px] text-accent-300">/{c.name}</span>
                <span className="truncate text-[12.5px] text-fog-400">{c.description}</span>
                {c.input?.hint && (
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">{c.input.hint}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <QueueControls chat={chat} text={text} images={images} report={setNotice} restore={(restored, attachments) => { setText(previous => previous ? previous + '\n\n' + restored : restored); setImages(previous => [...previous, ...attachments]); }} interrupted={() => { setText(''); setImages([]); setExtensionBackup(null); }} />

      {extensionBackup !== null && <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">OMP updated the draft.<button className="underline" onClick={() => { setText(extensionBackup); setExtensionBackup(null); }}>Undo</button><button className="ml-auto" aria-label="Dismiss draft update" onClick={() => setExtensionBackup(null)}><X className="size-3" /></button></div>}
      {notice && (
        <div className="mb-2 rounded-md border-0 bg-primary/10 px-2.5 py-1 text-[11.5px] text-primary">
          {notice}
        </div>
      )}

      {images.length>0&&<div className="mb-3 flex flex-wrap gap-2">{images.map((img,i)=><Attachment key={i} size="sm"><AttachmentMedia variant="image"><img src={`data:${img.mimeType};base64,${img.data}`} alt={img.name || "Attachment"} className="size-full object-cover"/></AttachmentMedia><AttachmentContent><AttachmentTitle>{img.name || "Image"}</AttachmentTitle><AttachmentDescription>{Math.round((img.size || 0)/1024)} KB · ready</AttachmentDescription></AttachmentContent><AttachmentActions><AttachmentAction aria-label={`Remove ${img.name || "attachment"}`} onClick={()=>setImages(p=>p.filter((_,j)=>j!==i))}><X className="size-3"/></AttachmentAction></AttachmentActions></Attachment>)}</div>}

      <PromptBox
          trailingActions={<>
            <ContextUsage usage={st?.contextUsage} stats={props.stats}/>
            <VoiceControls chat={chat} draft={text} insert={spoken => setText(previous => appendDictation(previous, spoken))}/>
          </>}
        disabled={permissionsPending}
        value={text}
        onValueChange={setText}
        onSubmit={(prompt, effort) => {
          if (effort && effort.id !== st?.thinkingLevel) props.onThinkingChange(effort.id);
          submit(prompt);
        }}
        hasContent={images.length>0}
        status={running || submitting ? "streaming" : "idle"}
        onStop={onAbort}
        efforts={thinkingLevels.slice(Math.max(0, thinkingLevels.indexOf(st?.thinkingLevel ?? "off"))).map((l) => ({ id: l, label: l }))}
        placeholder={
          running ? [`Queue a ${streamingBehavior === "steer" ? "steering" : "follow-up"} message…`] : PLACEHOLDERS
        }
        hint={null}
        inputRef={taRef as any}
        completion={completion.prediction?.text === text ? completion.prediction.suffix : undefined}
        inputProps={{
          onKeyDown,
          onInput: e => setCursor(e.currentTarget.selectionStart === e.currentTarget.selectionEnd ? e.currentTarget.selectionStart : -1),
          onSelect: e => setCursor(e.currentTarget.selectionStart === e.currentTarget.selectionEnd ? e.currentTarget.selectionStart : -1),
          onFocus: e => { setFocused(true); setCursor(e.currentTarget.selectionStart); },
          onBlur: () => { setFocused(false); completion.dismiss(); },
          onCompositionStart: () => setComposing(true),
          onCompositionEnd: () => setComposing(false),
          "aria-label": "Message OMP",
        }}
        actions={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => fileRef.current?.click()} className={chip} aria-label="Attach images">
                  <Paperclip className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Attach images</TooltipContent>
            </Tooltip>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => attach(e.target.files)}
            />

            <Popover open={modelOpen} onOpenChange={setModelOpen}><PopoverTrigger asChild><button className={chip} aria-label={`Model: ${model?.name ?? model?.id ?? "none"}`}><ProviderIcon provider={model?.provider || ""}/><span className="max-w-[170px] truncate">{model?.name ?? model?.id ?? "Model"}</span><ChevronDown className="size-3"/></button></PopoverTrigger><PopoverContent side="top" align="start" className="w-[400px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl p-0"><Command><CommandInput placeholder="Search models" value={filter} onValueChange={setFilter}/><CommandList className="max-h-72 p-1.5"><CommandEmpty>No matching models</CommandEmpty>{filteredModels.map(m=><CommandItem key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id} ${m.name}`} className="min-h-10 gap-3 rounded-lg px-3" onSelect={()=>{props.onModelChange(m.provider,m.id);setModelOpen(false);}}><ProviderIcon provider={m.provider}/><span className="min-w-0 flex-1 truncate text-[13px]">{m.name}<span className="mt-0.5 block text-[11px] text-muted-foreground">{m.provider}{m.context?` · ${Math.round(m.context/1000)}k context`:""}</span></span>{m.provider===model?.provider&&m.id===model?.id&&<Check className="size-3.5"/>}</CommandItem>)}</CommandList></Command></PopoverContent></Popover>
            <DropdownMenu open={thinkOpen} onOpenChange={setThinkOpen}><DropdownMenuTrigger asChild><button className={chip} aria-label={`Thinking level: ${st?.thinkingLevel ?? "off"}`}><Brain className="size-3.5"/><span>{st?.thinkingLevel ?? "off"}</span><ChevronDown className="size-3"/></button></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="w-52 rounded-2xl p-2"><DropdownMenuLabel className="px-3 pb-2 pt-1 text-xs font-medium text-muted-foreground">Thinking level</DropdownMenuLabel><DropdownMenuRadioGroup value={st?.thinkingLevel || "off"} onValueChange={props.onThinkingChange}>{thinkingLevels.map(level=><DropdownMenuRadioItem key={level} value={level} className="min-h-9 rounded-lg text-[13px] capitalize">{level}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
            {supportsFastMode(st?.model) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={props.onToggleFast}
                  className={`${chip} ${st?.fastModeEnabled ? chipOn : ""}`}
                  aria-pressed={!!st?.fastModeEnabled}
                  aria-label="Fast mode"
                >
                  <Zap className="size-3" /><span className="hidden sm:inline">Fast</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Priority tier when the provider offers one</TooltipContent>
            </Tooltip>
            )}

            <PermissionControl launchFlags={props.launchFlags} onPendingChange={setPermissionsPending}/>
            {running && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setStreamingBehavior(streamingBehavior === "steer" ? "followUp" : "steer")}
                    className={chip}
                    aria-label={`Queued message delivery: ${streamingBehavior}`}
                  >
                    {streamingBehavior === "steer" ? (
                      <ArrowDownRight className="size-3" />
                    ) : (
                      <Clock className="size-3" />
                    )}
                    {streamingBehavior === "steer" ? "steer" : "follow-up"}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">How queued messages are delivered while running</TooltipContent>
              </Tooltip>
            )}

          </>
        }
      />


    </div>
  );
}
