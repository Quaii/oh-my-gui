import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import os from "node:os";
import { installDesktopOmp } from "./desktop-setup.ts";
import { desktopBuildHash } from "./desktop-build.ts";
import {
  nativeInstallStage,
  type InstallMode,
  type InstallProgress,
  type InstallStage,
} from "../../shared/install-progress.ts";

export function desktopInstallDirectory(localData = process.env.LOCALAPPDATA) {
  if (!localData || !path.isAbsolute(localData))
    throw new Error("The user installation directory is unavailable.");
  return path.join(localData, "Programs", "Oh My GUI");
}

const appExecutable = "OhMyGUI.exe";
const legacyExecutable = "omp-desktop.exe";
const uninstallBase = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\";
const uninstallKey = uninstallBase + "Oh My GUI";
const legacyUninstallKey = uninstallBase + "omp";

export async function findDesktopInstallation(localData = process.env.LOCALAPPDATA) {
  const preferred = desktopInstallDirectory(localData);
  const legacy = path.join(path.dirname(preferred), "omp");
  for (const [destination, executable] of [
    [preferred, appExecutable],
    [legacy, appExecutable],
    [legacy, legacyExecutable],
  ]) {
    const file = await fs.stat(path.join(destination, executable)).catch(error => {
      if (error.code !== "ENOENT") throw error;
      return undefined;
    });
    if (file?.isFile()) return { destination, executable };
  }
  return { destination: preferred };
}

type AppState = "running" | "draining" | "closed";
type InstallResult = "installed" | "app-close-required";

function installedAppState(close: boolean): Promise<AppState> {
  const executable = path.join(path.dirname(process.env.OMP_INSTALLER_PAYLOAD!), "OhMyGUI-Installer.exe");
  return new Promise((resolve, reject) => {
    execFile(executable, [close ? "--installer-close-app" : "--installer-check-app"],
      { timeout: close ? 50_000 : 5000, windowsHide: true }, (error, stdout) => {
        const state = stdout.trim();
        if (error || (state !== "running" && state !== "draining" && state !== "closed")) {
          reject(new Error(close ? "Could not close Oh My GUI. Quit from its tray menu and retry here."
            : "Could not check whether Oh My GUI is running. Retry here."));
        } else {
          resolve(state);
        }
      });
  });
}

export async function prepareInstalledApp(
  close: boolean,
  check: (close: boolean) => Promise<AppState> = installedAppState,
  pause: () => Promise<void> = () => wait(500),
) {
  let state = await check(false);
  if (state === "running") {
    if (!close) return false;
    state = await check(true);
    if (state === "running") throw new Error("Oh My GUI is still running. Quit from its tray menu and retry here.");
  }
  for (let attempt = 0; state === "draining" && attempt < 20; attempt++) {
    await pause();
    state = await check(false);
  }
  if (state === "draining") throw new Error("Oh My GUI is still shutting down. Wait a moment and retry here.");
  return state === "closed";
}

let installed = false;
let installing: Promise<InstallResult> | undefined;
let existingInstallation: ReturnType<typeof detectExistingInstallation> | undefined;
let progress: InstallProgress = {
  stage: "checks",
  detail: "Ready to check this installation.",
};
function stage(stage: InstallStage, detail: string) {
  progress = { stage, detail };
}
export async function installerManifest(payload: string) {
  try {
    const [file, manifest] = await Promise.all([
      fs.stat(payload),
      fs
        .readFile(
          path.join(path.dirname(payload), "installer-manifest.json"),
          "utf8",
        )
        .then(JSON.parse),
    ]);
    if (
      !file.isFile() ||
      file.size === 0 ||
      typeof manifest.version !== "string" ||
      !manifest.version.trim() ||
      !/^[a-f0-9]{64}$/.test(manifest.sha256) ||
      (manifest.buildSha256 !== undefined && !/^[a-f0-9]{64}$/.test(manifest.buildSha256))
    )
      throw new Error("Invalid payload");
    return manifest as { version: string; sha256: string; buildSha256?: string };
  } catch {
    throw new Error(
      "Installation files are missing or damaged. Close this copy and run the packaged Oh My GUI installer again.",
    );
  }
}

