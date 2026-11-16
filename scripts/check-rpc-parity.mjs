import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { OmpBridge, OMP_BINARY } from "../server/src/omp.ts";
import { UiReplay } from "../server/src/ui-replay.ts";
import { readChatSnapshot, openSessionFile } from "../server/src/snapshot.ts";

// Explicit integration fixture: writes only a fresh temporary profile, an inert
// keyless model, a synthetic session and a trusted startup-question extension.
// It never sends a prompt, invokes a model/tool, or reads user configuration.
const directory = await fs.mkdtemp(path.join(os.tmpdir(), "omp-rpc-parity-"));
const environment = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    [
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
    ].includes(key.toUpperCase()),
  ),
);
Object.assign(environment, {
  PI_CODING_AGENT_DIR: directory,
  PI_NO_TITLE: "1",
});
for (const key of Object.keys(process.env)) delete process.env[key];
Object.assign(process.env, environment);
const bridge = new OmpBridge("rpc-parity-fixture", directory),
  replay = new UiReplay();
const questions = [],
  errors = [];
bridge.on("ui_request", (record) => {
  replay.accept(record);
  if (record.method === "select") {
    questions.push(record);
    setTimeout(() => {
      assert.ok(replay.dialogs.has(record.id));
      bridge.write({
        type: "extension_ui_response",
        id: record.id,
        value: "beta",
      });
      replay.dialogs.delete(record.id);
    }, 150);
  }
});
bridge.on("event", (record) => {
  if (record.type === "bridge_error" || record.type === "extension_error")
    errors.push(record.message || record.error);
});
try {
  await fs.writeFile(
    path.join(directory, "models.yml"),
    `providers:
  gui-audit:
    baseUrl: http://127.0.0.1:1/v1
    api: openai-completions
    auth: none
    models:
      - id: inert
        name: RPC fixture
        reasoning: false
        input: [text]
        contextWindow: 8192
        maxTokens: 1024
`,
  );
  const extension = path.join(directory, "question.ts");
  await fs.writeFile(
    extension,
    `export default function(pi) { pi.on('session_start', async (_event, ctx) => { const value = await ctx.ui.select('GUI startup fixture', ['alpha', 'beta'], { initialIndex: 1 }); if (value !== 'beta') throw Error('Startup response did not arrive'); ctx.ui.setEditorText('fixture draft'); }); }`,
  );
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Fixture startup timed out")),
      20000,
    );
    bridge.once("ready", (record) => {
      clearTimeout(timer);
      resolve(record);
    });
    bridge.once("exit", () => {
      clearTimeout(timer);
      reject(Error("Fixture exited: " + bridge.stderrTail));
    });
  });
  bridge.start({
    cwd: directory,
    mode: "rpc-ui",
    ompBinary: OMP_BINARY,
    args: [
      "--session-dir",
      directory,
      "--no-extensions",
      "--no-skills",
      "--no-lsp",
      "--no-tools",
      "--no-context-files",
      "--no-rules",
      "--no-title",
      "--model",
      "gui-audit/inert",
      "-e",
      extension,
    ],
    env: environment,
  });
  await ready;
  await bridge.protocolReady;
  assert.equal(bridge.protocolVersion, 2);
  await bridge.send({ type: "set_ask_dialog", enabled: true });
  assert.ok(
    questions.length > 0,
    "native startup extension must ask a real question",
  );
  const file = path.join(directory, "fixture.jsonl"),
    timestamp = new Date().toISOString();
  const entries = [
    {
      type: "session",
      version: 3,
      id: randomUUID(),
      timestamp,
      cwd: directory,
    },
  ];
  for (let i = 0; i < 401; i++)
    entries.push({
      type: "message",
      id: "entry-" + i,
      parentId: i ? "entry-" + (i - 1) : null,
      timestamp,
      message: {
        role: "user",
        content: [
          {
            type: "text",
            text: `Fixture ${i} ` + "Unicode λ日本語 ".repeat(400),
          },
        ],
        timestamp: Date.now(),
      },
    });
  await fs.writeFile(
    file,
    entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n",
  );
  await openSessionFile(bridge, file);
  const loaded = await bridge.send({ type: "get_entries" });
  console.log(
    JSON.stringify({
      fixtureEntries: loaded.entries.length,
      types: [...new Set(loaded.entries.map((entry) => entry.type))],
    }),
  );
  const large = await bridge.send({ type: "get_messages" });
  assert.equal(large.messages.length, 401);
  const snapshot = await readChatSnapshot(bridge);
  assert.equal(snapshot.totalMessages, 401);
  assert.deepEqual(snapshot.messages, large.messages);
  assert.ok(
    replay
      .snapshot()
      .some(
        (record) =>
          record.method === "set_editor_text" &&
          record.text === "fixture draft",
      ),
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      protocol: bridge.protocolVersion,
      startupQuestions: questions.length,
      largeFrameMessages: large.messages.length,
      pagedMessages: snapshot.totalMessages,
      modelRequests: 0,
      errors,
    }),
  );
} finally {
  await bridge.stop();
  await fs.rm(directory, { recursive: true, force: true });
}
