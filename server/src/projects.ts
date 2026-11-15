import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readControl, writeControl } from "./control.ts";

export async function createProject(body: any) {
  const existingPath = body.mode === "existing" && body.path ? path.resolve(String(body.path)) : null;
  const name = String(body.name || (existingPath ? path.basename(existingPath) : "")).trim();
  if (!name || name.length > 100 || /[<>:"/\\|?*\x00-\x1f]/.test(name) || [".", ".."].includes(name)) throw new Error("Enter a valid project name");
  const folder = body.mode === "existing" ? path.resolve(String(body.path || "")) : path.resolve(String(body.parent || ""), name);
  if (!(body.mode === "existing" ? body.path : body.parent)) throw new Error("Choose a folder location");
  const config = await readControl();
  const existing = config.projects.find(p => path.resolve(p.path).toLowerCase() === folder.toLowerCase());
  if (existing && body.mode === "existing") return { project: existing, projects: config.projects };
  if (existing) throw new Error("This folder is already a project");
  if (body.mode === "existing") {
    if (!(await fs.stat(folder)).isDirectory()) throw new Error("Choose an existing directory");
  } else {
    if (await fs.access(folder).then(() => true).catch(() => false)) throw new Error("That folder already exists. Choose Open existing instead");
    await fs.mkdir(folder, { recursive: true });
  }
  const project = { id: randomUUID(), name, path: folder, createdAt: new Date().toISOString() };
  await writeControl({ ...config, projects: [...config.projects, project] });
  return { project, projects: [...config.projects, project] };
}
