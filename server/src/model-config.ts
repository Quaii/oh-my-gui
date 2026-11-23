import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { AGENT_DIR } from "./sessions.ts";

const configPath = () => process.env.OMP_MODELS_PATH || path.join(AGENT_DIR, "models.yml");
const APIS = ["openai-completions", "openai-responses", "openai-codex-responses", "azure-openai-responses", "anthropic-messages", "google-generative-ai", "google-vertex"];
const PROVIDER_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
let pendingWrite = Promise.resolve();
async function document() {
  const preferred = configPath();
  const alternate = preferred.replace(/\.yml$/, ".yaml");
  const file = await fs.access(preferred).then(() => preferred).catch(() => fs.access(alternate).then(() => alternate).catch(() => preferred));
  const text = await fs.readFile(file, "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; });
  const doc = YAML.parseDocument(text || "providers: {}\n");
  if (doc.errors.length) throw new Error("models.yml has a YAML error; repair it before editing providers");
  return { file, doc };
}
export async function readModelConfig() {
  const { file, doc } = await document();
  const providers = doc.toJS()?.providers ?? {};
  return { path: file, apis: APIS, providers: Object.entries<any>(providers).map(([id, p]) => ({ id, baseUrl: p.baseUrl ?? "", api: p.api ?? "openai-completions", auth: p.auth ?? "apiKey", discovery: p.discovery?.type ?? "", apiKeyConfigured: !!p.apiKey, models: (p.models ?? []).map((m: any) => ({ id: m.id, name: m.name ?? m.id, contextWindow: m.contextWindow, maxTokens: m.maxTokens, reasoning: !!m.reasoning, input: m.input ?? ["text"] })) })) };
}
export function validateProvider(value: any) {
  if (typeof value?.id !== "string" || !PROVIDER_ID.test(value.id)) throw new Error("Use a provider ID made of letters, numbers, dashes, dots, or underscores");
  let url: URL;
  try { url = new URL(value.baseUrl); } catch { throw new Error("Enter a valid provider base URL"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Provider URL must use HTTP or HTTPS without embedded credentials");
  if (!APIS.includes(value.api)) throw new Error("Choose a supported provider API");
  if (!["none", "apiKey"].includes(value.auth)) throw new Error("Choose API key or no authentication");
  if (!Array.isArray(value.models) || value.models.length > 100 || (!value.models.length && !value.discovery)) throw new Error("Add at least one model or enable model discovery");
  if (value.discovery && !["ollama", "llama.cpp", "lm-studio", "openai-models-list", "proxy"].includes(value.discovery)) throw new Error("Unsupported discovery type");
  for (const m of value.models) {
    if (typeof m.id !== "string" || !m.id.trim()) throw new Error("Each model needs an ID");
    for (const key of ["contextWindow", "maxTokens"]) if (m[key] !== undefined && (!Number.isInteger(m[key]) || m[key] <= 0)) throw new Error(`${key} must be a positive integer`);
  }
  return value;
}
function updateConfig(update: (doc: Awaited<ReturnType<typeof document>>["doc"]) => boolean) {
  const result = pendingWrite.then(async () => {
    const { file, doc } = await document();
    if (update(doc)) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.copyFile(file, file + ".bak").catch(error => { if (error.code !== "ENOENT") throw error; });
      await fs.writeFile(file + ".tmp", String(doc), "utf8");
      await fs.rename(file + ".tmp", file);
    }
    return readModelConfig();
  });
  pendingWrite = result.then(() => {}, () => {});
  return result;
}

export async function saveProvider(input: unknown) {
  const value = validateProvider(input);
  return updateConfig(doc => {
    const previous: any = doc.toJS()?.providers?.[value.id] ?? {};
    const models = value.models.map((m: any) => ({ ...(previous.models ?? []).find((existing: any) => existing.id === m.id), ...m }));
    const next = { ...previous, baseUrl: value.baseUrl, api: value.api, auth: value.auth, models };
    if (value.apiKey?.trim()) next.apiKey = value.apiKey.trim();
    if (value.auth === "none") delete next.apiKey;
    else if (!next.apiKey) throw new Error("Enter an API key or environment variable name");
    if (value.discovery) next.discovery = { ...previous.discovery, type: value.discovery }; else delete next.discovery;
    doc.setIn(["providers", value.id], next);
    return true;
  });
}

export async function removeProvider(id: string) {
  if (!PROVIDER_ID.test(id)) throw new Error("Choose a valid custom provider");
  return updateConfig(doc => doc.deleteIn(["providers", id]));
}
