"use client"
import * as React from 'react';
import {motion,useMotionValue,useSpring,useTransform,useReducedMotion} from 'motion/react';
import {Switch as SwitchPrimitive} from 'radix-ui';
import {cn} from 'cn';
import {buildBlobPath} from '../../lib/liquid-toggle';

/** User-supplied Amicro liquid morph; retain Radix switch semantics and form integration. */
function LiquidThumb({checked,small}:{checked:boolean;small:boolean}) {
 const reduced=useReducedMotion(),id=React.useId().replaceAll(':','');
 const width=small?32:44,height=small?18:24;
 const progress=useMotionValue(checked?1:0),position=useSpring(progress,{stiffness:280,damping:24,mass:.55});
 const stretch=useSpring(0,{stiffness:240,damping:18,mass:.4});
 React.useEffect(()=>{progress.set(checked?1:0);},[checked,progress]);
 React.useEffect(()=>{
   if(reduced){position.jump(checked?1:0);stretch.jump(0);return;}
   let previous=position.get();
   const changed=position.on('change',latest=>{stretch.set(Math.min(1,Math.abs(latest-previous)*6));previous=latest;});
   const settled=position.on('animationComplete',()=>stretch.set(0));
   return()=>{changed();settled();};
 },[position,stretch,reduced,checked]);
 const path=useTransform([position,stretch],([t,s])=>buildBlobPath(width,height,t as number,s as number));
 return <svg data-slot="liquid-switch-thumb" width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="pointer-events-none absolute inset-0">
   <defs><radialGradient id={id} cx=".35" cy=".35" r=".85"><stop offset="0%" stopColor="currentColor"/><stop offset="100%" stopColor="currentColor" stopOpacity=".75"/></radialGradient></defs>
   <motion.path d={reduced?buildBlobPath(width,height,checked?1:0,0):path} fill={`url(#${id})`}/>
 </svg>;
}
function Switch({className,size='default',checked:controlled,defaultChecked=false,onCheckedChange,...props}:React.ComponentProps<typeof SwitchPrimitive.Root>&{size?:'sm'|'default'}) {
 const [local,setLocal]=React.useState(defaultChecked);
 const checked=controlled??local;
 return <SwitchPrimitive.Root data-slot="switch" data-size={size} {...props} checked={checked}
   onCheckedChange={next=>{if(controlled===undefined)setLocal(next);onCheckedChange?.(next);}}
   className={cn('relative inline-flex shrink-0 items-center rounded-full border border-transparent outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-[18px] data-[size=sm]:w-8 bg-input/70 text-muted-foreground data-[state=checked]:bg-primary/20 data-[state=checked]:text-primary',className)}>
   <LiquidThumb checked={checked} small={size==='sm'}/>
 </SwitchPrimitive.Root>;
}
export {Switch};
