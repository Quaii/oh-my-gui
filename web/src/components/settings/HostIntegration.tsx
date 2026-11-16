import { useEffect, useState } from "react";
import { get, post } from "../../lib/api";
import { Switch } from "../ui/switch";
export function HostIntegration({ chatKey }: { chatKey: string | null }) {
  const [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    if (!chatKey) {
      setBusy(false);
      return;
    }
    get("/api/host-adapters?key=" + encodeURIComponent(chatKey))
      .then((result) => {
        if (active) setEnabled(result.enabled);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [chatKey]);
  return (
    <section className="my-5 rounded-xl border bg-sidebar p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium">GUI host integration</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Let this session queue GUI notices with ui_notice and read the last
            reported runtime state at omp-ui://runtime. This manages the
            GUI-owned host tool and URI registrations for this session.
          </p>
        </div>
        <Switch
          aria-label="GUI host integration"
          checked={enabled}
          disabled={busy || !chatKey}
          onCheckedChange={async (value) => {
            setBusy(true);
            setError("");
            try {
              const result = await post("/api/host-adapters", {
                key: chatKey,
                enabled: value,
              });
              setEnabled(result.enabled);
            } catch (error: any) {
              setError(error.message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
