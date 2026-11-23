import {motion,useReducedMotion} from 'motion/react';
import './amicro.css';

/** Adapted Amicro MonoRounded meter/gauge/sparkline treatments. All values come from callers. */
export function MonoMeter({value,max=100,label,valueText}:{value:number;max?:number;label:string;valueText?:string}) {
  const capacity=Number.isFinite(max)&&max>0?max:100;
  const percent=Number.isFinite(value)&&Number.isFinite(max)&&max>0?Math.max(0,Math.min(100,value/max*100)):0;
  return <div className="amicro-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={Math.max(0,Math.min(capacity,Number.isFinite(value)?value:0))} aria-valuetext={valueText}>
    {Array.from({length:28},(_,i)=><span key={i} data-filled={(i+1)/28*100<=percent} style={{opacity:(i+1)/28*100<=percent?1:.12}}/>)}
  </div>;
}

export function MonoGauge({percent,label}:{percent:number;label:string}) {
  const reduced=useReducedMotion(),value=Number.isFinite(percent)?Math.max(0,Math.min(100,percent)):0;
  return <svg viewBox="0 0 100 100" className="amicro-gauge" role="img" aria-label={`${label}: ${value.toFixed(1)}%`}>
    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" opacity=".1"/>
    <motion.circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
      pathLength="100" strokeDasharray="100" initial={false} animate={{strokeDashoffset:100-value}} transition={{duration:reduced?0:.45,ease:[.16,1,.3,1]}} transform="rotate(-90 50 50)"/>
    <text x="50" y="54" textAnchor="middle" fill="currentColor" fontSize="17" fontWeight="600">{Math.round(value)}%</text>
  </svg>;
}

export function MonoSparkline({values,label}:{values:number[];label:string}) {
  const reduced=useReducedMotion(),points=values.filter(Number.isFinite);
  if(points.length<2)return null;
  const min=Math.min(...points),range=Math.max(...points)-min||1;
  const d=points.map((v,i)=>`${i?'L':'M'}${(i/(points.length-1)*116+2).toFixed(2)},${(30-(v-min)/range*26).toFixed(2)}`).join(' ');
  return <svg viewBox="0 0 120 34" className="amicro-sparkline" role="img" aria-label={label}>
    <motion.path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      initial={{pathLength:reduced?1:0,opacity:reduced?1:0}} animate={{pathLength:1,opacity:1}} transition={{duration:reduced?0:.45,ease:[.16,1,.3,1]}}/>
  </svg>;
}
