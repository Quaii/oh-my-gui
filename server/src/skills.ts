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
  const skills = await new Promise<SkillInfo[]>((resolve) => {
    execFile(OMP_BIN, ["skill", "list", "--json"], { timeout: 40000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
      if (!stdout) return resolve([]);
      try {
        const parsed = JSON.parse(String(stdout));
        resolve(Array.isArray(parsed) ? parsed : (parsed.skills ?? []));
      } catch {
        resolve([]);
      }
    });
  });
  cache = { at: Date.now(), skills };
  return skills;
}

