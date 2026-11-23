import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import path from "node:path";

/** The UI entry page names the content-hashed frontend bundles. */
export async function desktopBuildHash(executable: string, runtime: string) {
  const build = createHash("sha256");
  for (const file of [
    executable,
    path.join(runtime, "server/src/index.mjs"),
    path.join(runtime, "web/dist/index.html"),
    path.join(runtime, "runtime.json"),
  ]) {
    const digest = createHash("sha256");
    for await (const chunk of createReadStream(file)) digest.update(chunk);
    build.update(digest.digest());
  }
  return build.digest("hex");
}
