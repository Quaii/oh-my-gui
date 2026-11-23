import {Button} from "./ui/button";
import {Textarea} from "./ui/textarea";
import {Attachment,AttachmentGroup,AttachmentMedia,AttachmentContent,AttachmentTitle,AttachmentDescription} from "./ui/attachment";
import { TerminalCommand } from "@/components/ui/ai-trace";
import { activityToolKind, coalesceAssistantBlocks, isThinkingTurn, splitAssistantTurn } from "../lib/transcript";
import { Reasoning, TraceRow } from "@/components/ui/ai-trace";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "./Markdown";
import { ToolCard, type ToolRunView } from "./ToolCard";
import { StreamingResponse } from "@/components/ui/streaming-response";
import { GridReveal } from "@/components/ui/grid-reveal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, ChevronRight, Copy, Pencil, RefreshCw, Sparkles, ListChecks, Undo2 } from "lucide-react";

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
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [done, setDone] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          disabled={disabled}
          onClick={() => {
            onClick();
            if(label.startsWith("Copy"))setDone(true);
            setTimeout(() => setDone(false), 1200);
          }}
          aria-label={label}
          className="grid size-6 place-items-center rounded text-muted-foreground transition-colors t-fast hover:bg-ink-750 hover:text-fog-100 disabled:opacity-40 disabled:pointer-events-none"
        >
          {done ? <Check className="size-3" /> : children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}

function ActionBar({ children, inline=false }: { children: React.ReactNode; inline?:boolean }) {
  return (
    <div className={"message-actions absolute left-0 top-full z-10 mt-1 flex items-center gap-0.5 rounded-lg bg-background/90 opacity-0 transition-opacity t-base focus-within:opacity-100 group-hover/msg:opacity-100 "+(inline?"message-actions-inline":"")}>
      {children}
    </div>
  );
}

export interface MessageActions {
  onCopy?: (text: string) => void;
  onRegenerate?: () => void;
  onEdit?: (text: string) => Promise<boolean>;
  onRestore?: () => void;
  restoreDisabled?: boolean;
}

function RestoreAction({ actions }: { actions?: MessageActions }) {
  return actions?.onRestore ? (
    <ActionButton label="Go back to this message (files stay unchanged)" onClick={actions.onRestore} disabled={actions.restoreDisabled}>
      <Undo2 className="size-3" />
    </ActionButton>
  ) : null;
}

