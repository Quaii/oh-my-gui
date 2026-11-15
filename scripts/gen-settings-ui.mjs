#!/usr/bin/env node
// Regenerate server/data/settings-ui.json from the omp binary.
// The binary is a Bun single-file bundle: the settings definitions are present
// as plain JS source, so we parse id/type/default/ui{tab,group,label,description}
// out of each `h({...})` block. Run after every omp update:
//   node scripts/gen-settings-ui.mjs [path-to-omp]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function findBinary() {
  const arg = process.argv[2];
  if (arg) return arg;
  if (process.env.OMP_BIN) return process.env.OMP_BIN;
  try {
    const out = execFileSync(process.platform === "win32" ? "where" : "which", ["omp"], { encoding: "utf8" });
    return out.split(/\r?\n/).find(Boolean)?.trim();
  } catch {
    throw new Error("omp not found; pass the binary path explicitly");
  }
}

const bin = findBinary();
const src = fs.readFileSync(bin, "latin1");

function blocks(text) {
  const out = [];
  const re = /h\(\{/g;
  let m;
  while ((m = re.exec(text))) {
    // The binary embeds plenty of unrelated "h({" noise; a real settings block
    // declares id and type within its first few hundred bytes. Skipping the rest
    // without touching lastIndex keeps the scan linear.
    const head = text.slice(m.index, m.index + 240);
    if (!head.includes('id: "') || !head.includes("type:")) continue;
    let i = m.index + m[0].length - 1;
    let depth = 0;
    let j = i;
    for (; j < text.length; j++) {
      const c = text[j];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push(text.slice(i, j + 1));
    re.lastIndex = j;
  }
  return out;
}

const str = (block, key) => {
  const m = block.match(new RegExp("\\b" + key + ":\\s*\"((?:[^\"\\\\]|\\\\.)*)\""));
  return m ? m[1] : undefined;
};

const types = new Set(["boolean", "number", "string", "enum", "array", "record", "object"]);
const entries = {};
for (const b of blocks(src)) {
  if (!b.includes('id: "') || !b.includes("type:")) continue;
  const id = str(b, "id");
  const type = str(b, "type");
  if (!id || !type || /\s/.test(id) || !types.has(type)) continue;
  const uiIdx = b.indexOf("ui:");
  const ui = uiIdx >= 0 ? b.slice(uiIdx) : "";
  const e = {
    id,
    type,
    label: str(ui, "label") || str(b, "label"),
    tab: str(ui, "tab"),
    group: str(ui, "group"),
    description: str(ui, "description") || str(b, "description"),
    env: str(b, "env"),
  };
  if (type === "enum") {
    const vals = b.match(/values:\s*\[([^\]]*)\]/);
    if (vals) e.values = vals[1].split(",").map((v) => v.trim().replace(/^"|"$/g, "")).filter(Boolean);
    const opts = [...b.matchAll(/value:\s*"([^"]*)",\s*label:\s*"([^"]*)"/g)].map((m) => ({ value: m[1], label: m[2] }));
    if (opts.length) e.options = opts;
  }
  if (e.tab || e.label) entries[id] = Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined && v !== ""));
}

const dest = path.join(import.meta.dirname, "..", "server", "data", "settings-ui.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(entries, null, 1) + "\n");
console.log("wrote " + Object.keys(entries).length + " settings with UI metadata -> " + dest);
