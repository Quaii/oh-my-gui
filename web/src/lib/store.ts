export type AnyRec = Record<string, any>;

export interface ToolRun {
  id: string;
  name: string;
  args: AnyRec;
  startedAt: number;
  endedAt?: number;
  result?: any;
  partial?: any;
  isError?: boolean;
  durationMs?: number;
}

export interface DialogRequest {
  id: string;
  method: "select" | "confirm" | "input" | "editor" | string;
  title?: string;
  message?: string;
  options?: string[];
  placeholder?: string;
  prefill?: string;
  timeout?: number;
  receivedAt: number;
}

export interface Toast {
  id: string;
  kind: "info" | "warning" | "error" | "success";
  text: string;
}

export interface ChatState {
  key: string | null;
  connected: boolean;
  loaded: boolean;
  state: AnyRec | null;
  messages: AnyRec[];
  live: AnyRec | null;
  tools: Record<string, ToolRun>;
  queue: { steering: string[]; followUp: string[] };
  todos: any[];
  subagents: AnyRec[];
  dialogs: DialogRequest[];
  toasts: Toast[];
  widgets: Record<string, { lines: string[]; placement: string }>;
  statuses: Record<string, string>;
  commands: AnyRec[];
  title: string | null;
  running: boolean;
  error: string | null;
  notice: string | null;
}

export const initialChat: ChatState = {
  key: null,
  connected: false,
  loaded: false,
  state: null,
  messages: [],
  live: null,
  tools: {},
  queue: { steering: [], followUp: [] },
  todos: [],
  subagents: [],
  dialogs: [],
  toasts: [],
  widgets: {},
  statuses: {},
  commands: [],
  title: null,
  running: false,
  error: null,
  notice: null,
};

function pushToast(s: ChatState, kind: Toast["kind"], text: string): ChatState {
  const toast: Toast = { id: Math.random().toString(36).slice(2), kind, text };
  return { ...s, toasts: [...s.toasts.slice(-4), toast] };
}

function applyAssistantEvent(msg: AnyRec, ev: AnyRec): AnyRec {
  if(ev.partial?.role==="assistant"&&Array.isArray(ev.partial.content))return {...ev.partial};
  const content: AnyRec[] = Array.isArray(msg.content) ? [...msg.content] : [];
  const idx = typeof ev.contentIndex === "number" ? ev.contentIndex : /_start$/.test(ev.type) ? content.length : Math.max(0,content.length-1);
  const ensure = (type: string): AnyRec => {
    const existing = content[idx];
    if (existing && existing.type === type) return existing;
    const block: AnyRec = type === "text" ? { type: "text", text: "" } : type === "thinking" ? { type: "thinking", thinking: "" } : { type: "toolCall", id: "", name: "", arguments: "" };
    content[idx] = block;
    return block;
  };
  switch (ev.type) {
    case "text_start":
      ensure("text");
      break;
    case "text_delta": {
      const b = ensure("text");
      content[idx] = { ...b, text: (b.text || "") + (ev.delta || "") };
      break;
    }
    case "text_end":
      content[idx] = { type: "text", text: ev.content ?? content[idx]?.text ?? "" };
      break;
    case "thinking_start":
      ensure("thinking");
      break;
    case "thinking_delta": {
      const b = ensure("thinking");
      content[idx] = { ...b, thinking: (b.thinking || "") + (ev.delta || "") };
      break;
    }
    case "thinking_end":
      content[idx] = { type: "thinking", thinking: ev.content ?? content[idx]?.thinking ?? "" };
      break;
    case "toolcall_start":
      content[idx] = { type: "toolCall", id: ev.id ?? "", name: ev.toolName ?? "", arguments: "" };
      break;
    case "toolcall_delta": {
      const b = ensure("toolCall");
      content[idx] = { ...b, arguments: (typeof b.arguments === "string" ? b.arguments : "") + (ev.delta || "") };
      break;
    }
    case "toolcall_end": {
      const tc = ev.toolCall ?? {};
      content[idx] = { type: "toolCall", id: tc.id ?? content[idx]?.id ?? "", name: tc.name ?? tc.toolName ?? content[idx]?.name ?? "", arguments: tc.arguments ?? tc.args ?? content[idx]?.arguments ?? "" };
      break;
    }
    default:
      break;
  }
  return { ...msg, content };
}

function mergeMessages(prev: AnyRec[], incoming: AnyRec[]): AnyRec[] {
  if (!incoming?.length) return prev;
  // snapshots replace; event-driven ends append
  return [...prev, ...incoming];
}

