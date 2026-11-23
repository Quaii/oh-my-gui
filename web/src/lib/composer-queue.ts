export type DraftImage = { data: string; mimeType: string; name?: string; size?: number };

export type QueuedDraft = {
  id: string;
  text: string;
  images: DraftImage[];
};

export function queueOwner(bridge: string | null, state?: { sessionId?: string; sessionFile?: string } | null) {
  if (state?.sessionId) return `session:${state.sessionId}`;
  if (state?.sessionFile) return `file:${state.sessionFile}`;
  return bridge ? `bridge:${bridge}` : null;
}

export function moveQueuedDraft(items: QueuedDraft[], id: string, offset: -1 | 1) {
  const from = items.findIndex(item => item.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function reorderQueuedDrafts(items: QueuedDraft[], order: string[]) {
  if (items.length !== order.length || new Set(order).size !== order.length) return items;
  const byId = new Map(items.map(item => [item.id, item]));
  if (order.some(id => !byId.has(id))) return items;
  return order.map(id => byId.get(id)!);
}

export async function deliverComposerDraft({
  bridge, owner, draft, interrupt, canSend, call,
}: {
  bridge: string;
  owner: string;
  draft: QueuedDraft;
  interrupt: boolean;
  canSend: () => boolean;
  call: (command: Record<string, unknown>) => Promise<{
    ok: boolean;
    error?: string;
    data?: { sessionId?: string; sessionFile?: string; isStreaming?: boolean; isCompacting?: boolean; queuedMessageCount?: number };
  }>;
}): Promise<"sent" | "wait"> {
  if (!canSend()) return "wait";
  const status = await call({ type: "get_state" });
  if (!status.ok || !status.data) throw Error(status.error || "Could not check whether OMP is ready.");
  if (!canSend()) return "wait";
  const state = status.data;
  if (queueOwner(bridge, state) !== owner) throw Error("The queued message belongs to a different chat.");
  if (!interrupt && (state.isStreaming || state.isCompacting || (state.queuedMessageCount ?? 0) > 0)) return "wait";
  const type = interrupt ? "abort_and_prompt" : "prompt";
  const images = draft.images.map(({ data, mimeType }) => ({ type: "image", data, mimeType }));
  const response = await call({ type, message: draft.text, ...(images.length ? { images } : {}) });
  if (!response.ok) throw Error(response.error || "OMP did not accept the queued message.");
  return "sent";
}
