import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  DesktopUpdates,
  updateReminderVisible,
} from "../src/desktop-updates.ts";
import { mergeUpdateFragments } from "../../scripts/desktop-update-manifest.mjs";

test("updates require verification and idle sessions, persist tomorrow reminders without touching user data", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "omp-update-state-"));
  const sent: string[] = [];
  try {
    const updates = new DesktopUpdates(directory, true, (action) =>
      sent.push(action),
    );
    await assert.rejects(
      updates.action("install", false),
      /Download and verify/,
    );
    await updates.action("check", false);
    await assert.rejects(updates.action("check", false), /already in progress/);
    await updates.receive({
      phase: "available",
      version: "0.2.0",
      notes: "Release notes",
      message: "Available",
    });
    assert.equal((await updates.status()).notify, true);
    const reminder = await updates.action("remind", false);
    assert.equal(reminder.notify, false);
    assert.ok(reminder.remindUntil! > Date.now() + 23 * 60 * 60 * 1000);
    assert.equal(
      JSON.parse(await readFile(path.join(directory, "updates.json"), "utf8"))
        .remindVersion,
      "0.2.0",
    );
    const reopened = new DesktopUpdates(directory, true, () => {});
    await reopened.receive({
      phase: "available",
      version: "0.2.0",
      message: "Available",
    });
    assert.equal((await reopened.status()).notify, false);
    await reopened.receive({
      phase: "available",
      version: "0.3.0",
      message: "Available",
    });
    assert.equal((await reopened.status()).notify, true);
    assert.equal(
      updateReminderVisible(
        { phase: "available", message: "", version: "0.2.0" },
        reminder,
        reminder.remindUntil! + 1,
      ),
      true,
    );
    await updates.action("download", false);
    await assert.rejects(
      updates.action("install", false),
      /already in progress/,
    );
    await updates.receive({ phase: "ready", message: "Verified" });
    await assert.rejects(updates.action("install", true), /running sessions/);
    await updates.action("install", false);
    assert.equal(updates.installing, true);
    assert.deepEqual(sent, ["check", "download", "install"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("unconfigured builds fail closed; automatic checks respect daily interval", async () => {
  const disabled = new DesktopUpdates(undefined, false, () =>
    assert.fail("must not dispatch"),
  );
  await assert.rejects(
    disabled.action("check", false),
    /no signed update channel/,
  );
  const sent: string[] = [];
  const updates = new DesktopUpdates(undefined, true, (action) =>
    sent.push(action),
  );
  await updates.action("check", false, true);
  await updates.receive({ phase: "current", message: "Current" });
  await updates.action("check", false, true);
  assert.deepEqual(sent, ["check"]);
  await updates.action("check", false);
  await updates.receive({ phase: "error", message: "Network unavailable" });
  assert.equal((await updates.status()).phase, "error");
  assert.equal(updates.installing, false);
});
test("release manifest rejects mixed versions, duplicate targets and untrusted artifact URLs", () => {
  const first = {
    version: "0.2.0",
    notes: "Notes",
    platforms: {
      "windows-x86_64": {
        url: "https://github.com/Quaii/oh-my-gui/releases/download/v0.2.0/omp.exe",
        signature: "signed",
      },
    },
  };
  assert.equal(
    mergeUpdateFragments([first]).platforms["windows-x86_64"].signature,
    "signed",
  );
  assert.throws(() => mergeUpdateFragments([first, first]), /Duplicate/);
  assert.throws(
    () => mergeUpdateFragments([first, { ...first, version: "0.3.0" }]),
    /do not match/,
  );
  assert.throws(
    () =>
      mergeUpdateFragments([
        {
          ...first,
          platforms: {
            win: { url: "http://example.com/evil.exe", signature: "signed" },
          },
        },
      ]),
    /Invalid signed/,
  );
});
