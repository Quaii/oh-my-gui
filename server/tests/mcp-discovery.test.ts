import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "omp-mcp-import-"));
const home = path.join(root, "home");
const project = path.join(root, "project");
const agent = path.join(root, "agent");
const codexHome = path.join(root, "custom-codex");
const claudeHome = path.join(home, ".claude");
const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
process.env.PI_CODING_AGENT_DIR = agent;
const { discoverMcp, importMcp } = await import("../src/mcp-discovery.ts");
const { writeMcp } = await import("../src/mcp.ts");
const locations = { home, codexHome, claudeHome, project };
const userMcp = path.join(agent, "mcp.json");
const projectMcp = path.join(project, ".omp", "mcp.json");

after(async () => {
  if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
  await fs.rm(root, { recursive: true, force: true });
});

async function write(file: string, body: object | string) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof body === "string" ? body : JSON.stringify(body));
}

test("finds the supported app and scope formats without exposing connection configuration", async () => {
  await write(path.join(codexHome, "config.toml"), `
    [mcp_servers."remote-tools"]
    url = "https://example.test/api"
    bearer_token_env_var = "MCP_TOKEN"
    tool_timeout_sec = 10
    http_headers = { Authorization = "private-token", "X-Version" = "2" }

    [mcp_servers.restricted]
    command = "fixture-command"
    enabled_tools = ["list"]
  `);
  await write(path.join(home, ".claude.json"), {
    mcpServers: { claude: { command: "fixture-command", args: ["arg with spaces"], env: { API_KEY: "private-token" } } },
    projects: { [project]: { mcpServers: { linked: { command: "fixture-command" } } },
      [root]: { mcpServers: { unrelated: { command: "fixture-command" } } } },
  });
  await write(path.join(claudeHome, "settings.json"), "{invalid with secret-looking text");
  await write(path.join(home, ".zcode", "cli", "config.json"), { mcp: { servers: {
    zcode: { type: "sse", url: "https://example.test/events", enable: false },
    signed: { type: "http", url: "https://example.test/events?token=private-token" },
  } } });
  await write(path.join(project, ".zcode", "config.json"), { mcp: { servers: { projectZcode: { command: "fixture-command" } } } });
  await write(path.join(project, ".mcp.json"), { mcpServers: { alreadyNative: { command: "fixture-command" } } });
  await write(userMcp, { enabledServers: ["zcode"], disabledServers: ["ignored"], mcpServers: { existing: { command: "old" } } });

  const preview = await discoverMcp(locations);
  const byName = Object.fromEntries(preview.servers.map(row => [row.name, row]));
  assert.equal(preview.projectAvailable, true);
  assert.equal(byName["remote-tools"].source, "Codex");
  assert.equal(byName.claude.needsSetup, true);
  assert.equal(byName.zcode.transport, "sse");
  assert.equal(byName.zcode.configured, true);
  assert.equal(byName.linked.scope, "project");
  assert.equal(byName.projectZcode.scope, "project");
  assert.equal(byName.alreadyNative.configured, true);
  assert.ok(byName.restricted.blocked);
  assert.ok(byName.signed.blocked);
  assert.equal(byName.unrelated, undefined);
  assert.deepEqual(preview.unreadable, [path.join(claudeHome, "settings.json")]);
  assert.doesNotMatch(JSON.stringify(preview), /private-token|fixture-command|secret-looking text/);
  const noProject = await discoverMcp({ ...locations, project: undefined });
  assert.ok(noProject.servers.every(row => row.scope === "user"));
});

test("imports selected entries into their own scope and preserves native settings and backups", async () => {
  const sourceFile = path.join(home, ".claude.json");
  const sourceBefore = await fs.readFile(sourceFile, "utf8");
  const nativeBefore = await fs.readFile(userMcp, "utf8");
  const preview = await discoverMcp(locations);
  const ids = ["remote-tools", "claude"].map(name => preview.servers.find(row => row.name === name)!.id);
  assert.deepEqual((await importMcp(locations, "user", ids)).imported, ["remote-tools", "claude"]);
  const saved = JSON.parse(await fs.readFile(userMcp, "utf8"));
  assert.deepEqual(saved.enabledServers, ["zcode"]);
  assert.deepEqual(saved.disabledServers, ["ignored"]);
  assert.equal(saved.mcpServers.existing.command, "old");
  assert.deepEqual(saved.mcpServers["remote-tools"], {
    type: "http", enabled: false, url: "https://example.test/api",
    headers: { "X-Version": "2", Authorization: "Bearer ${MCP_TOKEN}" }, timeout: 10000,
  });
  assert.deepEqual(saved.mcpServers.claude, { type: "stdio", enabled: false, command: "fixture-command", args: ["arg with spaces"], env: {} });
  assert.equal(await fs.readFile(userMcp + ".bak", "utf8"), nativeBefore);
  assert.equal(await fs.readFile(sourceFile, "utf8"), sourceBefore);
  assert.deepEqual((await importMcp(locations, "user", ids)).skipped, ["remote-tools", "claude"]);

  const workspace = preview.servers.find(row => row.name === "projectZcode")!;
  await assert.rejects(importMcp(locations, "user", [workspace.id]), /cannot be imported/);
  assert.deepEqual((await importMcp(locations, "project", [workspace.id])).imported, ["projectZcode"]);
  assert.equal(JSON.parse(await fs.readFile(projectMcp, "utf8")).mcpServers.projectZcode.enabled, false);

  const linked = preview.servers.find(row => row.name === "linked")!;
  const concurrent = await Promise.all([importMcp(locations, "project", [linked.id]), importMcp(locations, "project", [linked.id])]);
  assert.equal(concurrent.flatMap(result => result.imported).length, 1);
  assert.equal(concurrent.flatMap(result => result.skipped).length, 1);
});

test("changed source requires a fresh selection and malformed OMP config is left intact", async () => {
  const file = path.join(project, ".zcode", "config.json");
  const preview = await discoverMcp(locations);
  const old = preview.servers.find(row => row.name === "projectZcode")!;
  await write(file, { mcp: { servers: { projectZcode: { command: "changed" }, newOne: { command: "fixture-command" } } } });
  await assert.rejects(importMcp(locations, "project", [old.id]), /source configuration changed/);
  const latest = (await discoverMcp(locations)).servers.find(row => row.name === "newOne")!;
  await write(projectMcp, "{broken");
  await assert.rejects(importMcp(locations, "project", [latest.id]));
  assert.equal(await fs.readFile(projectMcp, "utf8"), "{broken");
  await writeMcp("project", project, {});
  assert.equal(await fs.readFile(projectMcp + ".bak", "utf8"), "{broken");
});
