import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Download, LoaderCircle } from "lucide-react";
import { DesktopSetupFrame } from "./DesktopSetupFrame";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "./ui/dialog";
import { get, post } from "../lib/api";
import {
  INSTALL_STEPS,
  type InstallProgress,
} from "../../../shared/install-progress";
import { revealDesktop } from "../lib/desktop";

type InstallerStatus = {
  destination: string;
  installed: boolean;
  installing: boolean;
  progress?: InstallProgress;
};
export function DesktopInstaller() {
  const [status, setStatus] = useState<InstallerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [exitQueued, setExitQueued] = useState(false);
  const exitAfterInstall = useRef(false);
  const [error, setError] = useState("");
  const load = () =>
    get<InstallerStatus>("/api/desktop/installer")
      .then(setStatus)
      .catch((error) => setError(error.message));
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (status || error) return revealDesktop("installer");
  }, [status, error]);

  useEffect(() => {
    if (!busy) return;
    let active = true,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const value = await get<InstallerStatus>("/api/desktop/installer");
        if (active) setStatus(value);
      } catch (error: any) {
        if (active) setError("Progress update unavailable: " + error.message);
      } finally {
        if (active) timer = setTimeout(poll, 300);
      }
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [busy]);
  const current = status?.installed
    ? INSTALL_STEPS.length - 1
    : Math.max(
        0,
        INSTALL_STEPS.findIndex((step) => step.id === status?.progress?.stage),
      );
  const verified = status?.progress?.totalBytes
    ? Math.min(
        100,
        Math.floor(
          ((status.progress.bytes || 0) / status.progress.totalBytes) * 100,
        ),
      )
    : null;

  async function close() {
    try {
      await post("/api/desktop/window", { action: "close-confirmed" });
    } catch (error: any) {
      setError(error.message);
    }
  }

  function requestExit() {
    if (busy || (started && !status?.installed)) setConfirmExit(true);
    else void close();
  }
  useEffect(() => {
    window.addEventListener("omp:close-requested", requestExit);
    return () => window.removeEventListener("omp:close-requested", requestExit);
  }, [busy, started, status?.installed]);

  async function action(kind: "install" | "launch") {
    setBusy(true);
    setError("");
    if (kind === "install") setStarted(true);
    try {
      setStatus(
        await post<InstallerStatus>("/api/desktop/installer", { action: kind }),
      );
      if (kind === "launch") await close();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setBusy(false);
      if (exitAfterInstall.current) await close();
    }
  }

  function confirmClose() {
    setConfirmExit(false);
    if (busy) {
      // NSIS owns file replacement and uninstall registration. Do not terminate
      // it midway through those writes; honor the exit at the safe boundary.
      exitAfterInstall.current = true;
      setExitQueued(true);
    } else void close();
  }

  return (
    <>
      <DesktopSetupFrame
        steps={INSTALL_STEPS.map((step) => step.label)}
        current={current}
        busy={busy}
        allowCancelWhileBusy
        onCancel={requestExit}
      >
        <section>
          <h1 id="installer-title">
            {status?.installed ? "Installation complete" : "Install omp."}
          </h1>
          <p>
            {status?.installed
              ? "Continue to set up OMP and connect your providers."
              : "Install for your account and bring the OMP runtime up to date. Your chats and settings are kept."}
          </p>
          <div className="desktop-setup-inset desktop-installer-progress">
            <div className="flex items-center gap-3">
              {busy ? (
                <LoaderCircle className="size-5 animate-spin text-primary motion-reduce:animate-none" />
              ) : status?.installed ? (
                <Check className="size-5 text-primary" />
              ) : (
                <Download className="size-5 text-muted-foreground" />
              )}
              <h2>
                {exitQueued
                  ? "Finishing safely…"
                  : busy
                    ? INSTALL_STEPS[current].label
                    : status?.installed
                      ? "Installed for your account"
                      : "Install for your account"}
              </h2>
            </div>
            <p className="break-all">
              {status?.destination || "Checking installation location…"}
            </p>
            <p>
              {exitQueued
                ? "This window will close when the current installation step finishes."
                : busy
                  ? status?.progress?.detail || "Starting installation…"
                  : status?.progress?.runtimeVersion
                    ? `OMP runtime verified · ${status.progress.runtimeVersion}`
                    : "No administrator access is needed. You can uninstall from Windows Settings."}
            </p>
            {(started || status?.installed) && (
              <div className="mt-4 space-y-2" aria-live="polite">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Installation stages completed</span>
                  <span>
                    {current} of {INSTALL_STEPS.length - 1}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Installation stages completed"
                  aria-valuemin={0}
                  aria-valuemax={INSTALL_STEPS.length - 1}
                  aria-valuenow={current}
                  className="h-1.5 overflow-hidden rounded bg-primary/20"
                >
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: (current / (INSTALL_STEPS.length - 1)) * 100 + "%",
                    }}
                  />
                </div>
                {status?.progress?.stage === "package" && verified !== null && (
                  <p className="text-xs">Checking package: {verified}%</p>
                )}
              </div>
            )}
          </div>
        </section>
        {(error || status?.progress?.error) && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error || status?.progress?.error}
          </p>
        )}
        <footer>
          {!status && error ? (
            <Button variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          ) : (
            <Button
              disabled={busy || !status || exitQueued}
              onClick={() =>
                void action(status?.installed ? "launch" : "install")
              }
            >
              {busy
                ? status?.installed
                  ? "Opening…"
                  : "Installing…"
                : status?.installed
                  ? "Open setup"
                  : "Install omp."}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </footer>
      </DesktopSetupFrame>
      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent
          className="desktop-installer-confirm"
          showCloseButton={false}
        >
          <DialogTitle>
            {busy ? "Abort installation?" : "Exit installer?"}
          </DialogTitle>
          <DialogDescription>
            {busy
              ? "Installation is in progress. It will finish safely before the window closes. Setup will not open."
              : status?.installed
                ? "omp. is installed. Close this window without opening setup?"
                : "Exit the installer? You can run it again to retry."}
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              autoFocus
              onClick={() => setConfirmExit(false)}
            >
              {busy ? "Keep installing" : "Stay here"}
            </Button>
            <Button onClick={confirmClose}>
              {busy ? "Finish and exit" : "Exit installer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
