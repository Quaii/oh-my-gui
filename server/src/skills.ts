import {normalizeSkills} from "../../shared/skills.ts";
import { execFile, spawn } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";

import { OMP_BINARY as OMP_BIN } from "./omp.ts";

export interface SkillInfo {
  name: string;
  description?: string;
  filePath?: string;
  baseDir?: string;
  source?: string;
  hide?: boolean;
}

let cache: { at: number; skills: SkillInfo[] } | null = null;

export function invalidateSkills(): void {
  cache = null;
}

export async function skillFolder(skills: SkillInfo[], name: string, filePath: string) {
  const skill = skills.find(row => row.name === name && row.filePath === filePath);
  if (!skill || !path.isAbsolute(filePath)) {
    throw Error("This skill location is no longer available. Rescan skills and try again.");
  }
  try {
    if ((await stat(filePath)).isFile()) return await realpath(path.dirname(filePath));
  } catch {
    // Discovery may still list a skill whose file was moved or deleted.
  }
  throw Error("The skill file could not be found. Rescan skills and try again.");
}

export async function openSkillFolder(name: string, filePath: string) {
  const folder = await skillFolder(await listSkills(), name, filePath);
  const windows = process.platform === "win32";
  const program = windows ? "explorer.exe" : process.platform === "darwin" ? "/usr/bin/open" : "xdg-open";
  await new Promise<void>((resolve, reject) => {
    const fail = () => reject(Error("Could not open the skill folder in the system file manager."));
    if (windows) {
      // Explorer hands off to the existing desktop process and may return a nonzero exit code.
      const child = spawn(program, [folder], { stdio: "ignore", windowsHide: true });
      child.once("error", fail);
      child.once("spawn", () => {
        child.unref();
        resolve();
      });
    } else {
      execFile(program, [folder], { timeout: 10_000 }, error => error ? fail() : resolve());
    }
  });
}

export async function listSkills(force = false): Promise<SkillInfo[]> {
  if (!force && cache && Date.now() - cache.at < 15000) return cache.skills;
  const skills = await new Promise<SkillInfo[]>((resolve,reject) => {
    execFile(OMP_BIN, ["skill", "list", "--json"], { timeout: 40000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
      if (err) return reject(Error("Skill discovery failed: " + err.message));
      if (!stdout) return reject(Error("Skill discovery returned no data"));
      try {
        const parsed = JSON.parse(String(stdout));
        resolve(normalizeSkills(parsed));
      } catch {
        reject(Error("OMP returned invalid skill metadata"));
      }
    });
  });
  cache = { at: Date.now(), skills };
  return skills;
}

