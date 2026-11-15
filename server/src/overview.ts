import {createReadStream,promises as fs} from "node:fs";
import {createInterface} from "node:readline";
import type {SessionSummary} from "./sessions.ts";
type BranchEntry={id?:string;parentId?:string|null;phases?:any[]};
export function durableTodo(entry:any):any[]|undefined {
 const m=entry.message;
 const phases=entry.type==="custom"&&entry.customType==="user_todo_edit"?entry.data?.phases:entry.type==="message"&&m?.role==="toolResult"&&m.toolName==="todo"&&!m.isError&&m.details?.op!=="view"?m.details?.phases:undefined;
 return Array.isArray(phases)&&phases.every(p=>typeof p.name==="string"&&Array.isArray(p.tasks)&&p.tasks.every((t:any)=>typeof t.content==="string"))?phases:undefined;
}
export function currentTodoPhases(entries:BranchEntry[]):any[] {
 const indexed=new Map(entries.filter(e=>e.id).map(e=>[e.id!,e]));
 let current=entries.at(-1),seen=new Set<string>();
 if(!current?.id)return [...entries].reverse().find(e=>e.phases)?.phases||[];
 while(current){if(current.phases)return current.phases;if(!current.parentId||seen.has(current.parentId))break;seen.add(current.parentId);current=indexed.get(current.parentId);}
 return [];
}
const cache=new Map<string,{mtime:number;size:number;phases:any[]}>();
async function savedPhases(file:string) {
 const stat=await fs.stat(file),cached=cache.get(file);if(cached?.mtime===stat.mtimeMs&&cached.size===stat.size)return cached.phases;
 const entries:BranchEntry[]=[],lines=createInterface({input:createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});
 for await(const line of lines){try{const e=JSON.parse(line);if(e.id||durableTodo(e))entries.push({id:e.id,parentId:e.parentId,phases:durableTodo(e)});}catch{}}
 const phases=currentTodoPhases(entries);cache.set(file,{mtime:stat.mtimeMs,size:stat.size,phases});return phases;
}
export async function overviewWork(sessions:SessionSummary[],live:{state:any}[]) {
 const results=await Promise.all(sessions.map(async session=>{
  let phases:any[]=[];try{phases=await savedPhases(session.path);}catch{}
  const state=live.find(l=>l.state?.sessionFile===session.path)?.state;
  if(Array.isArray(state?.todoPhases))phases=state.todoPhases;
  const tasks=phases.flatMap(p=>p.tasks||p.items||[]).filter(t=>!["completed","done","abandoned"].includes(t.status)&&t.done!==true);
  const goal=state?.goal&&!['complete','completed','cancelled','abandoned'].includes(state.goal.status)?state.goal:null;
  const goalText=goal?.objective||goal?.text||goal?.description;
  const running=!!(state?.isStreaming||state?.hasPendingAsyncWork);
  if(!tasks.length&&!goalText&&!running)return null;
  return {session,title:goalText||tasks.find(t=>t.status==="in_progress")?.content||tasks[0]?.content||"Agent work in progress",pendingTasks:tasks.length,running,hasGoal:!!goalText,nextTasks:tasks.slice(0,3).map(t=>({content:t.content,status:t.status}))};
 }));return results.filter(Boolean).sort((a,b)=>Number(b!.running)-Number(a!.running)||b!.session.updatedAt.localeCompare(a!.session.updatedAt));
}
