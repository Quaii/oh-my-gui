import {toolSettingIcon} from "../ToolIcons";
import {useRef,type ComponentType} from "react";
import {motion,useReducedMotion} from "motion/react";
import {useSmoothWheel} from "@/lib/use-smooth-wheel";
import {GraduationCap,ScanLine,Save,Search,Database,Landmark,Target,GitFork,Link2,Unplug,WandSparkles,NotebookPen,Layers2} from "lucide-react";
import { Zap, Gauge, Timer, RotateCcw, Minimize2, Radio, ArrowRightLeft, ListStart, UserRound, Fingerprint, BarChart3, Power, Shield, Globe, Hash, Layers, TextCursorInput, Eye, Volume2 } from "lucide-react";
import { Brand } from "../Brand";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Cpu, ChartNoAxesCombined, MessagesSquare, Workflow, Terminal, Boxes, KeyRound, MousePointer2, Wrench, ListTodo, Sparkles, Puzzle, FileText, Network, Command, Library, Brain, FolderOpen, HardDrive, Palette, SlidersHorizontal, FileCode2, ShieldCheck, Info, ChevronsLeft, ChevronsRight } from "../NavigationIcons";

export const SETTINGS_GROUPS = [
  {section:"Runtime",items:[{id:"runtime",label:"Installation",icon:Cpu},{id:"usage",label:"Usage",icon:ChartNoAxesCombined},{id:"session",label:"Session",icon:MessagesSquare},{id:"routing",label:"Routing",icon:Workflow},{id:"flags",label:"Launch flags",icon:Terminal},{id:"models",label:"Models",icon:Boxes},{id:"providers",label:"Providers",icon:KeyRound}]},
  {section:"Agent",items:[{id:"interaction",label:"Interaction",icon:MousePointer2},{id:"tools",label:"Tools",icon:Wrench},{id:"tasks",label:"Tasks",icon:ListTodo},{id:"skills",label:"Skills",icon:Library},{id:"personas",label:"Personas",icon:Sparkles},{id:"extensions",label:"Extensions",icon:Puzzle},{id:"context-files",label:"Prompts & rules",icon:FileText},{id:"mcp",label:"MCP servers",icon:Network},{id:"commands",label:"Commands",icon:Command},{id:"context",label:"Context",icon:Library},{id:"memory",label:"Memory",icon:Brain},{id:"files",label:"Files",icon:FolderOpen},{id:"shell",label:"Shell",icon:Terminal}]},
  {section:"Interface",items:[{id:"appearance",label:"Appearance",icon:Palette},{id:"all",label:"All settings",icon:SlidersHorizontal},{id:"config",label:"config.yml",icon:FileCode2},{id:"capabilities",label:"Runtime capabilities",icon:ShieldCheck},{id:"about",label:"About & credits",icon:Info}]},
] as const;
export type SettingsPanelId=typeof SETTINGS_GROUPS[number]["items"][number]["id"];
export const SETTINGS_ITEMS=SETTINGS_GROUPS.flatMap(g=>[...g.items]);
export function savedSettingsPanel():SettingsPanelId {const saved=localStorage.getItem("ompfe.settings.panel");return SETTINGS_ITEMS.some(i=>i.id===saved)?saved as SettingsPanelId:"appearance";}

