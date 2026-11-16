import { useEffect, useRef, useState } from "react";
import { post } from "../lib/api";
import { blockText } from "../lib/store";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
const finished = new Set([
  "completed",
  "done",
  "aborted",
  "cancelled",
  "failed",
  "error",
]);

export function SubagentControls({
  agents,
  chatKey,
  cancel,
}: {
  agents: any[];
  chatKey: string | null;
  cancel: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]),
    [steer, setSteer] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const epoch = ++generation.current;
    setMessages([]);
    setError("");
    if (!selected || !chatKey) return;
    let fromByte = 0,
      timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function read() {
      try {
        const result = await post("/api/cmd", {
          key: chatKey,
          cmd: {
            type: "get_subagent_messages",
            subagentId: selected,
            fromByte,
          },
        });
        if (epoch !== generation.current || controller.signal.aborted) return;
        if (!result.ok) throw Error(result.error);
        if (!Number.isFinite(result.data.nextByte) || result.data.nextByte < 0)
          throw Error("OMP returned an invalid transcript cursor");
        fromByte = result.data.nextByte;
        setMessages((previous) =>
          result.data.reset
            ? result.data.messages
            : [...previous, ...result.data.messages],
        );
        setError("");
      } catch (e: any) {
        if (!controller.signal.aborted) setError(e.message);
      }
      if (!controller.signal.aborted) timer = setTimeout(read, 1800);
    }
    void read();
    return () => {
      controller.abort();
      clearTimeout(timer);
      generation.current++;
    };
  }, [selected, chatKey]);
  return (
    <div className="space-y-3">
      {agents.map((agent) => (
        <div key={agent.id} className="rounded-lg bg-secondary/30 p-3">
          <button
            className="w-full text-left text-sm"
            onClick={() => setSelected(selected === agent.id ? null : agent.id)}
          >
            {agent.description || agent.agent || agent.id}
          </button>
          {agent.task && (
            <p className="mt-1 text-xs text-muted-foreground">{agent.task}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {agent.status}
            {agent.lastEvent ? ` · ${agent.lastEvent}` : ""}
          </p>
          {typeof agent.progress?.tokens === "number" && (
            <p className="mt-1 text-xs text-muted-foreground">
              {agent.progress.tokens.toLocaleString()} tokens
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setSelected(agent.id)}
            >
              Conversation
            </Button>
            {!finished.has(agent.status) && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => cancel(agent.id)}
              >
                Cancel agent
              </Button>
            )}
          </div>
        </div>
      ))}
      {selected && (
        <section
          className="space-y-3 border-t pt-3"
          aria-label="Subagent conversation"
        >
          <div className="flex items-center justify-between text-xs">
            <span>{selected}</span>
            <Button size="xs" variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="max-h-72 space-y-3 overflow-auto">
            {messages.map((message, index) => (
              <div key={index} className="text-xs">
                <p className="mb-1 text-muted-foreground">{message.role}</p>
                <p className="whitespace-pre-wrap break-words">
                  {blockText(message.content)}
                </p>
              </div>
            ))}
            {!messages.length && !error && (
              <p className="text-xs text-muted-foreground">
                No saved messages yet.
              </p>
            )}
          </div>
          {!finished.has(
            agents.find((agent) => agent.id === selected)?.status,
          ) && (
            <>
              <Textarea
                aria-label="Steer subagent"
                rows={2}
                value={steer}
                onChange={(event) => setSteer(event.target.value)}
                placeholder="Send direction to this agent…"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !steer.trim()}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const response = await post("/api/cmd", {
                      key: chatKey,
                      cmd: {
                        type: "steer_subagent",
                        subagentId: selected,
                        message: steer,
                      },
                    });
                    if (!response.ok) throw Error(response.error);
                    setSteer("");
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Send to agent
              </Button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
