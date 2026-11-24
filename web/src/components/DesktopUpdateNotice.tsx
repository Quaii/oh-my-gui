import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { editorAllowsUpdate, useUpdateStatus } from "../lib/app-updates";
import { Download, RefreshCw } from "lucide-react";
import { Markdown } from "./Markdown";

export function DesktopUpdateNotice() {
  const { status, error, action } = useUpdateStatus();
  const [open, setOpen] = useState(false),
    [guard, setGuard] = useState("");
  useEffect(() => {
    const show = () => {
      setOpen(true);
      setGuard("");
    };
    window.addEventListener("omp:show-update", show);
    return () => window.removeEventListener("omp:show-update", show);
  }, []);
  useEffect(() => {
    if (!status?.configured) return;
    const check = () => {
      if (document.documentElement.dataset.desktopSetup !== "true")
        void action("check", true);
    };
    const first = setTimeout(check, 1500),
      timer = setInterval(check, 60 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [status?.configured]);
  const busy = ["downloading", "verifying", "installing"].includes(
    status?.phase || "",
  );
  async function install() {
    if (!editorAllowsUpdate()) {
      setGuard("Save your editor changes before installing the update.");
      return;
    }
    setGuard("");
    await action("install");
  }
  const progress = status?.total
    ? Math.min(100, Math.floor(((status.downloaded || 0) / status.total) * 100))
    : undefined;
  return (
    <>
      {status?.notify &&
        !open &&
        document.documentElement.dataset.desktopSetup !== "true" && (
          <aside
            className="desktop-update-notice workspace-floating-surface"
            aria-label="App update"
          >
            <p className="text-sm font-medium">
              Oh My GUI {status.version} is available
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setOpen(true)}>
                View update
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void action("remind")}
              >
                Remind me tomorrow
              </Button>
            </div>
          </aside>
        )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (status?.phase !== "installing") setOpen(value);
        }}
      >
        <DialogContent className="desktop-update-dialog">
          <DialogTitle>
            Update Oh My GUI{status?.version ? ` to ${status.version}` : ""}
          </DialogTitle>
          <DialogDescription>
            Install the latest version and restart. Your chats and settings are
            kept.
          </DialogDescription>
          {status?.notes && (
            <div
              className="max-h-56 overflow-y-auto text-sm leading-relaxed text-muted-foreground"
              aria-label="Release notes"
            >
              <Markdown text={status.notes} />
            </div>
          )}
          <p role="status" className="text-sm">
            {status?.message || "Loading update…"}
          </p>
          {status?.phase === "downloading" && (
            <div
              role="progressbar"
              aria-label="Update download"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1.5 overflow-hidden rounded bg-primary/20"
            >
              <div
                className="h-full bg-primary"
                style={{
                  width: progress === undefined ? "25%" : progress + "%",
                }}
              />
            </div>
          )}
          {(error || guard) && (
            <p role="alert" className="text-sm text-destructive">
              {guard || error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              disabled={busy || !status?.version}
              onClick={() => {
                void action("remind");
                setOpen(false);
              }}
            >
              Remind me tomorrow
            </Button>
            {status?.phase === "ready" ? (
              <Button onClick={() => void install()}>
                <RefreshCw className="size-4" />
                Install and restart
              </Button>
            ) : (
              <Button
                disabled={busy || status?.phase === "disabled" || !status}
                onClick={() =>
                  void action(
                    status?.phase === "available" ? "download" : "check",
                  )
                }
              >
                <Download className="size-4" />
                {busy
                  ? status?.phase === "installing"
                    ? "Restarting…"
                    : "Preparing update…"
                  : status?.phase === "available"
                    ? "Update now"
                    : "Check again"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
