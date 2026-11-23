import { useCallback, useEffect, useRef, useState } from "react";
import { moveQueuedDraft, reorderQueuedDrafts, type DraftImage, type QueuedDraft } from "./composer-queue";

const emptyQueue = { items: [] as QueuedDraft[], editing: null as QueuedDraft | null, paused: false, error: "" };
type QueueState = typeof emptyQueue;
type Delivery = (key: string, draft: QueuedDraft, interrupt: boolean, canSend: () => boolean) => Promise<"sent" | "wait">;

/** Drafts stay editable until the native runtime accepts them. */
export function useComposerQueue(key: string | null, ready: boolean, deliver: Delivery) {
  const [queues, setQueues] = useState<Record<string, QueueState>>({});
  const [delivery, setDelivery] = useState<{ key: string; id: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const [reordering, setReordering] = useState<string | null>(null);
  const inFlight = useRef(false);
  const stopped = useRef(new Set<string>());
  const queue = key ? queues[key] ?? emptyQueue : emptyQueue;

  const update = useCallback((chatKey: string, change: (queue: QueueState) => QueueState) => {
    setQueues(previous => ({ ...previous, [chatKey]: change(previous[chatKey] ?? emptyQueue) }));
  }, []);

  const send = useCallback(async (chatKey: string, item: QueuedDraft, interrupt: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setDelivery({ key: chatKey, id: item.id });
    try {
      const result = await deliver(chatKey, item, interrupt, () => interrupt || !stopped.current.has(chatKey));
      if (result === "sent") {
        update(chatKey, current => ({
          ...current, items: current.items.filter(draft => draft.id !== item.id), error: "",
        }));
      } else if (interrupt) {
        update(chatKey, current => ({ ...current, paused: true, error: "The chat changed before the message could be sent." }));
      } else {
        setRetry(value => value + 1);
      }
    } catch (error) {
      update(chatKey, current => ({
        ...current, paused: true,
        error: error instanceof Error ? error.message : "Could not send the queued message.",
      }));
    } finally {
      inFlight.current = false;
      setDelivery(null);
    }
  }, [deliver, update]);

  const next = queue.items[0];
  useEffect(() => {
    if (!key || !ready || !next || delivery || queue.paused || queue.editing || reordering === key) return;
    const timer = window.setTimeout(() => void send(key, next, false), 300);
    return () => window.clearTimeout(timer);
  }, [key, ready, next, delivery, queue.paused, queue.editing, reordering, retry, send]);

  const change = (apply: (queue: QueueState) => QueueState) => {
    if (key) update(key, apply);
  };
  const pause = useCallback(() => {
    if (!key || (!queue.items.length && delivery?.key !== key)) return;
    stopped.current.add(key);
    update(key, current => ({ ...current, paused: true }));
  }, [key, update, queue.items.length, delivery?.key]);
  const markReordering = useCallback((active: boolean) => {
    setReordering(current => active ? key : current === key ? null : current);
  }, [key]);
  const sendingId = delivery?.key === key ? delivery?.id : undefined;
  return {
    ...queue,
    sendingId,
    add(text: string, images: DraftImage[]) {
      if (!key) return false;
      const id = crypto.randomUUID();
      change(current => ({ ...current, items: [...current.items, { id, text, images }] }));
      return true;
    },
    steer(id: string) {
      const item = queue.items.find(draft => draft.id === id);
      if (key && item && !queue.editing) void send(key, item, true);
    },
    pause,
    resume() {
      if (key) stopped.current.delete(key);
      change(current => ({ ...current, paused: false, error: "" }));
    },
    setReordering: markReordering,
    reorder(order: string[]) {
      change(current => ({ ...current, items: reorderQueuedDrafts(current.items, order) }));
    },
    move(id: string, direction: -1 | 1) {
      change(current => ({ ...current, items: moveQueuedDraft(current.items, id, direction) }));
    },
    remove(id: string) {
      if (key && queue.items.length === 1) stopped.current.delete(key);
      change(current => ({
        ...current, items: current.items.filter(item => item.id !== id),
        editing: current.editing?.id === id ? null : current.editing,
        paused: current.items.length > 1 && current.paused,
        error: current.items.length > 1 ? current.error : "",
      }));
    },
    edit(id: string) {
      change(current => current.editing ? current : {
        ...current, editing: current.items.find(item => item.id === id) ?? null,
      });
    },
    updateEdit(id: string, patch: (draft: QueuedDraft) => QueuedDraft) {
      change(current => current.editing?.id !== id ? current : { ...current, editing: patch(current.editing) });
    },
    finishEdit(commit: boolean) {
      change(current => {
        const edit = current.editing;
        if (!edit) return current;
        return {
          ...current,
          items: commit ? current.items.map(item => item.id === edit.id ? edit : item) : current.items,
          editing: null,
        };
      });
    },
  };
}

export type ComposerQueue = ReturnType<typeof useComposerQueue>;
