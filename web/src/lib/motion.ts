import {startTransition,addTransitionType} from 'react';
export function transitionUpdate(update:()=>void,type='tk-forward'){if(typeof window==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches){update();return;}startTransition(()=>{addTransitionType(type);update();});}
