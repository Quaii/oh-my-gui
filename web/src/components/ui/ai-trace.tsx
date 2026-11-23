import {Trace,TraceLine,TraceIcon,TraceTitle,TraceCollapsible,TraceCollapsibleTrigger,TraceCollapsibleContent} from "./trace";
// Adapted from the user-supplied shadcn.io Reasoning and Terminal patterns.
// The disclosure uses this app's shadcn/Radix primitives.
import { Markdown } from "../Markdown";
import { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import CodeBlock from "./code-block";
export function TraceRow({title,running,children,icon,error,compact}:{title:string;running?:boolean;error?:boolean;children?:React.ReactNode;icon?:React.ReactNode;compact?:boolean}) {
 const [chosen,setChosen]=useState<boolean|undefined>(); const open=chosen??(!!running&&!compact);
 return <Trace className="ai-trace"><TraceCollapsible open={open} onOpenChange={setChosen}><TraceCollapsibleTrigger className={compact?"min-h-6 py-0.5 text-[13px]":"min-h-8 py-1 text-[13px]"}><TraceLine status={error?"error":running?"running":undefined}>{icon&&<TraceIcon>{icon}</TraceIcon>}<TraceTitle>{title}</TraceTitle></TraceLine></TraceCollapsibleTrigger><TraceCollapsibleContent className="text-[13px]">{children}</TraceCollapsibleContent></TraceCollapsible></Trace>;
}
export function Reasoning({text,running,compact}:{text:string;running:boolean;compact?:boolean}){if(!text.trim())return null;return <TraceRow title={running&&!compact?"Thinking":"Thought"} running={running} compact={compact}><Markdown text={text}/></TraceRow>}
export function TerminalCommand({command,output,running,exitCode,isError}:{command:string;output:string;running:boolean;exitCode?:number;isError?:boolean}){return <TraceRow running={running} error={isError||!!exitCode} title={running?`Running ${command}`:isError||exitCode?`${command} exited${exitCode!==undefined?` with code ${exitCode}`:" with an error"}`:`Ran ${command}`} icon={<Terminal className="size-3.5 shrink-0"/>}><CodeBlock code={output || (running?"Waiting for output…":"No output")} language="bash" showLineNumbers={false} className="max-h-80 overflow-auto"/></TraceRow>}
