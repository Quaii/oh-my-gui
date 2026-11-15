import { useEffect, useState } from "react";

/**
 * Minimal client-side router for a two-route app: the chat shell (`/`) and
 * the settings page (`/settings`). `next-shims` already intercepts same-origin
 * link clicks; this keeps a single source of truth for the current path.
 */

const EV = "ompfe:route";

export function navigate(path: string) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event(EV));
  window.scrollTo(0, 0);
}

export function useRoutePath(): string {
  const [path, setPath] = useState(() => (typeof window === "undefined" ? "/" : window.location.pathname));

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    window.addEventListener(EV, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(EV, sync);
    };
  }, []);

  return path;
}
