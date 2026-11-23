import { PanelSkeleton } from "@/components/ui/loading-shapes";
import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Sector, type PieSectorShapeProps } from "recharts";
import { Button } from "@/components/ui/button";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProviderIcon } from "../ProviderIcon";
import { useRemote, Notice } from "./ManagementShared";
import { SettingsHeading } from "./SettingsHeading";
import { money } from "@/lib/api";
import { buildModelTrend,modelKey,modelTokens,USAGE_COLORS } from "@/lib/usage";
import type { usagePricing } from "../../../../server/src/usage-pricing";

const number=(n:number)=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2});
const compact=(n:number)=>Intl.NumberFormat(undefined,{notation:"compact",maximumFractionDigits:2}).format(n);
const duration=(ms:number)=>ms>=3_600_000?`${Math.floor(ms/3_600_000)}h ${Math.floor(ms%3_600_000/60_000)}m`:ms>=60_000?`${Math.floor(ms/60_000)}m ${Math.floor(ms%60_000/1000)}s`:`${Math.round(ms/1000)}s`;
type Metric="tokens"|"requests"|"cost";
const chartDate = (stamp: number, daily: boolean) => new Date(stamp).toLocaleString([], daily
  ? { month: "short", day: "numeric", timeZone: "UTC" }
  : { month: "short", day: "numeric", hour: "numeric" });
