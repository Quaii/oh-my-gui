import {motion,useReducedMotion} from 'motion/react';
import type {ReactNode} from 'react';
import {DesktopWindowControls,dragDesktopWindow,hasCustomChrome} from "./DesktopWindowControls";
import {LogOut,FolderOpen} from 'lucide-react';
import {ToolbarBlur} from './ToolbarBlur';
import {PlanUsageMenu} from './PlanUsageMenu';
import {shortcutLabel} from '../lib/platform';
import {Button} from '@/components/ui/button';
import {Tooltip,TooltipContent,TooltipTrigger} from '@/components/ui/tooltip';
import {Activity,Menu,ChevronRight,Folder} from './NavigationIcons';
function ToolbarSlot({ shown, width, children }: { shown: boolean; width: number; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className="workspace-toolbar-slot"
      aria-hidden={!shown}
      inert={!shown}
      initial={false}
      animate={{
        width: shown ? width : 0,
        marginLeft: shown ? 8 : 0,
        opacity: shown ? 1 : 0,
        overflow: 'clip',
        transitionEnd: { overflow: shown ? 'visible' : 'clip' },
      }}
      transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex shrink-0" style={{ width }}>{children}</div>
    </motion.div>
  );
}
export interface TopBarProps {showWindowControls?:boolean;title:string;onOpenFiles?:()=>void;filesOpen?:boolean;showWorkspaceCards?:boolean;inProject?:boolean;onLeaveProject?:()=>void;cwd?:string;connected?:boolean;chatKey?:string;modelId?:string;provider?:string;running:boolean;notice?:string|null;contextPercent?:number;railOpen:boolean;onOpenSidebar:()=>void;onToggleRail:()=>void;inspector?:React.ReactNode;}
export function TopBar(p:TopBarProps){return <header onMouseDown={dragDesktopWindow} className="workspace-header relative z-20 flex shrink-0 items-center"><ToolbarBlur/><Button variant="ghost" size="icon" aria-label="Open navigation" onClick={p.onOpenSidebar} className="floating-toolbar-button size-9 text-muted-foreground md:hidden"><Menu className="size-4"/></Button><div className="workspace-breadcrumb flex min-w-0 items-center gap-2 text-[13px]">
    {p.inProject && <>
      <Folder className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
      <span className="hidden max-w-36 truncate text-muted-foreground sm:block">
        {p.cwd?.split(/[\\/]/).filter(Boolean).pop() || 'Project'}
      </span>
      <ChevronRight className="hidden size-3 text-muted-foreground/50 sm:block" />
    </>}
    <span className="truncate font-medium">{p.title}</span>
    {p.inProject && (
      <Tooltip>
        <TooltipTrigger asChild>
          <button aria-label="Leave project" onClick={p.onLeaveProject} className="ml-1 grid size-6 place-items-center rounded-md text-muted-foreground hover:text-foreground">
            <LogOut className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Leave project and start a workspace chat</TooltipContent>
      </Tooltip>
    )}
  </div>
 <PlanUsageMenu provider={p.provider} connected={p.connected} chatKey={p.chatKey}/>
 <div className="workspace-header-actions ml-auto flex shrink-0 items-center">
   {p.onOpenFiles&&<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Open files" aria-pressed={!!p.filesOpen} onClick={p.onOpenFiles} className="floating-toolbar-button size-9 text-muted-foreground"><FolderOpen className="size-4"/></Button></TooltipTrigger><TooltipContent sideOffset={6}>Open files · {shortcutLabel('E',undefined,true)}</TooltipContent></Tooltip>}
   <ToolbarSlot shown={p.showWorkspaceCards!==false} width={36}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Workspace cards" aria-pressed={p.railOpen} onClick={p.onToggleRail} className="floating-toolbar-button size-9 text-muted-foreground"><Activity className="size-4"/></Button></TooltipTrigger><TooltipContent sideOffset={6}>Workspace cards</TooltipContent></Tooltip></ToolbarSlot>
   <ToolbarSlot shown={p.showWindowControls!==false&&hasCustomChrome()} width={108}><DesktopWindowControls/></ToolbarSlot>
 </div>{p.inspector&&<div className="workspace-context-cards absolute right-3 top-[68px] w-[340px] max-w-[calc(100%-24px)]">{p.inspector}</div>}</header>;}
