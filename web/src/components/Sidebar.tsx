import {LayoutMotion} from "./transitions/WorkspaceMotion";
import {transitionUpdate} from "../lib/motion";
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from "@/components/ui/collapsible";
import { ListSkeleton } from "@/components/ui/loading-shapes";
import { useEffect, useId, useMemo, useState, useRef, type DragEvent } from "react";
import {useSmoothWheel} from "@/lib/use-smooth-wheel";
import {
  archivedCount,
  getSessionMeta,
  groupSessions,
  setSessionMeta,
  sidebarProjectForSession,
  subscribeSessionMeta,
} from "../lib/sessionmeta";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  LoaderCircle,
  MessageSquarePlus,
  MessageSquare,
  MoreHorizontal,
  ChevronRight,
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
} from "./NavigationIcons";

type SidebarProject = { id: string; path: string; name: string };
const CHAT_DRAG_TYPE = "application/x-omp-sidebar-chat";

export interface SidebarProps {
  loading?:boolean;
  cwd: string;
  sessions: any[];
  activeSessionPath: string | null;
  busy: boolean;
  runningPaths?: ReadonlySet<string>;
  connected: boolean;
  collapsed: boolean;
  onNew: () => void;
  onNewProject?: () => void;
  onLeaveProject?:()=>void;
  onNewProjectChat?:(path:string)=>void;
  onHome?: () => void;
  projects?: SidebarProject[];
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
  const headingId = useId();
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
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [dropProject, setDropProject] = useState<string | null>(null);
  const draggedChat = useRef<{ path: string; cwd?: string } | null>(null);

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

  const pinned = groups.find(group => group.label === "Pinned")?.items ?? [];
  const navigation = useMemo(() => {
    const projects = props.projects ?? [];
    const byProject = new Map(projects.map(project => [project.id, { project, sessions: [] as any[] }]));
    const chats = groups.filter(group => group.label !== "Pinned").map(group => ({
      ...group,
      items: group.items.filter(session => {
        const project = sidebarProjectForSession(session, projects);
        if (!project) return true;
        byProject.get(project.id)?.sessions.push(session);
        return false;
      }),
    })).filter(group => group.items.length);
    const query = filterQuery.trim().toLowerCase();
    return {
      chats,
      projects: [...byProject.values()].filter(({ project, sessions }) =>
        !query || sessions.length > 0 || project.name.toLowerCase().includes(query)),
    };
  }, [groups, props.projects, filterQuery]);

  function moveChat(path: string, projectId: string | null | undefined) {
    setSessionMeta(path, { projectId });
    if (projectId) setClosedProjects(previous => ({ ...previous, [projectId]: false }));
  }

  function chatRunning(path: string) {
    return path === props.activeSessionPath ? props.busy : props.runningPaths?.has(path);
  }

  function handleProjectDragOver(event: DragEvent, project: SidebarProject) {
    const chat = draggedChat.current;
    if (!chat || !event.dataTransfer.types.includes(CHAT_DRAG_TYPE)) return;
    event.preventDefault();
    if (sidebarProjectForSession(chat, props.projects ?? [])?.id === project.id) {
      event.dataTransfer.dropEffect = "none";
      setDropProject(null);
      return;
    }
    event.dataTransfer.dropEffect = "move";
    setDropProject(project.id);
  }

  function nav(key: string) {
    if (key === "settings") props.onOpenSettings();
    else if (key === "refresh") props.onRefresh();
    else {
      setCwdDraft(props.cwd);
      setCwdOpen(true);

  if (props.collapsed) props.onToggleCollapsed();
    }
  }

