import {LayoutMotion} from "../transitions/WorkspaceMotion";
import {useRef} from "react";
import {useSmoothWheel} from "@/lib/use-smooth-wheel";
import { RotateCcw } from "lucide-react";
import { Brand } from "../Brand";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Cpu, ChartNoAxesCombined, MessagesSquare, Workflow, Terminal, Boxes, KeyRound, MousePointer2, Wrench, ListTodo, Sparkles, Puzzle, FileText, Network, Command, Library, Brain, FolderOpen, Palette, SlidersHorizontal, FileCode2, ShieldCheck, Info, ChevronsLeft, ChevronsRight } from "../NavigationIcons";

export const SETTINGS_GROUPS = [
  {section:"Runtime",items:[{id:"runtime",label:"Installation",icon:Cpu},{id:"usage",label:"Usage",icon:ChartNoAxesCombined},{id:"session",label:"Session",icon:MessagesSquare},{id:"routing",label:"Routing",icon:Workflow},{id:"models",label:"Models",icon:Boxes},{id:"providers",label:"Providers",icon:KeyRound}]},
  {section:"Agent",items:[{id:"interaction",label:"Interaction",icon:MousePointer2},{id:"tools",label:"Tools",icon:Wrench},{id:"tasks",label:"Tasks",icon:ListTodo},{id:"skills",label:"Skills",icon:Library},{id:"personas",label:"Personas",icon:Sparkles},{id:"extensions",label:"Extensions",icon:Puzzle},{id:"context-files",label:"Prompts & rules",icon:FileText},{id:"mcp",label:"MCP servers",icon:Network},{id:"commands",label:"Commands",icon:Command},{id:"context",label:"Context",icon:Library},{id:"memory",label:"Memory",icon:Brain},{id:"files",label:"Files",icon:FolderOpen},{id:"shell",label:"Shell",icon:Terminal}]},
  {section:"Advanced",items:[{id:"flags",label:"Launch configuration",icon:Terminal},{id:"native",label:"Runtime maintenance",icon:Command}]},
  {section:"Interface",items:[{id:"appearance",label:"Appearance",icon:Palette},{id:"all",label:"All settings",icon:SlidersHorizontal},{id:"config",label:"config.yml",icon:FileCode2},{id:"capabilities",label:"Runtime capabilities",icon:ShieldCheck},{id:"updates",label:"Updates & changelog",icon:RotateCcw},{id:"about",label:"About & credits",icon:Info}]},
] as const;
export type SettingsPanelId=typeof SETTINGS_GROUPS[number]["items"][number]["id"];
export const SETTINGS_ITEMS=SETTINGS_GROUPS.flatMap(g=>[...g.items]);
export function savedSettingsPanel():SettingsPanelId {const saved=localStorage.getItem("ompfe.settings.panel");return SETTINGS_ITEMS.some(i=>i.id===saved)?saved as SettingsPanelId:"appearance";}

export function SettingsNavigation({panel,onSelect,collapsed,onToggle}:{panel:string;onSelect:(id:SettingsPanelId)=>void;collapsed:boolean;onToggle:()=>void}) {
 const navRef=useRef<HTMLElement|null>(null);useSmoothWheel(navRef,'[data-slot=scroll-area-viewport]');
 return <LayoutMotion><aside style={{width:collapsed?64:264}} className="settings-sidebar hidden h-full shrink-0 overflow-hidden bg-sidebar md:flex md:flex-col" data-collapsed={collapsed}>
  <div className={`settings-brand-row flex h-18 shrink-0 items-center gap-2.5 ${collapsed?"justify-center":"px-5"}`}>
   {collapsed?<Tooltip><TooltipTrigger asChild><button aria-label="Expand settings sidebar" onClick={onToggle} className="group relative grid size-10 shrink-0 place-items-center rounded-xl hover:bg-sidebar-accent"><Brand className="size-7 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"/><ChevronsRight className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"/></button></TooltipTrigger><TooltipContent side="right">Expand sidebar</TooltipContent></Tooltip>:<><Brand className="size-7 shrink-0"/><div className="min-w-0 flex-1 whitespace-nowrap"><p className="text-[16px] font-semibold">omp<span className="text-primary">.</span></p><p className="mt-0.5 text-[11px] text-muted-foreground">Settings</p></div><Button variant="ghost" size="icon-sm" aria-label="Collapse settings sidebar" onClick={onToggle} className="size-7 shrink-0 text-muted-foreground"><ChevronsLeft className="size-4"/></Button></>}
  </div>
  <nav ref={navRef} className="settings-nav min-h-0 flex-1" aria-label="Settings sections"><ScrollArea className="h-full"><div className={collapsed?"px-2 py-2":"px-3 pb-5 pt-3"}>{SETTINGS_GROUPS.map((group,index)=><div key={group.section} className="settings-nav-group">{collapsed?index>0&&<div className="settings-rail-divider" role="separator" aria-label={group.section}/>:<div className="settings-section-title">{group.section}</div>}{group.items.filter(item=>item.id!=="flags").map(item=>{
   const button=<button key={item.id} aria-label={collapsed?item.label:undefined} aria-current={panel===item.id?"page":undefined} onClick={()=>onSelect(item.id)} className={`settings-nav-item mb-1 flex items-center rounded-lg text-left text-[13px] transition-colors ${collapsed?"mx-auto size-10 justify-center":"ml-3 w-[calc(100%-12px)] gap-2.5 px-3 py-1.5"}`}><item.icon className="size-4 shrink-0" strokeWidth={1.5}/>{!collapsed&&<span className="truncate whitespace-nowrap">{item.label}</span>}</button>;
   return collapsed?<Tooltip key={item.id}><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip>:button;
  })}</div>)}</div></ScrollArea></nav>
 </aside></LayoutMotion>;
}
