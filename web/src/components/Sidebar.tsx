import {LayoutMotion} from "./transitions/WorkspaceMotion";
import {transitionUpdate} from "../lib/motion";
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from "@/components/ui/collapsible";
import { ListSkeleton } from "@/components/ui/loading-shapes";
import { useEffect, useMemo, useState, useRef } from "react";
import {useSmoothWheel} from "@/lib/use-smooth-wheel";
import { ago } from "../lib/api";
import {
  archivedCount,
  getSessionMeta,
  groupSessions,
  setSessionMeta,
  subscribeSessionMeta,
} from "../lib/sessionmeta";
import {projectForSession} from "../../../shared/workspace";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Archive,
  ArchiveRestore,
  FolderOpen,
  FolderPlus,
  House,
  Link2,
  MessageSquarePlus,
  MessageSquare,
  MoreHorizontal,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Sparkles,
} from "./NavigationIcons";

export interface SidebarProps {
  loading?:boolean;
  cwd: string;
  sessions: any[];
  activeSessionPath: string | null;
  busy: boolean;
  connected: boolean;
  collapsed: boolean;
  onNew: () => void;
  onNewProject?: () => void;
  onLeaveProject?:()=>void;
  onNewProjectChat?:(path:string)=>void;
  onHome?: () => void;
  projects?: any[];
  onOpen: (s: any) => void;
  onDelete: (s: any) => void;
  onRename: (s: any, name: string) => void;
  onOpenSettings: () => void;
  onChangeCwd: (cwd: string) => void;
  onRefresh: () => void;
  onToggleCollapsed: () => void;
}

const NAV = [
  { label: "Settings", icon: Settings2, key: "settings" as const },
  { label: "Refresh", icon: RefreshCw, key: "refresh" as const },
  { label: "Change directory", icon: FolderOpen, key: "cwd" as const },
];

