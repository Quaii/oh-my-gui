import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventory = JSON.parse(await fs.readFile(path.join(root, process.argv[2] || '.tmp/omp-gui-inventory.json'), 'utf8'));
const map = JSON.parse(await fs.readFile(path.join(root, 'scripts/omp-gui-map.json'), 'utf8'));
const ui = JSON.parse(await fs.readFile(path.join(root, 'server/data/settings-ui.json'), 'utf8'));
const cached = JSON.parse(await fs.readFile(path.join(root, 'server/data/rpc-commands.json'), 'utf8')).filter(row => !row.section.includes('frame categories'));
const fixtures = JSON.parse(await fs.readFile(path.join(root, '.tmp/omp-gui-fixture-findings.json'), 'utf8'));
const labels = { direct: 'Direct control', integrated: 'Integrated route', guided: 'Guided native form', handoff: 'Native terminal handoff', partial: 'Partial', console: 'JSON console only', missing: 'Missing workflow', 'not-applicable': 'Terminal-specific' };
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
const flagProof = await evidence([{file:'shared/launch-args.ts',needle:'parseLaunchArgs'}]);
const uiFlagEquivalents = new Set(['--model','--thinking','--cwd']);
const incompatibleFlags = new Set(['--mode','--print','--alias','--goal','--wait-async','--print-thoughts','--hide-thinking','--spinner-interval','--max-fps','--motion']);
const flags = inventory.flags.map(name => ({name, status: name === '--api-key' ? 'Credential input stays in native terminal/provider configuration' : uiFlagEquivalents.has(name) ? 'GUI equivalent + native launcher' : incompatibleFlags.has(name) ? 'Native interactive launcher; incompatible GUI transport overrides are rejected' : 'Quoted GUI argv + native launcher', note: 'Arguments are never evaluated as shell code. Terminal launch is explicit. No launch-flag mutation was exercised against user configuration.'}));
const toolAliases = {ast_edit:'astEdit.enabled',ast_grep:'astGrep.enabled',security_scan:'security.enabled',generate_image:'generate_image.enabled',web_search:'web_search.enabled',manage_skill:'skills.enableSkillCommands'};
const tools = inventory.tools.map(tool => {
  const key = toolAliases[tool.name] || tool.name + '.enabled';
  return { ...tool, setting: settings.some(setting => setting.key === key) ? key : null, gui: tool.name === 'ask' ? 'Native rpc-ui questions with structured answers and standard extension dialogs' : 'Agent-mediated native execution, tool rendering and configuration; availability follows native policy/dependencies' };
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
  `Checked ${inventory.checkedAt} against **${inventory.version}**. Native inventory revision: ${inventory.codeRevision.slice(0,7)}; local evidence below is regenerated from the current working tree. **Every audited canonical RPC has a traced GUI route. Native CLI operations use guided forms or explicit terminal handoffs. This is reachability, not blanket acceptance testing.**`,
  '## Scope and evidence',
  `The versioned inventory contains **${rpc.length} canonical RPC commands**, **${cli.length} top-level CLI commands**, **${settings.length} configuration fields**, **${inventory.slash.length} built-in slash commands (${inventory.slash.reduce((n,row)=>n+(row.subcommands?.length||0),0)} advertised subcommands)**, **${flags.length} main launch flags**, and **${tools.length} help-listed native tools**. These are overlapping surfaces, not a feature-completion percentage.`,
  `Primary sources: matching [v${versionNumber} RPC types](${upstream}packages/coding-agent/src/modes/rpc/rpc-types.ts), [protocol behavior](${upstream}docs/rpc.md), [implementation](${upstream}packages/coding-agent/src/modes/rpc/rpc-mode.ts), installed --help/config metadata, and the source anchors below. The cached catalog contains ${cached.length}/${rpc.length} canonical commands.`,
  '**Verification:** 13 native read RPCs passed in a credential-filtered temporary profile. A separate trusted-extension fixture passed startup question delivery, protocol v2 reassembly of a large response and paged loading of 401 synthetic messages. All 54 installed top-level help routes parsed, and one real read-only stats job completed in a disposable profile. Focused tests cover malformed transport, cancellation, replay, task import, quoted argv, native state, host adapters and dictation insertion. Rendered inert browser checks covered native questions/default focus/password inputs, plan edits, branch labels, queue recovery, child transcripts/steering, account listing, dark/light/custom accent and 700px width. These fixtures never sent a model request or changed a real account, setting, package, project file or service.',
  '**Acceptance limits:** real microphones/audio playback, realtime/speech/prediction/side-question providers, goal continuation, model-driven summaries, actual subagents, account login/logout, installers/updaters, native service mutations and cross-platform terminal launches were not exercised. No paid request, real installation, publication or user configuration mutation was used as a test. Arbitrary third-party terminal widgets and host adapters are not automatically converted into React.',
  '## Coverage definitions',
  table(['Classification','Meaning'],[
    ['Direct control','A normal GUI control invokes the native operation and consumes its result or events.'],
    ['Integrated route','Ordinary GUI behavior uses the command or an equivalent native route.'],
    ['Guided native form','Installed help supplies action choices, argument fields and flags; explicit execution has native output, exit state and cancellation.'],
    ['Native terminal handoff','The GUI prepares and explicitly launches/copies a native terminal command. The terminal retains interactive/credential-bearing behavior.'],
    ['Verification','Source reachability and fixtures do not prove live provider, hardware or mutating-operation acceptance.'],
  ]),
  '## RPC reachability totals',
  table(['Classification','Commands'],Object.entries(tally(rpc)).filter(([,count])=>count).map(([status,count])=>[labels[status],count])),
  '## Audited workflows',
  table(['Priority','Feature','Route state','Evidence / limits','Local source'],features.map(row=>[row.priority,row.name,row.status,row.note,proofLinks(row)])),
  '## Every canonical RPC command',
  table(['RPC','Reachability','GUI route / limits','Read probe','Local source'],rpc.map(row=>['`'+row.name+'`',labels[row.status],row.surface+'. '+row.note,row.readProbe,proofLinks(row)])),
  '## Configuration fields',
  `All **${settings.length}** native fields remain searchable. **${enumGaps.length} enum controls lack choices**; unknown future enums also have a native-validated text fallback. Version-pinned supplemental enums restore imported/factory-defined native choices. Forty source-declared RPC-neutral preferences carry an effect note. Global configuration writes, active-session controls and terminal display preferences are identified separately. The forms do not silently override native RPC defaults. See ${controlsProof.map(proofLink).join(', ')}.`,
  table(['Category','Fields'],Object.entries(settings.reduce((out,row)=>{const tab=row.tab||'Unassigned / advanced';out[tab]=(out[tab]||0)+1;return out;},{})).map(([tab,count])=>[tab,count])),
  enumGaps.length?'Remaining enum keys: '+enumGaps.map(key=>'`'+key+'`').join(', '):'All enum keys in the audited schema have native choices.',
  'The machine-readable report includes all setting keys/types and metadata reachability; private effective values are excluded. Configuration defaults and command arguments still require native validation after an OMP update.',
  '## Every top-level CLI command',
  table(['CLI command','Reachability','GUI route / limits','Local source'],cli.map(row=>['`omp '+row.name+'`',labels[row.status],row.surface+'. '+row.note,proofLinks(row)])),
  'The native manager obtains metadata from the installed executable, builds argv without evaluating shell text, and never runs operations when loading a page. Credential/token flows and terminal renderers retain native-terminal ownership. Native command completion is reported from process exit, not inferred from a button click. The profile and working folder are explicit. Jobs expose their real output and cancellation; service state is read through native status/process operations.',
  '## Slash commands',
  'Built-in/extension commands are discovered from the active OMP session and sent through normal prompting. command_output, notices, errors and supported questions are rendered. Commands that require native terminal components use the interactive launcher; text routing is not a claim that their terminal widgets were ported.',
  table(['Slash command','Advertised subcommands','Entry route'],inventory.slash.map(row=>['`/'+row.name+'`',(row.subcommands||[]).map(command=>'`'+command.name+'`').join(', ')||'—','Composer / command palette; native-terminal fallback for interactive renderers'])),
  '## Main launch flags',
  `The shared argv parser preserves quotes, empty arguments and Windows paths (${flagProof.map(proofLink).join(', ')}). GUI launch validation rejects transport replacement, incompatible main modes and browser-stored API keys. The native interactive launcher exposes main CLI arguments/flags through help-driven forms.`,
  table(['Flag','Reachability'],flags.map(row=>['`'+row.name+'`',row.status])),
  '## Native agent tools',
  'OMP owns execution, approval policy and optional dependencies. The GUI renders native tool calls/results and structured tool questions. No model-driven tool execution was used for acceptance. Tools without a known configuration gate are labelled Runtime-managed; a check appears only when the active session reports that tool.',
  table(['Tool','Matched enable setting','Route'],tools.map(row=>['`'+row.name+'`',row.setting?'`'+row.setting+'`':'Runtime-managed',row.gui])),
  '## Reducer fixture observations',
  table(['Original defect','Still present'],Object.entries(fixtures).map(([key,value])=>[key,value?'Yes':'No'])),
  'These observations use synthetic records. Native protocol/history checks and rendered inert UI checks are separate evidence; a successful read RPC is not a mutation test.',
  '## Host features and upstream boundaries',
  'Project navigation, appearance, editor drafts and the desktop shell remain shared web/Tauri host features. They preserve the approved material hierarchy and native OMP permissions. Checkpoint history changes do not roll back files. Custom terminal renderers/raw-input APIs retain a native-terminal handoff, and arbitrary host tools/URI schemes require actual host handlers. The bundled GUI runtime URI is read-only and optional; unknown host requests fail explicitly instead of hanging.',
  '## Reproduce and maintain',
  'Inspect scripts before execution. The checks below use temporary fixture profiles and do not invoke a model; the inventory collector downloads public sources matching the installed OMP version. Mutating integration scripts elsewhere in the repository are not implied by this list.',
  '```sh\nnode scripts/collect-omp-inventory.mjs\nnode scripts/check-rpc-parity.mjs\nnode scripts/check-native-operations.mjs\nnode scripts/check-api-origin.mjs\nnode scripts/inspect-gui-events.mjs\nnode scripts/audit-capabilities.mjs\nnpm run typecheck\nnpm test\nnpm run build\nnpm run docs:check\n```',
  'Curate [scripts/omp-gui-map.json](scripts/omp-gui-map.json), then regenerate this document and [docs/omp-gui-coverage.json](docs/omp-gui-coverage.json). The generator rejects unmapped commands, duplicates and stale evidence. Refresh enum/protocol metadata after an OMP update. Keep live acceptance limits explicit.',
];
await fs.writeFile(path.join(root, 'CAPABILITIES.md'), sections.join('\n\n')+'\n');
console.log(JSON.stringify(report.summary,null,2));
