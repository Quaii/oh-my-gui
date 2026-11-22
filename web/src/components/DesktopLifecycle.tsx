import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { get, post } from "../lib/api";

export function DesktopLifecycle() {
  const [open, setOpen] = useState(false),
    [running, setRunning] = useState<number | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () =>
      get("/api/desktop/tray")
        .then((data) => {
          if (active) setRunning(data.running.length);
        })
        .catch(() => {});
    const close = () => {
      setOpen(true);
      setError("");
      void refresh();
    };
    window.addEventListener("omp:close-requested", close);
    void refresh();
    return () => {
      active = false;
      window.removeEventListener("omp:close-requested", close);
    };
  }, []);
  async function action(action: string) {
    try {
      await post("/api/desktop/window", { action });
      setOpen(false);
    } catch {
      setError("The window action failed. Please retry.");
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quit omp.?</DialogTitle>
          <DialogDescription>
            {running === null
              ? "Quitting stops any running sessions."
              : running
                ? `${running} session${running === 1 ? " is" : "s are"} still running. Quitting will stop them.`
                : "Quitting closes the app."}{" "}
            Unsaved editor changes will be lost. You can keep the app running in
            the tray instead.
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => void action("hide")}>
            Keep in tray
          </Button>
          <Button
            variant="destructive"
            onClick={() => void action("close-confirmed")}
          >
            Quit omp.
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
