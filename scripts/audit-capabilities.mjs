import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventory = JSON.parse(await fs.readFile(path.join(root, process.argv[2] || '.tmp/omp-gui-inventory.json'), 'utf8'));
const map = JSON.parse(await fs.readFile(path.join(root, 'scripts/omp-gui-map.json'), 'utf8'));
const ui = JSON.parse(await fs.readFile(path.join(root, 'server/data/settings-ui.json'), 'utf8'));
const cached = JSON.parse(await fs.readFile(path.join(root, 'server/data/rpc-commands.json'), 'utf8')).filter(row => !row.section.includes('frame categories'));
const fixtures = JSON.parse(await fs.readFile(path.join(root, '.tmp/omp-gui-fixture-findings.json'), 'utf8'));
const labels = { direct: 'Direct control', integrated: 'Integrated route', partial: 'Partial', console: 'JSON console only', missing: 'Missing workflow', 'not-applicable': 'Terminal-specific' };
const sources = new Map();

async function evidence(items) {
  return Promise.all(items.map(async ({ file, needle }) => {
    if (!sources.has(file)) sources.set(file, await fs.readFile(path.join(root, file), 'utf8'));
    const text = sources.get(file);
    const offset = text.indexOf(needle);
    if (offset < 0) throw Error(`Audit evidence drifted: ${file}: ${needle}`);
    return { file, line: text.slice(0, offset).split('\n').length };
  }));
}

async function expand(native, groups) {
  const names = new Set(native.map(row => row.name));
  const rows = new Map();
  for (const group of groups) {
    if (!labels[group.status]) throw Error('Unknown audit classification: ' + group.status);
    const proof = await evidence(group.evidence);
    for (const name of group.names) {
      if (!names.has(name)) throw Error('Mapped command absent from versioned inventory: ' + name);
      if (rows.has(name)) throw Error('Duplicate GUI coverage entry: ' + name);
      rows.set(name, { name, status: group.status, surface: group.surface, note: group.note, evidence: proof });
    }
  }
  const unmapped = [...names].filter(name => !rows.has(name));
  if (unmapped.length) throw Error('Unmapped native capabilities: ' + unmapped.join(', '));
  return native.map(row => rows.get(row.name));
}

const rpc = await expand(inventory.rpc, map.rpc);
const cli = await expand(inventory.cli, map.cli);
for (const row of rpc) {
  row.inCachedCatalog = cached.some(entry => entry.type === row.name);
  row.readProbe = inventory.checks.find(check => check.name === row.name)?.status || 'not executed';
}
const features = await Promise.all(map.features.map(async feature => ({ ...feature, evidence: await evidence(feature.evidence) })));
const enumGaps = inventory.settings.filter(row => row.type === 'enum' && !ui[row.key]?.values?.length && !ui[row.key]?.options?.length).map(row => row.key);
const settings = inventory.settings.map(row => ({ ...row, metadataPresent: !!ui[row.key], normalControlHasChoices: row.type !== 'enum' || !enumGaps.includes(row.key) }));
const tally = rows => Object.fromEntries(Object.keys(labels).map(status => [status, rows.filter(row => row.status === status).length]));
const escaped = value => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const proofLink = proof => `[${proof.file}:${proof.line}](${proof.file}#L${proof.line})`;
const proofLinks = row => row.evidence.map(proofLink).join(', ');
const table = (headers, rows) => ['| ' + headers.join(' | ') + ' |', '| ' + headers.map(() => '---').join(' | ') + ' |', ...rows.map(row => '| ' + row.map(escaped).join(' | ') + ' |')].join('\n');
const versionNumber = inventory.version.match(/\d+\.\d+\.\d+/)[0];
const upstream = `https://github.com/can1357/oh-my-pi/blob/v${versionNumber}/`;
const controlsProof = await evidence([{file:'web/src/components/settings/Controls.tsx',needle:'function enumOptions'}]);
const flagProof = await evidence([{file:'web/src/pages/SettingsPage.tsx',needle:'flagDraft.split'}]);
const uiFlagEquivalents = new Set(['--model','--thinking','--cwd']);
const partialFlagEquivalents = new Set(['--approval-mode','--auto-approve','--resume','--continue','--export','--smol','--slow','--plan','--provider']);
const incompatibleFlags = new Set(['--mode','--print','--alias','--goal','--wait-async','--print-thoughts','--hide-thinking','--spinner-interval','--max-fps','--motion']);
const flags = inventory.flags.map(name => ({name, status: uiFlagEquivalents.has(name) ? 'GUI equivalent' : partialFlagEquivalents.has(name) ? 'Partial GUI equivalent + raw flags' : incompatibleFlags.has(name) ? 'Mode/terminal-specific; not general RPC launch coverage' : 'Raw launch flags only', note: 'Raw flags are whitespace-split, not a quoted argument parser. Not executed in this audit.'}));
const toolAliases = {ast_edit:'astEdit.enabled',ast_grep:'astGrep.enabled',security_scan:'security.enabled',generate_image:'generate_image.enabled',web_search:'web_search.enabled',manage_skill:'skills.enableSkillCommands'};
const tools = inventory.tools.map(tool => {
  const key = toolAliases[tool.name] || tool.name + '.enabled';
  return { ...tool, setting: settings.some(setting => setting.key === key) ? key : null, gui: tool.name === 'ask' ? 'Missing native tool UI activation' : 'Agent-mediated; generic output/configuration, no separate execution UI' };
});

