import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pkg from "../../package.json" with { type: "json" };
import changelog from "../../shared/app-release.json" with { type: "json" };

export type UpdatePhase =
  | "disabled"
  | "idle"
  | "checking"
  | "current"
  | "available"
  | "downloading"
  | "verifying"
  | "ready"
  | "installing"
  | "error";
type NativeStatus = {
  phase: UpdatePhase;
  message: string;
  version?: string;
  notes?: string;
  downloaded?: number;
  total?: number;
};
type Preferences = {
  lastChecked?: number;
  remindUntil?: number;
  remindVersion?: string;
};
const DAY = 24 * 60 * 60 * 1000;
export function updateReminderVisible(
  status: NativeStatus,
  prefs: Preferences,
  now = Date.now(),
) {
  return (
    ["available", "ready"].includes(status.phase) &&
    !(prefs.remindVersion === status.version && (prefs.remindUntil || 0) > now)
  );
}

// Only the owning native host can report status or choose the trusted release endpoint.
export class DesktopUpdates {
  private native: NativeStatus;
  private prefs: Preferences = {};
  private loaded?: Promise<void>;
  private writes: Promise<void> = Promise.resolve();
  private directory: string | undefined;
  private enabled: boolean;
  private send: (action: string) => void;
  constructor(
    directory: string | undefined,
    enabled: boolean,
    send: (action: string) => void,
  ) {
    this.directory = directory;
    this.enabled = enabled;
    this.send = send;
    this.native = {
      phase: enabled ? "idle" : "disabled",
      message: enabled
        ? "Check for a new version of omp."
        : "Automatic updates are not configured for this build yet.",
    };
  }
  private load() {
    return (this.loaded ??= (async () => {
      if (!this.directory) return;
      try {
        const saved = JSON.parse(
          await fs.readFile(path.join(this.directory, "updates.json"), "utf8"),
        );
        this.prefs = {
          lastChecked:
            typeof saved.lastChecked === "number"
              ? saved.lastChecked
              : undefined,
          remindUntil:
            typeof saved.remindUntil === "number"
              ? saved.remindUntil
              : undefined,
          remindVersion:
            typeof saved.remindVersion === "string"
              ? saved.remindVersion
              : undefined,
        };
      } catch (error: any) {
        if (error.code !== "ENOENT")
          throw Error("Could not read update preferences.");
      }
    })());
  }
  private save() {
    const value = JSON.stringify(this.prefs);
    const directory = this.directory;
    this.writes = this.writes
      .catch(() => {})
      .then(async () => {
        if (!directory) return;
        await fs.mkdir(directory, { recursive: true });
        const temporary = path.join(directory, `updates-${randomUUID()}.tmp`);
        try {
          await fs.writeFile(temporary, value, { flag: "wx", mode: 0o600 });
          await fs.rename(temporary, path.join(directory, "updates.json"));
        } finally {
          await fs.rm(temporary, { force: true });
        }
      });
    return this.writes;
  }
  async status() {
    await this.load();
    return {
      ...this.native,
      ...this.prefs,
      configured: this.enabled,
      notify: updateReminderVisible(this.native, this.prefs),
    };
  }
  async receive(value: NativeStatus) {
    await this.load();
    if (
      ![
        "checking",
        "current",
        "available",
        "downloading",
        "verifying",
        "ready",
        "installing",
        "error",
        "disabled",
      ].includes(value.phase)
    )
      return;
    if (value.phase === "available" || value.phase === "current")
      this.prefs.lastChecked = Date.now();
    this.native = { ...this.native, ...value };
    if (value.phase === "current") {
      delete this.native.version;
      delete this.native.notes;
    }
    if (value.phase === "available" || value.phase === "current")
      await this.save();
  }
  async action(
    action: string,
    running: boolean | (() => boolean),
    automatic = false,
  ) {
    await this.load();
    if (action === "remind") {
      if (!this.native.version) throw Error("There is no update to postpone.");
      this.prefs.remindUntil = Date.now() + DAY;
      this.prefs.remindVersion = this.native.version;
      await this.save();
      return this.status();
    }
    if (!this.enabled)
      throw Error("This build has no signed update channel configured yet.");
    if (automatic && !["idle", "current", "error"].includes(this.native.phase))
      return this.status();
    if (
      ["checking", "downloading", "verifying", "installing"].includes(
        this.native.phase,
      )
    )
      throw Error("An update operation is already in progress.");
    if (action === "check") {
      if (automatic && Date.now() - (this.prefs.lastChecked || 0) < DAY)
        return this.status();
      this.prefs.lastChecked = Date.now();
      this.native = { phase: "checking", message: "Checking for updates…" };
      try {
        await this.save();
      } catch (error) {
        this.native = {
          phase: "error",
          message: "Could not save update preferences. Please retry.",
        };
        throw error;
      }
    } else if (action === "download") {
      if (this.native.phase !== "available")
        throw Error("Check for an available update first.");
      this.native = {
        ...this.native,
        phase: "downloading",
        message: "Downloading update…",
        downloaded: 0,
        total: undefined,
      };
    } else if (action === "install") {
      if (typeof running === "function" ? running() : running)
        throw Error(
          "Wait for running sessions, saves and native operations to finish before updating.",
        );
      if (this.native.phase !== "ready")
        throw Error("Download and verify the update first.");
      this.native = {
        ...this.native,
        phase: "installing",
        message: "Installing update and restarting…",
      };
    } else throw Error("Unknown update action.");
    this.send(action);
    return this.status();
  }
  get installing() {
    return this.native.phase === "installing";
  }
}
export const desktopUpdates = new DesktopUpdates(
  process.env.OMP_DESKTOP_DATA,
  process.env.OMP_UPDATES_CONFIGURED === "true" &&
    !!process.env.OMP_DESKTOP_TOKEN &&
    !process.env.OMP_INSTALLER_PAYLOAD,
  (action) => process.stdout.write(`OMP_DESKTOP_UPDATE ${action}\n`),
);
export function appRelease() {
  return {
    version: process.env.OMP_APP_VERSION || pkg.version,
    desktop: !!process.env.OMP_DESKTOP_TOKEN,
    platform: process.platform,
    arch: process.arch,
    ...changelog,
  };
}