export function chatReducer(s: ChatState, rec: AnyRec): ChatState {
  switch (rec.type) {
    case "snapshot": {
      const st = rec.state ?? s.state;
      return {
        ...s,
        loaded: true,
        state: st,
        messages: rec.messages ?? [],
        live: null,
        tools: {},
        todos: st?.todoPhases ?? s.todos,
        title: st?.sessionName ?? s.title,
        running: !!st?.isStreaming,
        queue: st?.queuedMessages
          ? { steering: st.queuedMessages.steering ?? [], followUp: st.queuedMessages.followUp ?? [] }
          : s.queue,
        error: null,
      };
    }
    case "snapshot_error":
      return { ...s, loaded: true, error: rec.message ?? "failed to load session" };
    case "bridge_exit":
      return { ...s, connected: false, running: false, error: `omp exited (code ${rec.code ?? "?"})` };
    case "agent_start":
      return { ...s, running: true, error: null };
    case "agent_end":
      return { ...s, running: false };
    case "agent_settled":
    case "session_settled":
      return { ...s, running: false, live: null };
    case "prompt_result":
      return { ...s, running: rec.sessionSettled ? false : s.running, live: rec.sessionSettled ? null : s.live };
    case "advisor_yielded":
    case "session_start":
      return s;
    case "message_start": {
      const m = rec.message ?? {};
      if (m.role === "assistant") return { ...s, live: m, running: true };
      return s;
    }
    case "message_update": {
      const ev = rec.assistantMessageEvent ?? {};
      const live = s.live ?? { role: "assistant", content: [], timestamp: Date.now() };
      return { ...s, live: applyAssistantEvent(live, ev), running: true };
    }
    case "message_end": {
      const m = rec.message ?? {};
      const liveMatches = s.live && m.role === "assistant";
      return {
        ...s,
        live: liveMatches ? null : s.live,
        messages: m && m.role ? [...s.messages, m] : s.messages,
      };
    }
    case "tool_execution_start": {
      const id = rec.toolCallId ?? rec.toolName;
      return {
        ...s,
        tools: {
          ...s.tools,
          [id]: { id, name: rec.toolName, args: rec.args ?? {}, startedAt: Date.now() },
        },
      };
    }
    case "tool_execution_update": {
      const id = rec.toolCallId ?? rec.toolName;
      const prev = s.tools[id] ?? { id, name: rec.toolName, args: rec.args ?? {}, startedAt: Date.now() };
      return { ...s, tools: { ...s.tools, [id]: { ...prev, partial: rec.partialResult } } };
    }
    case "tool_execution_end": {
      const id = rec.toolCallId ?? rec.toolName;
      const prev = s.tools[id] ?? { id, name: rec.toolName, args: rec.args ?? {}, startedAt: Date.now() };
      return {
        ...s,
        todos:(rec.toolName||prev.name)==="todo"&&!rec.isError&&Array.isArray(rec.result?.details?.phases)?rec.result.details.phases:s.todos,
        tools: {
          ...s.tools,
          [id]: { ...prev, result: rec.result, isError: !!rec.isError, durationMs: rec.durationMs, endedAt: Date.now() },
        },
      };
    }
    case "queue_update":
      return {
        ...s,
        queue: {
          steering: rec.steering ?? s.queue.steering,
          followUp: rec.followUp ?? s.queue.followUp,
        },
      };
    case "thinking_level_changed":
      return { ...s, state: s.state ? { ...s.state, thinkingLevel: rec.level } : s.state };
    case "session_info_changed":
      return { ...s, title: rec.name ?? null };
    case "compaction_start":
      return { ...s, notice: `Compacting (${rec.reason ?? "auto"})…` };
    case "compaction_end":
      return { ...s, notice: rec.aborted ? "Compaction aborted" : rec.errorMessage ? `Compaction failed: ${rec.errorMessage}` : "Compaction complete" };
    case "auto_retry_start":
      return pushToast(s, "warning", `Retrying (${rec.attempt}/${rec.maxAttempts}) — ${rec.errorMessage ?? ""}`);
    case "auto_retry_end":
      return rec.success ? s : pushToast(s, "error", `Retries exhausted: ${rec.finalError ?? ""}`);
    case "available_commands_update":
      return { ...s, commands: rec.commands ?? [] };
    case "extension_ui_request": {
      const method = rec.method;
      if (method === "notify") {
        return pushToast(s, rec.notifyType ?? "info", rec.message ?? "");
      }
      if (method === "setStatus") {
        const statuses = { ...s.statuses };
        if (rec.statusText) statuses[rec.statusKey] = rec.statusText;
        else delete statuses[rec.statusKey];
        return { ...s, statuses };
      }
      if (method === "setWidget") {
        const widgets = { ...s.widgets };
        if (rec.widgetLines) widgets[rec.widgetKey] = { lines: rec.widgetLines, placement: rec.widgetPlacement ?? "aboveEditor" };
        else delete widgets[rec.widgetKey];
        return { ...s, widgets };
      }
      if (method === "setTitle") return { ...s, title: rec.title ?? s.title };
      if (method === "set_editor_text") return { ...s, notice: "editor text set by extension" };
      return {
        ...s,
        dialogs: [
          ...s.dialogs,
          {
            id: rec.id,
            method,
            title: rec.title,
            message: rec.message,
            options: rec.options,
            placeholder: rec.placeholder,
            prefill: rec.prefill,
            timeout: rec.timeout,
            receivedAt: Date.now(),
          },
        ],
      };
    }
    default: {
      // tolerate unknown events that carry todo / subagent / state info
      const t = String(rec.type ?? "");
      if (t.includes("todo")) {
        const phases = rec.phases ?? rec.todoPhases ?? rec.todos;
        if (phases) return { ...s, todos: phases };
      }
      if (t.includes("subagent") && Array.isArray(rec.subagents)) {
        return { ...s, subagents: rec.subagents };
      }
      return s;
    }
  }
}

export function dismissToast(s: ChatState, id: string): ChatState {
  return { ...s, toasts: s.toasts.filter((t) => t.id !== id) };
}

export function blockText(content: any): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((c) => c && (c.type === "text" || c.type === "thinking"))
    .map((c) => (c.type === "text" ? c.text : c.thinking))
    .join("");
}
