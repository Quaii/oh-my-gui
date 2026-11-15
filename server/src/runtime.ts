import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { OMP_BINARY } from "./omp.ts";
import { AGENT_DIR, CONFIG_PATH } from "./sessions.ts";
import { readSettings } from "./settings.ts";
import { readUsageDetails } from "./usage-details.ts";

export function ompJson(args: string[], timeout = 40_000): Promise<any> {
  return new Promise((resolve, reject) => execFile(OMP_BINARY, args, { timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
    if (error) return reject(new Error(String(stderr || error.message)));
    try { resolve(JSON.parse(String(stdout))); } catch { reject(new Error("OMP returned invalid JSON")); }
  }));
}
let version: Promise<string> | undefined;
export function runtimeVersion() {
  return version ??= new Promise<string>(resolve => execFile(OMP_BINARY, ["--version"], { timeout: 10_000, windowsHide: true }, (error, stdout) => resolve(error ? "Unavailable" : String(stdout).trim())));
}
let usageCache: { at: number; value: any } | null = null;
const usageDetailsCache=new Map<string,ReturnType<typeof readUsageDetails>>();
export async function runtimeUsage(timeZone="UTC") {
  try {new Intl.DateTimeFormat("en",{timeZone});} catch {timeZone="UTC";}
  if (!usageCache || Date.now()-usageCache.at>=20_000) {
    const value=await ompJson(["stats","--json"]);
    usageCache={at:Date.now(),value};
    usageDetailsCache.clear();
  }
  try {if(!usageDetailsCache.has(timeZone))usageDetailsCache.set(timeZone,readUsageDetails(AGENT_DIR,timeZone));return {...usageCache.value,...usageDetailsCache.get(timeZone)};}
  catch {return {...usageCache.value,modelTokenSeries:[],activity:null,detailStatus:"unavailable"};}
}
export async function runtimeInfo(bridges: { key: string; cwd: string; alive: boolean; startedAt: number }[]) {
  const [v, settings] = await Promise.all([runtimeVersion(), readSettings()]);
  const values = Object.fromEntries(settings.settings.map(s => [s.key, s.value]));
  return { version: v, executable: OMP_BINARY, agentDir: AGENT_DIR, configPath: CONFIG_PATH, platform: `${os.platform()} ${os.arch()}`, nodeVersion: process.version, bridges, maxConcurrency: values["task.maxConcurrency"], maxRecursionDepth: values["task.maxRecursionDepth"], maxTaskRuntimeMs: values["task.maxRuntimeMs"], settingCount: settings.settings.length, capabilities: { nativeRoles: true, nativeFallbacks: true, nativeClassifierGraph: false, webClassifierGraph: true, personaInjection: "OMP before_agent_start extension" } };
}
export async function rpcCatalog() {
  return JSON.parse(await fs.readFile(fileURLToPath(new URL("../data/rpc-commands.json", import.meta.url)), "utf8"));
}