export function UserMessage({ message, actions }: { message: any; actions?: MessageActions }) {
  const text = blockText(message.content);
  const imgs = imagesOf(message.content);
  const [editing,setEditing]=useState(false),[draft,setDraft]=useState(text),[saving,setSaving]=useState(false),[editError,setEditError]=useState("");
  const editField=useRef<HTMLTextAreaElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [editWidth, setEditWidth] = useState(0);
  useEffect(()=>{if(editing){editField.current?.focus();editField.current?.setSelectionRange(draft.length,draft.length);}},[editing]);
  async function resend(){if(saving||!draft.trim()||!actions?.onEdit)return;setSaving(true);setEditError("");try{if(await actions.onEdit(draft))setEditing(false);else setEditError("Message could not be sent. Your edit is still here.");}catch{setEditError("Message could not be sent. Try again.");}finally{setSaving(false);}}
  return (
    <div className="user-message group/msg relative fade-up flex flex-col items-end">
      <div ref={bubble} style={editing ? { width: Math.max(224, editWidth) } : undefined} className={"user-message-surface max-w-[min(720px,92%)] rounded-xl border border-border bg-ink-800 px-4 py-2.5 "+(editing?"is-editing":"")}>
        {imgs.length > 0 && (
          <AttachmentGroup className="mb-2">{imgs.map((img,i)=><Attachment key={i} size="sm"><AttachmentMedia variant="image"><img alt={img.name||'Attached image'} src={'data:'+(img.mimeType||'image/png')+';base64,'+img.data}/></AttachmentMedia><AttachmentContent><AttachmentTitle>{img.name||'Attached image'}</AttachmentTitle><AttachmentDescription>{(img.mimeType||'image/png').split('/')[1].toUpperCase()} · {Math.max(1,Math.round((img.data?.length||0)*.75/1024))} KB</AttachmentDescription></AttachmentContent></Attachment>)}</AttachmentGroup>
        )}
        {editing ? <>
          <Textarea ref={editField} aria-label="Edit message" value={draft} rows={1} disabled={saving}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setEditing(false);
              }
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                void resend();
              }
            }} className="inline-message-edit chat-text" />
          {editError && <p role="alert" className="mt-2 text-xs text-destructive">{editError}</p>}
          <div className="message-edit-actions">
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" disabled={saving || !draft.trim()} onClick={() => void resend()}>{saving ? "Sending…" : "Send"}</Button>
          </div>
        </> : text && <div className="chat-text whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-fog-100">{text}</div>}
      </div>
      {text && !editing && (
        <ActionBar>
          <ActionButton label="Copy message" onClick={() => actions?.onCopy?.(text)}>
            <Copy className="size-3" />
          </ActionButton>
          <RestoreAction actions={actions} />
          {actions?.onEdit && (
            <ActionButton label="Edit message" onClick={() => {setEditWidth(bubble.current?.getBoundingClientRect().width ?? 0);setDraft(text);setEditError("");setEditing(true);}}>
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
  running?: boolean;
  compact?: boolean;
  actions?: MessageActions;
}

export function AssistantMessage({ message, tools, results, streaming, running, actions, compact }: AssistantViewProps) {
  const content=coalesceAssistantBlocks(message.content);
  const usage = message.usage;
  const plain = content
    .filter((b) => b?.type === "text")
    .map((b) => b.text ?? "")
    .join("\n\n");

  return (
    <div className={`assistant-message group/msg relative ${compact ? "turn-activity-message" : "fade-up space-y-2"}`}>
      {content.map((block, i) => {
        if (!block) return null;
        if (block.type === "thinking") return <Reasoning key={i} text={block.thinking} running={!!streaming && i===content.length-1} compact={compact} />;
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
          return <ToolCard key={id ?? i} run={run} compact={compact} pending={compact ? running : undefined} />;
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
        <ActionBar inline>
          {plain && (
            <ActionButton label="Copy response" onClick={() => actions?.onCopy?.(plain)}>
              <Copy className="size-3" />
            </ActionButton>
          )}
          <RestoreAction actions={actions} />
          {actions?.onRegenerate && (
            <ActionButton label="Regenerate response" onClick={actions.onRegenerate}>
              <RefreshCw className="size-3" />
            </ActionButton>
          )}
          {usage && usage.totalTokens > 0 && (
            <span className="message-usage font-mono text-[10.5px] text-muted-foreground">
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

function activitySummary(activity: any[], tools: AssistantViewProps["tools"], results: AssistantViewProps["results"]) {
  const calls = new Map<string, any>();
  let notes = 0;
  for (const message of activity) {
    if (message.role !== "assistant") {
      notes++;
      continue;
    }
    for (const block of message.content) {
      if (block.type === "toolCall") calls.set(block.id ?? `call-${calls.size}`, block);
    }
  }
  const counts = { change: 0, command: 0, search: 0, inspect: 0, other: 0 };
  let failures = 0;
  for (const call of calls.values()) {
    if (tools[call.id]?.isError || results[call.id]?.isError) failures++;
    counts[activityToolKind(call.name)]++;
  }
  const countLabel = (count: number, word: string, plural = word + "s") =>
    count ? `${count} ${count === 1 ? word : plural}` : "";
  const details = [
    countLabel(counts.change, "edit"), countLabel(counts.command, "command"),
    countLabel(counts.search, "web search", "web searches"), countLabel(counts.inspect, "workspace check"),
    countLabel(counts.other, "tool call"), countLabel(notes, "note"), countLabel(failures, "failed call"),
  ].filter(Boolean).join(" · ");
  return { details, failures };
}

export function AssistantTurn({ message, ...props }: AssistantViewProps) {
  const messages = message.turnMessages ?? [message];
  const active = !!(props.running || props.streaming);
  const thinking = active && isThinkingTurn(messages);
  const { activity, reply } = splitAssistantTurn(messages);
  const [choice, setChoice] = useState<{ active: boolean; open: boolean }>();
  const open = choice?.active === active ? choice.open : active && !thinking;
  const { details, failures } = activitySummary(activity, props.tools, props.results);
  const rows: { start: number; messages: any[] }[] = [];
  activity.forEach((entry, index) => {
    const previous = rows.at(-1);
    if (entry.role !== "assistant" && previous && previous.messages[0].role !== "assistant") previous.messages.push(entry);
    else rows.push({ start: index, messages: [entry] });
  });

  return (
    <div className="assistant-turn">
      {(rows.length > 0 || thinking) && (
        <Collapsible open={open} onOpenChange={expanded => setChoice({ active, open: expanded })} className="turn-activity">
          <CollapsibleTrigger className="turn-activity-trigger">
            {thinking ? <Sparkles className="size-3.5 shrink-0" /> : <ListChecks className="size-3.5 shrink-0" />}
            <span className={thinking ? "shimmer motion-reduce:shimmer-none" : undefined} aria-live="polite">{thinking ? "Thinking" : "Agent activity"}</span>
            {details && <span className={`turn-activity-summary ${failures ? "text-destructive" : ""}`}>{details}</span>}
            <ChevronRight className="turn-activity-chevron size-3.5 shrink-0" />
          </CollapsibleTrigger>
          <CollapsibleContent className="turn-activity-content">
            <div className="turn-activity-list">
              {rows.length === 0 && <p className="text-xs text-muted-foreground">Waiting for activity from OMP.</p>}
              {rows.map(({ start, messages: items }) => items[0].role === "assistant" ? (
                <AssistantMessage key={start} message={items[0]} tools={props.tools} results={props.results} compact
                  running={active} streaming={!!props.streaming && !reply && start === activity.length - 1} />
              ) : (
                <TraceRow key={start} title={items.length > 1 ? `${items.length} notes` : /incomplete todo|unfinished/i.test(noteText(items[0])) ? "Task reminder" : "Note"} icon={<Sparkles className="size-3.5" />} compact>
                  <div className="space-y-2">{items.map((note, index) => <Markdown key={index} text={noteText(note)} />)}</div>
                </TraceRow>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      {reply && <AssistantMessage message={reply} {...props} />}
    </div>
  );
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

function noteText(message: any) {
  return (blockText(message.content) || message.text || "").replace(/<\/?system-reminder>/gi, "").trim();
}

export function NoteLine({ message }: { message: any }) {
  const text = noteText(message);
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
  running,
}: {
  message: any;
  streaming?: boolean;
  running?: boolean;
  tools: Record<string, ToolRunView>;
  results: Record<string, any>;
  actions?: MessageActions;
}) {
  const role = message.role;
  switch (role) {
    case "user":
      return <UserMessage message={message} actions={actions} />;
    case "assistant":
    case "turnActivity":
      return <AssistantTurn message={message} tools={tools} results={results} actions={actions} streaming={streaming} running={running}/>;
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