  function renderSession(session: any) {
    const { path } = session;
    const title = session.name || session.preview || session.id || "Untitled chat";
    const active = path === props.activeSessionPath;
    const running = chatRunning(path);
    const meta = getSessionMeta(path);
    const projects = props.projects ?? [];
    const project = sidebarProjectForSession(session, projects);
    const pin = () => setSessionMeta(path, { pinned: !meta.pinned, archived: false });

    return (
      <LayoutMotion key={path}>
        <div className="session-row group" data-active={active} onContextMenu={event => {
          event.preventDefault();
          setMenuPath(path);
        }}>
          <button
            className="session-open"
            aria-current={active ? "page" : undefined}
            onClick={() => props.onOpen(session)}
            draggable
            onDragStart={event => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(CHAT_DRAG_TYPE, path);
              draggedChat.current = session;
            }}
            onDragEnd={() => {
              draggedChat.current = null;
              setDropProject(null);
            }}
          >
            {running && <span className="sr-only">Running: </span>}
            {meta.archived && <Archive className="size-3 shrink-0 text-muted-foreground" aria-label="Archived" />}
            <span className="truncate" title={title}>{title}</span>
          </button>
          <div className="session-row-actions">
            {running && <LoaderCircle aria-hidden="true" className="sidebar-chat-running" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="session-row-action"
                  aria-label={meta.pinned ? "Unpin chat" : "Pin chat"}
                  aria-pressed={!!meta.pinned}
                  onClick={pin}
                >
                  {meta.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{meta.pinned ? "Unpin chat" : "Pin chat"}</TooltipContent>
            </Tooltip>
            <DropdownMenu open={menuPath === path} onOpenChange={open => setMenuPath(current => open ? path : current === path ? null : current)}>
              <DropdownMenuTrigger asChild>
                <button type="button" className="session-row-action" aria-label={`Actions for ${title}`}>
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="session-actions-menu w-48 rounded-2xl p-1.5">
                <DropdownMenuItem onSelect={() => setRenaming({ session, value: session.name ?? "" })}>
                  <Pencil className="size-3.5" /> Rename
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderOpen className="size-3.5" /> Move chat
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="max-h-64 max-w-64 overflow-y-auto" aria-label="Move chat to">
                      {projects.map(destination => (
                        <DropdownMenuItem key={destination.id} disabled={destination.id === project?.id} onSelect={() => moveChat(path, destination.id)}>
                          <FolderOpen className="size-3.5" /><span className="truncate">{destination.name}</span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem disabled={!project} onSelect={() => moveChat(path, null)}>Chats</DropdownMenuItem>
                      {meta.projectId !== undefined && <DropdownMenuItem onSelect={() => moveChat(path, undefined)}>Group by working folder</DropdownMenuItem>}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuItem onSelect={pin}>
                  {meta.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  {meta.pinned ? "Unpin" : "Pin to top"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSessionMeta(path, { archived: !meta.archived, pinned: false })}>
                  {meta.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                  {meta.archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigator.clipboard?.writeText(path).catch(() => {})}>
                  <Link2 className="size-3.5" /> Copy path
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(session)}>
                  <Trash2 className="size-3.5" /> Delete…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </LayoutMotion>
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

        <div className="collapsed-chat-list mt-3 min-h-0 w-full flex-1">
          <div className="mx-auto mb-3 h-0.5 w-6 rounded-full bg-foreground/10" />
          <ScrollArea className="h-[calc(100%-14px)]">
            <div className="flex flex-col items-center gap-1 px-2 pb-2">
              {groups.flatMap(group => group.items).map(session => {
                const title = session.name || session.preview || "Untitled chat";
                const active = props.activeSessionPath === session.path;
                const running = chatRunning(session.path);
                return <Tooltip key={session.path}>
                  <TooltipTrigger asChild>
                    <button onClick={() => props.onOpen(session)} aria-label={`Open chat: ${title}${running ? " (running)" : ""}`} aria-current={active ? "page" : undefined}
                      className={`collapsed-chat relative grid size-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-sidebar-accent ${active ? "bg-sidebar-accent text-primary" : "text-muted-foreground"}`}>
                      {getSessionMeta(session.path).pinned ? <Pin className="size-4" /> : <MessageSquare className="size-4" />}
                      {running && <LoaderCircle aria-hidden="true" className="sidebar-chat-running" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-64">{title}{running && " · Running"}</TooltipContent>
                </Tooltip>;
              })}
            </div>
          </ScrollArea>
        </div>
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



      <ScrollArea className="session-scroll min-h-0 min-w-0 flex-1">
        <nav className="workspace-sidebar-sections" aria-label="Chats and projects">
          {pinned.length > 0 && <section aria-labelledby={headingId + "-pinned"}>
            <header className="workspace-sidebar-heading"><h2 id={headingId + "-pinned"}>Pinned</h2></header>
            <div className="workspace-sidebar-rows">{pinned.map(renderSession)}</div>
          </section>}
          <section aria-labelledby={headingId + "-projects"}>
            <header className="workspace-sidebar-heading">
              <h2 id={headingId + "-projects"}>Projects</h2>
              {props.onNewProject && <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" aria-label="New project" onClick={props.onNewProject}><Plus className="size-3.5" /></Button>
                </TooltipTrigger>
                <TooltipContent>New project</TooltipContent>
              </Tooltip>}
            </header>
            <div className="workspace-sidebar-rows">
              {navigation.projects.map(({ project, sessions }) => {
                const open = !!filterQuery || !closedProjects[project.id];
                return <Collapsible key={project.id} open={open}
                  onOpenChange={next => setClosedProjects(previous => ({ ...previous, [project.id]: !next }))}>
                  <div className="project-folder-row flex h-8 items-center rounded-lg" data-drop-target={dropProject === project.id}
                    onDragOver={event => handleProjectDragOver(event, project)}
                    onDragLeave={event => {
                      if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
                        setDropProject(current => current === project.id ? null : current);
                      }
                    }}
                    onDrop={event => {
                      const chat = draggedChat.current;
                      if (!chat || event.dataTransfer.getData(CHAT_DRAG_TYPE) !== chat.path) return;
                      event.preventDefault();
                      draggedChat.current = null;
                      setDropProject(null);
                      if (sidebarProjectForSession(chat, props.projects ?? [])?.id !== project.id) moveChat(chat.path, project.id);
                    }}>
                    <CollapsibleTrigger className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-[13px] text-muted-foreground" title={project.path}>
                      <ChevronRight className={`size-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
                      <FolderOpen className="size-3.5 shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </CollapsibleTrigger>
                    {props.onNewProjectChat && <Button variant="ghost" size="icon-xs" aria-label={`New chat in ${project.name}`} onClick={() => props.onNewProjectChat?.(project.path)} className="project-new-chat mr-1 size-6 shrink-0 text-muted-foreground"><Plus className="size-3.5" /></Button>}
                  </div>
                  <CollapsibleContent>
                    {sessions.length > 0 && <div className="project-chat-branch workspace-sidebar-rows">{sessions.map(renderSession)}</div>}
                  </CollapsibleContent>
                </Collapsible>;
              })}
            </div>
          </section>
          <section aria-labelledby={headingId + "-chats"}>
            <header className="workspace-sidebar-heading">
              <h2 id={headingId + "-chats"}>Chats</h2>
              {archived > 0 && <button type="button" onClick={() => transitionUpdate(() => setShowArchived(value => !value))} className="text-xs text-muted-foreground" aria-pressed={showArchived}>{showArchived ? "Hide archived" : "Show archived"}</button>}
            </header>
            {props.loading ? <div aria-busy="true"><ListSkeleton rows={5} logo={false} /></div> :
              navigation.chats.length === 0 ? <p className="workspace-sidebar-empty">{filterQuery ? "No chats match" : "No chats outside projects"}</p> :
                <div className="workspace-sidebar-chat-groups">{navigation.chats.map(group => (
                  <div key={group.label}>
                    <p className="workspace-sidebar-date">{group.label}</p>
                    <div className="workspace-sidebar-rows">{group.items.map(renderSession)}</div>
                  </div>
                ))}</div>}
          </section>
        </nav>
      </ScrollArea>

      <div className="session-sidebar-footer">
        <Button variant="ghost" onClick={props.onOpenSettings} className="session-sidebar-footer-button mr-auto justify-start gap-2 px-3 text-[13px] font-normal">
          <Settings2 className="size-4" /> Settings
        </Button>
        {NAV.filter(item => item.key !== "settings").map(item => (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="session-sidebar-footer-button"
                onClick={() => nav(item.key)} aria-label={item.label}>
                <item.icon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{item.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

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
