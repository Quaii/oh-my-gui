import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { verifyInstallerPayload } from "../src/desktop-installer.ts";
import { nativeInstallStage } from "../../shared/install-progress.ts";
test("package progress reports bytes actually read and rejects damaged payloads", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "omp-package-check-"));
  try {
    const data = Buffer.alloc(200000, 42),
      file = path.join(directory, "inert-payload");
    await writeFile(file, data);
    const samples: number[] = [];
    await verifyInstallerPayload(
      file,
      createHash("sha256").update(data).digest("hex"),
      (bytes, total) => {
        assert.equal(total, data.length);
        samples.push(bytes);
      },
    );
    assert.equal(samples[0], 0);
    assert.equal(samples.at(-1), data.length);
    assert.ok(samples.every((n, i) => i === 0 || n >= samples[i - 1]));
    await assert.rejects(
      verifyInstallerPayload(file, "0".repeat(64), () => {}),
      /integrity check failed/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("only native engine boundaries advance file/integration reporting", () => {
  assert.equal(nativeInstallStage("unknown\r\nfil"), undefined);
  assert.equal(nativeInstallStage("files\r\n"), "files");
  assert.equal(nativeInstallStage("files\r\nintegrated\r\n"), "integrated");
});
