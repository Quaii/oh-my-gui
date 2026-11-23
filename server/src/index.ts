import {desktopTrayData} from "./desktop-tray.ts";
import { createInterface } from 'node:readline';
import { appRelease, desktopUpdates } from './desktop-updates.ts';
import { projectFolders, pickDesktopFolder, receiveDesktopFolder, folderChooserOpen } from './folder-picker.ts';
import {desktopAccess} from "./desktop.ts";
import { desktopSetupStatus, completeDesktopSetup, installDesktopOmp } from './desktop-setup.ts';
import { desktopInstallerStatus, installDesktopApplication, launchInstalledDesktop } from './desktop-installer.ts';
import os from "node:os";
import {listEditorFiles,readEditorFile,saveEditorFile,reportedFileRoots} from "./editor.ts";
import {projectSuggestions}from"./suggestions.ts";
import{projectForSession}from"../../shared/workspace.ts";
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { OmpBridge, OMP_BINARY } from "./omp.ts";
import { listSessions, deleteSession, AGENT_DIR, SESSIONS_DIR } from "./sessions.ts";
import { readConfig, writeConfig } from "./config.ts";
import { readSettings, setSetting, resetSetting } from "./settings.ts";
import { readMcp, writeMcp, probeServer } from "./mcp.ts";
import { discoverMcp, importMcp } from "./mcp-discovery.ts";
import { listSkills, invalidateSkills } from "./skills.ts";
import { listBuiltinTools } from "./tools.ts";
import { runSlash } from "./slash.ts";
import { openSessionFile, readChatSnapshot } from "./snapshot.ts";
import { readControl, writeControl, selectedPersona, PERSONA_EXTENSION, validateControl } from "./control.ts";
import { readModelConfig, saveProvider } from "./model-config.ts";
import { runtimeInfo, runtimeUsage, rpcCatalog } from "./runtime.ts";
import { classifyRequest } from "./classifier.ts";
import { pluginAction, contextFiles, contextFile, projectActivity } from "./workspace-features.ts";
import { createProject } from "./projects.ts";
import {overviewWork} from "./overview.ts";
import {workspacePath} from "../../shared/workspace.ts";
import { UiReplay } from './ui-replay.ts';
import { validateGuiLaunchArgs } from '../../shared/launch-args.ts';
import { nativeDescriptor, nativeJobs, nativeJobOutput, runNativeOperation, cancelNativeOperation, nativeTerminal, stopNativeOperations } from './native-operations.ts';
import { HostRpcAdapter, GUI_HOST_TOOLS, GUI_HOST_SCHEMES } from './host-adapters.ts';
import { loopbackApiRequest } from './request-origin.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.resolve(__dirname, "../../web/dist");
const PORT = Number(process.env.PORT || 4317);
const HOST = process.env.HOST || "127.0.0.1";
if (!['localhost', '127.0.0.1', '::1'].includes(HOST)) throw Error('OMP API must bind to a loopback address.');

interface Slot {
  bridge: OmpBridge;
  cwd: string;
  subscribers: Set<http.ServerResponse>;
  state: any;
  startedAt: number;
  routingAbort?: AbortController;
  lastRouting?: any;
  replay: UiReplay;
  initializing?: Promise<void>;
  exports?: Map<string, string>;
  host?: HostRpcAdapter;
  hostEnabled?: boolean;
  login?: { providerId: string; hasAuthLink: boolean };
}
const slots = new Map<string, Slot>();
let trayRecent: ReturnType<typeof listSessions> | undefined;
let trayRecentAt=0, lastTrayState="";
let trayTimer: ReturnType<typeof setInterval> | undefined;
async function refreshNativeTray(){
  if(!trayRecent || Date.now()-trayRecentAt>15000){trayRecent=listSessions();trayRecentAt=Date.now();}
  const data=desktopTrayData(await trayRecent,slots);
  const serialized=JSON.stringify(data);
  if(serialized!==lastTrayState){lastTrayState=serialized;process.stdout.write('OMP_DESKTOP_TRAY '+serialized+'\n');}
  return data;
}
const startingBridges = new Map<string, Promise<Slot>>();

function log(...args: any[]) {
  console.log("[omp-fe]", ...args);
}

function json(res: http.ServerResponse, code: number, body: unknown) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "content-length": buf.length, "cache-control": "no-store" });
  res.end(buf);
}

async function readBody(req: http.IncomingMessage, limit = 64 * 1024 * 1024): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > limit) throw new Error("body too large");
    chunks.push(c as Buffer);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function broadcast(slot: Slot, rec: any) {
  const line = `data: ${JSON.stringify(rec)}\n\n`;
  for (const res of slot.subscribers) {
    try {
      res.write(line);
    } catch {}
  }
}

async function ensureBridge(key: string, cwd: string, sessionPath?: string, args?: string[], personaId?: string | null): Promise<Slot> {
  const pending = startingBridges.get(key);
  if (pending) return pending;
  const starting = startBridge(key, cwd, sessionPath, args, personaId).finally(() => {
    if (startingBridges.get(key) === starting) startingBridges.delete(key);
  });
  startingBridges.set(key, starting);
  return starting;
}

