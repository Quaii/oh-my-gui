import { Skeleton } from "./skeleton";
import { NativeSettingsSkeleton } from "./native-settings-skeleton";
export function FormSkeleton({rows=5}:{rows?:number}){return <div className="rounded-xl bg-card/30 px-5">{Array.from({length:rows},(_,i)=><div key={i} className="grid items-center gap-5 border-b border-border/50 py-5 last:border-0 sm:grid-cols-[1fr_40%]"><div className="space-y-2.5"><Skeleton className="h-3 w-32 rounded"/><Skeleton className="h-2.5 w-4/5 rounded"/><Skeleton className="h-2.5 w-3/5 rounded"/></div><Skeleton className={i%3===0?"ml-auto h-5 w-9 rounded-full":"h-9 w-full rounded-lg"}/></div>)}</div>}
export function ListSkeleton({rows=4,logo=true}:{rows?:number;logo?:boolean}){return <div className="space-y-3">{Array.from({length:rows},(_,i)=><div key={i} className="flex items-center gap-4 rounded-xl bg-card/40 p-4">{logo&&<Skeleton className="size-9 shrink-0 rounded-lg"/>}<div className="flex-1 space-y-2.5"><Skeleton className="h-3 w-32 rounded"/><Skeleton className="h-2.5 w-3/4 rounded"/></div><Skeleton className="h-5 w-9 shrink-0 rounded-full"/></div>)}</div>}
export function StatsSkeleton({count=4}:{count?:number}){return <div className={`grid gap-3 sm:grid-cols-2 ${count===3?"xl:grid-cols-3":"xl:grid-cols-4"}`}>{Array.from({length:count},(_,i)=><div key={i} className="space-y-4 rounded-xl bg-card/40 p-5"><Skeleton className="h-2.5 w-24 rounded"/><Skeleton className="h-8 w-28 rounded-md"/></div>)}</div>}
export function UsageSkeleton(){return <div className="space-y-6"><div className="usage-summary rounded-2xl border bg-card/40">{[0,1,2,3,4].map(i=><div className="usage-summary-cell space-y-3" key={i}><Skeleton className="h-3 w-24 max-w-full"/><Skeleton className="h-8 w-28 max-w-full"/><Skeleton className="h-2.5 w-4/5"/></div>)}</div><div className="usage-chart-grid"><div className="usage-card"><div className="mb-5 flex justify-between gap-4"><Skeleton className="h-4 w-32"/><Skeleton className="h-8 w-44 rounded-lg"/></div><Skeleton className="h-[260px] w-full rounded-xl"/><Skeleton className="mt-4 h-3 w-3/5"/></div><div className="usage-card"><Skeleton className="h-4 w-24"/><Skeleton className="mx-auto my-7 size-40 rounded-full"/>{[0,1].map(i=><Skeleton key={i} className="mt-3 h-3 w-full"/>)}</div></div><div className="usage-chart-grid"><div className="usage-card"><Skeleton className="mb-5 h-4 w-32"/>{[0,1].map(i=><div className="mt-5 space-y-3" key={i}><Skeleton className="h-3 w-32"/><Skeleton className="h-2 w-full rounded-full"/></div>)}</div><div className="usage-card"><Skeleton className="mb-5 h-4 w-24"/>{[0,1,2,3].map(i=><Skeleton key={i} className="mt-5 h-3 w-full"/>)}</div></div></div>}

export function ModelsSkeleton(){return <div className="divide-y divide-border/50 rounded-xl bg-card/30 px-5">{Array.from({length:15},(_,i)=><div key={i} className="grid items-center gap-4 py-4 sm:grid-cols-[80px_1fr_120px]"><Skeleton className="h-3 w-16"/><Skeleton className="h-9 w-full rounded-lg"/><Skeleton className="h-9 w-full rounded-lg"/></div>)}</div>}
export function EditorSkeleton(){return <div className="space-y-5"><Skeleton className="h-9 w-full rounded-lg"/><Skeleton className="h-2.5 w-3/4"/><Skeleton className="h-64 w-full rounded-xl"/><Skeleton className="h-9 w-32 rounded-lg"/></div>}
export function RoutingSkeleton(){return <div className="space-y-5"><Skeleton className="h-4 w-4/5"/><Skeleton className="h-16 w-full rounded-xl"/><div className="relative flex h-[570px] items-center justify-between gap-8 overflow-hidden rounded-xl bg-card/40 p-6"><Skeleton className="h-36 w-1/4 rounded-xl"/><div className="flex w-1/4 flex-col gap-8">{[0,1,2].map(i=><Skeleton key={i} className="h-32 w-full rounded-xl"/>)}</div><div className="flex w-1/4 flex-col gap-8">{[0,1,2].map(i=><Skeleton key={i} className="h-32 w-full rounded-xl"/>)}</div></div><EditorSkeleton/></div>}
export function ChatSkeleton(){return <div className="space-y-10 py-6"><Skeleton className="ml-auto h-14 w-3/5 rounded-xl"/>{[0,1].map(i=><div className="space-y-3" key={i}><Skeleton className="mb-5 h-3 w-24"/><Skeleton className="h-3 w-full"/><Skeleton className="h-3 w-11/12"/><Skeleton className="h-3 w-4/5"/>{i===0&&<Skeleton className="mt-6 h-28 w-full rounded-xl"/>}</div>)}</div>}
export function HomeSkeleton() {
  return <div className="home-dashboard">
    <div className="home-heading"><Skeleton className="h-8 w-52" /><Skeleton className="h-9 w-48" /></div>
    <div className="home-layout">
      <div className="home-section">
        <Skeleton className="h-5 w-28" />
        {[0, 1].map(index => <div className="home-work-card" key={index}><Skeleton className="h-4 w-2/3" /><Skeleton className="h-12 w-full" /></div>)}
      </div>
      <div className="home-side">
        {[0, 1].map(index => <div className="home-section" key={index}><Skeleton className="h-5 w-24" /><div className="home-list-card"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></div>)}
      </div>
    </div>
  </div>;
}

