export const USAGE_COLORS=["var(--primary)","#6ea8ad","#a597c7","#d3ab70","#83a48c","#ad7f91"];
export const modelKey=(m:{provider:string;model:string})=>`${m.provider}/${m.model}`;
export const modelTokens=(m:any)=>Number(m.totalInputTokens||0)+Number(m.totalOutputTokens||0)+Number(m.totalCacheReadTokens||0)+Number(m.totalCacheWriteTokens||0);
export function buildModelTrend(rows:any[],models:any[],metric:"tokens"|"requests"|"cost") {
 const ranked=[...models].sort((a,b)=>modelTokens(b)-modelTokens(a));
 const shown=ranked.slice(0,5).map((m,i)=>({...m,id:modelKey(m),key:`m${i}`,color:USAGE_COLORS[i]}));
 if(ranked.length>5)shown.push({model:"Other models",provider:"",id:"other",key:"m5",color:USAGE_COLORS[5]});
 if(!rows.length)return {models:shown,points:[]};
 const stamps=rows.map(r=>Number(r.timestamp)).filter(Number.isFinite),first=Math.min(...stamps),last=Math.max(...stamps);
 const interval=last-first>14*86_400_000?86_400_000:3_600_000;
 const start=Math.floor(first/interval)*interval,end=Math.floor(last/interval)*interval;
 const points=new Map<number,Record<string,number>>();
 for(let t=start;t<=end;t+=interval)points.set(t,Object.fromEntries([["timestamp",t],...shown.map(m=>[m.key,0])]));
 for(const row of rows){const stamp=Math.floor(Number(row.timestamp)/interval)*interval,point=points.get(stamp);if(!point)continue;const match=shown.find(m=>m.id===modelKey(row))||shown.find(m=>m.id==="other");if(match)point[match.key]+=Number(row[metric]||0);}
 return {models:shown,points:[...points.values()]};
}
