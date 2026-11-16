import { useState } from "react";
import { post } from "../lib/api";
import type { ChatState } from "../lib/store";
import { Button } from "./ui/button";

export function QueueControls({
  chat,
  text,
  images,
  restore,
  interrupted,
  report,
}: {
  chat: ChatState;
  text: string;
  images: any[];
  restore: (text: string, images: any[]) => void;
  interrupted: () => void;
  report: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);
  async function command(cmd: any) {
    setPending(true);
    try {
      const response = await post("/api/cmd", { key: chat.key, cmd });
      if (!response.ok) throw new Error(response.error);
      return response.data;
    } catch (error: any) {
      report(error.message);
      return null;
    } finally {
      setPending(false);
    }
  }
  const queued = [
    ...chat.queue.steering.map((message, index) => ({
      message,
      queue: "steering",
      delivered: index < (chat.queue.liveSteered ?? 0),
    })),
    ...chat.queue.followUp.map((message) => ({
      message,
      queue: "followUp",
      delivered: false,
    })),
  ];
  if (!queued.length && !chat.running) return null;
  return (
    <details className="mb-2 rounded-lg text-xs text-muted-foreground">
      <summary className="cursor-pointer py-2">
        {queued.length
          ? `${queued.length} queued messages`
          : "Running turn controls"}
      </summary>
      <div className="max-h-60 space-y-2 overflow-auto py-2">
        {queued.map((item, index) => (
          <div
            key={`${item.queue}:${index}`}
            className="workspace-floating-surface rounded-lg p-3"
          >
            <p className="whitespace-pre-wrap text-foreground">
              {item.message}
            </p>
            <p className="my-1">
              {item.delivered
                ? "Already delivered to this turn"
                : item.queue === "steering"
                  ? "Steering"
                  : "Follow-up"}
            </p>
            {!item.delivered && (
              <div className="flex flex-wrap gap-1">
                {item.queue === "followUp" && (
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={pending}
                    onClick={async () => {
                      const data = await command({
                        type: "promote_queued_message",
                        message: item.message,
                      });
                      if (data && !data.promoted)
                        report("This message was already consumed by OMP.");
                    }}
                  >
                    Promote to steering
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={pending}
                  onClick={async () => {
                    const data = await command({
                      type: "remove_queued_message",
                      message: item.message,
                      queue: item.queue,
                    });
                    if (!data) return;
                    if (!data.removed)
                      return report(
                        "This message was already consumed by OMP.",
                      );
                    restore(item.message, data.images ?? []);
                    if (data.imagesDropped)
                      report(
                        "OMP could not return this message’s images. Reattach them before sending.",
                      );
                  }}
                >
                  Edit in draft
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={pending}
                  onClick={async () => {
                    const data = await command({
                      type: "remove_queued_message",
                      message: item.message,
                      queue: item.queue,
                    });
                    if (data && !data.removed)
                      report("This message was already consumed by OMP.");
                  }}
                >
                  Withdraw
                </Button>
              </div>
            )}
          </div>
        ))}
        {chat.running && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={async () => {
                const data = await command({ type: "abort_and_restore_queue" });
                if (!data) return;
                const items = [
                  ...(data.steering ?? []),
                  ...(data.followUp ?? []),
                ];
                if (items.length)
                  restore(
                    items.map((item) => item.text).join("\n\n"),
                    items.flatMap((item) => item.images ?? []),
                  );
                if (data.imagesDropped || data.truncated)
                  report(
                    "OMP returned a partial queue. Check the restored messages and reattach missing images.",
                  );
              }}
            >
              Stop and restore queue
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={pending || !text.trim()}
              onClick={async () => {
                const data = await command({
                  type: "abort_and_prompt",
                  message: text,
                  ...(images.length
                    ? {
                        images: images.map((image) => ({
                          type: "image",
                          data: image.data,
                          mimeType: image.mimeType,
                        })),
                      }
                    : {}),
                });
                if (data) interrupted();
              }}
            >
              Interrupt and send draft
            </Button>
          </div>
        )}
      </div>
    </details>
  );
}