export function SettingsNavigation({panel,onSelect,collapsed,onToggle}:{panel:string;onSelect:(id:SettingsPanelId)=>void;collapsed:boolean;onToggle:()=>void}) {
 const navRef=useRef<HTMLElement|null>(null),reduce=useReducedMotion();useSmoothWheel(navRef,'[data-slot=scroll-area-viewport]');
 return <motion.aside initial={false} animate={{width:collapsed?64:264}} transition={{duration:reduce?0:.26,ease:[.22,1,.36,1]}} className="settings-sidebar hidden h-full shrink-0 overflow-hidden bg-sidebar md:flex md:flex-col" data-collapsed={collapsed}>
  <div className={`settings-brand-row flex h-18 shrink-0 items-center gap-2.5 ${collapsed?"justify-center":"px-5"}`}>
   {collapsed?<Tooltip><TooltipTrigger asChild><button aria-label="Expand settings sidebar" onClick={onToggle} className="group relative grid size-10 shrink-0 place-items-center rounded-xl hover:bg-sidebar-accent"><Brand className="size-7 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"/><ChevronsRight className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"/></button></TooltipTrigger><TooltipContent side="right">Expand sidebar</TooltipContent></Tooltip>:<><Brand className="size-7 shrink-0"/><motion.div initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{duration:reduce?0:.18}} className="min-w-0 flex-1 whitespace-nowrap"><p className="text-[16px] font-semibold">omp<span className="text-primary">.</span></p><p className="mt-0.5 text-[11px] text-muted-foreground">Settings</p></motion.div><Button variant="ghost" size="icon-sm" aria-label="Collapse settings sidebar" onClick={onToggle} className="size-7 shrink-0 text-muted-foreground"><ChevronsLeft className="size-4"/></Button></>}
  </div>
  <nav ref={navRef} className="settings-nav min-h-0 flex-1" aria-label="Settings sections"><ScrollArea className="h-full"><div className={collapsed?"px-2 py-2":"px-3 pb-5 pt-3"}>{SETTINGS_GROUPS.map((group,index)=><div key={group.section} className="settings-nav-group">{collapsed?index>0&&<div className="settings-rail-divider" role="separator" aria-label={group.section}/>:<div className="settings-section-title">{group.section}</div>}{group.items.map(item=>{
   const button=<button key={item.id} aria-label={collapsed?item.label:undefined} aria-current={panel===item.id?"page":undefined} onClick={()=>onSelect(item.id)} className={`settings-nav-item mb-1 flex items-center rounded-lg text-left text-[13px] transition-colors ${collapsed?"mx-auto size-10 justify-center":"ml-3 w-[calc(100%-12px)] gap-2.5 px-3 py-1.5"}`}><item.icon className="size-4 shrink-0" strokeWidth={1.5}/>{!collapsed&&<span className="truncate whitespace-nowrap">{item.label}</span>}</button>;
   return collapsed?<Tooltip key={item.id}><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip>:button;
  })}</div>)}</div></ScrollArea></nav>
 </motion.aside>;
}

export function SettingGlyph({settingKey,type}:{settingKey:string;type:string}){
 const group=settingKey.split(".")[0];
 const key=settingKey.toLowerCase().replace(/[^a-z0-9]/g,"");
 const rules:[RegExp,ComponentType<any>][]=[[/thinking|reasoning|effort/,Brain],[/fastmode/,Zap],[/slowmode|speed/,Gauge],[/timeout|runtime|delay|interval/,Timer],[/retry|rescan|refresh/,RotateCcw],[/compact|summari/,Minimize2],[/steer|interrupt/,ArrowRightLeft],[/followup|queue/,ListStart],[/stream/,Radio],[/model/,Boxes],[/sessionid/,Fingerprint],[/name|identity|persona/,UserRound],[/usage|cost|tokens/,BarChart3],[/approval|permission|safe/,Shield],[/url|endpoint|network|proxy/,Globe],[/max|min|limit|count|size|depth/,Gauge],[/font|text|prompt/,TextCursorInput],[/visible|display|show|hide/,Eye],[/audio|speech|voice/,Volume2],[/scope|layer/,Layers]];
 const icons:Record<string,ComponentType<any>>={task:ListTodo,skills:Library,memory:Brain,mcp:Network,providers:KeyRound,provider:KeyRound,models:Boxes,modelRoles:Boxes,modelPresets:Boxes,shell:Terminal,bash:Terminal,tools:Wrench,read:FileText,write:FileText,edit:FileCode2,files:FolderOpen,appearance:Palette,context:Library,interaction:MousePointer2,extensions:Puzzle,thinking:Brain};
 const memoryIcons:Record<string,ComponentType<any>>={"autolearn.enabled":GraduationCap,"autolearn.autoContinue":ScanLine,"memory.backend":Database,"mnemopi.dbPath":HardDrive,"mnemopi.bank":Landmark,"mnemopi.scoping":Target,"mnemopi.embeddingVariant":Layers2,"mnemopi.autoRecall":Search,"mnemopi.autoRetain":Save,"mnemopi.polyphonicRecall":GitFork,"mnemopi.enhancedRecall":WandSparkles,"mnemopi.proactiveLinking":Link2,"mnemopi.noEmbeddings":Unplug,"hindsight.apiToken":KeyRound,"hindsight.bankId":Landmark,"hindsight.scoping":Target,"hindsight.globalScope":Globe,"hindsight.autoRecall":Search,"hindsight.autoRetain":Save,"hindsight.retainMode":NotebookPen,"hindsight.mentalModelsEnabled":Brain,"hindsight.mentalModelAutoSeed":Sparkles};
 const Icon=toolSettingIcon(settingKey) || memoryIcons[settingKey] || rules.find(([pattern])=>pattern.test(key))?.[1] || icons[group] || (type==="number"?Hash:SlidersHorizontal);
 return <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5}/>;
}
