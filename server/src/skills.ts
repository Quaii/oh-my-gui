import {normalizeSkills} from "../../shared/skills.ts";
import { execFile, spawn } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rmdir, stat } from "node:fs/promises";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";

import { OMP_BINARY as OMP_BIN } from "./omp.ts";
import { AGENT_DIR } from "./sessions.ts";

export interface SkillInfo {
  name: string;
  description?: string;
  filePath?: string;
  baseDir?: string;
  source?: string;
  hide?: boolean;
}

const run = promisify(execFile);
const skillPackage = /^@[a-z0-9][a-z0-9_]{2,31}\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skillVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
let cache: { at: number; cwd: string; skills: SkillInfo[] } | null = null;
let generation = 0;
let mutation = Promise.resolve();

export function invalidateSkills(): void {
  cache = null;
  generation++;
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

export async function openSkillFolder(name: string, filePath: string, cwd?: string) {
  const folder = await skillFolder(await listSkills(false, cwd), name, filePath);
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

async function runSkill(args: string[], cwd: string, timeout = 40_000) {
  try {
    const { stdout } = await run(OMP_BIN, ["skill", ...args], {
      cwd, timeout, windowsHide: true, maxBuffer: 16 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const failure = error as Error & { stderr?: string; killed?: boolean };
    throw Error(failure.killed ? "The skill operation timed out." : failure.stderr?.trim().slice(0, 2000) || failure.message);
  }
}

export async function listSkills(force = false, cwd = process.cwd()): Promise<SkillInfo[]> {
  if (!force && cache?.cwd === cwd && Date.now() - cache.at < 15_000) return cache.skills;
  const started = generation;
  const stdout = await runSkill(["list", "--json"], cwd);
  let skills: SkillInfo[];
  try {
    skills = normalizeSkills(JSON.parse(stdout));
  } catch {
    throw Error("OMP returned invalid skill metadata");
  }
  if (started === generation) cache = { at: Date.now(), cwd, skills };
  return skills;
}

type SkillRemoval = { kind: "local"; directory: string; root: string }
  | { kind: "package"; id: string; global: boolean };

function localRoots(agentDir: string, home: string, project?: string) {
  const roots = [path.join(agentDir, "skills"), path.join(agentDir, "managed-skills"),
    ...[".agent", ".agents", ".claude", ".codex"].map(name => path.join(home, name, "skills"))];
  if (project) roots.push(...[".omp", ".agent", ".agents", ".claude", ".codex", ".github"].map(name => path.join(project, name, "skills")));
  return roots;
}

async function canonicalLocalSkill(removal: Extract<SkillRemoval, { kind: "local" }>, filePath: string) {
  const { directory, root } = removal;
  const canonical = await realpath(filePath);
  return !path.relative(filePath, canonical) && !path.relative(root, await realpath(root))
    && (await lstat(directory)).isDirectory() && (await lstat(filePath)).isFile();
}

async function installedPackages(agentDir: string, project?: string) {
  const scopes = [{ root: agentDir, global: true }];
  if (project) scopes.unshift({ root: path.join(project, ".omp"), global: false });
  const lists = await Promise.all(scopes.map(async ({ root, global }) => {
    const lock = await readFile(path.join(root, "skills.lock.json"), "utf8")
      .then(text => { try { return JSON.parse(text); } catch { return null; } }, () => null);
    if (lock?.version !== 1 || !lock.skills || typeof lock.skills !== "object") return [];
    return Promise.all(Object.entries(lock.skills).map(async ([id, entry]) => {
      const version = (entry as { version?: unknown } | null)?.version;
      if (!skillPackage.test(id) || typeof version !== "string" || !skillVersion.test(version) || version.includes("..")) return;
      const filePath = await realpath(path.join(path.dirname(agentDir), "skillshare", id, version, "SKILL.md")).catch(() => undefined);
      if (filePath) return { id, global, filePath };
    }));
  }));
  return lists.flat().filter(entry => entry !== undefined);
}

function removalForSkill(skill: SkillInfo, roots: string[], packages: Awaited<ReturnType<typeof installedPackages>>): SkillRemoval | undefined {
  const file = skill.filePath;
  if (!file || !path.isAbsolute(file) || path.basename(file).toUpperCase() !== "SKILL.MD") return;
  if (skill.source?.startsWith("skillshare")) {
    const matching = packages.filter(pkg => !path.relative(pkg.filePath, file));
    const sourceScope = skill.source.endsWith(":user") ? true : skill.source.endsWith(":project") ? false : undefined;
    const pkg = matching.find(row => sourceScope === undefined || row.global === sourceScope);
    if (pkg) return { kind: "package", id: pkg.id, global: pkg.global };
    return;
  }
  const directory = path.dirname(file);
  const root = roots.find(candidate => !path.relative(candidate, path.dirname(directory)));
  if (root) return { kind: "local", directory, root };
}

export async function listManageableSkills(project?: string, force = false) {
  const roots = localRoots(AGENT_DIR, os.homedir(), project);
  const [skills, packages] = await Promise.all([listSkills(force, project ?? os.homedir()), installedPackages(AGENT_DIR, project)]);
  return Promise.all(skills.map(async skill => {
    const removal = removalForSkill(skill, roots, packages);
    const removable = removal?.kind !== "local" || await canonicalLocalSkill(removal, skill.filePath!).catch(() => false);
    return { ...skill, removal: removable ? removal?.kind : undefined };
  }));
}

/** Move the complete standalone directory out of discovery, preserving support files and a way to undo. */
export async function archiveLocalSkill(filePath: string, root: string) {
  const removal = removalForSkill({ name: "", filePath }, [root], []);
  if (removal?.kind !== "local" || !(await canonicalLocalSkill(removal, filePath).catch(() => false))) {
    throw Error("This skill is no longer a standalone skill in the selected directory.");
  }
  const archive = path.join(path.dirname(root), "removed-skills");
  await mkdir(archive, { recursive: true });
  if (!(await lstat(archive)).isDirectory() || path.relative(archive, await realpath(archive))) {
    throw Error("The removed skills folder points to another location.");
  }
  const backup = await mkdtemp(path.join(archive, `${path.basename(removal.directory)}-`));
  const destination = path.join(backup, path.basename(removal.directory));
  try {
    await rename(removal.directory, destination);
  } catch (error) {
    await rmdir(backup).catch(() => {});
    throw error;
  }
  return destination;
}

function mutateSkill<T>(operation: () => Promise<T>) {
  const next = mutation.then(operation).finally(invalidateSkills);
  mutation = next.then(() => {}, () => {});
  return next;
}

export function installSkill(spec: string, allowScripts: boolean, project?: string) {
  const [empty, scopeAndName, version, extra] = spec.split("@");
  if (empty !== "" || !skillPackage.test(`@${scopeAndName}`) || spec.length > 180 || extra !== undefined
    || (version !== undefined && !/^[~^]?[0-9A-Za-z][0-9A-Za-z.+-]*$/.test(version))) {
    throw Error("Enter a Skillshare package such as @scope/name or @scope/name@1.0.0.");
  }
  return mutateSkill(() => runSkill(["install", spec, "--global", ...(allowScripts ? ["--yes"] : [])], project ?? os.homedir(), 120_000));
}

export function removeSkill(name: string, filePath: string, project?: string) {
  return mutateSkill(async () => {
    const [skills, packages] = await Promise.all([listSkills(true, project ?? os.homedir()), installedPackages(AGENT_DIR, project)]);
    const selected = skills.find(skill => skill.name === name && skill.filePath === filePath);
    const removal = selected && removalForSkill(selected, localRoots(AGENT_DIR, os.homedir(), project), packages);
    if (!removal) throw Error("This skill cannot be removed here. Rescan skills and check its source.");
    if (removal.kind === "local") return { archivedPath: await archiveLocalSkill(filePath, removal.root) };
    await runSkill(["uninstall", removal.id, ...(removal.global ? ["--global"] : [])], project ?? os.homedir());
    return {};
  });
}

