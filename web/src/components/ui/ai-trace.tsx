import {Trace,TraceLine,TraceIcon,TraceTitle,TraceCollapsible,TraceCollapsibleTrigger,TraceCollapsibleContent} from "./trace";
// Adapted from the user-supplied shadcn.io Reasoning and Terminal patterns.
// The disclosure uses this app's shadcn/Radix primitives.
import { Markdown } from "../Markdown";
import { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import CodeBlock from "./code-block";
export function TraceRow({title,running,children,icon,error}:{title:string;running?:boolean;error?:boolean;children?:React.ReactNode;icon?:React.ReactNode}) {
 const [chosen,setChosen]=useState<boolean|undefined>(); const open=chosen??!!running;
 return <Trace className="ai-trace"><TraceCollapsible open={open} onOpenChange={setChosen}><TraceCollapsibleTrigger className="min-h-8 py-1 text-[13px]"><TraceLine status={error?"error":running?"running":undefined}>{icon&&<TraceIcon>{icon}</TraceIcon>}<TraceTitle>{title}</TraceTitle></TraceLine></TraceCollapsibleTrigger><TraceCollapsibleContent className="text-[13px]">{children}</TraceCollapsibleContent></TraceCollapsible></Trace>;
}
export function Reasoning({text,running}:{text:string;running:boolean}){if(!text.trim())return null;return <TraceRow title="Thought" running={running}><Markdown text={text}/></TraceRow>}
export function TerminalCommand({command,output,running,exitCode,isError}:{command:string;output:string;running:boolean;exitCode?:number;isError?:boolean}){return <TraceRow running={running} error={isError||!!exitCode} title={running?`Running ${command}`:isError||exitCode?`${command} exited${exitCode!==undefined?` with code ${exitCode}`:" with an error"}`:`Ran ${command}`} icon={<Terminal className="size-3.5 shrink-0"/>}><CodeBlock code={output || (running?"Waiting for output…":"No output")} language="bash" showLineNumbers={false} className="max-h-80 overflow-auto"/></TraceRow>}
