import assert from "node:assert/strict";

const base = process.env.OMP_TEST_URL || "http://127.0.0.1:4318";
async function api(path, body, method = body ? "POST" : "GET") {
  const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
  const result = await response.json();
  assert.ok(response.ok && result.ok !== false, result.error || `HTTP ${response.status}`);
  return result;
}
async function readEvents(key, matches) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch(`${base}/api/events?key=${encodeURIComponent(key)}`, { signal: controller.signal });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error("Event stream ended before the snapshot");
      text += decoder.decode(chunk.value, { stream: true });
      let end;
      while ((end = text.indexOf("\n\n")) >= 0) {
        const event = text.slice(0, end); text = text.slice(end + 2);
        if (!event.startsWith("data: ")) continue;
        const record = JSON.parse(event.slice(6));
        if (record.type === "snapshot_error") throw new Error(record.message);
        if (matches(record)) return record;
      }
    }
  } finally { clearTimeout(timer); controller.abort(); }
}
const snapshot = key => readEvents(key, record => record.type === "snapshot");

const boot = await api("/api/bootstrap");
for (const session of boot.sessions.filter(s => s.messageCount > 0).slice(0, 2)) {
  const key = `ui-history-check:${Date.now()}`;
  try {
    await api("/api/bridge", { key, cwd: boot.cwd, sessionPath: session.path });
    const result = await snapshot(key);
    assert.ok(result.messages.length > 0, "Existing conversations must have a transcript");
    assert.equal(result.state.sessionFile.toLowerCase(), session.path.toLowerCase(), "Wrong session opened");
    console.log(`PASS: restored ${result.messages.length} messages from the selected session`);
  } finally { await api(`/api/bridge?key=${encodeURIComponent(key)}`, undefined, "DELETE"); }
}

if (process.argv.includes("--send")) {
  const key = `ui-send-check:${Date.now()}`;
  try {
    await api("/api/bridge", { key, cwd: boot.cwd, args: ["--no-session"] });
    await api("/api/cmd", { key, cmd: { type: "prompt", message: "Reply with exactly: OMP chat works. Do not use tools." } });
    await readEvents(key, record => record.type === "session_settled" || record.type === "prompt_result" && record.sessionSettled || record.type === "snapshot" && record.state.isSettled && record.messages.some(m => m.role === "assistant"));
    const result = await snapshot(key);
    assert.ok(result.messages.some(m => m.role === "user"));
    assert.ok(result.messages.some(m => m.role === "assistant" && m.stopReason !== "error" && JSON.stringify(m.content).includes("OMP chat works")), result.messages.find(m => m.role === "assistant")?.errorMessage || "Missing successful assistant reply");
    console.log("PASS: sent a message and received the assistant response in a disposable session");
  } finally { await api(`/api/bridge?key=${encodeURIComponent(key)}`, undefined, "DELETE"); }
}