export function installerMode(existing: boolean, previousVersion: string | undefined, version: string, sameBuild?: boolean): InstallMode {
  if (!existing) return "install";
  const numericVersion = /^\d+\.\d+\.\d+$/;
  const sameVersionMode = sameBuild === undefined ? "replace" : sameBuild ? "reinstall" : "update";
  if (previousVersion === version) return sameVersionMode;
  if (!previousVersion || !numericVersion.test(previousVersion) || !numericVersion.test(version)) return "replace";
  const previous = previousVersion.split(".").map(Number);
  const next = version.split(".").map(Number);
  const firstDifference = next.findIndex((part, index) => part !== previous[index]);
  if (firstDifference === -1) return sameVersionMode;
  return next[firstDifference] > previous[firstDifference] ? "update" : "replace";
}

async function detectExistingInstallation(version: string, buildSha256?: string) {
  const { destination, executable } = await findDesktopInstallation();
  if (!executable) return { destination, mode: "install" as const };
  const [previousVersion, installedBuild] = await Promise.all([
    new Promise<string | undefined>(resolve => {
      const key = executable === legacyExecutable ? legacyUninstallKey : uninstallKey;
      execFile("reg.exe", ["query", key, "/v", "DisplayVersion"], { timeout: 3000, windowsHide: true },
        (error, stdout) => resolve(error ? undefined : /^\s*DisplayVersion[ \t]+REG_SZ[ \t]+([^\r\n]+)/mi.exec(stdout)?.[1].trim()));
    }),
    buildSha256 ? desktopBuildHash(path.join(destination, executable), path.join(destination, "runtime")).catch(() => undefined) : undefined,
  ]);
  const sameBuild = installedBuild ? installedBuild === buildSha256 : undefined;
  return { destination, mode: installerMode(true, previousVersion, version, sameBuild), previousVersion };
}

export async function desktopInstallerStatus() {
  if (!process.env.OMP_INSTALLER_PAYLOAD || process.platform !== "win32")
    throw new Error("Installer mode is unavailable.");
  const { version, buildSha256 } = await installerManifest(process.env.OMP_INSTALLER_PAYLOAD);
  const initial = await (existingInstallation ??= detectExistingInstallation(version, buildSha256).catch(error => {
    existingInstallation = undefined;
    throw error;
  }));
  return {
    version,
    ...initial,
    installed,
    installing: !!installing,
    progress: { ...progress },
  };
}

export function installDesktopApplication(closeRunningApp = false) {
  return (installing ??= install(closeRunningApp).finally(() => {
    installing = undefined;
  }));
}

export async function verifyInstallerPayload(
  payload: string,
  expected: string,
  report: (bytes: number, total: number) => void,
) {
  const total = (await fs.stat(payload)).size;
  let bytes = 0;
  const hash = createHash("sha256");
  report(0, total);
  for await (const chunk of createReadStream(payload)) {
    hash.update(chunk);
    bytes += chunk.length;
    report(bytes, total);
  }
  if (hash.digest("hex") !== expected)
    throw Error("Installer integrity check failed. Download a fresh copy.");
}

