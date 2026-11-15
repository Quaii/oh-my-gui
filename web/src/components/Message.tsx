import {Button} from "./ui/button";
import {Textarea} from "./ui/textarea";
import {Attachment,AttachmentGroup,AttachmentMedia,AttachmentContent,AttachmentTitle,AttachmentDescription} from "./ui/attachment";
import { TerminalCommand } from "@/components/ui/ai-trace";
import { coalesceAssistantBlocks } from "../lib/transcript";
import { Reasoning, TraceRow } from "@/components/ui/ai-trace";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "./Markdown";
import { ToolCard, type ToolRunView } from "./ToolCard";
import { StreamingResponse } from "@/components/ui/streaming-response";
import { GridReveal } from "@/components/ui/grid-reveal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, ChevronRight, Copy, Pencil, RefreshCw, Sparkles, ListChecks } from "lucide-react";

/** tables are the one thing the streaming renderer does not parse */
function hasTable(text: string) {
  return /^\s*\|.*\|\s*$/m.test(text);
}

function blockText(content: any): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((c) => c && c.type === "text")
    .map((c) => c.text)
    .join("");
}

function imagesOf(content: any): any[] {
  if (!Array.isArray(content)) return [];
  return content.filter((c) => c && c.type === "image");
}

/* ------------------------------------------------------------------ */
/* message utilities                                                    */
/* ------------------------------------------------------------------ */

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [done, setDone] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => {
            onClick();
            if(label.startsWith("Copy"))setDone(true);
            setTimeout(() => setDone(false), 1200);
          }}
          aria-label={label}
          className="grid size-6 place-items-center rounded text-muted-foreground transition-colors t-fast hover:bg-ink-750 hover:text-fog-100"
        >
          {done ? <Check className="size-3" /> : children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" hideArrow sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}

function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="message-actions absolute left-0 top-full z-10 mt-1 flex items-center gap-0.5 rounded-lg bg-background/90 opacity-0 transition-opacity t-base focus-within:opacity-100 group-hover/msg:opacity-100">
      {children}
    </div>
  );
}

export interface MessageActions {
  onCopy?: (text: string) => void;
  onRegenerate?: () => void;
  onEdit?: (text: string) => Promise<boolean>;
}

export function UserMessage({ message, actions }: { message: any; actions?: MessageActions }) {
  const text = blockText(message.content);
  const imgs = imagesOf(message.content);
  const [editing,setEditing]=useState(false),[draft,setDraft]=useState(text),[saving,setSaving]=useState(false),[editError,setEditError]=useState("");
  const editField=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{if(editing){editField.current?.focus();editField.current?.setSelectionRange(draft.length,draft.length);}},[editing]);
  async function resend(){if(saving||!draft.trim()||!actions?.onEdit)return;setSaving(true);setEditError("");try{if(await actions.onEdit(draft))setEditing(false);else setEditError("Message could not be sent. Your edit is still here.");}catch{setEditError("Message could not be sent. Try again.");}finally{setSaving(false);}}
  return (
    <div className="user-message group/msg relative fade-up flex flex-col items-end">
      <div className={"user-message-surface max-w-[min(720px,92%)] rounded-xl border border-border bg-ink-800 px-4 py-2.5 "+(editing?"is-editing":"")}>
        {imgs.length > 0 && (
          <AttachmentGroup className="mb-2">{imgs.map((img,i)=><Attachment key={i} size="sm"><AttachmentMedia variant="image"><img alt={img.name||'Attached image'} src={'data:'+(img.mimeType||'image/png')+';base64,'+img.data}/></AttachmentMedia><AttachmentContent><AttachmentTitle>{img.name||'Attached image'}</AttachmentTitle><AttachmentDescription>{(img.mimeType||'image/png').split('/')[1].toUpperCase()} · {Math.max(1,Math.round((img.data?.length||0)*.75/1024))} KB</AttachmentDescription></AttachmentContent></Attachment>)}</AttachmentGroup>
        )}
        {editing?<><p className="mb-2 text-xs font-medium text-muted-foreground">Editing message</p><Textarea ref={editField} aria-label="Edit message" value={draft} disabled={saving} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();setEditing(false);}if(event.key==="Enter"&&(event.ctrlKey||event.metaKey)){event.preventDefault();void resend();}}} className="inline-message-edit"/>{editError&&<p role="alert" className="mt-2 text-xs text-destructive">{editError}</p>}<div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="ghost" disabled={saving} onClick={()=>setEditing(false)}>Cancel</Button><Button size="sm" disabled={saving||!draft.trim()} onClick={()=>void resend()}>{saving?"Sending…":"Send"}</Button></div></>:text&&<div className="chat-text whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-fog-100">{text}</div>}
      </div>
      {text && !editing && (
        <ActionBar>
          <ActionButton label="Copy message" onClick={() => actions?.onCopy?.(text)}>
            <Copy className="size-3" />
          </ActionButton>
          {actions?.onEdit && (
            <ActionButton label="Edit message" onClick={() => {setDraft(text);setEditError("");setEditing(true);}}>
              <Pencil className="size-3" />
            </ActionButton>
          )}
        </ActionBar>
      )}
    </div>
  );
}

