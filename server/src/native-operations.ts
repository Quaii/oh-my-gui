import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { OMP_BINARY } from "./omp.ts";
import {
  parseNativeHelp,
  nativeArguments,
  needsNativeTerminal,
  powershellLiteral,
  posixLiteral,
  type NativeHelp,
} from "../../shared/native-help.ts";
const execute = promisify(execFile);
const helpCache = new Map<string, Promise<NativeHelp>>();
export type NativeJob = {
  id: string;
  path: string[];
  argv: string[];
  cwd: string;
  startedAt: number;
  endedAt?: number;
  status: "running" | "completed" | "failed" | "cancelled";
  output: string;
  outputStart: number;
  truncated: boolean;
  exitCode?: number | null;
};
const jobs = new Map<
  string,
  {
    job: NativeJob;
    process: ChildProcess;
    timer: ReturnType<typeof setTimeout>;
  }
>();
async function help(path: string[]) {
  const key = OMP_BINARY + ":" + path.join(" ");
  if (!helpCache.has(key))
    helpCache.set(
      key,
      execute(OMP_BINARY, [...path, "--help"], {
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, NO_COLOR: "1" },
      })
        .then((result) => parseNativeHelp(result.stdout))
        .catch((error) => {
          helpCache.delete(key);
          throw error;
        }),
    );
  return helpCache.get(key)!;
}
export async function nativeDescriptor(path: string[]) {
  if (
    !Array.isArray(path) ||
    path.length > 6 ||
    path.some(
      (part) => typeof part !== "string" || !/^[a-z][a-z0-9-]*$/.test(part),
    )
  )
    throw Error("Invalid native command path");
  for (let i = 0; i < path.length; i++) {
    const parent = await help(path.slice(0, i));
    if (
      !parent.commands.some(
        (command) => command.name.split(/[: ]/).at(-1) === path[i],
      )
    )
      throw Error(
        "The installed runtime does not advertise " +
          path.slice(0, i + 1).join(" "),
      );
  }
  const descriptor = await help(path);
  return { ...descriptor, path, terminal: needsNativeTerminal(path) };
}
async function prepare(
  input: {
    path: string[];
    values?: Record<string, unknown>;
    positionals?: string[];
    cwd: string;
    profile?: string;
  },
  allowMain = false,
) {
  const descriptor = await nativeDescriptor(input.path);
  if (!input.path.length && !allowMain)
    throw Error("Choose an OMP operation before running it.");
  const cwd = await fs.realpath(input.cwd);
  if (!(await fs.stat(cwd)).isDirectory())
    throw Error("Choose an existing working folder");
  if (input.profile && !/^[a-zA-Z0-9_.-]+$/.test(input.profile))
    throw Error(
      "Use a profile name containing letters, numbers, dots, underscores or hyphens",
    );
  const argv = [
    ...(input.profile ? ["--profile=" + input.profile] : []),
    ...input.path,
    ...nativeArguments(descriptor, input.values ?? {}, input.positionals ?? []),
  ];
  return {
    descriptor: {
      ...descriptor,
      terminal:
        descriptor.terminal ||
        needsNativeTerminal([
          ...input.path,
          ...(input.positionals ?? []).slice(0, 1),
        ]),
    },
    argv,
    cwd,
  };
}
export function nativeJobs() {
  return [...jobs.values()]
    .map(({ job }) => {
      const { output, argv, ...summary } = job;
      return summary;
    })
    .sort((a, b) => b.startedAt - a.startedAt);
}
export function nativeJobOutput(id: string, from: number) {
  const job = jobs.get(id)?.job;
  if (!job) throw Error("No such native operation");
  if (!Number.isSafeInteger(from) || from < 0)
    throw Error("Invalid output cursor");
  const end = job.outputStart + job.output.length;
  const reset = from < job.outputStart || from > end;
  return {
    text: job.output.slice(reset ? 0 : from - job.outputStart),
    next: end,
    reset,
    truncated: job.truncated,
    status: job.status,
  };
}
export async function runNativeOperation(input: Parameters<typeof prepare>[0]) {
  const { descriptor, argv, cwd } = await prepare(input);
  if (descriptor.terminal)
    throw Error("This operation needs the native terminal workflow.");
  if (
    [...jobs.values()].filter((entry) => entry.job.status === "running")
      .length >= 4
  )
    throw Error("Wait for a native operation to finish or cancel it first.");
  while (jobs.size >= 24) {
    const oldest = [...jobs].find(
      ([, entry]) => entry.job.status !== "running",
    );
    if (!oldest) break;
    jobs.delete(oldest[0]);
  }
  const job: NativeJob = {
    id: randomUUID(),
    path: input.path,
    argv,
    cwd,
    startedAt: Date.now(),
    status: "running",
    output: "",
    outputStart: 0,
    truncated: false,
  };
  const child = spawn(OMP_BINARY, argv, {
    cwd,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NO_COLOR: "1" },
  });
  const append = (value: string) => {
    job.output += value;
    if (job.output.length > 2 * 1024 * 1024) {
      job.outputStart += job.output.length - 2 * 1024 * 1024;
      job.output = job.output.slice(-2 * 1024 * 1024);
      job.truncated = true;
    }
  };
  const stdout = new TextDecoder(),
    stderr = new TextDecoder();
  child.stdout.on("data", (data) =>
    append(stdout.decode(data, { stream: true })),
  );
  child.stderr.on("data", (data) =>
    append(stderr.decode(data, { stream: true })),
  );
  child.on("error", (error) => {
    append(error.message);
    job.status = "failed";
    job.endedAt = Date.now();
  });
  const timer = setTimeout(
    () => {
      append("\nStopped after the 30 minute operation limit.");
      void cancelNativeOperation(job.id);
    },
    30 * 60 * 1000,
  );
  child.on("close", (code) => {
    clearTimeout(timer);
    append(stdout.decode() + stderr.decode());
    if (job.status === "running")
      job.status = code === 0 ? "completed" : "failed";
    job.exitCode = code;
    job.endedAt = Date.now();
  });
  jobs.set(job.id, { job, process: child, timer });
  return job;
}
export async function cancelNativeOperation(id: string) {
  const entry = jobs.get(id);
  if (!entry) throw Error("No such native operation");
  if (entry.job.status !== "running") return entry.job;
  const pid = entry.process.pid;
  if (process.platform === "win32" && pid)
    await execute("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
    });
  else entry.process.kill("SIGTERM");
  entry.job.status = "cancelled";
  clearTimeout(entry.timer);
  return entry.job;
}
export async function nativeTerminal(
  input: Parameters<typeof prepare>[0],
  launch = false,
) {
  const { argv, cwd } = await prepare(input, true);
  const display =
    process.platform === "win32"
      ? "& " + [OMP_BINARY, ...argv].map(powershellLiteral).join(" ")
      : [OMP_BINARY, ...argv].map(posixLiteral).join(" ");
  if (!launch) return { command: display, cwd };
  let child: ChildProcess;
  if (process.platform === "win32") {
    const script =
      "Set-Location -LiteralPath " + powershellLiteral(cwd) + "; " + display;
    child = spawn(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NoExit",
        "-EncodedCommand",
        Buffer.from(script, "utf16le").toString("base64"),
      ],
      { cwd, detached: true, windowsHide: false, stdio: "ignore" },
    );
  } else if (process.platform === "darwin") {
    const script = "cd " + posixLiteral(cwd) + " && " + display;
    child = spawn(
      "osascript",
      [
        "-e",
        'tell application "Terminal" to do script ' + JSON.stringify(script),
      ],
      { stdio: "ignore" },
    );
  } else {
    const gnome = "/usr/bin/gnome-terminal",
      konsole = "/usr/bin/konsole",
      xterm = "/usr/bin/xterm";
    if (existsSync(gnome))
      child = spawn(
        gnome,
        ["--working-directory=" + cwd, "--", OMP_BINARY, ...argv],
        { detached: true, stdio: "ignore" },
      );
    else if (existsSync(konsole))
      child = spawn(konsole, ["--workdir", cwd, "-e", OMP_BINARY, ...argv], {
        detached: true,
        stdio: "ignore",
      });
    else if (existsSync(xterm))
      child = spawn(xterm, ["-e", OMP_BINARY, ...argv], {
        cwd,
        detached: true,
        stdio: "ignore",
      });
    else
      throw Error(
        "No supported terminal was found. Copy this command into your terminal.",
      );
  }
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  child.unref();
  return { command: display, cwd, launched: true };
}
export async function stopNativeOperations() {
  await Promise.allSettled(
    [...jobs]
      .filter(([, entry]) => entry.job.status === "running")
      .map(([id]) => cancelNativeOperation(id)),
  );
}
