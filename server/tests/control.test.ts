import { test } from "node:test";
import assert from "node:assert/strict";
import { validateControl, selectedPersona } from "../src/control.ts";
import { DEFAULT_CONTROL_CONFIG } from "../../shared/control.ts";
import { parseRoute } from "../src/classifier.ts";
import { validateProvider } from "../src/model-config.ts";
import { composePersona } from "../src/persona-extension.mjs";

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
 const c=structuredClone(DEFAULT_CONTROL_CONFIG);c.personas=[persona as any];c.defaultPersona=null;assert.equal(selectedPersona(c),null);assert.equal(selectedPersona(c,"p")?.name,"Editor");
});
test("local providers permit keyless discovery and reject embedded credentials and invalid model limits",()=>{
 const p={id:"local",baseUrl:"http://127.0.0.1:1234/v1",api:"openai-completions",auth:"none",discovery:"openai-models-list",models:[]};
 assert.doesNotThrow(()=>validateProvider(p));assert.throws(()=>validateProvider({...p,baseUrl:"https://secret:password@example.com/v1"}),/credentials/);assert.throws(()=>validateProvider({...p,models:[{id:"qwen",contextWindow:-1}]}),/positive/);assert.throws(()=>validateProvider({...p,discovery:"",models:[]}),/at least one/);
});