async function install(closeRunningApp: boolean): Promise<InstallResult> {
  let work: string | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  installed = false;
  stage(
    "checks",
    closeRunningApp ? "Closing Oh My GUI and waiting for its session to stop…"
      : "Checking the destination, free disk space and running applications…",
  );
  process.stdout.write("OMP_DESKTOP_INSTALLING true\n");
  try {
    const { destination, mode } = await desktopInstallerStatus();
    if (!await prepareInstalledApp(closeRunningApp)) return "app-close-required";
    const payload = process.env.OMP_INSTALLER_PAYLOAD!;
    const manifest = await installerManifest(payload);
    const payloadSize = (await fs.stat(payload)).size;
    const disk = await fs.statfs(process.env.LOCALAPPDATA!);
    // A conservative allowance for extraction plus the bundled runtime and application.
    if (disk.bavail * disk.bsize < payloadSize * 6)
      throw Error(
        "Not enough free disk space for installation and extraction. Free some space and retry.",
      );
    stage("package", "Verifying the installation package checksum…");
    await verifyInstallerPayload(
      payload,
      manifest.sha256,
      (bytes, totalBytes) => {
        progress.bytes = bytes;
        progress.totalBytes = totalBytes;
      },
    );
    stage("omp", "Checking the installed OMP runtime…");
    const runtime = await installDesktopOmp({
      checkUpdates: true,
      report: detail => { progress.detail = detail; },
    });
    if (!runtime.available || !runtime.version)
      throw Error("The OMP runtime could not be verified. Retry installation.");
    if (!await prepareInstalledApp(false)) return "app-close-required";
    work = await fs.mkdtemp(path.join(os.tmpdir(), "omp-install-progress-"));
    const log = path.join(work, "stages.log");
    await fs.writeFile(log, "");
    const readProgress = async () => {
      const event = nativeInstallStage(await fs.readFile(log, "utf8"));
      if (event && progress.stage === "dependencies")
        stage(
          "files",
          "Installing application files and the bundled Node.js runtime…",
        );
      if (event === "integrated" && progress.stage === "files")
        progress.detail =
          "Application files, shortcuts and Windows uninstall registration written.";
    };
    stage("dependencies", "Checking Windows WebView2 dependencies…");
    timer = setInterval(() => {
      void readProgress().catch(() => {});
    }, 200);
    await new Promise<void>((resolve, reject) =>
      execFile(
        payload,
        ["/S", `/D=${destination}`],
        {
          windowsHide: true,
          windowsVerbatimArguments: true,
          env: { ...process.env, OMP_INSTALL_PROGRESS: log },
        },
        (error) =>
          error
            ? reject(
                new Error(
                  "Installation did not finish. Close Oh My GUI, check disk space and try again.",
                ),
              )
            : resolve(),
      ),
    );
    clearInterval(timer);
    await readProgress();
    if (nativeInstallStage(await fs.readFile(log, "utf8")) !== "integrated")
      throw Error(
        "The installation engine did not confirm Windows integration. Retry with a freshly built installer.",
      );
    stage(
      "verify",
      "Checking installed app files, the uninstaller and bundled runtime…",
    );
    for (const file of [
      appExecutable,
      "uninstall.exe",
      "runtime/node.exe",
      "runtime/server/src/index.mjs",
      "runtime/web/dist/index.html",
    ])
      await fs.access(path.join(destination, file));
    await new Promise<void>((resolve, reject) =>
      execFile(
        "reg.exe",
        [
          "query",
          uninstallKey,
          "/v",
          "UninstallString",
        ],
        { timeout: 10000, windowsHide: true },
        (error) =>
          error
            ? reject(
                Error(
                  "Windows uninstall registration could not be verified. Retry installation.",
                ),
              )
            : resolve(),
      ),
    );
    await new Promise<void>((resolve, reject) =>
      execFile(
        path.join(destination, "runtime/node.exe"),
        ["--version"],
        { timeout: 15000, windowsHide: true },
        (error, stdout) =>
          error || !/^v\d+\./.test(stdout.trim())
            ? reject(
                Error(
                  "The installed Node.js runtime could not be verified. Retry installation.",
                ),
              )
            : resolve(),
      ),
    );
    installed = true;
    stage("complete", mode === "install"
      ? "Installation verified. Continue to first-launch setup."
      : "Installation verified. Oh My GUI is ready to open.");
    progress.runtimeVersion = runtime.version;
    return "installed";
  } catch (error: any) {
    progress.error = error.message;
    throw error;
  } finally {
    if (timer) clearInterval(timer);
    process.stdout.write("OMP_DESKTOP_INSTALLING false\n");
    if (work)
      await fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

export function desktopApplicationEnvironment(
  source: NodeJS.ProcessEnv = process.env,
) {
  const environment = { ...source };
  // A launched app owns a fresh native session; installer flags must never follow it.
  for (const key of [
    "OMP_INSTALLER_PAYLOAD",
    "OMP_INSTALL_PROGRESS",
    "OMP_DESKTOP_TOKEN",
    "OMP_DESKTOP_DATA",
    "OMP_UPDATES_CONFIGURED",
    "OMP_APP_VERSION",
  ])
    delete environment[key];
  return environment;
}

export async function launchInstalledDesktop() {
  if (!installed) throw new Error("Finish installation before opening Oh My GUI.");
  const { destination } = await desktopInstallerStatus();
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      path.join(destination, appExecutable),
      [],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: desktopApplicationEnvironment(),
      },
    );
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
