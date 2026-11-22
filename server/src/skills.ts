import {normalizeSkills} from "../../shared/skills.ts";
import { execFile } from "node:child_process";

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

