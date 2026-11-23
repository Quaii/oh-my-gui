import {searchSiteLabel,webSources}from"../lib/web-sources";
import {CommitResult,TestResult,StackTrace,LocalWebPreview} from "./ToolPatterns";
import {PackageInfo} from "./ui/package-info";
import {packageChanges,testSummary} from "../lib/tool-presentation";
import { TerminalCommand, TraceRow } from "@/components/ui/ai-trace";
import { useMemo, useState } from "react";
import CodeBlock from "@/components/ui/code-block";
import { WebSearch, type WebSource } from "@/components/ui/web-search";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, FilePenLine, FilePlus2, Terminal, Search, FolderSearch, Network, ListTodo, Globe, Code2, Wrench, Timer, MessageCircle } from "lucide-react";
import { GridReveal } from "@/components/ui/grid-reveal";

export interface ToolRunView {
  id: string;
  name: string;
  args: any;
  startedAt?: number;
  endedAt?: number;
  result?: any;
  partial?: any;
  isError?: boolean;
  durationMs?: number;
}

export {ToolIcon} from "./ToolIcons";
import {ToolIcon} from "./ToolIcons";

export function resultText(result: any): string {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (Array.isArray(result.content)) {
    const parts = result.content
      .map((c: any) => (c?.type === "text" ? c.text : c?.type === "image" ? "[image]" : ""))
      .filter(Boolean);
    if (parts.length) return parts.join("\n");
  }
  if (typeof result.output === "string") return result.output;
  if (typeof result.stdout === "string") return result.stdout + (result.stderr ? "\n" + result.stderr : "");
  if (typeof result.text === "string") return result.text;
  try {
    return JSON.stringify(result.details ?? result, null, 2);
  } catch {
    return String(result);
  }
}

function shorten(s: string, n = 120) {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n) + "…" : flat;
}

export function argsSummary(name: string, args: any): string {
  if (!args || typeof args !== "object") return "";
  switch (name) {
    case "bash":
    case "powershell":
      return shorten(String(args.command ?? ""), 160);
    case "read":
    case "write":
    case "edit":
    case "ast_edit":
      return shorten(String(args.path ?? args.file_path ?? args.file ?? ""), 120);
    case "grep":
      return shorten(`/${args.pattern ?? ""}/${args.path ? " in " + args.path : ""}`, 120);
    case "glob":
      return shorten(String(args.pattern ?? ""), 120);
    case "task":
      return shorten(String(args.description ?? args.prompt ?? args.task ?? ""), 140);
    case "web_search":
      return shorten(String(args.query ?? ""), 140);
    case "eval":
      return shorten(String(args.language ?? "code"), 40);
    default: {
      const first = Object.entries(args).find(([, v]) => typeof v === "string");
      return first ? shorten(String(first[1]), 120) : "";
    }
  }
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const removed = String(oldText ?? "").split("\n");
  const added = String(newText ?? "").split("\n");
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-ink-950 font-mono text-[11.5px] leading-[1.6]">
      {removed.map((line, i) => (
        <div key={"r" + i} className="whitespace-pre bg-rose-500/10 px-3 text-rose-300/90">
          <span className="mr-2 select-none opacity-50">-</span>
          {line || " "}
        </div>
      ))}
      {added.map((line, i) => (
        <div key={"a" + i} className="whitespace-pre bg-emerald-500/10 px-3 text-emerald-300/90">
          <span className="mr-2 select-none opacity-50">+</span>
          {line || " "}
        </div>
      ))}
    </div>
  );
}

export function ToolCard({run}:{run:ToolRunView}){
  const running=run.endedAt===undefined&&!run.result;
  const text=useMemo(()=>resultText(run.result??run.partial),[run.result,run.partial]);
  const args=run.args || {};
  const isShell=run.name==="bash"||run.name==="powershell";
  const isEdit=run.name==="edit"||run.name==="ast_edit";
  const isSearch=/(^|_)web_search$/.test(run.name);
  const sources=useMemo(()=>isSearch?webSources(run.result??run.partial):[],[isSearch,run.result,run.partial]);
  const packages=!running&&!run.isError?packageChanges(String(args.path??args.file_path??""),args):[];
  if(isShell)return <div className="space-y-3">{!running&&!run.isError&&<CommitResult command={String(args.command||"")} output={text}/>}<LocalWebPreview text={text}/>{!running&&testSummary(text)?<TestResult output={text}/>:<TerminalCommand command={String(args.command || "Shell command")} output={text} running={running} isError={run.isError} exitCode={run.result?.details?.exitCode ?? run.result?.exitCode}/>}</div>;
  if(run.isError)return <StackTrace output={text||"Tool execution failed"}/>;
  const title=`${run.name} · ${argsSummary(run.name,args)}${run.isError?" · failed":""}`;
  const images=(run.result?.content || []).filter((b:any)=>b.type==="image"&&b.data);
  return <div className="space-y-3">{packages.map(p=><PackageInfo key={p.group+"/"+p.name} {...p}/>)}{isSearch&&!run.isError&&<WebSearch sources={sources} label={running?undefined:searchSiteLabel(sources)} status={running?"searching":"done"} query={String(args.query ?? args.search_query ?? "")}/>}<TraceRow title={title} running={running} icon={<ToolIcon name={run.name}/>}><div className="space-y-3">{isEdit&&(args.oldText||args.newText||args.old_string||args.new_string)&&<DiffView oldText={args.oldText ?? args.old_string ?? ""} newText={args.newText ?? args.new_string ?? ""}/>}<details><summary className="cursor-pointer py-1 text-xs text-muted-foreground">Tool input</summary><CodeBlock code={JSON.stringify(args,null,2)} language="json" className="mt-2 max-h-64 overflow-auto"/></details>{text?<CodeBlock code={text} language="text" className="max-h-[420px] overflow-auto"/>:running?<p className="text-xs text-muted-foreground">Waiting for output…</p>:<p className="text-xs text-muted-foreground">Completed without text output.</p>}{images.map((img:any,i:number)=><GridReveal key={i} src={`data:${img.mimeType || "image/png"};base64,${img.data}`} alt="Generated image" aspect={16/10}/>)}</div></TraceRow></div>;
}