export interface AssistantViewProps {
  message: any;
  tools: Record<string, ToolRunView>;
  results: Record<string, any>;
  streaming?: boolean;
  compact?: boolean;
  actions?: MessageActions;
}

export function AssistantMessage({ message, tools, results, streaming, actions, compact }: AssistantViewProps) {
  const content=coalesceAssistantBlocks(message.content);
  const usage = message.usage;
  const plain = content
    .filter((b) => b?.type === "text")
    .map((b) => b.text ?? "")
    .join("\n\n");

  return (
    <div className="assistant-message group/msg relative fade-up space-y-2">
      {content.map((block, i) => {
        if (!block) return null;
        if (block.type === "thinking") return <Reasoning key={i} text={typeof block.thinking==="string"?block.thinking:typeof block.text==="string"?block.text:Array.isArray(block.thinking)?block.thinking.map((b:any)=>b.text || "").join(""):""} running={!!streaming && i===content.length-1} />;
        if (block.type === "redactedThinking")
          return (
            <div key={i} className="text-[12px] text-muted-foreground">
              [redacted thinking]
            </div>
          );
        if (block.type === "text") {
          const text = block.text ?? "";
          if (!text) return null;
          if (hasTable(text) && !streaming) return <Markdown key={i} text={text} className="chat-text text-[15px] text-fog-100" />;
          return (
            <StreamingResponse
              key={i}
              text={text}
              status={streaming ? "streaming" : "done"}
              actions={false}
              className="chat-text text-[15px] leading-[1.72]"
            />
          );
        }
        if (block.type === "toolCall") {
          const id = block.id;
          const run: ToolRunView =
            tools[id] ??
            ({
              id,
              name: block.name,
              args: parseArgs(block.arguments),
              result: results[id]?.result,
              isError: results[id]?.isError,
              endedAt: results[id] ? 1 : undefined,
            } as ToolRunView);
          return <ToolCard key={i} run={run} />;
        }
        if (block.type === "image") {
          return (
            <GridReveal
              key={i}
              src={`data:${block.mimeType || "image/png"};base64,${block.data}`}
              alt="assistant image"
              aspect={16 / 10}
              className="max-h-80 w-full max-w-lg"
            />
          );
        }
        return null;
      })}

      {message.stopReason === "error" && message.errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {message.errorMessage}
        </div>
      )}

      {!compact && !streaming && plain.trim() && !content.some(b=>b.type==="toolCall") && (
        <ActionBar>
          {plain && (
            <ActionButton label="Copy response" onClick={() => actions?.onCopy?.(plain)}>
              <Copy className="size-3" />
            </ActionButton>
          )}
          {actions?.onRegenerate && (
            <ActionButton label="Regenerate response" onClick={actions.onRegenerate}>
              <RefreshCw className="size-3" />
            </ActionButton>
          )}
          {usage && usage.totalTokens > 0 && (
            <span className="ml-1 font-mono text-[10.5px] text-muted-foreground">
              {usage.input ?? 0} in · {usage.output ?? 0} out
              {usage.cacheRead ? ` · ${usage.cacheRead} cached` : ""}
              {usage.cost?.total ? ` · $${usage.cost.total.toFixed(4)}` : ""}
            </span>
          )}
        </ActionBar>
      )}
    </div>
  );
}

