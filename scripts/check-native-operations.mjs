import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import {
  nativeDescriptor,
  runNativeOperation,
  nativeJobs,
  nativeJobOutput,
  stopNativeOperations,
} from "../server/src/native-operations.ts";
const directory = await fs.mkdtemp(path.join(os.tmpdir(), "omp-native-gui-"));
const keep = new Set([
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "WINDIR",
  "COMSPEC",
  "TEMP",
  "TMP",
  "USERPROFILE",
  "HOME",
  "APPDATA",
  "LOCALAPPDATA",
]);
for (const key of Object.keys(process.env))
  if (!keep.has(key.toUpperCase())) delete process.env[key];
process.env.PI_CODING_AGENT_DIR = directory;
try {
  const root = await nativeDescriptor([]);
  assert.equal(root.commands.length, 54);
  const help = [];
  for (const command of root.commands) {
    const descriptor = await nativeDescriptor([command.name]);
    help.push({
      name: command.name,
      flags: descriptor.flags.length,
      arguments: descriptor.arguments.length,
      terminal: descriptor.terminal,
    });
  }
  const job = await runNativeOperation({
    path: ["stats"],
    values: { "--json": true },
    positionals: [],
    cwd: directory,
  });
  for (let i = 0; i < 200 && job.status === "running"; i++)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(job.status, "completed", job.output.slice(0, 500));
  assert.equal(job.exitCode, 0);
  assert.ok(job.output.trim(), "The native job must return its real output");
  const output = nativeJobOutput(job.id, 0);
  assert.equal(output.text, job.output);
  assert.equal(nativeJobOutput(job.id, output.next).text, "");
  assert.ok(!("output" in nativeJobs()[0]));
  assert.ok(!("argv" in nativeJobs()[0]));
  const result = {
    commands: help.length,
    checks: help,
    isolatedStatsJob: job.status,
    modelRequests: 0,
  };
  await fs.mkdir(".tmp", { recursive: true });
  await fs.writeFile(
    ".tmp/native-operations-check.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      nativeHelp: help.length,
      isolatedStatsJob: job.status,
      modelRequests: 0,
    }),
  );
} finally {
  await stopNativeOperations();
  await fs.rm(directory, { recursive: true, force: true });
}
