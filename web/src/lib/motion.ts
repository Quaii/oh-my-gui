import {startTransition,addTransitionType} from 'react';
import {isDesktopHost} from './desktop';
export function transitionUpdate(update:()=>void,type='tk-forward'){if(isDesktopHost()||typeof window==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches){update();return;}startTransition(()=>{addTransitionType(type);update();});}
