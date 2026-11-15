import type {ReactNode} from 'react';
import {Tabs,TabsList,TabsTrigger} from '../transitions/tabs';
/** Shared transition-kit selection motion, retaining the workspace tab contract. */
export function SlidingTabs({tabs,value,onChange,label,controls}:{tabs:{id:string;label:string;icon?:ReactNode}[];value:string;onChange:(id:string)=>void;label:string;controls:string}){return <Tabs value={value} onValueChange={onChange} className="workspace-selection-tabs"><TabsList className="sliding-tabs" aria-label={label}>{tabs.map(tab=><TabsTrigger key={tab.id} value={tab.id} id={'idea-tab-'+tab.id} aria-controls={controls}>{tab.icon}{tab.label}</TabsTrigger>)}</TabsList></Tabs>;}
