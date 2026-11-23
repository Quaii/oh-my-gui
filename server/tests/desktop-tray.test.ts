import { test } from "node:test";
import assert from "node:assert/strict";
import { desktopTrayData } from "../src/desktop-tray.ts";
test("tray keeps three recent chats and reuses live bridge identity", () => {
  const sessions = Array.from({ length: 8 }, (_, i) => ({
    path: `/chat/${i}`,
    cwd: "/work",
    name: `Chat ${i}`,
  }));
  const bridges = new Map([
    [
      "new:original",
      {
        cwd: "/work",
        state: {
          sessionFile: "/chat/0",
          isStreaming: true,
          sessionName: "Running",
        },
      },
    ],
    ["idle", { cwd: "/work", state: { isStreaming: false } }],
  ]);
  const tray = desktopTrayData(sessions, bridges);
  assert.deepEqual(tray.recent.map(chat => chat.path), sessions.slice(0, 3).map(session => session.path));
  assert.equal(tray.recent[0].key, "new:original");
  assert.equal(tray.running.length, 1);
  assert.equal(tray.running[0].key, "new:original");
});
test("tray includes a running unsaved chat and keeps labels bounded", () => {
  const tray = desktopTrayData(
    [],
    new Map([
      [
        "new:1",
        {
          cwd: "/work",
          state: { isStreaming: true, sessionName: "a\n" + "b".repeat(200) },
        },
      ],
    ]),
  );
  assert.equal(tray.running[0].path, undefined);
  assert.equal(tray.running[0].key, "new:1");
  assert.equal(tray.running[0].name.length, 100);
  assert.ok(!tray.running[0].name.includes("\n"));
});