export function Sidebar(props: SidebarProps) {
  const scrollRoot=useRef<HTMLElement|null>(null);useSmoothWheel(scrollRoot,'[data-slot=scroll-area-viewport]',props.collapsed);
  const [q, setQ] = useState("");
  const [filterQuery,setFilterQuery]=useState("");
  const [closedProjects,setClosedProjects]=useState<Record<string,boolean>>({});
  const [cwdOpen, setCwdOpen] = useState(false);
  const [cwdDraft, setCwdDraft] = useState(props.cwd);
  const [renaming, setRenaming] = useState<{ session: any; value: string } | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [metaVersion, bump] = useState(0);

  useEffect(() => subscribeSessionMeta(() => bump((n) => n + 1)), []);

  const filtered = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return props.sessions;
    return props.sessions.filter((s) =>
      `${s.name ?? ""} ${s.preview ?? ""} ${s.id} ${s.cwd ?? ""}`.toLowerCase().includes(query)
    );
  }, [props.sessions, filterQuery]);

  const groups = useMemo(() => groupSessions(filtered, showArchived), [filtered, showArchived, metaVersion]);
  const archived = useMemo(() => archivedCount(props.sessions), [props.sessions, metaVersion]);

  const ordinaryGroups=useMemo(()=>groupSessions(filtered.filter(session=>!projectForSession(session,props.projects||[])),showArchived),[filtered,props.projects,showArchived,metaVersion]);
  const projectGroups=useMemo(()=>(props.projects||[]).map(project=>({project,sessions:groups.flatMap(g=>g.items).filter(session=>projectForSession(session,props.projects||[])?.id===project.id)})).filter(g=>!q||g.sessions.length||g.project.name.toLowerCase().includes(q.toLowerCase())),[props.projects,groups,q]);

  function nav(key: string) {
    if (key === "settings") props.onOpenSettings();
    else if (key === "refresh") props.onRefresh();
    else {
      setCwdDraft(props.cwd);
      setCwdOpen(true);

  if (props.collapsed) props.onToggleCollapsed();
    }
  }

      function renderSession(s:any) {
                const active = s.path === props.activeSessionPath;
                const meta = getSessionMeta(s.path);
                return (
                  <LayoutMotion key={s.path}><div
                    data-active={active}
                    className={`session-row group relative mb-1 rounded-md px-3 py-2.5 pr-10 transition-colors t-fast ${
                      active
                        ? "bg-sidebar-accent"
                        : "hover:bg-sidebar-accent/60"
                    }`}
                  >
                    <button onClick={() => props.onOpen(s)} className="flex w-full min-w-0 items-center gap-1.5 text-left after:absolute after:inset-0 after:rounded-lg" aria-current={active ? "page" : undefined}>
                      <span
                        className={`truncate text-[13px] ${active ? "font-medium text-fog-100" : "text-fog-200"}`}
                        title={s.name || s.preview || s.id}
                      >
                        {s.name || s.preview?.slice(0, 46) || s.id}
                      </span>
                      {meta.pinned && <Pin className="size-2.5 shrink-0 text-primary/70" aria-label="pinned" />}
                      {meta.archived && <Archive className="size-2.5 shrink-0 text-muted-foreground" aria-label="archived" />}
                    </button>
                    <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-muted-foreground/75">
                      <span className="font-mono">{s.updatedAt ? ago(s.updatedAt) : ""}</span>
                      {s.messageCount ? <span>· {s.messageCount} msg</span> : null}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 grid size-6 place-items-center rounded text-muted-foreground opacity-0 transition-opacity t-fast hover:bg-ink-700 hover:text-fog-100 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                          aria-label={`Actions for ${s.name || s.preview || s.id}`}
                        >
                          <MoreHorizontal className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="session-actions-menu w-48 rounded-2xl p-1.5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onSelect={() => setRenaming({ session: s, value: s.name ?? "" })}>
                          <Pencil className="size-3.5" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setSessionMeta(s.path, { pinned: !meta.pinned })}>
                          {meta.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                          {meta.pinned ? "Unpin" : "Pin to top"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setSessionMeta(s.path, { archived: !meta.archived, pinned: false })}
                        >
                          {meta.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                          {meta.archived ? "Unarchive" : "Archive"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => navigator.clipboard?.writeText(s.path).catch(() => {})}
                        >
                          <Link2 className="size-3.5" /> Copy path
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(s)}>
                          <Trash2 className="size-3.5" /> Delete…
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div></LayoutMotion>
                );

  }

  if (props.collapsed) {
    return (
      <aside ref={scrollRoot} className="collapsed-sidebar flex h-full w-full shrink-0 flex-col items-center gap-1 bg-sidebar py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={props.onToggleCollapsed}
              className="grid size-9 place-items-center rounded-lg transition-colors t-fast hover:bg-sidebar-accent"
              aria-label="Expand sidebar"
            >
              <Brand className="size-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={props.onNew}
              size="icon"
              variant="ghost"
              className="mt-3 size-10 text-foreground hover:bg-sidebar-accent"
              aria-label="New session"
            >
              <MessageSquarePlus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">New session</TooltipContent>
        </Tooltip>

        <div className="mt-3 flex flex-col gap-0.5"><Button variant="ghost" size="icon" onClick={props.onHome} aria-label="Home"><House className="size-4"/></Button><Button variant="ghost" size="icon" onClick={props.onNewProject} aria-label="New project"><FolderPlus className="size-4"/></Button>
          {NAV.filter(n => n.key !== "settings").map((n) => (
            <Tooltip key={n.key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => nav(n.key)}
                  className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors t-fast hover:bg-sidebar-accent hover:text-fog-100"
                  aria-label={n.label}
                >
                  <n.icon className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{n.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="collapsed-chat-list mt-3 min-h-0 w-full flex-1"><div className="mx-auto mb-3 h-0.5 w-6 rounded-full bg-foreground/10"/><ScrollArea className="h-[calc(100%-14px)]"><div className="flex flex-col items-center gap-1 px-2 pb-2">{groups.flatMap(g=>g.items).map(session=><Tooltip key={session.path}><TooltipTrigger asChild><button onClick={()=>props.onOpen(session)} aria-label={`Open chat: ${session.name||session.preview||"Untitled chat"}`} aria-current={props.activeSessionPath===session.path?"page":undefined} className={`grid size-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-sidebar-accent ${props.activeSessionPath===session.path?"bg-sidebar-accent text-primary":"text-muted-foreground"}`}><MessageSquare className="size-4"/></button></TooltipTrigger><TooltipContent side="right" className="max-w-64"><p className="truncate">{session.name||session.preview||"Untitled chat"}</p><p className="mt-1 text-[10px] opacity-65">{session.messageCount||0} messages</p></TooltipContent></Tooltip>)}</div></ScrollArea></div>
        <div className="mt-auto flex flex-col items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Settings" onClick={props.onOpenSettings}><Settings2 className="size-4" /></Button>
        </div>
      </aside>
    );
  }

  return (
    <aside ref={scrollRoot} className="session-sidebar flex h-full w-full min-w-0 shrink-0 flex-col bg-sidebar">
      <div className="flex h-18 items-center gap-2.5 px-5">
        <Brand className="size-7 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-semibold tracking-[-0.04em]">omp<span className="text-primary">.</span></span>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-fog-100"
              onClick={props.onToggleCollapsed}
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Collapse</TooltipContent>
        </Tooltip>
      </div>

      <div className="relative mx-3 mb-2 border-b border-sidebar-border/70 pt-1 pb-3">
        <Search className="pointer-events-none absolute left-2 top-[19px] size-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {const value=e.target.value;setQ(value);transitionUpdate(()=>setFilterQuery(value));}}
          placeholder="Search sessions"
          aria-label="Search sessions"
          className="h-8 rounded-lg border-0 bg-sidebar-accent/50 pl-7 text-[12px] focus-visible:border-border"
        />
      </div>

      <div className="px-3"><Button variant="ghost" onClick={props.onHome} className="mb-1 h-9 w-full justify-start gap-2 text-[13px] font-normal text-muted-foreground"><House className="size-3.5"/>Home</Button>
        <Button
          onClick={props.onNew}
          variant="outline"
          className="sidebar-new-chat h-9 w-full justify-start gap-2 border-0 bg-transparent px-3 text-[13px] font-normal text-foreground shadow-none hover:bg-sidebar-accent"
        >
          <Plus className="size-3.5 text-muted-foreground" /> New chat
        </Button>
      </div>



      <div className="px-3 pt-2"><Button variant="ghost" onClick={props.onNewProject} className="h-9 w-full justify-start gap-2 text-[13px] font-normal text-muted-foreground"><FolderPlus className="size-3.5"/>New project</Button></div>
      <ScrollArea className="session-scroll min-h-0 min-w-0 flex-1"><div className="px-3 pb-3">
       {projectGroups.map(({project,sessions})=><Collapsible key={project.id} open={q?true:!closedProjects[project.id]} onOpenChange={open=>setClosedProjects(v=>({...v,[project.id]:!open}))} className="project-sidebar-group mb-3 mt-2"><div className="project-folder-row group/project flex h-8 items-center rounded-lg"><CollapsibleTrigger className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-xs text-muted-foreground" title={project.path}><ChevronsRight className={'size-3 shrink-0 transition-transform '+(!closedProjects[project.id]||q?'rotate-90':'')}/><FolderOpen className="size-3.5 shrink-0"/><span className="truncate">{project.name}</span></CollapsibleTrigger><Button variant="ghost" size="icon-sm" aria-label={'New chat in '+project.name} onClick={()=>props.onNewProjectChat?.(project.path)} className="project-new-chat mr-1 size-6 shrink-0 text-muted-foreground"><Plus className="size-3.5"/></Button></div><CollapsibleContent><div className="project-chat-branch ml-[19px] mt-1 pl-3">{sessions.map(renderSession)}{!sessions.length&&<p className="px-2 py-2 text-[11px] text-muted-foreground">No chats yet</p>}</div></CollapsibleContent></Collapsible>)}
       <div className="sidebar-section-divider"/><div className="flex items-center gap-2 px-3 pb-2 pt-1"><h2 className="text-[13px] font-semibold">Chats</h2><span className="text-[10px] tabular-nums text-muted-foreground">{ordinaryGroups.reduce((n,g)=>n+g.items.length,0)}</span>{archived>0&&<button onClick={()=>transitionUpdate(()=>setShowArchived(v=>!v))} className="ml-auto text-[10px] text-muted-foreground">{showArchived?"Hide archived":"Show archived"}</button>}</div>
       {props.loading?<div aria-busy="true" className="pt-3"><ListSkeleton rows={5} logo={false}/></div>:!ordinaryGroups.length&&<p className="px-3 py-5 text-xs text-muted-foreground">{q?"No chats match":"No chats yet"}</p>}
       {!props.loading&&ordinaryGroups.map(group=><LayoutMotion key={group.label}><div><p className="px-3 pb-1 pt-3 text-[11px] text-muted-foreground">{group.label}</p>{group.items.map(renderSession)}</div></LayoutMotion>)}
      </div></ScrollArea>

      <div className="mx-3 flex shrink-0 items-center gap-1 py-3"><Button variant="ghost" onClick={props.onOpenSettings} className="mr-auto h-9 justify-start gap-2 px-3 text-[13px] font-normal text-muted-foreground"><Settings2 className="size-4"/>Settings</Button>{NAV.filter(n=>n.key!=="settings").map(n=><Tooltip key={n.key}><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={()=>nav(n.key)} aria-label={n.label} className="size-8 text-muted-foreground"><n.icon className="size-3.5"/></Button></TooltipTrigger><TooltipContent>{n.label}</TooltipContent></Tooltip>)}</div>

      {/* change directory */}
      <Dialog open={cwdOpen} onOpenChange={setCwdOpen}>
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="text-[13px]">Change working directory</DialogTitle>
            <DialogDescription className="text-[11.5px]">
              New sessions start in this folder. The current session keeps its own cwd.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <Input
              autoFocus
              value={cwdDraft}
              onChange={(e) => setCwdDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCwdOpen(false);
                  props.onChangeCwd(cwdDraft);
                }
              }}
              className="font-mono text-[12px]"
              aria-label="Working directory"
            />
          </div>
          <DialogFooter className="flex-row justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => setCwdOpen(false)} className="text-[12px]">
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-[12px]"
              onClick={() => {
                setCwdOpen(false);
                props.onChangeCwd(cwdDraft);
              }}
            >
              Use directory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* rename */}
      <Dialog open={!!renaming} onOpenChange={(v) => !v && setRenaming(null)}>
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="text-[13px]">Rename session</DialogTitle>
            <DialogDescription className="text-[11.5px]">
              The name is written into the session file by omp itself.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <Input
              autoFocus
              value={renaming?.value ?? ""}
              placeholder="Session name"
              onChange={(e) => setRenaming((r) => (r ? { ...r, value: e.target.value } : r))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renaming) {
                  props.onRename(renaming.session, renaming.value.trim());
                  setRenaming(null);
                }
              }}
              aria-label="Session name"
            />
          </div>
          <DialogFooter className="flex-row justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => setRenaming(null)} className="text-[12px]">
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-[12px]"
              onClick={() => {
                if (renaming) props.onRename(renaming.session, renaming.value.trim());
                setRenaming(null);
              }}
            >
              Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="text-[13px]">Delete session</DialogTitle>
            <DialogDescription className="text-[11.5px]">
              This removes the session file from disk. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="truncate px-4 py-3 font-mono text-[11.5px] text-fog-300">
            {deleting?.name || deleting?.preview?.slice(0, 80) || deleting?.id}
          </div>
          <DialogFooter className="flex-row justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => setDeleting(null)} className="text-[12px]">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-[12px]"
              onClick={() => {
                if (deleting) props.onDelete(deleting);
                setDeleting(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
