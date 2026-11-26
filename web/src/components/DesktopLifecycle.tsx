import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { api, post } from "../lib/api";
import { hasPendingEditorChanges } from "../lib/editor-session";

export function DesktopLifecycle() {
  const [warning, setWarning] = useState<{ running: number | null; unsaved: boolean }>();
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const actionPending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let checking = false;
    const close = async () => {
      if (checking || actionPending.current || document.documentElement.dataset.desktopSetup === "true") return;
      setError("");
      checking = true;
      let running: number | null = null;
      try {
        const status = await api<{ running: unknown[] }>("/api/desktop/tray", {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2500)]),
        });
        running = status.running.length;
      } catch {
        // Let the user choose if the backend cannot confirm the window is idle.
      }
      try {
        if (controller.signal.aborted) return;
        const unsaved = hasPendingEditorChanges();
        if (running === 0 && !unsaved) await post("/api/desktop/window", { action: "close-confirmed" });
        else setWarning({ running, unsaved });
      } catch {
        setWarning({ running, unsaved: hasPendingEditorChanges() });
        setError("The window action failed. Please retry.");
      } finally {
        checking = false;
      }
    };
    window.addEventListener("omp:close-requested", close);
    return () => {
      controller.abort();
      window.removeEventListener("omp:close-requested", close);
    };
  }, []);
  async function action(action: "hide" | "close-confirmed") {
    if (actionPending.current) return;
    actionPending.current = true;
    setActing(true);
    setError("");
    try {
      await post("/api/desktop/window", { action });
      setWarning(undefined);
    } catch {
      setError("The window action failed. Please retry.");
    } finally {
      actionPending.current = false;
      setActing(false);
    }
  }
  const running = warning?.running;
  const minimize = window.__OMP_MINIMIZE_INSTEAD_OF_TRAY__ === true;

  return (
    <Dialog open={!!warning} onOpenChange={(open) => { if (!open && !actionPending.current) setWarning(undefined); }}>
      <DialogContent className="gap-3 p-4 sm:max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle>Quit Oh My GUI?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>
                {running === null
                  ? "Quitting stops any running sessions."
                  : running
                    ? `Quitting will stop ${running} running session${running === 1 ? "" : "s"}.`
                    : !warning?.unsaved && "Quitting closes the app."}
                {running !== 0 && warning?.unsaved && " "}
                {warning?.unsaved && "Unsaved editor changes will be lost."}
              </p>
              <p>
                {minimize
                  ? "You can minimize the window to keep the app running instead."
                  : "You can keep the app running in the tray instead."}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={acting} onClick={() => void action("hide")}>
            {minimize ? "Minimize" : "Keep in tray"}
          </Button>
          <Button
            variant="destructive"
            disabled={acting}
            onClick={() => void action("close-confirmed")}
          >
            Quit Oh My GUI
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
