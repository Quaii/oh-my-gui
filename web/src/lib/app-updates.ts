import { useEffect, useState } from "react";
import { get, post } from "./api";

export type UpdateStatus = {
  phase: string;
  message: string;
  configured: boolean;
  notify: boolean;
  version?: string;
  notes?: string;
  lastChecked?: number;
  remindUntil?: number;
  downloaded?: number;
  total?: number;
};
export function useUpdateStatus() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!window.__OMP_DESKTOP__ || window.__OMP_INSTALLER__) return;
    let active = true,
      inFlight = false,
      timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      clearTimeout(timer);
      let delay = 3000;
      try {
        const value = await get<UpdateStatus>("/api/desktop/updates");
        if (active) {
          setStatus(value);
          setError("");
        }
        if (
          ["checking", "downloading", "verifying", "installing"].includes(
            value.phase,
          )
        )
          delay = 500;
      } catch (error: any) {
        if (active) setError(error.message);
      }
      inFlight = false;
      if (active) timer = setTimeout(refresh, delay);
    };
    void refresh();
    window.addEventListener("omp:update-changed", refresh);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("omp:update-changed", refresh);
    };
  }, []);
  async function action(action: string, automatic = false) {
    setError("");
    try {
      const value = await post<UpdateStatus>("/api/desktop/updates", {
        action,
        automatic,
      });
      setStatus(value);
      window.dispatchEvent(new Event("omp:update-changed"));
      return value;
    } catch (error: any) {
      setError(error.message);
      return null;
    }
  }
  return { status, error, action };
}
export function editorAllowsUpdate() {
  return window.dispatchEvent(
    new Event("omp:before-update", { cancelable: true }),
  );
}
