import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtemp,rm} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {activitySummary,readUsageDetails} from "../src/usage-details.ts";

test("activity streaks use calendar days, include yesterday, and ignore zero-token days",()=>{
 const days=["2026-11-10","2026-11-11","2026-11-13"].map(day=>({day,tokens:100}));
 assert.deepEqual(activitySummary(days,Date.parse("2026-11-14T12:00Z")),{currentStreak:1,longestStreak:2,activeDays:3});
 assert.equal(activitySummary(days,Date.parse("2026-11-15T12:00Z")).currentStreak,0);
 assert.equal(activitySummary([{day:"2026-11-15",tokens:1}],Date.parse("2026-11-14T23:30Z"),"Europe/Berlin").currentStreak,1);
});
test("usage supplements keep provider/model identity, count cache tokens, and sum active session time read-only",async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"omp-usage-")),file=path.join(dir,"stats.db");
 try {const db=new DatabaseSync(file);db.exec("CREATE TABLE messages (timestamp INTEGER, provider TEXT, model TEXT, input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER, cache_write_tokens INTEGER, cost_total REAL, duration REAL, agent_type TEXT, session_file TEXT)");
 const insert=db.prepare("INSERT INTO messages VALUES (?,?,?,?,?,?,?,?,?,?,?)"),stamp=Date.parse("2026-11-14T12:00Z");
 insert.run(stamp,"a","same",100,10,20,5,.1,3000,"main","one");insert.run(stamp+60000,"b","same",50,5,0,0,.2,8000,"advisor","child");insert.run(stamp+3600000,"a","same",20,2,0,0,.1,4000,"main","one");db.close();
 const result=readUsageDetails(dir,"Europe/Berlin",stamp,file);
 assert.equal(result.overall?.totalRequests,3);assert.equal(result.overall?.totalInputTokens,170);assert.equal(result.byModel.length,2);assert.equal(result.modelTokenSeries.length,3);assert.equal(result.modelTokenSeries[0].tokens,135);assert.equal(result.activity.peakHourlyTokens,190);assert.equal(result.activity.longestSessionMs,7000);assert.equal(result.activity.currentStreak,1);
 const check=new DatabaseSync(file,{readOnly:true});assert.equal(check.prepare("SELECT COUNT(*) AS n FROM messages").get()!.n,3);check.close();
 }finally{await rm(dir,{recursive:true,force:true});}
});
