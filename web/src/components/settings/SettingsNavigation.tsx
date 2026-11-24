import {LayoutMotion} from "../transitions/WorkspaceMotion";
import {useEffect, useRef, useState} from "react";
import {useSmoothWheel} from "@/lib/use-smooth-wheel";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Brand } from "../Brand";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Cpu, ChartNoAxesCombined, MessagesSquare, Workflow, Terminal, Boxes, KeyRound, MousePointer2, Wrench, ListTodo, Sparkles, Puzzle, FileText, Network, Command, Library, Brain, FolderOpen, Palette, SlidersHorizontal, FileCode2, ShieldCheck, Info, ChevronsLeft, ChevronsRight, ChevronRight } from "../NavigationIcons";

const advanced = {
  section: "Advanced", items: [
    { id: "native", label: "Runtime maintenance", icon: Command },
    { id: "all", label: "All settings", icon: SlidersHorizontal },
    { id: "config", label: "config.yml", icon: FileCode2 },
    { id: "capabilities", label: "Runtime capabilities", icon: ShieldCheck },
  ],
} as const;

export const SETTINGS_GROUPS = [
  { section: "Application", items: [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "usage", label: "Usage", icon: ChartNoAxesCombined },
  ] },
  { section: "Models & providers", items: [
    { id: "models", label: "Models", icon: Boxes },
    { id: "providers", label: "Providers", icon: KeyRound },
    { id: "routing", label: "Routing", icon: Workflow },
  ] },
  { section: "Agent", items: [
    { id: "session", label: "Session", icon: MessagesSquare },
    { id: "interaction", label: "Interaction", icon: MousePointer2 },
    { id: "tools", label: "Tools", icon: Wrench },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "commands", label: "Commands", icon: Command },
    { id: "context", label: "Context", icon: Library },
    { id: "memory", label: "Memory", icon: Brain },
    { id: "files", label: "Files", icon: FolderOpen },
    { id: "shell", label: "Shell", icon: Terminal },
  ] },
  { section: "Customize the agent", items: [
    { id: "skills", label: "Skills", icon: Library },
    { id: "personas", label: "Personas", icon: Sparkles },
    { id: "context-files", label: "Prompts & rules", icon: FileText },
    { id: "extensions", label: "Extensions", icon: Puzzle },
    { id: "mcp", label: "MCP servers", icon: Network },
  ] },
  { section: "System", items: [
    { id: "runtime", label: "Installation", icon: Cpu },
    { id: "updates", label: "Updates & changelog", icon: RotateCcw },
    { id: "about", label: "About & credits", icon: Info },
  ] },
  advanced,
] as const;
type PanelItem = (typeof SETTINGS_GROUPS)[number]["items"][number];
export type SettingsPanelId = PanelItem["id"] | "flags";
export const SETTINGS_ITEMS=SETTINGS_GROUPS.flatMap(g=>[...g.items]);
export function savedSettingsPanel():SettingsPanelId {
  const saved = localStorage.getItem("ompfe.settings.panel");
  if (saved === "flags") return "runtime";
  return SETTINGS_ITEMS.some(i => i.id === saved) ? saved as SettingsPanelId : "appearance";
}

