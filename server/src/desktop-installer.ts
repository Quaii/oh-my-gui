import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { connect } from "node:net";
import os from "node:os";
import {
  nativeInstallStage,
  type InstallProgress,
  type InstallStage,
} from "../../shared/install-progress.ts";

export function desktopInstallDirectory(localData = process.env.LOCALAPPDATA) {
  if (!localData || !path.isAbsolute(localData))
    throw new Error("The user installation directory is unavailable.");
  return path.join(localData, "Programs", "omp");
}

function isRunning() {
  return new Promise<boolean>((resolve) => {
    const socket = connect({ host: "127.0.0.1", port: 4319 });
    const finish = (value: boolean) => {
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}

let installed = false;
let installing: Promise<void> | undefined;
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
      !/^[a-f0-9]{64}$/.test(manifest.sha256)
    )
      throw new Error("Invalid payload");
    return manifest as { version: string; sha256: string };
  } catch {
    throw new Error(
      "Installation files are missing or damaged. Close this copy and run the packaged omp. installer again.",
    );
  }
}
export async function desktopInstallerStatus() {
  if (!process.env.OMP_INSTALLER_PAYLOAD || process.platform !== "win32")
    throw new Error("Installer mode is unavailable.");
  await installerManifest(process.env.OMP_INSTALLER_PAYLOAD);
  return {
    destination: desktopInstallDirectory(),
    installed,
    installing: !!installing,
    progress: { ...progress },
  };
}

export function installDesktopApplication() {
  return (installing ??= install().finally(() => {
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

async function install() {
  let work: string | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  installed = false;
  stage(
    "checks",
    "Checking the destination, free disk space and running applications…",
  );
  process.stdout.write("OMP_DESKTOP_INSTALLING true\n");
  try {
    const { destination } = await desktopInstallerStatus();
    if (await isRunning())
      throw new Error(
        "Close the running omp. app, then try again. Your work will be kept.",
      );
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
                  "Installation did not finish. Close omp., check disk space and try again.",
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
      "omp-desktop.exe",
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
          "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\omp",
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
    stage("complete", "Installation verified. Continue to first-launch setup.");
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
  if (!installed) throw new Error("Finish installation before opening omp.");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      path.join(desktopInstallDirectory(), "omp-desktop.exe"),
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
