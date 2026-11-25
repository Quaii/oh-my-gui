import { useEffect, useState } from "react";
import { get, post } from "@/lib/api";
import { Group, Toggle } from "./Controls";

type NotificationStatus = {
  enabled: boolean;
  permission: "granted" | "prompt" | "denied" | "unavailable";
};

const endpoint = "/api/desktop/notifications";

export function DesktopNotificationSettings() {
  const [status, setStatus] = useState<NotificationStatus>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (busy) return;
    let active = true;
    const refresh = async () => {
      try {
        const next = await get<NotificationStatus>(endpoint);
        if (active) setStatus(next);
      } catch (error) {
        if (active) setError((error as Error).message);
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [busy]);

  async function toggle(enabled: boolean) {
    setBusy(true);
    setError("");
    try {
      setStatus(await post<NotificationStatus>(endpoint, { enabled }));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const unavailable = status?.permission === "unavailable";
  const denied = status?.permission === "denied";

  return <Group title="Desktop notifications">
    <div className="setting-row flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Agent activity</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Get notified when a turn finishes or the agent asks a question while you’re away from that chat.
        </p>
        {denied && <p className="mt-1 text-xs text-muted-foreground">
          Allow notifications for Oh My GUI in macOS System Settings → Notifications.
        </p>}
        {unavailable && <p className="mt-1 text-xs text-muted-foreground">Notifications are unavailable in this build.</p>}
        {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <Toggle label="Agent activity notifications" value={!!status?.enabled} disabled={!status || busy || denied || unavailable}
        onChange={toggle} />
    </div>
  </Group>;
}