function TrendTooltip({active,payload,label,metric,daily}:{active?:boolean;payload?:readonly any[];label?:unknown;metric:Metric;daily:boolean}) {
 if(!active||!payload?.length)return null;
 return <div className="chart-tooltip min-w-52 rounded-xl border border-border px-4 py-3 text-[13px] text-foreground shadow-lg"><p className="mb-3 font-medium">{chartDate(Number(label),daily)}</p>{payload.filter(p=>Number(p.value)>0).map(p=><div key={p.dataKey} className="mt-2 flex items-center justify-between gap-6"><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full" style={{background:p.color}}/>{p.name}</span><span className="font-medium tabular-nums">{metric==="cost"?money(Number(p.value)):number(Number(p.value))}</span></div>)}</div>;
}
function DonutTooltip({active,payload,metric}:{active?:boolean;payload?:readonly any[];metric:string}) {
 if(!active||!payload?.length)return null;const point=payload[0].payload;
 return <div className="chart-tooltip rounded-xl border border-border px-4 py-3 text-[13px] text-foreground shadow-lg"><p className="font-medium">{point.model}</p><p className="mt-1 text-xs text-muted-foreground">{point.provider}</p><p className="mt-2 tabular-nums">{number(point.value)} {metric}</p></div>;
}

function renderModelShareSector({ startAngle, endAngle, index, ...sector }: PieSectorShapeProps, angles: number[]) {
  const count = angles.length;
  // Only separate arcs wide enough to show a visible slice beside the gap.
  const canSeparate = (neighbor: number) => count > 1 && angles[index] >= 4 && angles[neighbor] >= 4;
  const inset = Math.min(1, 15 / count);
  const startInset = canSeparate((index + count - 1) % count) ? inset : 0;
  const endInset = canSeparate((index + 1) % count) ? inset : 0;
  const direction = Math.sign(endAngle - startAngle);
  return <Sector {...sector}
    startAngle={startAngle + direction * startInset}
    endAngle={endAngle - direction * endInset}
    cornerRadius={startInset && endInset ? 5 : 0}
  />;
}

function UsagePricingCard({ timeZone, unpricedRequests }: { timeZone: string; unpricedRequests?: number }) {
  const [requested, setRequested] = useState(false);
  const { data, loading, error, refresh } = useRemote<Awaited<ReturnType<typeof usagePricing>>>(
    requested ? `/api/usage/pricing?tz=${encodeURIComponent(timeZone)}` : null,
  );
  return <section className="settings-card">
    <div className="settings-card-row flex-wrap">
      <div className="min-w-0 flex-[1_1_20rem]">
        <h2 className="settings-heading-title">About usage estimates</h2>
        <p className="settings-heading-description">
          API-equivalent estimates from OMP’s price catalog, rather than your subscription bill. Tokens include cache reads and writes. Streaks use {timeZone}.
          {unpricedRequests ? ` ${unpricedRequests} requests have no catalog pricing.` : ""}
        </p>
      </div>
      <Button variant="outline" size="sm" className="ms-auto" disabled={requested && loading} onClick={() => requested ? refresh() : setRequested(true)}>
        {requested && loading ? "Checking…" : "Check published prices"}
      </Button>
    </div>
    {requested && (data || error) && <div className="mt-4 border-t border-border pt-4" aria-live="polite">
      <Notice error={error} />
      {data && <>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Current public rates from Models.dev and OpenRouter, applied to recorded token counts. Subscription charges and historical rates can differ.
          {data.unavailable.length > 0 && ` Unavailable: ${data.unavailable.join(", ")}.`}
        </p>
        {data.rows.length ? <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground"><tr><th scope="col" className="py-2">Model</th><th scope="col" className="px-3 py-2 text-right">OMP estimate</th><th scope="col" className="py-2 text-right">Public reference</th></tr></thead>
            <tbody>{data.rows.map(row => <tr key={modelKey(row)} className="border-t border-border">
              <th scope="row" className="break-all py-2 font-medium">{row.model}<span className="block font-normal text-muted-foreground">{row.provider}</span></th>
              <td className="whitespace-nowrap px-3 text-right tabular-nums">{row.recorded === null ? "—" : money(row.recorded)}</td>
              <td className="text-right tabular-nums">{row.reference === null ? "No comparable rate" : <>
                {money(row.reference)}<span className="block text-muted-foreground" title={row.catalogId ?? undefined}>{row.source}</span>
              </>}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="mt-3 text-xs text-muted-foreground">No model usage to compare.</p>}
      </>}
    </div>}
  </section>;
}

export default function UsagePanel({ title, description }: { title: string; description?: string }) {
 const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
 const {data,loading,error,refresh}=useRemote(`/api/usage?tz=${encodeURIComponent(tz)}`);
 const [metric,setMetric]=useState<Metric>("tokens"),[shareMetric,setShareMetric]=useState("tokens");
 const gradientId = useId().replace(/[^\w-]/g, "");
 const total=data?.overall,activity=data?.activity;
 const models=useMemo(()=>[...(data?.byModel||[])].sort((a:any,b:any)=>modelTokens(b)-modelTokens(a)),[data]);
 const colors = useMemo(() => new Map(models.map((model, i) => [modelKey(model), USAGE_COLORS[i % USAGE_COLORS.length]])), [models]);
 const ranking = useMemo(() => [...models].sort((a, b) => Number(b.totalCost || 0) - Number(a.totalCost || 0)), [models]);
 const trend = useMemo(() => buildModelTrend(data?.detailStatus === "available" ? data.modelTokenSeries || [] :
   metric === "requests" ? data?.modelSeries || [] : [], models, metric, tz), [data, models, metric, tz]);
 const shares = useMemo(() => models.map(m => ({
   ...m, value: shareMetric === "tokens" ? modelTokens(m) : Number(m.totalRequests),
   color: colors.get(modelKey(m)),
 })).filter(model => Number.isFinite(model.value) && model.value > 0).sort((a, b) => b.value - a.value), [models, colors, shareMetric]);
 const tokens = total ? modelTokens(total) : 0;
 const shareTotal = shares.reduce((sum, model) => sum + model.value, 0);
 const shareAngles = shares.map(model => 360 * (model.value / shareTotal));
 const maxCost = Number(ranking[0]?.totalCost || 0);
 const stats=[{label:"Total tokens",value:compact(tokens),hint:"Including cache reads & writes"},{label:"Peak tokens",value:activity?compact(activity.peakHourlyTokens):"—",hint:"Highest hourly usage"},{label:"Longest session",value:activity?duration(activity.longestSessionMs):"—",hint:"Active model time · main sessions"},{label:"Current streak",value:activity?`${activity.currentStreak} ${activity.currentStreak===1?"day":"days"}`:"—",hint:"Active today or yesterday"},{label:"Longest streak",value:activity?`${activity.longestStreak} ${activity.longestStreak===1?"day":"days"}`:"—",hint:"Consecutive active days"}];
 return <>
  <SettingsHeading level="h1" title={title} description={description} action={<Button variant="outline" size="sm" onClick={refresh} disabled={loading}>Refresh</Button>} />
  <div className="usage-dashboard settings-stack">
  <Notice error={error}/><SkeletonReveal loading={loading&&!data} skeleton={<PanelSkeleton panel="usage"/>} label="Loading OMP usage history">
   {total&&<div className="settings-stack">
    <div className="usage-summary settings-card settings-card-flush">{stats.map(s=><div className="usage-summary-cell" key={s.label}><p className="text-xs text-muted-foreground">{s.label}</p><div className="my-3 text-[26px] font-semibold tracking-tight tabular-nums">{s.value}</div><p className="text-[11px] text-muted-foreground">{s.hint}</p></div>)}</div>
    <div className="usage-chart-grid">
     <section className="settings-card"><SettingsHeading title="Usage over time" description={<> {metric==="tokens"?"Tokens by model":metric==="requests"?"Requests by model":"API-equivalent cost by model"} · {trend.daily?"Daily":"Hourly"}</>} action={<SlidingTabs tabs={[{id:"tokens",label:"Tokens"},{id:"requests",label:"Requests"},{id:"cost",label:"Cost"}]} value={metric} onChange={v=>setMetric(v as Metric)} label="Usage metric" controls="usage-chart"/>} />
      <div id="usage-chart" role="tabpanel" aria-label={`${metric} by model over time`} className="h-[260px] w-full">{trend.points.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={trend.points} margin={{left:0,right:8,top:8,bottom:0}}>
      <defs>
        {trend.models.map(m => <linearGradient key={m.id} id={`${gradientId}-${m.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={m.color} stopOpacity={0.72}/>
          <stop offset="100%" stopColor={m.color} stopOpacity={0}/>
        </linearGradient>)}
      </defs>
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5"/><XAxis dataKey="timestamp" tickFormatter={v=>chartDate(v,trend.daily)} tick={{fontSize:10,fill:"var(--muted-foreground)"}} axisLine={false} tickLine={false} minTickGap={42}/><YAxis tick={{fontSize:10,fill:"var(--muted-foreground)"}} axisLine={false} tickLine={false} tickFormatter={v=>metric==="cost"?`$${compact(v)}`:compact(v)} width={48}/><Tooltip cursor={{stroke:"var(--muted-foreground)",strokeOpacity:.25}} content={props=><TrendTooltip {...props} metric={metric} daily={trend.daily}/>}/>{trend.models.map(m=><Area key={m.id} name={m.provider?`${m.model} · ${m.provider}`:m.model} type="monotone" dataKey={m.key} stackId="models" stroke={m.color} fill={`url(#${gradientId}-${m.key})`} fillOpacity={1} strokeWidth={2} isAnimationActive={false}/>)}</AreaChart></ResponsiveContainer>:<div className="grid h-full place-items-center text-sm text-muted-foreground">{data.detailStatus==="unavailable"?"Detailed history is unavailable for this runtime.":"No recorded usage yet."}</div>}</div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">{trend.models.map(m=><span className="inline-flex items-center gap-2 text-xs text-muted-foreground" key={m.id} title={m.provider}><span className="size-2 rounded-full" style={{background:m.color}}/>{m.model}</span>)}</div>
     </section>
     <section className="settings-card"><SettingsHeading title="Model usage" action={<SlidingTabs tabs={[{id:"tokens",label:"Tokens"},{id:"requests",label:"Requests"}]} value={shareMetric} onChange={setShareMetric} label="Model usage metric" controls="model-usage-chart"/>} /><div id="model-usage-chart" role="tabpanel" aria-label={`Model share by ${shareMetric}`} className="relative isolate mb-3 h-[210px]">{shareTotal>0?<><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={shares} dataKey="value" nameKey="model" cx="50%" cy="50%" innerRadius={65} outerRadius={88} stroke="none" isAnimationActive={false} shape={sector => renderModelShareSector(sector, shareAngles)}>{shares.map(m => <Cell key={modelKey(m)} fill={m.color}/>)}</Pie><Tooltip wrapperStyle={{zIndex:1}} content={props=><DonutTooltip {...props} metric={shareMetric}/>}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold tracking-tight tabular-nums">{compact(shareTotal)}</span><span className="mt-1 text-xs text-muted-foreground">{shareMetric}</span></div></>:<div className="grid h-full place-items-center text-sm text-muted-foreground">No recorded usage yet.</div>}</div>
      <ScrollArea className="usage-model-list--share" viewportClassName="usage-model-list-viewport" role="region" aria-label="Model usage breakdown" viewportTabIndex={shares.length > 4 ? 0 : undefined}>
        {shares.map(m=>{
          const share = m.value/shareTotal*100;
          return <div className="flex min-w-0 items-center gap-2.5 text-xs" key={modelKey(m)}>
            <span className="size-2 shrink-0 rounded-full" style={{background:m.color}}/>
            <span className="min-w-0 flex-1 truncate" title={modelKey(m)}>{m.model}</span>
            <span className="tabular-nums text-muted-foreground">{share<.01?"<0.01%":number(share)+"%"}</span>
          </div>;
        })}
      </ScrollArea>
     </section>
    </div>
    <div className="usage-chart-grid">
     <section className="settings-card">
      <SettingsHeading title="Cost by model" action={<span className="text-xs text-muted-foreground">API-equivalent</span>} />
      <ScrollArea className="usage-model-list--cost" viewportClassName="usage-model-list-viewport" role="region" aria-label="Model cost breakdown" viewportTabIndex={ranking.length > 4 ? 0 : undefined}>
        {ranking.map(m=>{
          const cost = Number(m.totalCost || 0);
          return <div key={modelKey(m)} className="flex flex-col justify-center gap-1.5">
            <div className="flex min-w-0 items-center justify-between gap-4 text-xs">
              <span className="flex min-w-0 items-center gap-2"><ProviderIcon provider={m.provider} className="size-4"/><span className="truncate" title={modelKey(m)}>{m.model}</span></span>
              <span className="shrink-0 font-medium tabular-nums">{money(cost)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary/65" role="meter" aria-label={`${m.model} API-equivalent cost`}
              aria-valuemin={0} aria-valuemax={maxCost||1} aria-valuenow={cost} aria-valuetext={money(cost)}>
              <div className="h-full rounded-full" style={{width:`${maxCost?cost/maxCost*100:0}%`,background:colors.get(modelKey(m))}}/>
            </div>
          </div>;
        })}
      </ScrollArea>
     </section>
     <section className="settings-card flex flex-col"><SettingsHeading title="General stats" /><dl className="usage-general-stats">{[["Requests",number(total.totalRequests)],["API-equivalent cost",money(total.totalCost)],["Cache read tokens",compact(total.totalCacheReadTokens)],["Active days",activity?number(activity.activeDays):"—"]].map(([label,value])=><div key={label} className="flex items-center justify-between gap-4 py-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm font-medium tabular-nums">{value}</dd></div>)}</dl></section>
    </div>
    <div className="settings-card settings-card-flush overflow-x-auto"><table className="w-full text-left text-[13px]"><thead className="bg-secondary/50 text-xs text-muted-foreground"><tr>{["Model","Requests","Input","Output","Cached","Cost"].map(h=><th className="p-4 font-medium" key={h}>{h}</th>)}</tr></thead><tbody>{models.map((m:any)=><tr key={modelKey(m)} className="border-t border-border"><td className="p-4"><span className="flex items-center gap-2"><ProviderIcon provider={m.provider}/><span>{m.model}<small className="block text-muted-foreground">{m.provider}</small></span></span></td><td className="p-4 tabular-nums">{number(m.totalRequests)}</td><td className="p-4 tabular-nums">{compact(m.totalInputTokens)}</td><td className="p-4 tabular-nums">{compact(m.totalOutputTokens)}</td><td className="p-4 tabular-nums">{compact(m.totalCacheReadTokens)}</td><td className="p-4 tabular-nums">{money(m.totalCost)}</td></tr>)}</tbody></table></div>
    <UsagePricingCard timeZone={activity?.timeZone || tz} unpricedRequests={total.unpricedRequests} />
   </div>}
  </SkeletonReveal>
  </div>
 </>;
}
