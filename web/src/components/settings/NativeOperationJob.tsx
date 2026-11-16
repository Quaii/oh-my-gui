import { useEffect, useState } from "react";
import { get } from "../../lib/api";
import { Button } from "../ui/button";
export function NativeOperationJob({
  job,
  cancel,
}: {
  job: any;
  cancel: () => Promise<void>;
}) {
  const [open, setOpen] = useState(job.status === "running");
  const [output, setOutput] = useState(""),
    [error, setError] = useState(""),
    [truncated, setTruncated] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true,
      from = 0,
      timer: ReturnType<typeof setTimeout>;
    setOutput("");
    setError("");
    async function read() {
      try {
        const result = await get(
          `/api/native/operations?id=${encodeURIComponent(job.id)}&from=${from}`,
        );
        if (!active) return;
        if (
          !Number.isSafeInteger(result.next) ||
          typeof result.text !== "string"
        )
          throw Error("Invalid native output cursor");
        from = result.next;
        setOutput((previous) =>
          (result.reset ? result.text : previous + result.text).slice(
            -2 * 1024 * 1024,
          ),
        );
        setTruncated(result.truncated);
        setError("");
        if (result.status === "running") timer = setTimeout(read, 1000);
      } catch (error: any) {
        if (active) setError(error.message);
      }
    }
    void read();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [job.id, open]);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="rounded-xl border bg-sidebar p-4"
    >
      <summary className="cursor-pointer text-sm">
        {job.path.join(" ")}{" "}
        <span className="ml-2 text-xs text-muted-foreground">
          {job.status}
          {job.exitCode !== undefined ? ` · exit ${job.exitCode}` : ""}
        </span>
      </summary>
      <p className="my-2 break-all text-xs text-muted-foreground">{job.cwd}</p>
      {truncated && (
        <p className="text-xs text-muted-foreground">
          The runtime retains the last 2 million characters.
        </p>
      )}
      {output.length > 65536 && (
        <p className="text-xs text-muted-foreground">
          Showing the last 64 thousand characters. Copy includes all retained
          output.
        </p>
      )}
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">
        {output.slice(-65536) || "No output yet."}
      </pre>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void navigator.clipboard.writeText(output)}
        >
          Copy retained output
        </Button>
        {job.status === "running" && (
          <Button variant="outline" size="sm" onClick={() => void cancel()}>
            Cancel operation
          </Button>
        )}
      </div>
    </details>
  );
}
