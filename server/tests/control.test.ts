import { test } from "node:test";
import assert from "node:assert/strict";
import { validateControl, selectedPersona } from "../src/control.ts";
import { DEFAULT_CONTROL_CONFIG } from "../../shared/control.ts";
import { parseRoute } from "../src/classifier.ts";
import { validateProvider } from "../src/model-config.ts";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import personaExtension, { composePersona } from "../src/persona-extension.mjs";

test("routing cannot enable missing models or save dangling/duplicate connections",()=>{
 const cfg=structuredClone(DEFAULT_CONTROL_CONFIG);assert.doesNotThrow(()=>validateControl(cfg));
 cfg.routing.enabled=true;assert.throws(()=>validateControl(cfg),/Choose a model/);cfg.routing.enabled=false;
 cfg.routing.branches[0].target="missing";assert.throws(()=>validateControl(cfg),/connected model/);
 cfg.routing.branches[0].target="target-1";cfg.routing.targets[1].id="target-1";assert.throws(()=>validateControl(cfg),/unique/);
});
test("classifier decisions select only a configured connected target",()=>{
 const r=structuredClone(DEFAULT_CONTROL_CONFIG.routing);r.targets[0]={id:"target-1",provider:"test",modelId:"small",thinking:"low"};
 assert.equal(parseRoute('```json\n{"route":"simple"}\n```',r).target.modelId,"small");
 assert.throws(()=>parseRoute('{"route":"unknown"}',r),/unconnected/);
 assert.throws(()=>parseRoute('{"route":"complex"}',r),/unavailable/);
 assert.throws(()=>parseRoute('not JSON',r),/valid routing/);
});
test("persona placement preserves project rules, tool context, and nonidentity instructions",()=>{
 const original=["Use tools.\nYou are omp's trusted coding assistant.\nFollow safety rules.","<project-context>AGENTS.md: run checks</project-context>"];
 const persona={id:"p",name:"Editor",prompt:"Be concise.",placement:"first",stripIdentity:true};
 const result=composePersona(original,persona);assert.equal(result.length,3);assert.match(result[0],/Be concise/);assert.match(result[1],/Use tools/);assert.match(result[1],/Follow safety rules/);assert.doesNotMatch(result[1],/trusted coding/);assert.equal(result[2],original[1]);assert.equal(original.length,2);
 const keep=composePersona(original,{...persona,stripIdentity:false,placement:"append"});assert.equal(keep[0],original[0]);assert.match(keep.at(-1),/Be concise/);
 const c=structuredClone(DEFAULT_CONTROL_CONFIG);c.personas=[persona as any];c.defaultPersona="p";assert.equal(selectedPersona(c),null);assert.equal(selectedPersona(c,"p")?.name,"Editor");
});
test("a chosen Markdown persona snapshots on the first turn and stays scoped to that chat", async t => {
  const folder = await mkdtemp(path.join(os.tmpdir(), "omp-persona-"));
  const library = path.join(folder, "web-control.json");
  const persona = { id: "p", name: "Reviewer", prompt: "# Role\nReview changes.", placement: "first", stripIdentity: false };
  await writeFile(library, JSON.stringify({ personas: [persona] }));
  const env = { OMP_WEB_PERSONA_ID: "p", OMP_WEB_PERSONA_LIBRARY: library };
  const original = Object.keys(env).map(key => [key, process.env[key]] as const);
  Object.assign(process.env, env);
  t.after(async () => {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(folder, { recursive: true, force: true });
  });
  const listeners = new Map<string, (...args: any[]) => any>();
  const entries: any[] = [];
  const runtime = {
    on: (event: string, fn: (...args: any[]) => any) => listeners.set(event, fn),
    appendEntry: (customType: string, data: unknown) => entries.push({ type: "custom", customType, data }),
  };
  const context = { sessionManager: { getBranch: () => entries } };
  const prompt = { systemPrompt: ["Project rules"] };
  personaExtension(runtime);
  listeners.get("session_start")!({}, context);
  assert.equal(entries.length, 0);
  const first = listeners.get("before_agent_start")!(prompt, context);
  assert.match(first.systemPrompt[0], /# Role\nReview changes/);
  assert.deepEqual(entries[0].data, persona);
  assert.deepEqual(listeners.get("before_agent_start")!(prompt, context), first);
  assert.equal(entries.length, 1);
  delete process.env.OMP_WEB_PERSONA_ID;
  personaExtension(runtime);
  listeners.get("session_start")!({}, context);
  assert.deepEqual(listeners.get("before_agent_start")!(prompt, context), first);
  entries.length = 0;
  listeners.get("session_switch")!({ reason: "new" }, context);
  assert.equal(listeners.get("before_agent_start")!(prompt, context), undefined);
});
test("local providers permit keyless discovery and reject embedded credentials and invalid model limits",()=>{
 const p={id:"local",baseUrl:"http://127.0.0.1:1234/v1",api:"openai-completions",auth:"none",discovery:"openai-models-list",models:[]};
 assert.doesNotThrow(()=>validateProvider(p));assert.throws(()=>validateProvider({...p,baseUrl:"https://secret:password@example.com/v1"}),/credentials/);assert.throws(()=>validateProvider({...p,models:[{id:"qwen",contextWindow:-1}]}),/positive/);assert.throws(()=>validateProvider({...p,discovery:"",models:[]}),/at least one/);
});
