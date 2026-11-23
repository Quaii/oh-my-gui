export const USAGE_COLORS=["var(--primary)","#6ea8ad","#a597c7","#d3ab70","#83a48c","#ad7f91"];
export const modelKey=(m:{provider:string;model:string})=>`${m.provider}/${m.model}`;
export const modelTokens=(m:any)=>Number(m.totalInputTokens||0)+Number(m.totalOutputTokens||0)+Number(m.totalCacheReadTokens||0)+Number(m.totalCacheWriteTokens||0);
export function buildModelTrend(rows:any[],models:any[],metric:"tokens"|"requests"|"cost",timeZone="UTC") {
 const ranked=[...models].sort((a,b)=>modelTokens(b)-modelTokens(a));
 const shown=ranked.slice(0,5).map((m,i)=>({...m,id:modelKey(m),key:`m${i}`,color:USAGE_COLORS[i]}));
 if(ranked.length>5)shown.push({model:"Other models",provider:"",id:"other",key:"m5",color:USAGE_COLORS[5]});
 const stamps=rows.map(r=>Number(r.timestamp)).filter(Number.isFinite);
 if(!stamps.length)return {models:shown,points:[],daily:false};
 const first=stamps.reduce((oldest,stamp)=>Math.min(oldest,stamp));
 const last=stamps.reduce((newest,stamp)=>Math.max(newest,stamp));
 const dayMs=86_400_000;
 const daily=last-first>=2*dayMs;
 const interval=daily?dayMs:3_600_000;
 const dayFormat=daily?new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}):null;
 const bucket=(stamp:number)=>{
  if(!dayFormat)return Math.floor(stamp/interval)*interval;
  const parts=dayFormat.formatToParts(stamp);
  const part=(type:string)=>Number(parts.find(item=>item.type===type)?.value);
  return Date.UTC(part("year"),part("month")-1,part("day"));
 };
 const start=bucket(first),end=bucket(last);
 const points=new Map<number,Record<string,number>>();
 for(let t=start;t<=end;t+=interval)points.set(t,Object.fromEntries([["timestamp",t],...shown.map(m=>[m.key,0])]));
 for(const row of rows){
  const stamp=Number(row.timestamp);
  if(!Number.isFinite(stamp))continue;
  const point=points.get(bucket(stamp));
  if(!point)continue;
  const match=shown.find(m=>m.id===modelKey(row))||shown.find(m=>m.id==="other");
  if(match)point[match.key]+=Number(row[metric]||0);
 }
 return {models:shown,points:[...points.values()],daily};
}
