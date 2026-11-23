import { useEffect, useState, type MouseEvent } from "react";
import { Minus, Square, Copy, X } from "lucide-react";

type WindowAction = "drag" | "minimize" | "toggle-maximize" | "close" | "sync-state";

export function hasCustomChrome() {
  return !!window.__OMP_CUSTOM_CHROME__ && !window.__OMP_INSTALLER__ && !window.__OMP_TRAY__;
}

async function windowCommand(action: WindowAction) {
  const response = await fetch("/api/desktop/window", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) throw Error("Window control unavailable");
}

/** The integrated toolbar is also the drag region, excluding interactive surfaces. */
export function dragDesktopWindow(event: MouseEvent<HTMLElement>) {
  if (!hasCustomChrome() || event.button !== 0 || !(event.target instanceof Element)) return;
  if (event.target.closest("button,a,input,textarea,select,summary,[contenteditable=true],[role=button],[role=dialog],[role=menu],[role=tooltip],[data-window-no-drag],.workspace-context-cards")) return;
  event.preventDefault();
  void windowCommand(event.detail === 2 ? "toggle-maximize" : "drag")
    .catch(() => window.dispatchEvent(new Event("omp:window-control-error")));
}

export function DesktopWindowControls() {
  const [maximized, setMaximized] = useState(false);
  const [error, setError] = useState("");
  const enabled = hasCustomChrome();
  useEffect(() => {
    if (!enabled) return;
    const sync = (event: Event) => setMaximized(!!(event as CustomEvent<{ maximized: boolean }>).detail.maximized);
    const failed = () => setError("Window control unavailable");
    window.addEventListener("omp:window-state", sync);
    window.addEventListener("omp:window-control-error", failed);
    void windowCommand("sync-state").catch(failed);
    return () => {
      window.removeEventListener("omp:window-state", sync);
      window.removeEventListener("omp:window-control-error", failed);
    };
  }, [enabled]);
  if (!enabled) return null;
  function command(action: WindowAction) {
    void windowCommand(action).then(() => setError("")).catch(() => setError("Window control unavailable"));
  }
  return <div className="desktop-window-controls" role="group" aria-label="Window controls">
    {error && <span role="status" className="desktop-window-error">{error}</span>}
    <button type="button" onClick={() => command("minimize")} aria-label="Minimize window" title="Minimize"><Minus /></button>
    <button type="button" onClick={() => command("toggle-maximize")} aria-label={maximized ? "Restore window" : "Maximize window"} title={maximized ? "Restore" : "Maximize"}>{maximized ? <Copy /> : <Square />}</button>
    <button type="button" className="desktop-window-close" onClick={() => command("close")} aria-label="Close window" title="Close"><X /></button>
  </div>;
}