const report = {
  checkedAt: inventory.checkedAt, version: inventory.version, codeRevision: inventory.codeRevision,
  method: inventory.safety, upstream: {protocol: upstream+'docs/rpc.md', types: upstream+'packages/coding-agent/src/modes/rpc/rpc-types.ts'},
  definitions: labels, summary: {rpc: tally(rpc), cli: tally(cli), settings: settings.length, enumControlGaps: enumGaps.length, slash: inventory.slash.length, tools: tools.length},
  rpc, cli, flags, tools, slash: inventory.slash, settings, enumControlGaps: enumGaps, features,
  readOnlyProbes: inventory.checks, fixtureObservations: fixtures,
};
await fs.mkdir(path.join(root, 'docs'), { recursive: true });
await fs.writeFile(path.join(root, 'docs/omp-gui-coverage.json'), JSON.stringify(report, null, 2) + '\n');

const sections = [
  '# OMP GUI coverage audit',
  `Checked ${inventory.checkedAt} against **${inventory.version}**, the installed runtime, with GUI source inspected at ${inventory.codeRevision.slice(0,7)}. **The GUI does not yet expose every OMP feature as a complete workflow.** This is an audit and prioritized implementation map, not a claim that missing features were added.`,
  '## Scope and evidence',
  `The inventory contains **${rpc.length} canonical RPC commands**, **${cli.length} top-level CLI commands**, **${settings.length} configuration fields**, **${inventory.slash.length} built-in slash commands (${inventory.slash.reduce((total,row)=>total+(row.subcommands?.length||0),0)} advertised subcommands)**, **${flags.length} main launch flags**, and **${tools.length} help-listed built-in tools**. Counts describe different surfaces and must not be added into a feature-completion percentage.`,
  `Sources: the installed binary\'s --version/--help/config list and ready/read RPCs; matching [v${versionNumber} RpcCommand definitions](${upstream}packages/coding-agent/src/modes/rpc/rpc-types.ts), [RPC behavior](${upstream}docs/rpc.md), [RPC implementation](${upstream}packages/coding-agent/src/modes/rpc/rpc-mode.ts), and [slash dispatch](${upstream}packages/coding-agent/src/slash-commands/available-commands.ts). Local code references below are the GUI evidence.`,
  'The live read probes used an isolated temporary agent directory, an inert keyless model definition, no extensions/skills/tools/LSP/context files, no saved sessions, and a credential-filtered environment. No prompt, provider login/logout, model request, tool execution, real configuration write, package installation, sharing action or user transcript inspection was performed. Temporary fixture files were removed. The default settings schema was inspected; private effective project/global values were not collected.',
  '**Reachability is separate from verification.** Direct/integrated means a source-traced GUI route exists, not that every mutation passed native acceptance. Thirteen read-only RPC probes passed. In-memory reducer fixtures confirmed five client event defects. No browser/native interaction or mutating OMP acceptance was performed for this audit. Arbitrary installed third-party extension behavior and every CLI subcommand/option remain outside exhaustive verification.',
  '## Coverage definitions',
  table(['Classification','Meaning'],[
    ['Direct control','A visible purpose-built control routes the action to OMP.'],
    ['Integrated route','Normal GUI behavior uses the RPC, or an equivalent native route, without asking the user for JSON.'],
    ['Partial','Some UI exists, but arguments, result consumption, state synchronization or supported variants are incomplete.'],
    ['JSON console only','An expert can compose native JSON in Runtime capabilities; there is no ordinary feature control.'],
    ['Missing workflow','No usable feature integration. A raw forwarding endpoint is not sufficient for audio or request/result protocols.'],
    ['Terminal-specific','A terminal-only view/developer workflow is not automatically a requirement to reproduce in the GUI.'],
  ]),
  '## RPC reachability totals',
  table(['Classification','Commands'], Object.entries(tally(rpc)).filter(([,count])=>count).map(([status,count])=>[labels[status],count])),
  `The cached GUI catalog currently lists ${cached.length}/${rpc.length} canonical commands. Missing from it: ${rpc.filter(row=>!row.inCachedCatalog).map(row=>'`'+row.name+'`').join(', ')}. The generic API can forward arbitrary JSON, but does not supply the missing audio/UI/event handling.`,
  '## Implementation order',
  'P0 restores basic user/runtime communication. P1 finishes existing workflows. P2 covers additional native capabilities or an explicit product decision. These priorities are recommendations from the audit; no implementation work is implied.',
  table(['Priority','Feature','Coverage','Finding / next work','Local evidence'], features.map(row=>[row.priority,row.name,row.status,row.note,proofLinks(row)])),
  '## Every canonical RPC command',
  table(['RPC','Coverage','GUI route / limitation','Read probe','Local evidence'],rpc.map(row=>['`'+row.name+'`',labels[row.status],row.surface+'. '+row.note,row.readProbe,proofLinks(row)])),
  '## Configuration fields',
  `All **${settings.length}** fields enter Settings → All settings and search, but **${enumGaps.length} enum fields have no selectable options** in the current form renderer. ${settings.filter(row=>row.metadataPresent).length} have UI metadata, ${settings.filter(row=>!row.metadataPresent).length} do not, and ${settings.filter(row=>!row.tab).length} have no native tab assignment. Those advanced/unassigned fields are still listed. Complex arrays/records/objects use a JSON popover. The raw config.yml editor is an expert fallback, not proof that every form control works. See ${controlsProof.map(proofLink).join(', ')}.`,
  table(['Settings category','Fields'],Object.entries(settings.reduce((counts,row)=>{const key=row.tab || 'Unassigned / advanced';counts[key]=(counts[key]||0)+1;return counts;},{}))),
  '**Enum form gaps:** '+enumGaps.map(key=>'`'+key+'`').join(', ')+'.',
  'Setting writes use `omp config set/reset` without a project/profile scope selector. Some keys control only OMP\'s terminal UI; the web appearance system is separate. RPC protocol defaults also differ from interactive defaults unless explicitly configured. A visible setting therefore does not establish that it affects the active RPC session or this GUI. The machine-readable map lists every setting key/type/category without user values.',
  '## Every top-level CLI command',
  'Launch flags are appended to `omp --mode rpc`; they are not a terminal for invoking arbitrary top-level CLI commands. Agent-mediated shell/tool access is also not a substitute for a corresponding user-facing management workflow. Some developer/service commands may intentionally remain CLI-only after a product decision.',
  table(['CLI command','Coverage','GUI equivalent / gap','Local evidence'],cli.map(row=>['`omp '+row.name+'`',labels[row.status],row.surface+'. '+row.note,proofLinks(row)])),
  '## Slash commands',
  `The isolated runtime advertises ${inventory.slash.length} built-ins. The GUI can list them in Settings → Commands, reveal them in the composer/palette and submit them through prompt. Their command_output side channel is not rendered, so **listed/routable does not mean end-to-end usable**. Entry without required arguments often only requests help, whose answer is then invisible. Commands may still mutate state or invoke a model; none was executed here. TUI-only entries with no text-mode handler are not advertised by upstream. Third-party, file, skill and MCP prompt commands are dynamic and were disabled during the isolated inventory.`,
  table(['Slash command','Advertised subcommands','Entry coverage'],inventory.slash.map(row=>['`/'+row.name+'`',(row.subcommands||[]).map(command=>'`'+command.name+'`').join(', ') || '—','Text route; output/integration partial'])),
  '## Main launch flags',
  `The raw flags editor exists, but ${flagProof.map(proofLink).join(', ')} splits on whitespace and loses quoted argument boundaries. Paths with spaces and some structured arguments cannot be assumed to work. Mode/print/interactive flags may conflict with the RPC host. This is an inventory of options, not an instruction to pass every flag.`,
  table(['Flag','Reachability'],flags.map(row=>['`'+row.name+'`',row.status])),
  '## Native agent tools',
  'OMP retains execution of built-in tools. GUI management/configuration and generic tool-call/result rendering cover the agent-mediated path; no tool was executed in this audit. Browser/computer use run inside eval and depend on native setup/policy. Tool-specific interactive requirements (especially ask), specialized previews, external programs and optional dependencies need acceptance individually. ToolsPanel currently labels tools without a matched enable-setting key as Always available; that inference is not authoritative for launch restrictions or installed dependencies.',
  table(['Tool','Matched GUI enable setting','Coverage'],tools.map(row=>['`'+row.name+'`',row.setting?'`'+row.setting+'`':'No matched gate; fixed label',row.gui])),
  '## Reducer fixture observations',
  table(['Observed defect','Present in this snapshot'],Object.entries(fixtures).map(([key,value])=>[key,value?'Yes':'No'])),
  'The fixtures feed only synthetic command_output, notice, set_editor_text, select and cancel records to the current reducer. They demonstrate client-state behavior, not a live provider/tool run. Option descriptions, secret input, structured ask, widget placement, voice, host-tool/URI responses and UI timeout behavior were additionally source-reviewed; not all were exercised as fixtures.',
  '## Host features versus OMP parity',
  'The classifier routing graph, persona library, project navigation, visual editor, desktop installer and appearance controls are host features. They can be useful and polished without covering missing native OMP operations. Permissions are OMP\'s authoritative global policy with possible launch/project overrides, not an invented per-chat access switch. Checkpoint navigation changes conversation history, not files; native checkpoint/rewind tools are distinct.',
  '## Reproduce and maintain this map',
  'Run from the repository root with Node 24+ and a working OMP binary (`OMP_BIN` can select it). The collector downloads the public source matching --version and writes only a sanitized inventory under .tmp. It creates and removes its own temporary fixture profile. The report generator rejects unclassified native commands, duplicate mappings and stale local evidence anchors rather than treating new commands as implemented.',
  '```sh\nnode scripts/collect-omp-inventory.mjs\nnode scripts/inspect-gui-events.mjs\nnode scripts/audit-capabilities.mjs\nnpm run docs:check\n```',
  'Curate [scripts/omp-gui-map.json](scripts/omp-gui-map.json), then regenerate this document and [docs/omp-gui-coverage.json](docs/omp-gui-coverage.json). The JSON contains every RPC/CLI/flag/tool/setting row and evidence location, suitable for filtering or a later in-app coverage view. Refresh after an OMP update or when closing a gap; do not turn source evidence or read-probe success into a blanket feature-verification claim.',
];
await fs.writeFile(path.join(root, 'CAPABILITIES.md'), sections.join('\n\n') + '\n');
console.log(JSON.stringify(report.summary, null, 2));
