import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { nativeInstallStage } from "../shared/install-progress.ts";

// Compile the actual hooks into an inert engine: no app files, registry, shortcuts or installs.
if (process.platform !== "win32")
  throw Error("This NSIS hook check requires Windows.");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = await fs.mkdtemp(path.join(os.tmpdir(), "omp-inert-hooks-"));
const run = promisify(execFile);
const quote = (value) => value.replaceAll("$", "$$").replaceAll('"', '$\\"');
try {
  const executable = path.join(directory, "inert.exe"),
    source = path.join(directory, "inert.nsi"),
    log = path.join(directory, "stages.log");
  await fs.writeFile(
    source,
    `Unicode true
!include "LogicLib.nsh"
!include "${quote(path.join(root, "src-tauri/installer-hooks.nsh"))}"
RequestExecutionLevel user
SilentInstall silent
OutFile "${quote(executable)}"
Section
  !insertmacro NSIS_HOOK_PREINSTALL
  !insertmacro NSIS_HOOK_POSTINSTALL
SectionEnd
`,
  );
  const compiler =
    process.env.MAKENSIS ||
    path.join(process.env.LOCALAPPDATA, "tauri/NSIS/makensis.exe");
  await run(compiler, ["/V2", source], { windowsHide: true, timeout: 30000 });
  await run(executable, [], {
    windowsHide: true,
    timeout: 15000,
    env: { ...process.env, OMP_INSTALL_PROGRESS: log },
  });
  const contents = await fs.readFile(log, "utf8");
  assert.deepEqual(contents.trim().split(/\r?\n/), ["files", "integrated"]);
  assert.equal(nativeInstallStage(contents), "integrated");
  await run(executable, [], {
    windowsHide: true,
    timeout: 15000,
    env: { ...process.env, OMP_INSTALL_PROGRESS: "" },
  });
  assert.equal(await fs.readFile(log, "utf8"), contents);
  console.log(
    "Real NSIS hooks emitted file/integration boundaries. No application installation or system integration was performed.",
  );
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
