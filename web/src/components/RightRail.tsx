import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import {isDesktopHost} from '../lib/desktop';
import {SubagentControls} from './SubagentControls';
import {LayoutMotion} from "./transitions/WorkspaceMotion";
import {transitionUpdate} from "../lib/motion";
import {useEffect,useState,type ReactNode} from "react";
import {X} from "lucide-react";
import {money} from "../lib/api";
import type {ChatState} from "../lib/store";
import {GoalPlan} from "./GoalPlan";
import {ProjectActivity} from "./Projects";
import {ProviderIcon} from "./ProviderIcon";
import {Button} from "@/components/ui/button";
import {useRemote} from "./settings/ManagementShared";
import {ScrollFrame} from "./ScrollFrame";
function Card({title,kind,children,onDismiss,header}:{title:string;kind:string;children:ReactNode;onDismiss:()=>void;header?:ReactNode}){const reduced=useReducedMotion(),desktop=isDesktopHost();return <LayoutMotion><motion.section initial={desktop&&!reduced?{opacity:0,y:-6}:false} animate={desktop?{opacity:1,y:0}:undefined} exit={desktop?{opacity:0,y:reduced?0:-4,transition:{duration:reduced?0:0.14}}:undefined} transition={{duration:reduced?0:0.22,ease:[0.22,1,0.36,1]}} data-kind={kind} className="context-card workspace-floating-surface relative rounded-xl border p-4 shadow-lg"><div className="context-card-header mb-4 flex min-w-0 items-center justify-between gap-3"><h2 className="shrink-0 text-sm font-medium">{title}</h2>{header}<Button variant="ghost" size="icon-sm" onClick={()=>transitionUpdate(onDismiss)} aria-label={`Dismiss ${title}`} className="context-card-dismiss size-6 text-muted-foreground"><X className="size-3.5"/></Button></div>{children}</motion.section></LayoutMotion>}
export function RightRail({chat,stats,cwd,onCancelSubagent,onRequestPlan,enabled=true,manual=false}:{chat:ChatState;stats:any;cwd?:string;onCancelSubagent:(id:string)=>void;onRequestPlan:()=>void;enabled?:boolean;manual?:boolean}){
 const st=chat.state,[dismissed,setDismissed]=useState<string[]>([]),githubRemote=useRemote(cwd&&(enabled||manual)?`/api/project?cwd=${encodeURIComponent(cwd)}`:null);const {data:github,refresh:refreshGithub}=githubRemote;
 useEffect(()=>{if(manual||enabled&&chat.loaded&&!chat.running)refreshGithub();},[manual,enabled,chat.loaded,chat.running,cwd,refreshGithub]);
 const todos=chat.todos||[],hasPlan=todos.some(p=>(p.tasks||p.todos||p.items||[]).length>0||p.content||p.text),goal=st?.goal?.goal?.objective||st?.goal?.objective||st?.goal?.text;
 const agents=chat.subagents||[],activeAgents=agents.filter((a:any)=>!['completed','done','aborted','cancelled','failed','error'].includes(a.status));
 const planId=JSON.stringify(todos.map(p=>[p.name||p.title,(p.tasks||p.todos||p.items||[]).map((t:any)=>t.content||t.text||t.title||t)]));
 useEffect(()=>setDismissed([]),[chat.key]);
 useEffect(()=>{if(manual)setDismissed([]);},[manual]);
 useEffect(()=>setDismissed(v=>v.filter(k=>k!=='plan')),[planId,goal]);
 useEffect(()=>setDismissed(v=>v.filter(k=>k!=='agents')),[activeAgents.map((a:any)=>a.id||a.subagentId).join(',')]);
 useEffect(()=>setDismissed(v=>v.filter(k=>k!=='github')),[github?.repository]);
 const visible=(kind:string,automatic:boolean)=>!dismissed.includes(kind)&&(manual||enabled&&automatic),dismiss=(kind:string)=>setDismissed(v=>[...v,kind]);
 return <ScrollFrame><aside className="context-card-stack max-h-[calc(100dvh-100px)] space-y-[var(--space-content)] overflow-y-auto p-1" aria-label="Workspace cards"><AnimatePresence initial={false}>
 {visible('plan',hasPlan||!!goal)&&(hasPlan||goal)&&<Card key="plan" title="Task plan" kind="plan" onDismiss={()=>dismiss('plan')}>{goal&&<p className="mb-3 text-sm text-muted-foreground">{goal}</p>}<GoalPlan todos={todos} onRequestPlan={onRequestPlan}/></Card>}
 {visible('github',!!github?.repository&&github?.authenticated)&&github?.repository&&<Card key="github" title="GitHub" kind="github" onDismiss={()=>dismiss('github')} header={<a href={"https://github.com/"+github.repository} target="_blank" rel="noreferrer" title={github.repository} className="ml-auto min-w-0 truncate text-right text-xs text-muted-foreground hover:text-foreground">{github.repository}</a>}><ProjectActivity cwd={cwd!} activityData={github}/></Card>}
 {visible('session',false)&&<Card key="session" title="Session" kind="session" onDismiss={()=>dismiss('session')}><div className="mb-4 flex items-center gap-3"><ProviderIcon provider={st?.model?.provider||''} className="size-6"/><div className="min-w-0"><p className="truncate text-sm">{st?.model?.id||'Loading model…'}</p><p className="mt-1 text-xs text-muted-foreground">{st?.model?.provider} · thinking {st?.thinkingLevel||'off'}</p></div></div><dl className="grid grid-cols-2 gap-4">{[['Messages',st?.messageCount??0],['Tokens',stats?.tokens?.total?.toLocaleString()??'—'],['API equivalent',money(stats?.cost)]].map(([k,v])=><div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 font-mono text-sm">{v}</dd></div>)}</dl>{Object.entries(chat.statuses).map(([k,v])=><p key={k} className="mt-3 text-xs text-muted-foreground">{v}</p>)}</Card>}
 {visible('agents',activeAgents.length>0)&&agents.length>0&&<Card key="agents" title="Agents" kind="agents" onDismiss={()=>dismiss('agents')}><SubagentControls agents={agents} chatKey={chat.key} cancel={onCancelSubagent}/></Card>}
 </AnimatePresence></aside></ScrollFrame>;
}