async function startBridge(key: string, cwd: string, sessionPath?: string, args?: string[], personaId?: string | null): Promise<Slot> {
  const existing = slots.get(key);
  if (existing && existing.bridge.alive) return existing;
  if (sessionPath && args?.includes('--no-session')) throw Error('Saved chats require session persistence. Remove --no-session from Launch flags before opening a saved chat.');

  const bridge = new OmpBridge(key, cwd);
  const slot: Slot = { bridge, cwd, subscribers: new Set(), state: null, startedAt: Date.now(), replay: new UiReplay() };
  slots.set(key, slot);
  slot.host = new HostRpcAdapter(record => bridge.write(record));
  slot.host.tool('ui_notice', async record => {
    const text = record.arguments?.message;
    if (!slot.hostEnabled) throw Error('GUI host integration is disabled');
    if (typeof text !== 'string' || !text.trim() || text.length > 10000) throw Error('A notice needs 1–10000 characters');
    broadcast(slot, slot.replay.accept({ type: 'notice', message: text }));
    return { content: [{ type: 'text', text: `Queued a notice for ${slot.subscribers.size} connected GUI view(s).` }] };
  });
  slot.host.uri('omp-ui', async record => {
    if (!slot.hostEnabled) throw Error('GUI host integration is disabled');
    if (record.operation !== 'read' || record.url !== 'omp-ui://runtime') throw Error('Only read access to omp-ui://runtime is supported');
    return { content: JSON.stringify({ state: slot.state, bridgeStartedAt: slot.startedAt }), mimeType: 'application/json' };
  });

  bridge.on("event", (rec: any) => {
    if (['host_tool_call', 'host_tool_cancel', 'host_uri_request', 'host_uri_cancel'].includes(rec.type)) { void slot.host!.accept(rec); return; }
    if (rec.type === "available_commands_update") slot.state = slot.state;
    if(rec.type === "agent_start") slot.state={...slot.state,isStreaming:true};
    if(["agent_end","agent_settled","session_settled"].includes(rec.type)) slot.state={...slot.state,isStreaming:false};
    broadcast(slot, slot.replay.accept(rec));
  });
  bridge.on("ui_request", (rec: any) => {
    if (slot.login && rec.method === 'open_url') {
      slot.login.hasAuthLink = true;
      rec = { ...rec, authProvider: slot.login.providerId };
    } else if (slot.login?.hasAuthLink && rec.method === 'input' && !rec.secret) {
      rec = { ...rec, authProvider: slot.login.providerId };
    }
    broadcast(slot, slot.replay.accept(rec));
  });
  bridge.on("exit", (info: any) => {
    slot.host?.dispose();
    broadcast(slot, { type: "bridge_exit", ...info });
    if (slots.get(key) === slot) slots.delete(key);
    log("bridge exited", key, info);
  });
  bridge.on("stderr", (s: string) => {
    if (process.env.OMP_FE_DEBUG) process.stderr.write(s);
  });

  const control = await readControl();
  const persona = sessionPath ? null : selectedPersona(control, personaId);
  const flags = [...validateGuiLaunchArgs(args ?? [])];
  // The extension also restores a persona snapshot stored in an existing session.
  flags.push("-e", PERSONA_EXTENSION);
  bridge.start({ cwd, mode: 'rpc-ui', args: flags, env: persona ? { OMP_WEB_PERSONA: JSON.stringify(persona) } : {} });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("omp did not become ready in 60s")), 60_000);
    bridge.once("ready", () => {
      clearTimeout(t);
      resolve();
    });
    bridge.once("exit", () => {
      clearTimeout(t);
      reject(new Error("omp exited during startup: " + bridge.stderrTail.slice(-2000)));
    });
  });

  // Return after transport readiness so the client can answer extension startup
  // questions before commands waiting on session_start can finish.
  slot.initializing = (async () => {
    await bridge.send({ type: 'set_ask_dialog', enabled: true });
    await bridge.send({ type: 'set_event_filter', events: null, messageUpdates: 'full' });
    await bridge.send({ type: 'set_subagent_subscription', level: 'events' });
    if (sessionPath) await openSessionFile(bridge, sessionPath);
    slot.state = await bridge.send({ type: 'get_state' }, 60_000);
  })();
  void slot.initializing.catch(error => broadcast(slot, slot.replay.accept({ type: 'bridge_error', message: error.message })));
  return slot;
}

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<boolean> {
  const p = url.pathname;
  if (!p.startsWith("/api/")) return false;

  try {
    if (p === '/api/native/catalog' && req.method === 'GET') {
      const parts = (url.searchParams.get('path') || '').split('/').filter(Boolean);
      json(res, 200, await nativeDescriptor(parts)); return true;
    }
    if (p === '/api/host-adapters') {
      const body = req.method === 'POST' ? await readBody(req, 1024) : null;
      const slot = slots.get(String(body?.key || url.searchParams.get('key') || ''));
      if (!slot) return json(res, 404, { error: 'No such bridge' }), true;
      if (req.method === 'POST') {
        if (typeof body.enabled !== 'boolean') throw Error('Choose whether to enable GUI host integration');
        await slot.initializing;
        try {
          await slot.bridge.send({ type: 'set_host_tools', tools: body.enabled ? GUI_HOST_TOOLS : [] });
          await slot.bridge.send({ type: 'set_host_uri_schemes', schemes: body.enabled ? GUI_HOST_SCHEMES : [] });
          slot.hostEnabled = body.enabled;
        } catch (error) {
          slot.hostEnabled = false;
          await Promise.allSettled([slot.bridge.send({ type: 'set_host_tools', tools: [] }), slot.bridge.send({ type: 'set_host_uri_schemes', schemes: [] })]);
          throw error;
        }
      }
      json(res, 200, { enabled: !!slot.hostEnabled, tools: GUI_HOST_TOOLS, schemes: GUI_HOST_SCHEMES }); return true;
    }
    if (p === '/api/native/operations') {
      if (req.method === 'GET') json(res, 200, url.searchParams.has('id') ? nativeJobOutput(url.searchParams.get('id')!, Number(url.searchParams.get('from') || 0)) : { jobs: nativeJobs() });
      else if (req.method === 'POST') {
        const body = await readBody(req, 1024 * 1024);
        if (body.action === 'cancel') json(res, 200, await cancelNativeOperation(String(body.id)));
        else if (body.action === 'run') json(res, 200, await runNativeOperation(body));
        else if (body.action === 'terminal-preview' || body.action === 'terminal-launch') json(res, 200, await nativeTerminal(body, body.action === 'terminal-launch'));
        else json(res, 400, { error: 'Unknown native operation' });
      } else json(res, 405, { error: 'Method not allowed' });
      return true;
    }
    if (p === '/api/desktop/installer') {
      if (!process.env.OMP_DESKTOP_TOKEN || !process.env.OMP_INSTALLER_PAYLOAD) {
        json(res, 404, { error: 'Installer mode is unavailable.' }); return true;
      }
      if (req.method === 'GET') json(res, 200, await desktopInstallerStatus());
      else if (req.method === 'POST') {
        const body = await readBody(req, 1024);
        if (body.action === 'install') await installDesktopApplication();
        else if (body.action === 'launch') await launchInstalledDesktop();
        else { json(res, 400, { error: 'Invalid installer action.' }); return true; }
        json(res, 200, await desktopInstallerStatus());
      } else json(res, 405, { error: 'Method not allowed' });
      return true;
    }
    if (p === '/api/desktop/setup' || p === '/api/desktop/setup/install') {
      if (!process.env.OMP_DESKTOP_TOKEN || !process.env.OMP_DESKTOP_DATA) {
        json(res, 404, { error: 'Desktop setup is unavailable.' }); return true;
      }
      if (p.endsWith('/install') && req.method === 'POST') json(res, 200, await installDesktopOmp());
      else if (p.endsWith('/install')) json(res, 405, { error: 'Method not allowed' });
      else if (req.method === 'GET') json(res, 200, await desktopSetupStatus());
      else if (req.method === 'POST') { await completeDesktopSetup(); json(res, 200, { completed: true }); }
      else json(res, 405, { error: 'Method not allowed' });
      return true;
    }
    if(p==='/api/files'||p==='/api/file'){
      if(req.method!=='GET'&&!(p==='/api/file'&&req.method==='PUT')){json(res,405,{error:'Method not allowed'});return true;}
      const body=req.method==='PUT'?await readBody(req):{},key=String(body.key||url.searchParams.get('key')||''),slot=slots.get(key);
      if(!slot){json(res,404,{error:'No active chat workspace.'});return true;}
      const snapshot=await readChatSnapshot(slot.bridge),roots=reportedFileRoots(slot.cwd,snapshot.messages),requested=path.resolve(slot.cwd,String(body.path||url.searchParams.get('path')||slot.cwd));
      try{const data=p==='/api/files'?await listEditorFiles(roots,requested,url.searchParams.get('q')||'',Number(url.searchParams.get('offset')||0)):req.method==='PUT'?await saveEditorFile(roots,requested,String(body.content??''),String(body.version||'')):await readEditorFile(roots,requested);json(res,200,{...data,roots});}
      catch(error:any){json(res,400,{error:error.message});}return true;
    }
    if (p === "/api/health") {
      json(res, 200, { ok: true, omp: OMP_BINARY, agentDir: AGENT_DIR, sessionsDir: SESSIONS_DIR, bridges: [...slots.keys()] });
      return true;
    }

    if (p === "/api/control") {
      if (req.method === "GET") json(res, 200, await readControl());
      else if (req.method === "PUT") {
        const current = await readControl();
        const body = await readBody(req);
        json(res, 200, await writeControl({ ...current, ...body }));
      } else json(res, 405, { error: "Method not allowed" });
      return true;
    }
    if(p==="/api/suggestions"&&req.method==="POST"){
      const body=await readBody(req),slot=slots.get(String(body.key));if(!slot){json(res,200,{eligible:false,suggestions:[]});return true;}
      const control=await readControl();if(!projectForSession({cwd:slot.cwd},control.projects)){json(res,200,{eligible:false,suggestions:[]});return true;}
      const snapshot=await readChatSnapshot(slot.bridge);if(snapshot.state?.isStreaming){json(res,200,{eligible:false,suggestions:[]});return true;}
      const messageText=(m:any)=>typeof m.content==='string'?m.content:(m.content||[]).filter((b:any)=>b.type==='text').map((b:any)=>b.text).join('\n');
      const files=(await contextFiles(slot.cwd)).filter(f=>f.scope==='project'&&f.exists&&!/prompts[\\/]/.test(f.name)).slice(0,2);
      const transcript=snapshot.messages.filter((m:any)=>['user','assistant'].includes(m.role)&&messageText(m).trim()).slice(-4);
      if(!files.length&&!transcript.some((m:any)=>m.role==='assistant')){json(res,200,{eligible:false,suggestions:[]});return true;}
      const contexts=await Promise.all(files.map(async f=>f.name+':\n'+(await contextFile(slot.cwd,f.id)).text.slice(0,1600)));
      const context=[...contexts,...transcript.map((m:any)=>m.role+': '+messageText(m).slice(-700)),snapshot.state?.todoPhases?'Task plan: '+JSON.stringify(snapshot.state.todoPhases).slice(0,1800):''].join('\n\n').slice(-6000);
      const mode=['build','explore','review','next'].includes(body.mode)?body.mode:'next',config=await readConfig();
      json(res,200,await projectSuggestions(slot.cwd,context,mode,JSON.stringify(config.data?.modelRoles||{})));return true;
    }
    if (p === "/api/projects") {
      json(res, 200, req.method === "POST" ? await createProject(await readBody(req)) : { projects: (await readControl()).projects });
      return true;
    }
    if (p === "/api/plugins/action" && req.method === "POST") {
      const body = await readBody(req);
      json(res, 200, await pluginAction(body, String(body.cwd || process.cwd())));
      return true;
    }
    if (p === "/api/context") {
      json(res, 200, { files: await contextFiles(url.searchParams.get("cwd") || process.cwd()) });
      return true;
    }
    if (p === "/api/context/file") {
      const body = req.method === "PUT" ? await readBody(req) : {};
      json(res, 200, await contextFile(String(body.cwd || url.searchParams.get("cwd") || process.cwd()), String(body.id || url.searchParams.get("id") || ""), req.method === "PUT" ? String(body.text ?? "") : undefined));
      return true;
    }
    if (p === "/api/project") {
      json(res, 200, await projectActivity(url.searchParams.get("cwd") || process.cwd()));
      return true;
    }
    if (p === "/api/model-config") {
      json(res, 200, req.method === "PUT" ? await saveProvider(await readBody(req)) : await readModelConfig());
      return true;
    }
    if (p === "/api/models") {
      const selected = slots.get(url.searchParams.get("key") || "");
      if (!selected) throw new Error("Open a session to load the model catalog");
      json(res, 200, await selected.bridge.send({ type: "get_available_models" }));
      return true;
    }
    if (p === "/api/runtime") {
      const selected = slots.get(url.searchParams.get("key") || "");
      const [runtime, providers, subagents, stats, state] = await Promise.all([
        runtimeInfo([...slots].map(([key, s]) => ({ key, cwd: s.cwd, alive: s.bridge.alive, startedAt: s.startedAt }))),
        selected?.bridge.send({ type: "get_login_providers" }).catch(() => null),
        selected?.bridge.send({ type: "get_subagents" }).catch(() => null),
        selected?.bridge.send({ type: "get_session_stats" }).catch(() => null),
        selected?.bridge.send({ type: "get_state" }).catch(() => null),
      ]);
      json(res, 200, { ...runtime, providers: providers?.providers ?? [], subagents, stats, state: state && { model: state.model, isStreaming: state.isStreaming, isSettled: state.isSettled, messageCount: state.messageCount, queuedMessageCount: state.queuedMessageCount, contextUsage: state.contextUsage, goal: state.goal }, lastRouting: selected?.lastRouting });
      return true;
    }
    if (p === "/api/usage") {
      json(res, 200, await runtimeUsage(url.searchParams.get("tz") || "UTC"));
      return true;
    }
    if (p === "/api/routing/preview" && req.method === "POST") {
      const body = await readBody(req);
      const config = validateControl({ ...(await readControl()), routing: body.routing }).routing;
      const selected = slots.get(String(body.key));
      if (!selected) throw new Error("Open a session before testing the classifier");
      json(res, 200, await classifyRequest(config, String(body.message || ""), selected.cwd));
      return true;
    }
    if (p === "/api/capabilities") {
      const catalog = (await rpcCatalog()).filter((entry: any) => !entry.section.includes("frame categories"));
      const selected = slots.get(url.searchParams.get("key") || "");
      const probes = new Set(["get_state", "get_available_models", "get_available_commands", "get_available_thinking_levels", "get_session_stats", "get_login_providers", "get_subagents", "get_tree", "get_branch_messages", "get_last_assistant_text", "get_btw_history"]);
      const results = selected ? await Promise.all(catalog.filter((entry: any) => probes.has(entry.type)).map(async (entry: any) => {
        try { await selected.bridge.send({ type: entry.type }, 10_000); return { type: entry.type, status: "verified" }; }
        catch (error: any) { return { type: entry.type, status: "unavailable", error: error.message }; }
      })) : [];
      json(res, 200, { commands: catalog.map((entry: any) => ({ ...entry, verification: results.find((result: any) => result.type === entry.type)?.status ?? "not-executed", error: results.find((result: any) => result.type === entry.type)?.error })), source: "https://github.com/can1357/oh-my-pi/blob/main/docs/rpc.md", note: "Read-only methods are probed against the running binary. Mutating methods are documented and accessible through Advanced controls, but are not executed during an audit." });
      return true;
    }

    if (p === "/api/bootstrap") {
      const cwd = url.searchParams.get("cwd") || process.env.OMP_WORKSPACE_CWD || os.homedir();
      const [allSessions, config] = await Promise.all([listSessions(), readConfig()]);
      const sessions=allSessions.filter(s=>workspacePath(s.cwd)===workspacePath(cwd));
      json(res, 200, {
        cwd,
        omp: OMP_BINARY,
        agentDir: AGENT_DIR,
        config,
        sessions,
        allSessions,
        bridges: [...slots.entries()].map(([key, s]) => ({ key, cwd: s.cwd, alive: s.bridge.alive })),
        control: await readControl(),
      });
      return true;
    }

    if(p==="/api/overview") {
      const sessions=await listSessions();
      const live=await Promise.all([...slots.values()].map(async slot=>{try{return {state:await slot.bridge.send({type:"get_state"})};}catch{return {state:slot.state};}}));
      json(res,200,{work:await overviewWork(sessions,live)});return true;
    }

    if (p === "/api/sessions") {
      const cwd = url.searchParams.get("cwd") || undefined;
      json(res, 200, { sessions: await listSessions(cwd) });
      return true;
    }

    if (p === "/api/session" && req.method === "DELETE") {
      const file = url.searchParams.get("path");
      if (!file) return json(res, 400, { error: "path required" }), true;
      await deleteSession(file);
      json(res, 200, { ok: true });
      return true;
    }

    if (p === "/api/config") {
      if (req.method === "GET") {
        json(res, 200, await readConfig());
        return true;
      }
      if (req.method === "PUT") {
        const body = await readBody(req);
        try {
          json(res, 200, await writeConfig(body));
        } catch (err: any) {
          json(res, 400, { error: String(err?.message ?? err) });
        }
        return true;
      }
    }

    if (p === "/api/bridge" && req.method === "POST") {
      const body = await readBody(req);
      const key = String(body.key || "");
      if (!key) return json(res, 400, { error: "key required" }), true;
      const cwd = String(body.cwd || process.cwd());
      const slot = await ensureBridge(key, cwd, body.sessionPath, body.args, body.personaId);
      json(res, 200, { key, cwd, state: slot.state, ready: slot.bridge.ready, stderr: slot.bridge.stderrTail.slice(-2000) });
      return true;
    }

    if (p === "/api/bridge" && req.method === "DELETE") {
      const key = url.searchParams.get("key") || "";
      const slot = slots.get(key);
      if (slot) {
        await slot.bridge.stop();
        slots.delete(key);
      }
      json(res, 200, { ok: true });
      return true;
    }

    if (p === "/api/events") {
      const key = url.searchParams.get("key") || "";
      const slot = slots.get(key);
      if (!slot) return json(res, 404, { error: "no such bridge" }), true;
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });
      res.write(": connected\n\n");
      slot.subscribers.add(res);
      const ping = setInterval(() => {
        if (!res.destroyed) res.write(": ping\n\n");
      }, 15_000);
      req.on("close", () => {
        clearInterval(ping);
        slot.subscribers.delete(res);
      });
      for (const record of slot.replay.snapshot()) res.write(`data: ${JSON.stringify(record)}\n\n`);
      // snapshot: state + transcript
      try {
        await slot.initializing;
        const snapshot = await readChatSnapshot(slot.bridge);
        slot.state = snapshot.state;
        if (!res.destroyed) res.write(`data: ${JSON.stringify({ type: "snapshot", ...snapshot, ready: slot.bridge.ready })}\n\n`);
        const history = await slot.bridge.send({ type: 'get_btw_history' });
        if (!res.destroyed) res.write(`data: ${JSON.stringify({ type: 'btw_history', records: history.records })}\n\n`);
      } catch (err: any) {
        if (!res.destroyed) res.write(`data: ${JSON.stringify({ type: "snapshot_error", message: String(err?.message ?? err) })}\n\n`);
      }
      return true;
    }

    if (p === '/api/session-export' && req.method === 'GET') {
      const slot = slots.get(url.searchParams.get('key') || '');
      const file = slot?.exports?.get(url.searchParams.get('id') || '');
      if (!file) return json(res, 404, { error: 'No such session export' }), true;
      const data = await fs.readFile(file);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-disposition': 'attachment; filename="omp-session.html"', 'content-length': data.length, 'cache-control': 'no-store' });
      res.end(data); return true;
    }
    if (p === "/api/cmd" && req.method === "POST") {
      const body = await readBody(req);
      const slot = slots.get(String(body.key));
      if (!slot) return json(res, 404, { error: "no such bridge" }), true;
      try {
        await slot.initializing;
        if (body.cmd?.type === 'login') {
          const providerId = body.cmd.providerId;
          if (typeof providerId !== 'string' || !providerId) throw Error('Choose a provider to sign in.');
          if (slot.login) throw Error('A provider sign-in is already in progress.');
          if (slot.state?.isStreaming) throw Error('Finish the current turn before signing in.');
          slot.login = { providerId, hasAuthLink: false };
          let connected = false;
          try {
            const data = await slot.bridge.send({ type: 'login', providerId }, 660_000);
            connected = true;
            json(res, 200, { ok: true, data });
          } finally {
            slot.login = undefined;
            broadcast(slot, slot.replay.accept({ type: 'provider_login_finished', providerId, connected }));
          }
          return true;
        }
        if (body.cmd?.type === "abort") slot.routingAbort?.abort();
        if (body.cmd?.type === "prompt" && !String(body.cmd.message || "").startsWith("/")) {
          const config = await readControl();
          if (config.routing.enabled) {
            if (slot.routingAbort) throw new Error("A routing decision is already in progress");
            const state = await slot.bridge.send({ type: "get_state" });
            if (!state.isStreaming) {
              const controller = new AbortController(); slot.routingAbort = controller;
              broadcast(slot, { type: "extension_ui_request", method: "setStatus", statusKey: "routing", statusText: "Classifying request…" });
              try {
                const decision = await classifyRequest(config.routing, String(body.cmd.message), slot.cwd, controller.signal);
                await slot.bridge.send({ type: "set_model", provider: decision.target.provider, modelId: decision.target.modelId });
                if (decision.target.thinking && decision.target.thinking !== "inherit") await slot.bridge.send({ type: "set_thinking_level", level: decision.target.thinking });
                slot.lastRouting = { name: config.routing.name, condition: decision.branch.label, provider: decision.target.provider, modelId: decision.target.modelId, classifier: config.routing.classifier, durationMs: decision.durationMs, usage: decision.usage, at: Date.now() };
                broadcast(slot, { type: "routing_decision", ...slot.lastRouting });
                broadcast(slot, { type: "extension_ui_request", method: "setStatus", statusKey: "routing", statusText: `${decision.branch.label} → ${decision.target.modelId}` });
              } catch(error) { broadcast(slot, {type:"extension_ui_request",method:"setStatus",statusKey:"routing",statusText:""}); throw error; } finally { slot.routingAbort = undefined; }
            } else {
              broadcast(slot, { type: "extension_ui_request", method: "setStatus", statusKey: "routing", statusText: "Queued messages keep the current turn's model" });
            }
          }
        }
        const data = await slot.bridge.send(body.cmd, body.timeoutMs ?? 120_000);
        if (body.cmd?.type === 'export_html' && data.path) {
          const id = crypto.randomUUID();
          (slot.exports ??= new Map()).set(id, data.path);
          data.downloadUrl = `/api/session-export?key=${encodeURIComponent(String(body.key))}&id=${id}`;
        }
        if (['new_session', 'open_session', 'switch_session', 'branch', 'fork', 'navigate_tree', 'handoff'].includes(body.cmd?.type) && !data.cancelled && !data.aborted) {
          const snapshot = await readChatSnapshot(slot.bridge);
          slot.state = snapshot.state;
          broadcast(slot, { type: 'snapshot', ...snapshot });
          if (typeof (data.editorText ?? data.text) === 'string') broadcast(slot, slot.replay.accept({ type: 'extension_ui_request', method: 'set_editor_text', text: data.editorText ?? data.text }));
          const history = await slot.bridge.send({ type: 'get_btw_history' });
          broadcast(slot, { type: 'btw_history', records: history.records });
        }
        if (body.cmd?.type === 'set_todos') broadcast(slot, { type: 'todo_update', phases: data.todoPhases });
        if (body.cmd?.type === "get_state") slot.state = data;
        json(res, 200, { ok: true, data });
      } catch (err: any) {
        json(res, 200, { ok: false, error: String(err?.message ?? err), code: err.code });
      }
      return true;
    }

    if (p === "/api/ui" && req.method === "POST") {
      const body = await readBody(req);
      const slot = slots.get(String(body.key));
      if (!slot) return json(res, 404, { error: "no such bridge" }), true;
      slot.bridge.write({ type: "extension_ui_response", ...body.response });
      slot.replay.dialogs.delete(String(body.response?.id));
      json(res, 200, { ok: true });
      return true;
    }

    /* ---------------- settings (omp config surface) ---------------- */

    if (p === "/api/settings") {
      if (req.method === "GET") {
        const force = url.searchParams.get("refresh") === "1";
        json(res, 200, await readSettings(force));
        return true;
      }
      if (req.method === "POST") {
        const body = await readBody(req);
        const key = String(body.key || "");
        if (!key) return json(res, 400, { error: "key required" }), true;
        const result = body.reset ? await resetSetting(key) : await setSetting(key, body.value);
        json(res, result.ok ? 200 : 400, result);
        return true;
      }
    }

    /* ---------------- MCP servers (mcp.json) ---------------- */

    if ((p === "/api/mcp/discover" && req.method === "GET") ||
        (p === "/api/mcp/import" && req.method === "POST")) {
      const body = req.method === "POST" ? await readBody(req) : undefined;
      const cwd = body?.cwd ?? url.searchParams.get("cwd");
      const project = typeof cwd === "string" && path.isAbsolute(cwd)
        ? projectForSession({ cwd: path.resolve(cwd) }, (await readControl()).projects)?.path
        : undefined;
      if (!body) {
        json(res, 200, await discoverMcp({ project }));
        return true;
      }
      if ((body.scope !== "user" && body.scope !== "project") || !Array.isArray(body.ids) ||
          !body.ids.length || body.ids.length > 500 || body.ids.some((id: unknown) => typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id))) {
        json(res, 400, { error: "Select the discovered MCP servers to import." });
        return true;
      }
      json(res, 200, await importMcp({ project }, body.scope, body.ids));
      return true;
    }

    if (p === "/api/mcp") {
      if (req.method === "GET") {
        const cwd = url.searchParams.get("cwd") || process.cwd();
        json(res, 200, await readMcp(cwd));
        return true;
      }
      if (req.method === "PUT") {
        const body = await readBody(req);
        const scope = body.scope === "project" ? "project" : "user";
        const cwd = String(body.cwd || process.cwd());
        const servers = body.servers && typeof body.servers === "object" ? body.servers : {};
        const written = await writeMcp(scope, cwd, servers);
        json(res, 200, { ok: true, ...written });
        return true;
      }
    }

    if (p === "/api/slash" && req.method === "POST") {
      const body = await readBody(req);
      const cwd = String(body.cwd || process.cwd());
      const command = String(body.command || "").trim();
      if (!command.startsWith("/")) return json(res, 400, { error: "command must start with /" }), true;
      json(res, 200, await runSlash(cwd, command, { waitMs: Number(body.waitMs) || 9000 }));
      return true;
    }

    if (p === "/api/mcp/probe" && req.method === "POST") {
      const body = await readBody(req);
      const timeout = Math.min(Math.max(Number(body.timeoutMs) || 15000, 1000), 60000);
      json(res, 200, await probeServer(body.server ?? {}, timeout));
      return true;
    }

    /* ---------------- skills ---------------- */

    if (p === "/api/skills") {
      const force = url.searchParams.get("refresh") === "1";
      if (force) invalidateSkills();
      const [skills, settings] = await Promise.all([listSkills(force), readSettings()]);
      const ignored = (settings.settings.find((s) => s.key === "skills.ignoredSkills")?.value as string[] | undefined) ?? [];
      json(res, 200, { skills, ignored });
      return true;
    }

    /* ---------------- built-in tools + plugins ---------------- */

    if (p === "/api/tools") {
      const key = url.searchParams.get("key");
      const slot = key ? slots.get(key) : undefined;
      const live = slot?.state?.dumpTools?.map((t: any) => t.name) ?? null;
      json(res, 200, { tools: await listBuiltinTools(), live });
      return true;
    }

    if (p === "/api/plugins") {
      const plugins = await new Promise<any>((resolve,reject) => {
        execFile(OMP_BINARY, ["plugin", "list", "--json"], { timeout: 40000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
          if(error){reject(new Error(String(stderr || error.message)));return;}
          try {
            resolve(JSON.parse(String(stdout ?? "{}")));
          } catch {
            reject(new Error("OMP returned an invalid extension list"));
          }
        });
      });
      const settings = await readSettings();
      json(res, 200, {
        plugins,
        extensions: settings.settings.find((s) => s.key === "extensions")?.value ?? [],
        disabledExtensions: settings.settings.find((s) => s.key === "disabledExtensions")?.value ?? [],
      });
      return true;
    }

    json(res, 404, { error: "not found" });
    return true;
  } catch (err: any) {
    json(res, 500, { error: String(err?.message ?? err) });
    return true;
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".map": "application/json",
};

