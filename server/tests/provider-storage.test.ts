import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
test("provider edits and deletion preserve existing credentials and unrelated YAML with a backup",async()=>{
 const root=await fs.mkdtemp(path.join(process.cwd(),".provider-test-"));const file=path.join(root,"models.yml");process.env.OMP_MODELS_PATH=file;
 try{
 const initial="# Existing configuration\nother: keep\nproviders:\n  local:\n    apiKey: EXISTING_ENV_KEY\n    headers:\n      X-Custom: preserve\n    compat:\n      supportsStore: false\n    models: []\n";await fs.writeFile(file,initial);
 const {saveProvider,readModelConfig,removeProvider}=await import("../src/model-config.ts");
 const result=await saveProvider({id:"local",baseUrl:"http://localhost:1234/v1",api:"openai-completions",auth:"apiKey",apiKey:"",discovery:"openai-models-list",models:[]});
 const text=await fs.readFile(file,"utf8"),doc=YAML.parse(text);assert.match(text,/Existing configuration/);assert.equal(doc.other,"keep");assert.equal(doc.providers.local.apiKey,"EXISTING_ENV_KEY");assert.equal(doc.providers.local.headers["X-Custom"],"preserve");assert.equal(doc.providers.local.compat.supportsStore,false);assert.equal(await fs.readFile(file+".bak","utf8"),initial);assert.doesNotMatch(JSON.stringify(result),/EXISTING_ENV_KEY/);assert.equal((await readModelConfig()).providers[0].apiKeyConfigured,true);
 const remote = { id: "another", baseUrl: "https://example.test/v1", api: "openai-completions", auth: "none", models: [{ id: "model" }] };
 await Promise.all([saveProvider(remote), removeProvider("local")]);
 assert.deepEqual((await readModelConfig()).providers.map(provider => provider.id), ["another"]);
 const removed = await fs.readFile(file, "utf8");
 assert.equal(YAML.parse(removed).other, "keep");
 const backup = await fs.readFile(file + ".bak", "utf8");
 assert.equal(YAML.parse(backup).providers.local.apiKey, "EXISTING_ENV_KEY");
 await removeProvider("local");
 assert.equal(await fs.readFile(file + ".bak", "utf8"), backup);
 await assert.rejects(removeProvider("../local"), /valid custom provider/);
 }finally{delete process.env.OMP_MODELS_PATH;assert.ok(path.resolve(root).startsWith(path.resolve(process.cwd())+path.sep));await fs.rm(root,{recursive:true,force:true});}
});
