import { useState } from "react";
import { post } from "../../lib/api";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
export function TransportControls({ chatKey }: { chatKey: string | null }) {
  const [mode, setMode] = useState("full"),
    [events, setEvents] = useState(""),
    [level, setLevel] = useState("events");
  const [error, setError] = useState(""),
    [status, setStatus] = useState("");
  async function apply(command: any) {
    setError("");
    try {
      const result = await post("/api/cmd", { key: chatKey, cmd: command });
      if (!result.ok) throw Error(result.error);
      setStatus("OMP accepted " + command.type + ".");
    } catch (error: any) {
      setError(error.message);
    }
  }
  return (
    <details className="rounded-xl border bg-sidebar p-4">
      <summary className="cursor-pointer text-sm font-medium">
        Advanced event transport
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          The GUI starts with all native events, full message snapshots and live
          subagent events. Filtering events can hide transcript updates in this
          session. These controls change transport only when you apply them.
        </p>
        <label className="block space-y-2 text-xs">
          Message updates
          <select
            className="w-full rounded-md border bg-sidebar p-2"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="full">Full snapshots</option>
            <option value="delta">Deltas</option>
          </select>
        </label>
        <label className="block space-y-2 text-xs">
          Native event names (blank forwards all)
          <Textarea
            rows={3}
            value={events}
            onChange={(e) => setEvents(e.target.value)}
            placeholder="One event type per line"
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          disabled={!chatKey}
          onClick={() =>
            void apply({
              type: "set_event_filter",
              events: events.trim()
                ? events
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean)
                : null,
              messageUpdates: mode,
            })
          }
        >
          Apply event transport
        </Button>
        <label className="block space-y-2 text-xs">
          Subagent subscription
          <select
            className="w-full rounded-md border bg-sidebar p-2"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="off">Off</option>
            <option value="progress">Lifecycle and progress</option>
            <option value="events">Lifecycle, progress and events</option>
          </select>
        </label>
        <Button
          size="sm"
          variant="outline"
          disabled={!chatKey}
          onClick={() =>
            void apply({ type: "set_subagent_subscription", level })
          }
        >
          Apply subscription
        </Button>
        {status && (
          <p role="status" className="text-xs text-muted-foreground">
            {status}
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
