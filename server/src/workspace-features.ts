import {gitLoginActivity} from "./github-activity.ts";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { OMP_BINARY } from "./omp.ts";
import { AGENT_DIR } from "./sessions.ts";
import { invalidateSkills } from "./skills.ts";
import { invalidateSettings } from "./settings.ts";
import { parseMarketplaceList, parseMarketplacePlugins } from "./marketplace-output.ts";

export function runCommand(bin: string, args: string[], cwd?: string, timeout = 60_000): Promise<string> {
  return new Promise((resolve, reject) => execFile(bin, args, { cwd, windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => error ? reject(new Error(String(stderr || error.message))) : resolve(String(stdout))));
}
export async function marketplaceCatalog(name?: string) {
  const sources = parseMarketplaceList(await runCommand(OMP_BINARY, ["plugin", "marketplace", "list"]));
  if (!name) return { sources, plugins: [] };
  if (!sources.some(source => source.name === name)) throw new Error("Choose a configured marketplace.");
  const output = await runCommand(OMP_BINARY, ["plugin", "discover", name], undefined, 120_000);
  return { sources, plugins: parseMarketplacePlugins(output, name) };
}

export async function pluginAction(body: any, cwd: string) {
  const actions = ["list", "discover", "doctor", "features", "install", "uninstall", "enable", "disable", "upgrade", "marketplace-list", "marketplace-add", "marketplace-remove", "marketplace-update", "install-from-marketplace"];
  if (!actions.includes(body.action)) throw new Error("Unsupported extension action");
  const target = String(body.target || "").trim();
  if (target.startsWith("-") || target.length > 2000) throw new Error("Invalid extension source");
  const needsTarget = ["install", "install-from-marketplace", "uninstall", "enable", "disable", "features", "marketplace-add", "marketplace-remove", "marketplace-update"].includes(body.action);
  if (needsTarget && !target) throw new Error("Choose an extension or marketplace source");
  const installFromMarketplace = body.action === "install-from-marketplace";
  let catalogName: string | undefined;
  if (installFromMarketplace) {
    catalogName = target.split("@")[1];
    if (!catalogName || !(await marketplaceCatalog(catalogName)).plugins.some(plugin => plugin.id === target)) {
      throw new Error("This plugin is no longer listed in the marketplace.");
    }
  }
  const command = installFromMarketplace ? "install" : body.action;
  const args = command.startsWith("marketplace-") ? ["plugin", "marketplace", command.slice(12), ...(target ? [target] : [])] : ["plugin", command, ...(target ? [target] : [])];
  if (["list", "discover", "features"].includes(body.action)) args.push("--json");
  if (["install", "uninstall", "enable", "disable", "upgrade"].includes(command) &&
    (body.scope === "project" || body.scope === "user")) args.push("--scope", body.scope);
  if (installFromMarketplace) {
    const preview = JSON.parse(await runCommand(OMP_BINARY, [...args, "--dry-run", "--json"], cwd, 120_000));
    if (preview.marketplace !== catalogName || `${preview.plugin}@${preview.marketplace}` !== target) {
      throw new Error("OMP could not resolve this plugin as a marketplace installation.");
    }
  }
  const output = await runCommand(OMP_BINARY, args, cwd, 120_000);
  invalidateSkills(); invalidateSettings();
  let data: any = null;
  try { data = JSON.parse(output); } catch {}
  return { ok: true, output, data, restartRequired: !["list", "discover", "doctor", "features", "marketplace-list"].includes(body.action) };
}

export async function contextFiles(cwd: string) {
  const roots = [{ scope: "project", root: path.resolve(cwd) }, { scope: "user", root: AGENT_DIR }];
  const files: { id: string; scope: string; name: string; path: string; exists: boolean }[] = [];
  for (const { scope, root } of roots) {
    const names = ["AGENTS.md", "SYSTEM.md", "SYSTEM_TEMPLATE.md", "CLAUDE.md", ...(scope === "project" ? [".omp/AGENTS.md", ".omp/SYSTEM.md", ".omp/SYSTEM_TEMPLATE.md"] : [])];
    const promptDir = path.join(root, scope === "project" ? ".omp/prompts" : "prompts");
    const prompts = await fs.readdir(promptDir, { withFileTypes: true }).catch(() => []);
    for (const prompt of prompts.slice(0, 100)) if (prompt.isFile() && prompt.name.endsWith(".md")) names.push(path.relative(root, path.join(promptDir, prompt.name)));
    for (const name of names) {
      const file = path.join(root, name);
      const stat = await fs.lstat(file).catch(() => null);
      // Editing a symlink could write outside the selected project/user context roots.
      if (stat?.isSymbolicLink()) continue;
      files.push({ id: Buffer.from(`${scope}:${name}`).toString("base64url"), scope, name, path: file, exists: !!stat?.isFile() });
    }
  }
  return files;
}
export async function contextFile(cwd: string, id: string, text?: string) {
  const file = (await contextFiles(cwd)).find(entry => entry.id === id);
  if (!file) throw new Error("Choose a listed context file");
  const realRoot = await fs.realpath(file.scope === "project" ? cwd : AGENT_DIR);
  const parent = await fs.realpath(path.dirname(file.path)).catch(() => path.dirname(file.path));
  const relative = path.relative(realRoot, parent);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Context file is outside the selected root");
  if (text !== undefined) {
    if (Buffer.byteLength(text) > 512_000) throw new Error("Context file is too large");
    await fs.mkdir(path.dirname(file.path), { recursive: true });
    await fs.copyFile(file.path, file.path + ".bak").catch(() => {});
    await fs.writeFile(file.path + ".tmp", text, "utf8");
    await fs.rename(file.path + ".tmp", file.path);
  }
  const content = await fs.readFile(file.path, "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; });
  return { ...file, exists: text !== undefined || file.exists, text: content };
}

export async function projectActivity(cwd: string) {
  let remote = "";
  let branch = "";
  try { [remote, branch] = await Promise.all([runCommand("git", ["remote", "get-url", "origin"], cwd), runCommand("git", ["branch", "--show-current"], cwd)]); }
  catch { return { repository: null, authenticated: false, issues: [], contributors: [], reason: "This folder is not a Git repository with an origin remote." }; }
  const match = remote.trim().match(/(?:github\.com[:/])([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) return { repository: null, branch: branch.trim(), authenticated: false, issues: [], contributors: [], reason: "This project does not use a GitHub origin." };
  const repository = `${match[1]}/${match[2]}`;
  try {
    const [repo, issues, contributors] = await Promise.all([runCommand("gh", ["api", `repos/${repository}`], cwd, 20_000), runCommand("gh", ["api", `repos/${repository}/issues?state=open&per_page=8`], cwd, 20_000), runCommand("gh", ["api", `repos/${repository}/contributors?per_page=100`], cwd, 20_000)]);
    const owner=JSON.parse(repo).owner;
    return { repository, branch: branch.trim(), owner:{login:owner.login,avatar_url:owner.avatar_url,url:owner.html_url}, authenticated: true, issues: JSON.parse(issues).map((i: any) => ({ id: i.id, number: i.number, title: i.title, url: i.html_url, pullRequest: !!i.pull_request })), contributors: JSON.parse(contributors).map((c: any) => ({ login: c.login, avatar_url: c.avatar_url, url: c.html_url, contributions: c.contributions })) };
  } catch {try{return await gitLoginActivity(repository,branch.trim(),cwd);}catch{return { repository, branch: branch.trim(), authenticated: false, issues: [], contributors: [], reason: "Sign in with Git or GitHub CLI to show verified repository activity." };}}
}
