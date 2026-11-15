import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { CONFIG_PATH, AGENT_DIR } from "./sessions.ts";

export async function readConfig() {
  let text = "";
  try {
    text = await fs.readFile(CONFIG_PATH, "utf8");
  } catch {
    text = "";
  }
  let data: any = {};
  let parseError: string | null = null;
  try {
    data = YAML.parse(text) ?? {};
  } catch (err: any) {
    parseError = String(err?.message ?? err);
  }
  return { path: CONFIG_PATH, text, data, parseError };
}

export async function writeConfig(next: { text?: string; data?: any }) {
  const text = next.text !== undefined ? next.text : YAML.stringify(next.data ?? {});
  // validate before writing
  YAML.parse(text);
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  try {
    await fs.copyFile(CONFIG_PATH, CONFIG_PATH + ".bak");
  } catch {}
  await fs.writeFile(CONFIG_PATH, text, "utf8");
  return readConfig();
}

export async function listAgentDir() {
  try {
    const entries = await fs.readdir(AGENT_DIR, { withFileTypes: true });
    return entries.map((e) => ({ name: e.name, dir: e.isDirectory() }));
  } catch {
    return [];
  }
}