type SettingsSelection = { panel: SettingsPanelId; onSelect: (id: SettingsPanelId) => void; locked?: boolean };
export function SettingsMobileNavigation({ panel, onSelect, locked }: SettingsSelection) {
  const item = (entry: PanelItem) => (
    <DropdownMenuItem key={entry.id} aria-current={panel === entry.id ? "page" : undefined} onSelect={() => onSelect(entry.id)}>
      <entry.icon className="size-4" />{entry.label}
    </DropdownMenuItem>
  );
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" aria-label="Settings sections" disabled={locked} className="max-w-[38vw]">
        <span className="truncate">{SETTINGS_ITEMS.find(entry => entry.id === panel)?.label ?? "Settings"}</span>
        <ChevronRight className="size-3 rotate-90" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto">
      {SETTINGS_GROUPS.map(group => group.section === "Advanced"
        ? <DropdownMenuSub key={group.section}>
          <DropdownMenuSubTrigger>Advanced</DropdownMenuSubTrigger>
          <DropdownMenuPortal><DropdownMenuSubContent>{group.items.map(item)}</DropdownMenuSubContent></DropdownMenuPortal>
        </DropdownMenuSub>
        : <DropdownMenuGroup key={group.section}>
          <DropdownMenuLabel>{group.section}</DropdownMenuLabel>
          {group.items.map(item)}
        </DropdownMenuGroup>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}

export function SettingsNavigation({panel,onSelect,collapsed,onToggle,onBack,locked}: SettingsSelection & {collapsed:boolean;onToggle:()=>void;onBack:()=>void}) {
 const navRef=useRef<HTMLElement|null>(null);useSmoothWheel(navRef,'[data-slot=scroll-area-viewport]');
 const [advancedOpen, setAdvancedOpen] = useState(false);
 useEffect(() => { setAdvancedOpen(false); }, [panel]);

 function renderItem(item: PanelItem) {
   const button=<button key={item.id} aria-label={collapsed?item.label:undefined} aria-current={panel===item.id?"page":undefined} disabled={locked && panel!==item.id} onClick={()=>onSelect(item.id)} className={`settings-nav-item flex items-center rounded-lg text-left text-[13px] transition-colors disabled:opacity-55 ${collapsed?"mx-auto size-10 justify-center":"ml-3 w-[calc(100%-12px)] gap-2.5 px-3 py-1.5"}`}><item.icon className="size-4 shrink-0" strokeWidth={1.5}/>{!collapsed&&<span className="truncate whitespace-nowrap">{item.label}</span>}</button>;
   return collapsed?<Tooltip key={item.id}><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip>:button;
 }
 const back = <Button variant="ghost" size={collapsed ? "icon" : "sm"} aria-label="Back to workspace" onClick={onBack} disabled={locked}
   className={collapsed ? "mx-auto text-muted-foreground" : "w-full justify-start text-muted-foreground"}>
   <ArrowLeft className="size-4" />{!collapsed && "Back to workspace"}
 </Button>;
 return <LayoutMotion><aside style={{width:collapsed?64:264}} className="settings-sidebar hidden h-full shrink-0 overflow-hidden bg-sidebar md:flex md:flex-col" data-collapsed={collapsed}>
  <div inert={locked} className={`settings-brand-row flex h-18 shrink-0 items-center gap-2.5 ${collapsed?"justify-center":"px-5"}`}>
   {collapsed?<Tooltip><TooltipTrigger asChild><button aria-label="Expand settings sidebar" onClick={onToggle} className="group relative grid size-10 shrink-0 place-items-center rounded-xl hover:bg-sidebar-accent"><Brand className="size-7 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"/><ChevronsRight className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"/></button></TooltipTrigger><TooltipContent side="right">Expand sidebar</TooltipContent></Tooltip>:<><Brand className="size-7 shrink-0"/><div className="min-w-0 flex-1 whitespace-nowrap"><p className="text-[16px] font-semibold">omp<span className="text-primary">.</span></p><p className="mt-0.5 text-[11px] text-muted-foreground">Settings</p></div><Button variant="ghost" size="icon-sm" aria-label="Collapse settings sidebar" onClick={onToggle} className="size-7 shrink-0 text-muted-foreground"><ChevronsLeft className="size-4"/></Button></>}
  </div>
  <div className={`flex shrink-0 ${collapsed ? "px-2" : "px-3"}`}>
    {collapsed ? <Tooltip><TooltipTrigger asChild>{back}</TooltipTrigger><TooltipContent side="right">Back to workspace</TooltipContent></Tooltip> : back}
  </div>
  <nav ref={locked ? undefined : navRef} className="settings-nav min-h-0 flex-1" aria-label="Settings sections">
    <ScrollArea className="h-full">
      <div className={collapsed?"px-2 py-2":"px-3 pb-5 pt-3"}>
        {SETTINGS_GROUPS.map((group, index) => <div key={group.section} className="settings-nav-group">
          {collapsed && index > 0 && <div className="settings-rail-divider" role="separator" aria-label={group.section} />}
          {group.section === "Advanced" ? (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger aria-label="Advanced" disabled={locked} className={`settings-nav-item settings-advanced-trigger flex items-center rounded-lg text-left ${collapsed ? "mx-auto size-10 justify-center" : "justify-between"}`}>
                    {collapsed ? <SlidersHorizontal className="size-4" /> : <>
                      <span>Advanced</span>
                      <ChevronRight className="size-4 transition-transform motion-reduce:transition-none" />
                    </>}
                  </CollapsibleTrigger>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">Advanced</TooltipContent>}
              </Tooltip>
              <CollapsibleContent>{group.items.map(renderItem)}</CollapsibleContent>
            </Collapsible>
          ) : <>
            {!collapsed && <div className="settings-section-title">{group.section}</div>}
            {group.items.map(renderItem)}
          </>}
        </div>)}
      </div>
    </ScrollArea>
  </nav>
 </aside></LayoutMotion>;
}
