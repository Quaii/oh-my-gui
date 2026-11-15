import { useEffect,type RefObject } from "react";

/** Ease discrete mouse-wheel steps; leave high-resolution trackpads and touch native. */
export function useSmoothWheel(ref:RefObject<HTMLElement|null>,selector?:string,resetKey?:unknown) {
 useEffect(()=>{
  const root=ref.current,el=selector?root?.querySelector<HTMLElement>(selector):root;if(!el)return;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");let frame=0,target=0,last=0;
  const stop=()=>{cancelAnimationFrame(frame);frame=0;};
  const tick=(time:number)=>{const dt=Math.min(40,time-last||16);last=time;const next=el.scrollTop+(target-el.scrollTop)*(1-Math.exp(-dt/55));el.scrollTo({top:next,behavior:"instant"});if(Math.abs(target-el.scrollTop)>.5)frame=requestAnimationFrame(tick);else{el.scrollTo({top:target,behavior:"instant"});frame=0;}};
  const wheel=(e:WheelEvent)=>{
   if(e.ctrlKey||e.shiftKey||e.deltaX||reduced.matches)return;
   const discrete=e.deltaMode===1||(e.deltaMode===0&&Math.abs(e.deltaY)>=50&&Number.isInteger(e.deltaY));
   if(!discrete){stop();return;}
   const max=el.scrollHeight-el.clientHeight,delta=e.deltaY*(e.deltaMode===1?18:1),next=Math.max(0,Math.min(max,(frame?target:el.scrollTop)+delta));
   if(max<=0||next===(frame?target:el.scrollTop))return;
   e.preventDefault();target=next;if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}
  };
  el.addEventListener("wheel",wheel,{passive:false});el.addEventListener("pointerdown",stop);el.addEventListener("keydown",stop);
  return()=>{stop();el.removeEventListener("wheel",wheel);el.removeEventListener("pointerdown",stop);el.removeEventListener("keydown",stop);};
 },[ref,selector,resetKey]);
}