export function SkillsSkeleton(){return <div className="space-y-1.5">{Array.from({length:5},(_,i)=><div key={i} className="flex items-start gap-4 rounded-xl border border-border/60 bg-card/50 p-4"><Skeleton className="size-9 shrink-0 rounded-lg"/><div className="min-w-0 flex-1 space-y-2"><div className="flex gap-3"><Skeleton className="h-4 w-40"/><Skeleton className="h-4 w-14 rounded-full"/></div><Skeleton className="h-3 w-full"/><Skeleton className="h-3 w-4/5"/><Skeleton className="h-2.5 w-3/5"/></div><Skeleton className="mt-1 h-5 w-9 shrink-0 rounded-full"/></div>)}</div>}
export function ToolsSkeleton(){return <div><Skeleton className="mb-3 h-4 w-28"/><div className="rounded-xl border bg-card/40 px-4">{Array.from({length:6},(_,i)=><div key={i} className="flex items-start gap-3 border-b border-border/50 py-4 last:border-0"><div className="flex-1 space-y-2"><Skeleton className="h-3 w-24"/><Skeleton className="h-3 w-4/5"/></div><Skeleton className="h-5 w-9 rounded-full"/></div>)}</div></div>}
export function RecordSkeleton({rows=8}:{rows?:number}){return <div className="divide-y rounded-xl border bg-card/40 px-5">{Array.from({length:rows},(_,i)=><div className="flex items-center justify-between gap-8 py-4" key={i}><Skeleton className="h-3 w-28"/><Skeleton className="h-3 w-2/5"/></div>)}</div>}
export function CustomProvidersSkeleton(){return <div className="space-y-3">{[0,1,2].map(i=><div key={i} className="flex items-center gap-3 rounded-xl border bg-card/40 p-4"><Skeleton className="size-6 shrink-0 rounded"/><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32"/><Skeleton className="h-3 w-3/5"/></div><Skeleton className="h-3 w-20"/></div>)}</div>}
export function PanelSkeleton({panel}:{panel:string}) {
 if(panel==="usage")return <UsageSkeleton/>;
 if(panel==="routing")return <RoutingSkeleton/>;
 if(panel==="models")return <ModelsSkeleton/>;
 if(panel==="skills")return <SkillsSkeleton/>;
 if(panel==="tools")return <ToolsSkeleton/>;
 if(panel==="context-files"||panel==="config")return <EditorSkeleton/>;
 if(panel==="runtime")return <div className="space-y-7"><StatsSkeleton count={3}/><RecordSkeleton rows={11}/><Skeleton className="h-4 w-28"/><ProviderSkeleton rows={4}/></div>;
 if(panel==="providers")return <ProviderSkeleton/>;
 if(panel==="capabilities")return <RecordSkeleton rows={10}/>;
 if(panel==="extensions")return <div className="space-y-5"><div className="flex flex-wrap gap-2">{[0,1,2].map(i=><Skeleton key={i} className="h-8 w-36 rounded-lg"/>)}</div><div className="space-y-4 rounded-xl border bg-card/40 p-5"><Skeleton className="h-4 w-40"/><Skeleton className="h-3 w-4/5"/><Skeleton className="h-9 w-full rounded-lg"/><Skeleton className="h-3 w-28"/></div><Skeleton className="h-9 w-80 max-w-full rounded-lg"/><CustomProvidersSkeleton/></div>;
 if(panel==="mcp")return <div className="space-y-4">{[0,1].map(i=><div key={i} className="space-y-4 rounded-xl border p-5"><Skeleton className="h-4 w-32"/><RecordSkeleton rows={3}/></div>)}</div>;
 if(panel==="personas")return <div className="space-y-6"><div className="flex justify-between gap-5"><Skeleton className="h-3 w-3/5"/><Skeleton className="h-8 w-28 rounded-lg"/></div><div className="grid gap-3 sm:grid-cols-2">{[0,1].map(i=><div className="space-y-3 rounded-xl border p-4" key={i}><Skeleton className="size-5 rounded"/><Skeleton className="h-4 w-32"/><Skeleton className="h-3 w-full"/><Skeleton className="h-3 w-4/5"/></div>)}</div></div>;
 if(panel==="session"||panel==="flags")return <RecordSkeleton rows={6}/>;
 return <NativeSettingsSkeleton panel={panel}/>;
}

export function ProviderSkeleton({rows=5}:{rows?:number}){return <div className="space-y-3">{Array.from({length:rows},(_,i)=><div className="flex items-center gap-3 rounded-xl bg-card/50 px-4 py-3" key={i}><Skeleton className="size-6 shrink-0 rounded"/><div className="flex-1 space-y-2"><Skeleton className="h-3 w-48 max-w-full"/><Skeleton className="h-2.5 w-24"/></div><Skeleton className="h-5 w-16 rounded-full"/><Skeleton className="h-8 w-14 rounded-lg"/></div>)}</div>}