async function serveStatic(res: http.ServerResponse, pathname: string) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let file = path.resolve(WEB_DIST, rel);
  if (!file.startsWith(WEB_DIST)) return json(res, 403, { error: "forbidden" });
  let data: Buffer;
  try {
    data = await fs.readFile(file);
  } catch {
    try {
      file = path.join(WEB_DIST, "index.html");
      data = await fs.readFile(file);
    } catch {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("web/dist not built. Run: npm run build");
      return;
    }
  }
  res.writeHead(200, {
    "content-type": MIME[path.extname(file)] || "application/octet-stream",
    "cache-control": file.endsWith("index.html") ? "no-store" : "public, max-age=31536000, immutable",
  });
  res.end(data);
}

let activeMutations = 0;
const server = http.createServer((req, res) => {
  let url: URL;
  try {
    url = new URL(req.url || "/", process.env.OMP_DESKTOP_TOKEN ? `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}` : `http://${req.headers.host || "localhost"}`);
  } catch {
    json(res, 400, { error: 'Invalid request URL.' }); return;
  }
  if (url.pathname.startsWith('/api/') && !loopbackApiRequest(req.headers.host, req.headers.origin)) {
    json(res, 403, { error: 'A same-origin loopback session is required.' }); return;
  }
  if(!desktopAccess(req,res,url,process.env.OMP_DESKTOP_TOKEN))return;
  if (desktopUpdates.installing && req.method !== 'GET') { json(res,409,{error:'The app is restarting to install an update.'}); return; }
  if (url.pathname === '/api/app-release' && req.method === 'GET') { json(res,200,appRelease()); return; }
  if (url.pathname === '/api/project-folders' && req.method === 'GET') {
    void projectFolders(url.searchParams.get('path') || undefined).then(data=>json(res,200,data)).catch(error=>json(res,400,{error:error.message}));return;
  }
  if (process.env.OMP_DESKTOP_TOKEN && !process.env.OMP_INSTALLER_PAYLOAD && url.pathname === '/api/desktop/folder' && req.method === 'POST') {
    void readBody(req,8192).then(body=>pickDesktopFolder(typeof body.directory === 'string' ? body.directory : undefined)).then(data=>json(res,200,data)).catch(error=>json(res,400,{error:error.message}));return;
  }
  if (process.env.OMP_DESKTOP_TOKEN && !process.env.OMP_INSTALLER_PAYLOAD && url.pathname === '/api/desktop/tray-action' && req.method === 'POST') {
    void (async()=>{
      const body = await readBody(req,8192);
      if (!['show','settings','quit','dismiss','ready','chat'].includes(body.action)) throw Error('Invalid tray action.');
      let session;
      if(body.action === 'chat') {
        const data = await refreshNativeTray();
        session = [...data.running,...data.recent].find(row=>body.key ? row.key===body.key : body.path && row.path===body.path);
        if(!session) throw Error('This chat is no longer available. Refresh the tray.');
      }
      process.stdout.write('OMP_DESKTOP_TRAY_ACTION '+JSON.stringify({action:body.action,session})+'\n');json(res,200,{ok:true});
    })().catch(error=>json(res,400,{error:error.message}));return;
  }
  if (process.env.OMP_DESKTOP_TOKEN && !process.env.OMP_INSTALLER_PAYLOAD && url.pathname === '/api/desktop/updates') {
    void (async () => {
      if (req.method === 'GET') return json(res,200,await desktopUpdates.status());
      if (req.method !== 'POST') return json(res,405,{error:'Method not allowed.'});
      const body = await readBody(req,1024);
      const running = () => folderChooserOpen() || activeMutations > 0 || startingBridges.size > 0 ||
        [...slots.values()].some(slot => slot.initializing || slot.routingAbort || slot.state?.isStreaming || slot.state?.isCompacting || slot.state?.queuedMessageCount > 0) ||
        nativeJobs().some(job => job.status === 'running');
      json(res,200,await desktopUpdates.action(String(body.action),running,body.automatic === true));
    })().catch(error => json(res,409,{error:error.message}));
    return;
  }
  const mutation = req.method !== 'GET' && url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/desktop/');
  if (mutation) activeMutations++;
  if(process.env.OMP_DESKTOP_TOKEN && url.pathname==='/api/desktop/tray' && req.method==='GET') {
    if(!trayTimer){trayTimer=setInterval(()=>{void refreshNativeTray().catch(()=>{});},5000);trayTimer.unref();}
    void refreshNativeTray().then(data=>json(res,200,data)).catch(()=>json(res,500,{error:'Could not refresh tray sessions'}));return;
  }
  if(process.env.OMP_DESKTOP_TOKEN && url.pathname==="/api/desktop/appearance" && req.method==="POST"){
    void readBody(req,1024).then(body=>{if(!/^#[0-9a-f]{6}$/i.test(body.accent||"")){json(res,400,{error:"Invalid accent"});return;}process.stdout.write("OMP_DESKTOP_APPEARANCE "+JSON.stringify({accent:body.accent})+"\n");res.writeHead(204);res.end();}).catch(()=>json(res,400,{error:"Invalid appearance request"}));return;
  }
  if(process.env.OMP_DESKTOP_TOKEN && url.pathname==="/api/desktop/window" && req.method==="POST"){
    void readBody(req,1024).then(body=>{
      if(!["hide","drag","minimize","toggle-maximize","close","close-confirmed","sync-state","ready"].includes(body.action) ||
        (body.action === 'ready' && !['installer','setup','workspace'].includes(body.mode))) {
        json(res,400,{error:"Invalid window action"});return;
      }
      process.stdout.write("OMP_DESKTOP_WINDOW "+JSON.stringify({action:body.action,...(body.action === 'ready' ? {mode:body.mode} : {})})+"\n");res.writeHead(204);res.end();
    }).catch(()=>json(res,400,{error:"Invalid window request"}));return;
  }
  handleApi(req, res, url).then((handled) => {
    if (!handled) serveStatic(res, url.pathname);
  }).catch((err) => json(res, 500, { error: String(err) })).finally(() => { if (mutation) activeMutations--; });
});

server.listen(PORT, HOST, () => {
  log(`listening http://${HOST}:${PORT}`);
  if(process.env.OMP_DESKTOP_TOKEN)process.stdout.write("OMP_DESKTOP_READY "+JSON.stringify({port:(server.address() as import("node:net").AddressInfo).port})+"\n");
  log(`omp binary: ${OMP_BINARY}`);
  log(`agent dir:  ${AGENT_DIR}`);
});

let stopping=false;
async function shutdown() {
  if(stopping)return;stopping=true;
  log("shutting down");
  await Promise.allSettled([...slots.values()].map((s) => s.bridge.stop(2500)));
  if(trayTimer)clearInterval(trayTimer);
  await stopNativeOperations();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 4000);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if(process.env.OMP_DESKTOP_TOKEN){
  const input = createInterface({ input: process.stdin });
  input.on('line', line => {
    if(line === 'shutdown') void shutdown();
    else if(line.startsWith('update ')) {
      try { void desktopUpdates.receive(JSON.parse(line.slice(7))).catch(error=>log(error.message)); } catch {}
    }
    else if(line.startsWith('folder ')) { try { receiveDesktopFolder(JSON.parse(line.slice(7))); } catch {} }
  });
  input.on('close',()=>void shutdown());
}
