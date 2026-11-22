import metadata from "../../../../server/data/settings-ui.json";
import { Skeleton } from "./skeleton";
import {skeletonSettings} from '../../lib/settings-skeleton';

/** Mirrors native settings groups and control types, without reading user values. */
export function NativeSettingsSkeleton({panel,prefix}:{panel?:string;prefix?:string}) {
 const rows=skeletonSettings(metadata,panel,prefix);
 const groups=new Map<string,typeof rows>();
 for(const row of rows){const group=(row as any).group||"General";groups.set(group,[...(groups.get(group)||[]),row]);}
 return <div>{[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([group,items])=><section key={group} className="mb-7"><div className="mb-3 flex justify-between"><Skeleton className="h-4 w-36"/><Skeleton className="h-3 w-4"/></div><div className="settings-group-body rounded-xl border border-border/60 bg-card/50 px-4">{items.map((row:any)=><div key={row.id} className="setting-row"><div className="min-w-0 flex-1"><div className="flex items-center gap-2.5"><Skeleton className="size-4 shrink-0 rounded"/><Skeleton className="h-4 max-w-full" style={{width:`${Math.min(280,Math.max(80,row.label.length*7))}px`}}/></div>{row.description&&<div className="ml-[26px] mt-2 space-y-2"><Skeleton className="h-3 w-4/5"/>{row.description.length>90&&<Skeleton className="h-3 w-3/5"/>}</div>}</div><Skeleton className={row.type==="boolean"?"h-5 w-9 shrink-0 rounded-full":row.type==="number"?"h-9 w-24 shrink-0 rounded-lg":"h-9 w-40 max-w-[40%] shrink-0 rounded-lg"}/></div>)}</div></section>)}</div>;
}
