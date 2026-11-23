import assert from "node:assert/strict";
import { test } from "node:test";
import { clearSessionMeta, getSessionMeta, groupSessions, setSessionMeta, sidebarProjectForSession } from "../../web/src/lib/sessionmeta.ts";

test("sidebar moves and pins preserve chat identity and working folder", () => {
  const storage = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  try {
    const first = { id: "first", path: "C:/work/first" };
    const second = { id: "second", path: "C:/work/second" };
    const chat = { path: "saved-chat.jsonl", cwd: "C:\\work\\first\\src" };
    const projects = [first, second];
    assert.equal(sidebarProjectForSession(chat, projects), first);

    setSessionMeta(chat.path, { projectId: second.id });
    assert.equal(sidebarProjectForSession(chat, projects), second);
    assert.equal(sidebarProjectForSession(chat, [first]), first);
    assert.equal(chat.cwd, "C:\\work\\first\\src");

    setSessionMeta(chat.path, { pinned: true });
    assert.deepEqual(groupSessions([chat]), [{ label: "Pinned", items: [chat] }]);
    setSessionMeta(chat.path, { pinned: false, archived: true });
    assert.deepEqual(groupSessions([chat]), []);
    assert.equal(sidebarProjectForSession(chat, projects), second);

    setSessionMeta(chat.path, { projectId: null, archived: false });
    assert.equal(sidebarProjectForSession(chat, projects), undefined);
    assert.equal(getSessionMeta(chat.path).projectId, null);
    setSessionMeta(chat.path, { projectId: undefined });
    assert.deepEqual(getSessionMeta(chat.path), {});
    assert.equal(sidebarProjectForSession(chat, projects), first);

    setSessionMeta(chat.path, { pinned: true, projectId: second.id });
    clearSessionMeta(chat.path);
    assert.deepEqual(getSessionMeta(chat.path), {});
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
