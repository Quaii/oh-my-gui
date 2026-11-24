import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist/site");
await mkdir(output, { recursive: true });
for (const entry of ["index.html", "showcase.js", "style.css", "assets"]) {
  await cp(resolve(root, "site", entry), resolve(output, entry), { recursive: true });
}

await build({
  configFile: resolve(root, "web/vite.config.ts"),
  root: resolve(root, "site/demo"),
  base: "./",
  publicDir: resolve(root, "web/public"),
  build: { outDir: resolve(output, "demo"), emptyOutDir: true },
});
await writeFile(resolve(output, "demo/ready.json"), '{"appearanceDemo":true}\n');
