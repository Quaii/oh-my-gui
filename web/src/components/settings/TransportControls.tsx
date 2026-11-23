import { useState } from "react";
import { post } from "../../lib/api";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
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
    <details className="settings-card">
      <summary className="cursor-pointer text-sm font-medium">
        Advanced event transport
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          The GUI starts with all native events, full message snapshots and live
          subagent events. Filtering events can hide transcript updates in this
          session. These controls change transport only when you apply them.
        </p>
        <div className="space-y-2 text-xs">
          <span>Message updates</span>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger aria-label="Message updates" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full snapshots</SelectItem>
              <SelectItem value="delta">Deltas</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
        <div className="space-y-2 text-xs">
          <span>Subagent subscription</span>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger aria-label="Subagent subscription" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="progress">Lifecycle and progress</SelectItem>
              <SelectItem value="events">Lifecycle, progress and events</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
