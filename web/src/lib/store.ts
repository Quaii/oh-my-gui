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
  initialIndex?: number;
  selectionMarker?: 'radio' | 'checkbox';
  checkedIndices?: number[];
  markableCount?: number;
  optionDetails?: { description?: string }[];
  secret?: boolean;
  promptStyle?: boolean;
  authProvider?: string;
  questions?: { id: string; question: string; header?: string; multi?: boolean; recommended?: number; options: { label: string; description?: string; preview?: string }[] }[];
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
  queue: { steering: string[]; followUp: string[]; liveSteered?: number };
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
  outputs: { id: string; text: string; kind: string; at: number }[];
  editorUpdate: { id: string; text: string } | null;
  authLinks: { id: string; url: string; instructions?: string; authProvider?: string }[];
  sideQuestions: AnyRec[];
  dictation: AnyRec | null;
  voice: { phase: string; input?: number; output?: number; error?: string; turns: AnyRec[] };
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
  outputs: [],
  editorUpdate: null,
  authLinks: [],
  sideQuestions: [],
  dictation: null,
  voice: { phase: 'off', turns: [] },
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
    case 'command_output':
    case 'notice':
    case 'extension_error':
    case 'bridge_error': {
      const text = rec.text ?? rec.message ?? rec.error ?? '';
      if (!text) return s;
      const id = String(rec.uiEventId ?? rec.id ?? `${rec.type}-${Date.now()}-${s.outputs.length}`);
      if (s.outputs.some(output => output.id === id)) return s;
      const kind = rec.type.endsWith('error') ? 'error' : rec.level ?? rec.severity ?? 'info';
      return { ...s, outputs: [...s.outputs.slice(-63), { id, text: String(text), kind, at: rec.uiReceivedAt ?? Date.now() }] };
    }
    case 'session_info_update':
      return { ...s, title: rec.title ?? s.title };
    case 'config_update':
      return { ...s, state: { ...s.state, ...(rec.model ? { model: rec.model } : {}), ...(rec.thinkingLevel ? { thinkingLevel: rec.thinkingLevel } : {}) } };
    case 'goal_updated':
      return { ...s, state: { ...s.state, goal: rec.state ?? (rec.goal ? { goal: rec.goal } : null) } };
    case 'subagents_snapshot': {
      const activeIds = new Set((rec.subagents ?? []).map((agent: AnyRec) => agent.id));
      return { ...s, subagents: [...(rec.subagents ?? []), ...s.subagents.filter(agent => !activeIds.has(agent.id) && ['completed', 'done', 'aborted', 'cancelled', 'failed', 'error'].includes(agent.status))].slice(0, 50) };
    }
    case 'subagent_lifecycle': {
      const payload = rec.payload;
      if (!payload?.id) return s;
      const existing = s.subagents.find(agent => agent.id === payload.id);
      if (existing?.parentToolCallId && payload.parentToolCallId && existing.parentToolCallId !== payload.parentToolCallId && payload.status !== 'started') return s;
      const agent = { ...existing, ...payload, status: payload.status === 'started' ? 'running' : payload.status, lastUpdate: Date.now() };
      return { ...s, subagents: [agent, ...s.subagents.filter(current => current.id !== agent.id)].slice(0, 50) };
    }
    case 'subagent_progress': {
      const payload = rec.payload, id = payload?.progress?.id;
      return { ...s, subagents: s.subagents.map(agent => agent.id === id && (!payload.parentToolCallId || !agent.parentToolCallId || agent.parentToolCallId === payload.parentToolCallId) ? { ...agent, ...payload, ...payload.progress, progress: payload.progress, lastUpdate: Date.now() } : agent) };
    }
    case 'subagent_event':
      return { ...s, subagents: s.subagents.map(agent => agent.id === rec.payload?.id ? { ...agent, lastEvent: rec.payload.event?.type, lastUpdate: Date.now() } : agent) };
    case 'btw_history':
      return { ...s, sideQuestions: rec.records ?? [] };
    case 'dictation_state':
    case 'dictation_transcript':
      return { ...s, dictation: { ...(s.dictation?.captureId === rec.captureId ? s.dictation : {}), ...rec } };
    case 'dictation_end':
      return { ...s, dictation: { ...rec, state: 'ended' } };
    case 'live_phase':
      return { ...s, voice: { ...s.voice, phase: rec.phase } };
    case 'live_levels':
      return { ...s, voice: { ...s.voice, input: rec.input, output: rec.output } };
    case 'live_transcript':
      return { ...s, voice: { ...s.voice, turns: [...s.voice.turns.filter(turn => turn.role !== rec.role || turn.turn !== rec.turn), rec].slice(-100) } };
    case 'live_end':
      return { ...s, voice: { ...s.voice, phase: 'off', error: rec.error, input: 0, output: 0 } };
    case 'btw_record':
      return { ...s, sideQuestions: [rec.record, ...s.sideQuestions.filter(record => record.id !== rec.record.id)] };
    case 'btw_delta':
      return { ...s, sideQuestions: s.sideQuestions.map(record => {
        if (record.id !== rec.recordId) return record;
        if (!record.followUps?.length) return { ...record, answer: (record.answer ?? '') + rec.delta };
        return { ...record, followUps: record.followUps.map((turn: AnyRec, index: number) => index === record.followUps.length - 1 ? { ...turn, answer: (turn.answer ?? '') + rec.delta } : turn) };
      }) };
    case "snapshot": {
      const st = rec.state ?? s.state;
      const changed = s.state?.sessionId && st?.sessionId && s.state.sessionId !== st.sessionId;
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
          ? { steering: st.queuedMessages.steering ?? [], followUp: st.queuedMessages.followUp ?? [], liveSteered: st.queuedMessages.liveSteered ?? 0 }
          : s.queue,
        error: null,
        ...(changed ? { outputs: [], authLinks: [], sideQuestions: [], statuses: {}, widgets: {}, subagents: [], editorUpdate: null } : {}),
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
          liveSteered: rec.liveSteered ?? s.queue.liveSteered,
        },
      };
    case "thinking_level_changed":
      return { ...s, state: s.state ? { ...s.state, thinkingLevel: rec.level } : s.state };
    case "session_info_changed":
      return { ...s, title: rec.name ?? null };
    case "compaction_start":
    case 'manual_compaction_start':
    case 'auto_compaction_start':
      return { ...s, notice: `Compacting (${rec.reason ?? "auto"})…` };
    case "compaction_end":
    case 'manual_compaction_end':
    case 'auto_compaction_end':
      return { ...s, notice: rec.aborted ? "Compaction aborted" : rec.errorMessage ? `Compaction failed: ${rec.errorMessage}` : "Compaction complete" };
    case "auto_retry_start":
      return pushToast(s, "warning", `Retrying (${rec.attempt}/${rec.maxAttempts}) — ${rec.errorMessage ?? ""}`);
    case "auto_retry_end":
      return rec.success ? s : pushToast(s, "error", `Retries exhausted: ${rec.finalError ?? ""}`);
    case 'cache_warming_start':
      return { ...s, statuses: { ...s.statuses, cache: `Warming ${rec.phase} cache · ${rec.provider}/${rec.model}` } };
    case 'cache_warming_end':
      return { ...s, statuses: { ...s.statuses, cache: `Cache ${rec.outcome}${rec.warmingStopReason ? ' · ' + rec.warmingStopReason : ''}` } };
    case "available_commands_update":
      return { ...s, commands: rec.commands ?? [] };
    case 'provider_login_finished':
      return {
        ...s,
        authLinks: s.authLinks.filter(link => link.authProvider !== rec.providerId),
        dialogs: s.dialogs.filter(dialog => dialog.authProvider !== rec.providerId),
      };
    case "extension_ui_request": {
      const method = rec.method;
      if (method === 'cancel') return { ...s, dialogs: s.dialogs.filter(dialog => dialog.id !== rec.targetId) };
      if (method === 'open_url') {
        const url = rec.launchUrl || rec.url;
        if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return pushToast(s, 'error', 'OMP returned an unsupported sign-in link.');
        return {
          ...s,
          authLinks: [...s.authLinks.filter(link => link.id !== rec.id && (!rec.authProvider || link.authProvider !== rec.authProvider)), {
            id: rec.id, url, instructions: rec.instructions, authProvider: rec.authProvider,
          }],
        };
      }
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
      if (method === "set_editor_text") return { ...s, editorUpdate: { id: String(rec.uiEventId ?? rec.id ?? Date.now()), text: String(rec.text ?? '') } };
      if (!['select', 'confirm', 'input', 'editor', 'ask'].includes(method)) return pushToast(s, 'warning', `Unsupported native dialog: ${method}`);
      if (s.dialogs.some(dialog => dialog.id === rec.id)) return s;
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
            receivedAt: rec.uiReceivedAt ?? Date.now(),
            initialIndex: rec.initialIndex,
            selectionMarker: rec.selectionMarker,
            checkedIndices: rec.checkedIndices,
            markableCount: rec.markableCount,
            optionDetails: rec.optionDetails,
            secret: rec.secret,
            promptStyle: rec.promptStyle,
            authProvider: rec.authProvider,
            questions: rec.questions,
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
