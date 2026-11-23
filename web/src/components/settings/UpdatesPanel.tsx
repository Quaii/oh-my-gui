import { useRemote, Notice } from "./ManagementShared";
import { Button } from "../ui/button";
import { useUpdateStatus } from "../../lib/app-updates";
import { Download, RefreshCw } from "lucide-react";

export function AppVersion({ compact = false }: { compact?: boolean }) {
  const { data, error } = useRemote("/api/app-release");
  if (compact) {
    return (
      <span className="shrink-0 whitespace-nowrap text-right text-sm text-muted-foreground">
        <span className="font-medium text-foreground">omp.</span>{" "}
        {data?.version ?? (error ? "Unavailable" : "…")}
      </span>
    );
  }
  return (
    <div className="mb-6 font-sans">
      <h2 className="settings-heading-title">
        omp.{" "}
        {data ? (
          <span className="text-muted-foreground">{data.version}</span>
        ) : (
          "version"
        )}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {data?.desktop
          ? `Desktop · ${data.platform} · ${data.arch}`
          : "Web interface"}
      </p>
      <Notice error={error} />
    </div>
  );
}
export default function UpdatesPanel() {
  const { data, loading, error } = useRemote("/api/app-release");
  const updates = useUpdateStatus();
  const busy =
    updates.status &&
    ["checking", "downloading", "verifying", "installing"].includes(
      updates.status.phase,
    );
  return (
    <div className="settings-stack">
      <section className="settings-card">
        <AppVersion />
        {window.__OMP_DESKTOP__ ? (
          <>
            <p role="status" className="text-sm text-muted-foreground">
              {updates.status?.message || "Loading update status…"}
            </p>
            {updates.status?.lastChecked && (
              <p className="mt-2 text-xs text-muted-foreground">
                Last checked{" "}
                {new Date(updates.status.lastChecked).toLocaleString()}
              </p>
            )}
            {updates.status?.remindUntil &&
              updates.status.remindUntil > Date.now() && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Next reminder{" "}
                  {new Date(updates.status.remindUntil).toLocaleString()}
                </p>
              )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!updates.status?.configured || !!busy}
                onClick={() => void updates.action("check")}
              >
                <RefreshCw className="size-4" />
                Check for updates
              </Button>
              {["available", "ready", "downloading", "verifying"].includes(
                updates.status?.phase || "",
              ) && (
                <Button
                  onClick={() =>
                    window.dispatchEvent(new Event("omp:show-update"))
                  }
                >
                  <Download className="size-4" />
                  View update {updates.status?.version}
                </Button>
              )}
            </div>
            <Notice error={updates.error} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            The web interface updates when its server is upgraded. Desktop
            update controls are available in the installed app.
          </p>
        )}
      </section>
      <section className="settings-card-stack">
        <h2 className="settings-heading-title">Changelog</h2>
        <Notice error={error} />
        {loading && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading release notes…
          </p>
        )}
        <div className="settings-card-stack empty:hidden">
          {data?.releases?.map((release: any) => (
            <article
              key={release.version}
              className="settings-card"
            >
              <h3 className="font-medium">
                {release.version} · {release.title}
              </h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                {release.changes.map((change: string) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
