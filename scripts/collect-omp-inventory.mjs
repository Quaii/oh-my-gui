import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { OmpBridge, OMP_BINARY } from '../server/src/omp.ts';
import { parseBuiltinTools } from '../server/src/tools.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const execute = promisify(execFile);
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'omp-gui-audit-'));
const allowedEnvironment = new Set([
  'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP',
  'USERPROFILE', 'HOME', 'APPDATA', 'LOCALAPPDATA',
]);
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowedEnvironment.has(key.toUpperCase())));
environment.PI_CODING_AGENT_DIR = directory;
environment.PI_NO_TITLE = '1';
// OmpBridge normally inherits its host environment. Exclude provider credentials,
// profile overrides and extension configuration from the audit subprocess too.
for (const key of Object.keys(process.env)) delete process.env[key];
Object.assign(process.env, environment);
const run = async args => (await execute(OMP_BINARY, args, {
  cwd: directory, env: environment, windowsHide: true, timeout: 30000, maxBuffer: 16 * 1024 * 1024,
})).stdout;
const bridge = new OmpBridge('gui-capability-audit', directory);
const readCommands = [
  'get_state', 'get_available_commands', 'get_available_models', 'get_available_thinking_levels',
  'get_entries', 'get_tree', 'get_subagents', 'get_session_stats', 'get_messages',
  'get_messages_page', 'get_branch_messages', 'get_last_assistant_text', 'get_btw_history',
];
try {
  // Startup requires a selected model even for read RPCs. This inert, keyless
  // definition has no discovery endpoint and is never prompted.
  await fs.writeFile(path.join(directory, 'models.yml'), `providers:
  gui-audit:
    baseUrl: http://127.0.0.1:1/v1
    api: openai-completions
    auth: none
    models:
      - id: inert
        name: Inventory fixture
        reasoning: false
        input: [text]
        contextWindow: 8192
        maxTokens: 1024
`);
  const version = (await run(['--version'])).trim();
  const number = version.match(/\d+\.\d+\.\d+/)?.[0];
  if (!number) throw Error('Cannot identify the installed OMP version');
  const help = await run(['--help']);
  const config = JSON.parse(await run(['config', 'list', '--json']));
  const ui = JSON.parse(await fs.readFile('server/data/settings-ui.json', 'utf8'));
  const reference = `https://raw.githubusercontent.com/can1357/oh-my-pi/v${number}/packages/coding-agent/src/modes/rpc/rpc-types.ts`;
  const response = await fetch(reference);
  if (!response.ok) throw Error('The matching upstream protocol source is unavailable: ' + response.status);
  const source = ts.createSourceFile('rpc-types.ts', await response.text(), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(statement => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'RpcCommand');
  if (!declaration || !ts.isUnionTypeNode(declaration.type)) throw Error('Cannot identify canonical RpcCommand union');
  const rpc = declaration.type.types.map(member => {
    const property = member.members?.find(item => item.name?.getText(source) === 'type');
    if (!property || !ts.isLiteralTypeNode(property.type) || !ts.isStringLiteral(property.type.literal)) {
      throw Error('Unrecognized RPC command declaration');
    }
    return { name: property.type.literal.text, schema: member.getText(source) };
  });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Audit runtime startup timed out')), 20000);
    bridge.once('ready', value => { clearTimeout(timer); resolve(value); });
    bridge.once('exit', () => {
      clearTimeout(timer);
      reject(Error('Audit runtime exited before readiness: ' + bridge.stderrTail));
    });
  });
  bridge.start({
    cwd: directory,
    args: ['--no-session', '--no-extensions', '--no-skills', '--no-lsp', '--no-tools',
      '--no-context-files', '--no-rules', '--no-title', '--model', 'gui-audit/inert'],
    env: environment,
  });
  const handshake = await ready;
  const checks = [];
  let slash = [];
  for (const type of readCommands) {
    try {
      const result = await bridge.send({ type }, 10000);
      checks.push({ name: type, status: 'passed' });
      if (type === 'get_available_commands') slash = result.commands || [];
    } catch (error) {
      checks.push({ name: type, status: 'failed', error: error.message });
    }
  }
  const commandSection = help.split('\nCOMMANDS\n')[1]?.split('\nEnvironment Variables:')[0] || '';
  const cli = [...commandSection.matchAll(/^  ([a-z][\w-]*)\s{2,}(.+)$/gm)]
    .map(match => ({ name: match[1], description: match[2].trim() }));
  const flags = [...new Set([...help.split('\nEXAMPLES\n')[0].matchAll(/(?:^|\s)--([a-z][\w-]*)(?:[=<\s]|$)/gm)]
    .map(match => '--' + match[1]))];
  const codeRevision = (await execute('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })).stdout.trim();
  const snapshot = {
    checkedAt: new Date().toISOString(), version, codeRevision, source: reference,
    cli, flags, rpc, handshake, checks, tools: parseBuiltinTools(help),
    settings: Object.entries(config).map(([key, entry]) => ({
      key, type: entry.type, tab: ui[key]?.tab || null, group: ui[key]?.group || null,
    })),
    slash: slash.map(command => ({
      name: command.name, description: command.description, source: command.source,
      aliases: command.aliases, subcommands: command.subcommands,
    })),
    safety: 'Fresh temporary agent directory and inert keyless model; no extensions, skills, tools or context; no prompts, user configuration writes or saved sessions. Only metadata and read RPC results retained.',
  };
  await fs.mkdir('.tmp', { recursive: true });
  await fs.writeFile('.tmp/omp-gui-inventory.json', JSON.stringify(snapshot, null, 2) + '\n');
  console.log(JSON.stringify({ version, rpc: rpc.length, cli: cli.length, settings: snapshot.settings.length,
    slash: snapshot.slash.length, tools: snapshot.tools.length, checks }));
} finally {
  await bridge.stop();
  await fs.rm(directory, { recursive: true, force: true });
}
