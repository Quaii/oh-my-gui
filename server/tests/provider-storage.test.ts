import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
test("provider edits preserve existing credentials and unrelated YAML with a backup",async()=>{
 const root=await fs.mkdtemp(path.join(process.cwd(),".provider-test-"));const file=path.join(root,"models.yml");process.env.OMP_MODELS_PATH=file;
 try{
 const initial="# Existing configuration\nother: keep\nproviders:\n  local:\n    apiKey: EXISTING_ENV_KEY\n    headers:\n      X-Custom: preserve\n    compat:\n      supportsStore: false\n    models: []\n";await fs.writeFile(file,initial);
 const {saveProvider,readModelConfig}=await import("../src/model-config.ts");
 const result=await saveProvider({id:"local",baseUrl:"http://localhost:1234/v1",api:"openai-completions",auth:"apiKey",apiKey:"",discovery:"openai-models-list",models:[]});
 const text=await fs.readFile(file,"utf8"),doc=YAML.parse(text);assert.match(text,/Existing configuration/);assert.equal(doc.other,"keep");assert.equal(doc.providers.local.apiKey,"EXISTING_ENV_KEY");assert.equal(doc.providers.local.headers["X-Custom"],"preserve");assert.equal(doc.providers.local.compat.supportsStore,false);assert.equal(await fs.readFile(file+".bak","utf8"),initial);assert.doesNotMatch(JSON.stringify(result),/EXISTING_ENV_KEY/);assert.equal((await readModelConfig()).providers[0].apiKeyConfigured,true);
 }finally{delete process.env.OMP_MODELS_PATH;assert.ok(path.resolve(root).startsWith(path.resolve(process.cwd())+path.sep));await fs.rm(root,{recursive:true,force:true});}
});
