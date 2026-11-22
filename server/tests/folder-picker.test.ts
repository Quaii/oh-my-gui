import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  projectFolders,
  pickDesktopFolder,
  receiveDesktopFolder,
  folderChooserOpen,
} from "../src/folder-picker.ts";

test("project folder browsing lists only directories without changing or reading files", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "omp-folder-browser-"),
  );
  try {
    await mkdir(path.join(directory, "Example project"));
    await writeFile(path.join(directory, "private.txt"), "not included");
    const result = await projectFolders(directory);
    assert.equal(result.path, await realpath(directory));
    assert.deepEqual(
      result.folders.map((entry) => entry.name),
      ["Example project"],
    );
    await assert.rejects(projectFolders("relative/folder"), /absolute/);
    await assert.rejects(projectFolders(path.join(directory, "missing")));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("native folder replies match a pending request; cancellation keeps the selection empty", async () => {
  let request: any;
  const writer = mock.method(process.stdout, "write", (chunk: any) => {
    const line = String(chunk);
    if (line.startsWith("OMP_DESKTOP_FOLDER "))
      request = JSON.parse(line.slice(19));
    return true;
  });
  try {
    const selected = pickDesktopFolder(os.homedir());
    assert.equal(folderChooserOpen(), true);
    assert.throws(() => pickDesktopFolder(), /already open/);
    receiveDesktopFolder({ id: "unrelated", path: os.homedir() });
    assert.equal(folderChooserOpen(), true);
    receiveDesktopFolder({ id: request.id, path: null });
    assert.deepEqual(await selected, { path: null });
    assert.equal(folderChooserOpen(), false);
    const invalid = pickDesktopFolder();
    receiveDesktopFolder({ id: request.id, path: "relative" });
    await assert.rejects(invalid, /invalid/);
    const valid = pickDesktopFolder();
    receiveDesktopFolder({ id: request.id, path: os.homedir() });
    assert.deepEqual(await valid, { path: os.homedir() });
  } finally {
    writer.mock.restore();
  }
});
