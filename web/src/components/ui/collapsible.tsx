import {useState,type ComponentProps} from 'react';
import {Collapsible as Primitive} from 'radix-ui';
import {LayoutMotion} from '../transitions/WorkspaceMotion';
import {transitionUpdate} from '../../lib/motion';
/** transition-kit accordion motion with the existing Radix disclosure API. */
function Collapsible({open:controlled,defaultOpen=false,onOpenChange,...props}:ComponentProps<typeof Primitive.Root>){const [local,setLocal]=useState(defaultOpen);return <LayoutMotion><Primitive.Root data-slot="collapsible" {...props} open={controlled??local} onOpenChange={open=>transitionUpdate(()=>{setLocal(open);onOpenChange?.(open);})}/></LayoutMotion>;}
function CollapsibleTrigger(props:ComponentProps<typeof Primitive.Trigger>){return <Primitive.Trigger data-slot="collapsible-trigger" {...props}/>;}
function CollapsibleContent(props:ComponentProps<typeof Primitive.Content>){return <Primitive.Content data-slot="collapsible-content" {...props}/>;}
export {Collapsible,CollapsibleTrigger,CollapsibleContent};
export function CollapsibleIndicator({className,...props}:ComponentProps<'span'>){return <span aria-hidden="true" className={className} {...props}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16"><path d="m6 9 6 6 6-6"/></svg></span>;}
