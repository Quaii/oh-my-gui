import path from "node:path";
import { DatabaseSync } from "node:sqlite";

type DailyActivity={day:string;tokens:number};
export function activitySummary(days:DailyActivity[],now=Date.now(),timeZone="UTC") {
 const format=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"});
 const dayOf=(stamp:number)=>{const p=format.formatToParts(stamp);return `${p.find(v=>v.type==="year")!.value}-${p.find(v=>v.type==="month")!.value}-${p.find(v=>v.type==="day")!.value}`;};
 const active=[...new Set(days.filter(d=>d.tokens>0).map(d=>d.day))].sort();
 const dayNumber=(day:string)=>Date.parse(`${day}T00:00:00Z`)/86_400_000;
 let longestStreak=0,run=0,last=-Infinity;
 for(const day of active){const n=dayNumber(day);run=n===last+1?run+1:1;longestStreak=Math.max(longestStreak,run);last=n;}
 const today=dayNumber(dayOf(now)),activeSet=new Set(active.map(dayNumber));
 let cursor=activeSet.has(today)?today:today-1,currentStreak=0;
 while(activeSet.has(cursor--))currentStreak++;
 return {currentStreak,longestStreak,activeDays:active.length};
}

/** Supplemental aggregates only. OMP owns ingestion, schema, pricing, and deduplication. */
export function readUsageDetails(agentDir:string,timeZone="UTC",now=Date.now(),databaseFile=path.join(agentDir,"..","stats.db")) {
 // No create, migrations, PRAGMA mutations, or transcript/credential reads.
 const db=new DatabaseSync(databaseFile,{readOnly:true});
 try {
  const aggregates = 'COUNT(*) AS totalRequests, SUM(COALESCE(input_tokens,0)) AS totalInputTokens, SUM(COALESCE(output_tokens,0)) AS totalOutputTokens, SUM(COALESCE(cache_read_tokens,0)) AS totalCacheReadTokens, SUM(COALESCE(cache_write_tokens,0)) AS totalCacheWriteTokens, SUM(COALESCE(cost_total,0)) AS totalCost';
  const overall = db.prepare('SELECT ' + aggregates + ' FROM messages').get();
  const byModel = db.prepare('SELECT provider, model, ' + aggregates + ' FROM messages GROUP BY provider, model').all();
  const tokens="(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens)";
  const modelTokenSeries=db.prepare(`SELECT CAST(timestamp / 3600000 AS INTEGER) * 3600000 AS timestamp, provider, model, SUM(${tokens}) AS tokens, COUNT(*) AS requests, SUM(cost_total) AS cost FROM messages WHERE timestamp > 0 GROUP BY 1,2,3 ORDER BY 1,2,3`).all() as {timestamp:number;provider:string;model:string;tokens:number;requests:number;cost:number}[];
  const daily=db.prepare(`SELECT DISTINCT timestamp FROM messages WHERE timestamp > 0 AND ${tokens} > 0 ORDER BY timestamp`).all() as {timestamp:number}[];
  const format=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"});
  const days=new Map<string,number>();
  for(const row of daily){const p=format.formatToParts(row.timestamp),day=`${p.find(v=>v.type==="year")!.value}-${p.find(v=>v.type==="month")!.value}-${p.find(v=>v.type==="day")!.value}`;days.set(day,1);}
  const hours=new Map<number,number>();for(const row of modelTokenSeries)hours.set(row.timestamp,(hours.get(row.timestamp)||0)+row.tokens);
  const longest=db.prepare("SELECT MAX(active_ms) AS duration FROM (SELECT SUM(COALESCE(duration,0)) AS active_ms FROM messages WHERE agent_type = 'main' GROUP BY session_file)").get() as {duration:number|null};
  return {overall,byModel,modelTokenSeries,activity:{...activitySummary([...days].map(([day,tokens])=>({day,tokens})),now,timeZone),peakHourlyTokens:[...hours.values()].reduce((n,v)=>Math.max(n,v),0),longestSessionMs:longest.duration||0,timeZone},detailStatus:"available" as const};
 } finally {db.close();}
}
