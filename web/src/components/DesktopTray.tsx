import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { get, post } from "../lib/api";
import { applyThemeImmediately, getTheme } from "../lib/theme";
import {
  ArrowUpRight,
  Settings2 as Settings,
  MessagesSquare,
  Activity,
  LogOut,
  RefreshCw,
} from "./NavigationIcons";

type Chat = { key?: string; path?: string; name: string };
type TrayData = { recent: Chat[]; running: Chat[] };
export function DesktopTray() {
  const [data, setData] = useState<TrayData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const theme = () => {
      applyThemeImmediately(getTheme());
      window.dispatchEvent(new Event("omp:appearance"));
    };
    const refresh = async () => {
      theme();
      try {
        const next = await get<TrayData>("/api/desktop/tray");
        if (active) {
          setData(next);
          setError("");
        }
      } catch (error: any) {
        if (active) setError(error.message);
      } finally {
        if (active)
          void post("/api/desktop/tray-action", { action: "ready" }).catch(
            () => {},
          );
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        void post("/api/desktop/tray-action", { action: "dismiss" });
    };
    const timer = setInterval(() => {
      if (document.hasFocus()) void refresh();
    }, 5000);
    void refresh();
    window.addEventListener("omp:tray-open", refresh);
    window.addEventListener("storage", theme);
    window.addEventListener("keydown", escape);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("omp:tray-open", refresh);
      window.removeEventListener("storage", theme);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  async function action(action: string, chat?: Chat) {
    setBusy(true);
    setError("");
    try {
      await post("/api/desktop/tray-action", {
        action,
        key: chat?.key,
        path: chat?.path,
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="desktop-tray" aria-label="Oh My GUI tray menu">
      {error && (
        <div
          role="alert"
          className="m-3 rounded-lg border p-3 text-xs text-destructive"
        >
          {error}
          <button
            className="mt-2 flex gap-2 text-foreground"
            onClick={() => window.dispatchEvent(new Event("omp:tray-open"))}
          >
            <RefreshCw className="size-3" />
            Retry
          </button>
        </div>
      )}
      <div className="desktop-tray-lists">
        {(["running", "recent"] as const).map((group) => (
          <section
            key={group}
            aria-label={
              group === "running" ? "Running sessions" : "Recent chats"
            }
          >
            <h2>
              {group === "running" ? (
                <Activity className="size-3.5" />
              ) : (
                <MessagesSquare className="size-3.5" />
              )}
              {group === "running" ? "Running sessions" : "Recent chats"}
              <span className="ml-auto tabular-nums">
                {data?.[group].length || 0}
              </span>
            </h2>
            {!data ? (
              <p role="status">Loading chats…</p>
            ) : !data[group].length ? (
              <p>
                {group === "running"
                  ? "No sessions running"
                  : "No recent chats"}
              </p>
            ) : (
              (group === "recent" ? data.recent : data.running.slice(0, 20))
                .map((chat, index) => (
                  <button
                    key={chat.key || chat.path || index}
                    disabled={busy}
                    onClick={() => void action("chat", chat)}
                    title={chat.name}
                  >
                    <span
                      className={
                        group === "running"
                          ? "tray-running-dot"
                          : "tray-chat-dot"
                      }
                    />
                    <span className="truncate">{chat.name}</span>
                    <ArrowUpRight className="ml-auto size-3 shrink-0 opacity-50" />
                  </button>
                ))
            )}
          </section>
        ))}
      </div>
      <footer>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void action("settings")}
        >
          <Settings className="size-4" />
          Settings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void action("quit")}
        >
          <LogOut className="size-4" />
          Quit Oh My GUI…
        </Button>
      </footer>
    </main>
  );
}
