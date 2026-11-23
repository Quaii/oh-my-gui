import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_DIR } from "./sessions.ts";
import { DEFAULT_CONTROL_CONFIG, type WebControlConfig, type Persona } from "../../shared/control.ts";

export const CONTROL_PATH = process.env.OMP_WEB_CONTROL_PATH || path.join(AGENT_DIR, "web-control.json");
export const PERSONA_EXTENSION = fileURLToPath(new URL("./persona-extension.mjs", import.meta.url));
export async function readControl(): Promise<WebControlConfig> {
  try { return validateControl(JSON.parse(await fs.readFile(CONTROL_PATH, "utf8"))); }
  catch (error: any) { if (error.code === "ENOENT") return structuredClone(DEFAULT_CONTROL_CONFIG); throw error; }
}
export function validateControl(value: any): WebControlConfig {
  if (!value || !value.routing || !Array.isArray(value.personas)) throw new Error("Invalid web control configuration");
  const r = value.routing;
  if (typeof r.enabled !== "boolean" || typeof r.name !== "string" || !r.classifier || typeof r.classifier.prompt !== "string" || r.classifier.prompt.length > 30_000) throw new Error("Invalid routing configuration");
  if (!Array.isArray(r.branches) || !Array.isArray(r.targets) || r.branches.length < 1 || r.branches.length > 12 || r.targets.length > 12) throw new Error("Use between 1 and 12 routing conditions and targets");
  const ids = new Set(r.targets.map((t: any) => t.id));
  if (ids.size !== r.targets.length || [...ids].some(id => typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id) || id === "classifier")) throw new Error("Routing model IDs must be unique");
  if (typeof r.classifier.provider !== "string" || typeof r.classifier.modelId !== "string") throw new Error("Invalid classifier model");
  const branches = new Set<string>();
  for (const b of r.branches) {
    if (!/^[a-zA-Z0-9_-]+$/.test(b.id) || b.id === "classifier" || ids.has(b.id) || branches.has(b.id) || !ids.has(b.target) || typeof b.label !== "string" || b.label.length > 200) throw new Error("Every routing condition needs a unique ID and a connected model");
    branches.add(b.id);
  }
  for (const t of r.targets) if (typeof t.provider !== "string" || typeof t.modelId !== "string" || (r.enabled && (!t.provider || !t.modelId))) throw new Error("Choose a model for every routing target before enabling routing");
  for (const t of r.targets) if (t.thinking && !["inherit", "off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(t.thinking)) throw new Error("Choose a supported thinking level");
  if (r.positions && Object.values<any>(r.positions).some(p => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))) throw new Error("Invalid routing node position");
  if (r.enabled && (!r.classifier.provider || !r.classifier.modelId)) throw new Error("Choose a classifier model before enabling routing");
  if (value.personas.length > 50) throw new Error("The persona library supports up to 50 personas");
  const personaIds = new Set<string>();
  for (const p of value.personas) {
    if (typeof p.id !== "string" || personaIds.has(p.id) || !p.name?.trim() || typeof p.prompt !== "string" || p.prompt.length > 60_000 || !["first", "append"].includes(p.placement) || typeof p.stripIdentity !== "boolean") throw new Error("Invalid persona");
    personaIds.add(p.id);
  }
  if (value.defaultPersona !== null && !personaIds.has(value.defaultPersona)) throw new Error("The selected launch persona does not exist");
  const projects = value.projects ?? [];
  if (!Array.isArray(projects) || projects.some((p: any) => typeof p.id !== "string" || typeof p.name !== "string" || typeof p.path !== "string")) throw new Error("Invalid project list");
  return { routing: r, personas: value.personas, defaultPersona: value.defaultPersona, projects };
}
export async function writeControl(value: unknown) {
  const config = validateControl(value);
  await fs.mkdir(path.dirname(CONTROL_PATH), { recursive: true });
  await fs.copyFile(CONTROL_PATH, CONTROL_PATH + ".bak").catch(() => {});
  await fs.writeFile(CONTROL_PATH + ".tmp", JSON.stringify(config, null, 2), "utf8");
  await fs.rename(CONTROL_PATH + ".tmp", CONTROL_PATH);
  return config;
}
export function selectedPersona(config: WebControlConfig, requested?: string | null): Persona | null {
  return config.personas.find(p => p.id === requested) ?? null;
}
