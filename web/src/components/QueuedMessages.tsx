import { Reorder, useDragControls, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { ArrowUpToLine, GripVertical, Pencil, Trash2 } from "lucide-react";
import type { QueuedDraft } from "../lib/composer-queue";
import type { ComposerQueue } from "../lib/use-composer-queue";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

function QueueRow({ item, index, queue, running }: { item: QueuedDraft; index: number; queue: ComposerQueue; running: boolean }) {
  const drag = useDragControls();
  const reduced = useReducedMotion();
  const sending = queue.sendingId === item.id;
  const editing = queue.editing?.id === item.id;
  const locked = !!(queue.sendingId || queue.editing);
  return (
    <Reorder.Item value={item.id} dragControls={drag} dragListener={false} className="queued-message"
      transition={reduced ? { duration: 0 } : undefined}
      onDragStart={() => queue.setReordering(true)} onDragEnd={() => queue.setReordering(false)}>
      <button type="button" className="queue-grab-handle"
        disabled={locked || queue.items.length < 2}
        aria-label={`Reorder queued message ${index + 1}`}
        aria-keyshortcuts="ArrowUp ArrowDown"
        onPointerDown={event => { if (event.button === 0) drag.start(event); }}
        onKeyDown={event => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          queue.move(item.id, event.key === "ArrowUp" ? -1 : 1);
        }}>
        <GripVertical className="size-4" />
      </button>
      <p className="queued-message-text" title={item.text}>
        {item.text || `${item.images.length} image${item.images.length === 1 ? "" : "s"}`}
        {item.text && item.images.length > 0 && <span className="text-muted-foreground"> · {item.images.length} attached</span>}
      </p>
      <div className="queued-message-actions">
        {sending ? <span role="status" className="text-xs text-muted-foreground">Sending…</span> : <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="xs" disabled={locked || !running} onClick={() => queue.steer(item.id)}>
                <ArrowUpToLine className="size-3.5" /><span>Steer</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Interrupt the current turn and send this message</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="icon-xs" aria-label={`Edit queued message ${index + 1}`} aria-pressed={editing}
            disabled={locked} onClick={() => queue.edit(item.id)}><Pencil className="size-3.5" /></Button>
          <Button variant="ghost" size="icon-xs" aria-label={`Delete queued message ${index + 1}`}
            disabled={locked} onClick={() => queue.remove(item.id)}><Trash2 className="size-3.5" /></Button>
        </>}
      </div>
    </Reorder.Item>
  );
}

export function QueuedMessages({ queue, running }: { queue: ComposerQueue; running: boolean }) {
  const { setReordering } = queue;
  useEffect(() => () => setReordering(false), [setReordering]);
  if (!queue.items.length) return null;
  return (
    <section className="composer-queue" aria-label="Queued messages">
      {queue.paused && <div className="composer-queue-status">
        <p role={queue.error ? "alert" : "status"}>{queue.error || "Queue paused"}</p>
        <Button variant="ghost" size="xs" onClick={queue.resume}>{queue.error ? "Retry" : "Resume"}</Button>
      </div>}
      <Reorder.Group as="ol" axis="y" values={queue.items.map(item => item.id)} onReorder={queue.reorder}
        className="composer-queue-list" layoutScroll>
        {queue.items.map((item, index) => <QueueRow key={item.id} item={item} index={index} queue={queue} running={running} />)}
      </Reorder.Group>
    </section>
  );
}