export function AssistantTurn({message,...props}:AssistantViewProps){
  const messages=message.turnMessages||[message],last=messages.at(-1);
  const hasTools=messages.some((m:any)=>coalesceAssistantBlocks(m.content).some(b=>b.type==='toolCall'));
  if(!hasTools)return <AssistantMessage message={{...last,content:coalesceAssistantBlocks(messages.flatMap((m:any)=>coalesceAssistantBlocks(m.content)))}} {...props}/>;
  const thoughts=messages.flatMap((m:any)=>coalesceAssistantBlocks(m.content).filter(b=>b.type==='thinking').map(b=>b.thinking)).filter(Boolean).join('\n\n');
  const activity=messages.map((m:any,i:number)=>({...m,content:coalesceAssistantBlocks(m.content).filter(b=>b.type!=='thinking'&&(i<messages.length-1||b.type==='toolCall'))})).filter((m:any)=>m.content.length);
  const reply={...last,content:coalesceAssistantBlocks(last.content).filter(b=>b.type!=='thinking'&&b.type!=='toolCall')};
  return <div className="assistant-turn space-y-3"><TraceRow title="Agent activity" icon={<ListChecks className="size-3.5"/>}><Reasoning text={thoughts} running={false}/><div className="space-y-2">{activity.map((m:any,i:number)=><AssistantMessage key={i} message={m} tools={props.tools} results={props.results} compact/>)}</div></TraceRow>{reply.content.length>0&&<AssistantMessage message={reply} {...props}/>}</div>;
}

export function parseArgs(args: any): any {
  if (!args) return {};
  if (typeof args === "object") return args;
  try {
    return JSON.parse(args);
  } catch {
    return { raw: String(args) };
  }
}

export function SummaryCard({ kind, text }: { kind: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-dashed border-ink-600 bg-ink-850/40 px-3 py-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-[12.5px] text-fog-300"
      >
        <Sparkles className="size-3 text-muted-foreground" />
        <span className="font-medium">{kind}</span>
        <span className="text-muted-foreground">{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <div className="mt-2 text-[13px] text-fog-300">
          <Markdown text={text} />
        </div>
      )}
    </div>
  );
}

export function ShellCard({message}:{message:any}){return <TerminalCommand command={message.command || "Shell command"} output={message.output ?? message.stdout ?? ""} running={false} exitCode={message.exitCode} isError={!!message.exitCode}/>;}

export function NoteLine({ message }: { message: any }) {
  const text = (blockText(message.content) || message.text || "").replace(/<\/?system-reminder>/gi,"").trim();
  if (!text) return null;
  if(["developer","custom","hookMessage"].includes(message.role))return <TraceRow title={/incomplete todo|unfinished/i.test(text)?"Task reminder":"System note"} icon={<Sparkles className="size-3.5"/>}><Markdown text={text}/></TraceRow>;
  return (
    <div className="border-l-2 border-ink-600 pl-3 text-[12.5px] leading-relaxed text-fog-400">
      <Markdown text={text} />
    </div>
  );
}

export function buildResultMap(messages: any[]) {
  const map: Record<string, { result: any; details?: any; isError: boolean }> = {};
  for (const m of messages) {
    if (m?.role === "toolResult") {
      const id = m.toolCallId ?? m.tool_use_id ?? m.id;
      if (id) map[id] = { result: m, details: m.details, isError: !!m.isError };
    }
  }
  return map;
}

export function MessageRow({
  message,
  tools,
  results,
  actions,
  streaming,
}: {
  message: any;
  streaming?: boolean;
  tools: Record<string, ToolRunView>;
  results: Record<string, any>;
  actions?: MessageActions;
}) {
  const role = message.role;
  switch (role) {
    case "user":
      return <UserMessage message={message} actions={actions} />;
    case "assistant":
      return <AssistantTurn message={message} tools={tools} results={results} actions={actions} streaming={streaming}/>;
    case "toolResult":
      return null;
    case "bashExecution":
    case "pythonExecution":
      return <ShellCard message={message} />;
    case "compactionSummary":
      return <SummaryCard kind="Compaction summary" text={blockText(message.content) || message.summary || ""} />;
    case "branchSummary":
      return <SummaryCard kind="Branch summary" text={blockText(message.content) || message.summary || ""} />;
    case "custom":
    case "hookMessage":
    case "developer":
      return <NoteLine message={message} />;
    default:
      return <NoteLine message={message} />;
  }
}
