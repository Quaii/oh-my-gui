import {projectForSession} from "../../../shared/workspace";
import {getSessionMeta} from "@/lib/sessionmeta";
import {Skeleton} from "@/components/ui/skeleton";
import {TaskItem} from "@/components/ui/task-list";
import {Popover,PopoverContent,PopoverTrigger} from "@/components/ui/popover";
import {MessageSquare,ListTodo,CheckCheck,Workflow} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {HorizontalCarousel} from "./HorizontalCarousel";

import { GithubLogo as Github } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { FolderPlus, FolderOpen, LoaderCircle, GitPullRequest, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";
import { useRemote, Notice } from "./settings/ManagementShared";
import { post } from "@/lib/api";
import {FolderBrowser} from './FolderBrowser';

export function ProjectDialog({
  open,
  onOpenChange,
  cwd,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cwd: string;
  onCreated: (path: string) => void;
}) {
  const [mode, setMode] = useState("new");
  const [name, setName] = useState("");
  const [location, setLocation] = useState(cwd);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [picking, setPicking] = useState(false),
    [browsing, setBrowsing] = useState(false);
  useEffect(() => {
    if (open) {
      setLocation(cwd);
      setName("");
      setError("");
      setBrowsing(false);
    }
  }, [open, cwd]);
  async function browse() {
    setError("");
    if (!window.__OMP_DESKTOP__) {
      setBrowsing(true);
      return;
    }
    setPicking(true);
    try {
      const selected = await post<{ path: string | null }>(
        "/api/desktop/folder",
        { directory: location },
      );
      if (selected.path) setLocation(selected.path);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setPicking(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || picking || browsing) return;
    setBusy(true);
    setError("");
    try {
      const result = await post("/api/projects", {
        mode,
        ...(mode === "new" ? { name, parent: location } : { path: location }),
      });
      onCreated(result.project.path);
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !busy && !picking && onOpenChange(v)}
    >
      <DialogContent className="project-dialog max-h-[calc(100dvh-40px)] gap-6 overflow-y-auto rounded-xl p-6 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">
            {mode === "new" ? "Create a project" : "Open a project"}
          </DialogTitle>
          <DialogDescription>
            {mode === "new"
              ? "Start with a new folder for your work"
              : "Use a folder that is already on this computer"}
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={mode}
          onValueChange={(v) => {
            if (busy || picking) return;
            setMode(v);
            setError("");
            setBrowsing(false);
          }}
        >
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl bg-secondary/65 p-1">
            <TabsTrigger
              disabled={busy || picking}
              value="new"
              className="h-10 gap-2 rounded-lg text-[13px]"
            >
              <FolderPlus className="size-4" />
              Create folder
            </TabsTrigger>
            <TabsTrigger
              disabled={busy || picking}
              value="existing"
              className="h-10 gap-2 rounded-lg text-[13px]"
            >
              <FolderOpen className="size-4" />
              Open existing
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Notice error={error} />
        <form className="space-y-5" onSubmit={submit}>
          {mode === "new" && (
            <label className="flex flex-col gap-2.5 text-[13px] font-medium">
              Project name
              <Input
                required
                disabled={busy || picking}
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My project"
                className="h-11 rounded-[10px]"
              />
            </label>
          )}
          <div className="space-y-2.5">
            <label htmlFor="project-folder" className="text-[13px] font-medium">
              {mode === "new" ? "Parent folder" : "Folder path"}
            </label>
            <div className="flex gap-2">
              <Input
                id="project-folder"
                required
                disabled={busy || picking}
                autoFocus={mode === "existing"}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Choose a folder"
                className="h-11 min-w-0 flex-1 rounded-[10px]"
              />
              <Button
                type="button"
                variant="outline"
                disabled={busy || picking}
                className="h-11 shrink-0"
                onClick={() => void browse()}
              >
                {picking ? (
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <FolderOpen className="size-4" />
                )}
                {picking ? "Choosing…" : "Browse…"}
              </Button>
            </div>
          </div>
          {browsing && (
            <FolderBrowser
              initial={location}
              onChoose={(path) => {
                setLocation(path);
                setBrowsing(false);
              }}
              onCancel={() => setBrowsing(false)}
            />
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {mode === "new"
              ? `Creates “${name.trim() || "My project"}” inside the selected folder`
              : "The project uses the folder name. Existing files stay where they are."}
          </p>
          <Button
            type="submit"
            disabled={
              busy ||
              picking ||
              browsing ||
              !location.trim() ||
              (mode === "new" && !name.trim())
            }
            className="h-11 w-full rounded-[10px] bg-foreground text-background hover:bg-foreground/90"
          >
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {busy
              ? "Opening…"
              : mode === "new"
                ? "Create project"
                : "Open project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectActivity({cwd,activityData}:{cwd:string;activityData?:any}) {
 const remote=useRemote(activityData?null:`/api/project?cwd=${encodeURIComponent(cwd)}`);
 const {data,loading,error}=activityData?{data:activityData,loading:false,error:""}:remote;
 const owner=data?.owner,contributors=(data?.contributors||[]).filter((person:any)=>person.login?.toLowerCase()!==owner?.login?.toLowerCase());
 const person=(person:any,role:string)=><a key={person.login} href={person.url||`https://github.com/${encodeURIComponent(person.login)}`} target="_blank" rel="noreferrer" className="repo-person" title={role==='Owner'?`${person.login} · Owner`:`${person.login} · ${person.contributions} contributions`}><img draggable={false} src={person.avatar_url} alt="" className="size-7 shrink-0 rounded-full"/><span className="text-xs">{person.login}</span></a>;
 return <section className="project-activity rounded-xl p-0"><div className="mb-4 flex items-center gap-2 text-sm font-medium"><Github className="size-4"/>GitHub{data?.repository&&<a href={`https://github.com/${data.repository}`} target="_blank" rel="noreferrer" className="ml-auto truncate text-xs text-muted-foreground hover:text-foreground">{data.repository}</a>}</div><SkeletonReveal loading={loading} skeleton={<SettingsSkeleton rows={2}/>} label="Loading GitHub activity"><Notice error={error}/>{data?.reason&&<p className="text-xs leading-relaxed text-muted-foreground">{data.reason}</p>}{data?.authenticated&&<div className="space-y-4"><dl className="flex items-center justify-between gap-3 text-xs"><dt className="text-muted-foreground">Branch</dt><dd className="truncate" title={data.branch}>{data.branch||'Detached HEAD'}</dd></dl>{(owner||contributors.length>0)&&<HorizontalCarousel label="Repository owner and contributors" className="repo-people">{owner&&<div className="repo-people-group"><span className="repo-people-label">Owner</span>{person(owner,'Owner')}</div>}{owner&&contributors.length>0&&<div role="separator" aria-orientation="vertical" className="repo-people-separator"/>}{contributors.length>0&&<div className="repo-people-group"><span className="repo-people-label">Contributors</span><div className="flex gap-4">{contributors.map((entry:any)=>person(entry,'Contributor'))}</div></div>}</HorizontalCarousel>}<div className="space-y-3">{data.issues?.slice(0,6).map((issue:any)=><a key={issue.number} href={issue.url} target="_blank" rel="noreferrer" className="flex gap-2 text-xs hover:text-primary"><GitPullRequest className="size-3.5 shrink-0 text-muted-foreground"/><span>{issue.title}<span className="ml-1 text-muted-foreground">#{issue.number}</span></span></a>)}{!data.issues?.length&&<p className="text-xs text-muted-foreground">No open issues.</p>}</div></div>}</SkeletonReveal></section>;
}

export function HomeOverview({projects,sessions,onProject,onSession,onCreate}:{projects:any[];sessions:any[];onProject:(p:string)=>void;onSession:(s:any)=>void;onCreate:()=>void}) {
 const {data,loading,error}=useRemote("/api/overview");
 const recent=sessions.filter(s=>!getSessionMeta(s.path).archived).slice(0,3);
 const projectList=[...projects].sort((a,b)=>{const latest=(p:any)=>Math.max(Date.parse(p.createdAt)||0,...sessions.filter(s=>projectForSession(s,projects)?.id===p.id).map(s=>Date.parse(s.updatedAt)||0));return latest(b)-latest(a);}).slice(0,3);
 const work=(data?.work||[]).filter((w:any)=>!getSessionMeta(w.session.path).archived);
 const workCard=(w:any)=><article className="home-work-card" key={w.session.path}><button onClick={()=>onSession(w.session)} className="mb-3 flex w-full min-w-0 items-center gap-2 text-left" aria-label={`Resume work: ${w.session.name||w.session.preview||"Untitled chat"}`}>{w.running?<Workflow className="size-4 shrink-0 text-primary"/>:<ListTodo className="size-4 shrink-0 text-muted-foreground"/>}<span className="min-w-0 flex-1 truncate text-sm font-medium">{w.session.name||w.session.preview||"Untitled chat"}</span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground"/></button>{w.hasGoal&&<p className="mb-2 line-clamp-1 text-xs text-muted-foreground">{w.title}</p>}{w.nextTasks?.[0]?<TaskItem disabled checked={false} label={w.nextTasks[0].content} size="sm" className="home-next-task w-full disabled:opacity-100"/>:<p className="text-xs text-muted-foreground">{w.running?"Workflow in progress":"Goal ready to resume"}</p>}<p className="mt-2 truncate text-[10px] text-muted-foreground">{projectForSession(w.session,projects)?.name||"Workspace"} · {w.pendingTasks} unfinished {w.pendingTasks===1?"task":"tasks"}</p></article>;
 return <div className="home-dashboard">
  <header className="home-heading"><div><h1 className="text-[clamp(24px,2.3vw,34px)] font-medium tracking-tight">Ready when you are.</h1><p className="mt-2 text-sm text-muted-foreground">Your recent work, with the next step close at hand.</p></div><Button variant="outline" size="sm" className="home-new-project" onClick={onCreate}><FolderPlus className="size-4"/>New project</Button></header>
  <section className="home-section"><div className="home-section-heading"><h2>Recent projects</h2><span>{projects.length} {projects.length===1?"project":"projects"}</span></div><div className="home-card-grid">{projectList.map(p=><button key={p.id} onClick={()=>onProject(p.path)} className="home-project-card group"><FolderOpen className="size-5 shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{sessions.filter(s=>projectForSession(s,projects)?.id===p.id).length} chats</p></div><ArrowUpRight className="size-4 shrink-0 text-muted-foreground"/></button>)}{!projectList.length&&<button onClick={onCreate} className="home-empty-card"><FolderPlus className="size-5 text-muted-foreground"/><span className="text-sm">Create a project or open a folder</span><ArrowUpRight className="ml-auto size-4 text-muted-foreground"/></button>}</div></section>
  <section className="home-section"><div className="home-section-heading"><h2>Recent chats</h2><span>Last three conversations</span></div><div className="home-card-grid">{recent.map(session=><button key={session.path} className="home-chat-card" onClick={()=>onSession(session)}><MessageSquare className="size-4 shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{session.name||session.preview||"Untitled chat"}</p><p className="mt-2 truncate text-xs text-muted-foreground">{projectForSession(session,projects)?.name||"Workspace"} · {session.messageCount||0} messages</p></div><ArrowUpRight className="size-4 shrink-0 text-muted-foreground"/></button>)}{!recent.length&&<p className="home-empty-card text-sm text-muted-foreground">Your conversations will appear here.</p>}</div></section>
  <section className="home-section home-work-section"><div className="home-section-heading"><h2>Pick up the next step</h2>{work.length>3?<Popover><PopoverTrigger asChild><button className="text-xs text-muted-foreground hover:text-foreground">View all {work.length}</button></PopoverTrigger><PopoverContent className="max-h-[65vh] w-[min(600px,calc(100vw-32px))] overflow-y-auto rounded-2xl p-4"><div className="space-y-3">{work.map(workCard)}</div></PopoverContent></Popover>:<span>{work.length} open {work.length===1?"conversation":"conversations"}</span>}</div>{loading?<div aria-busy="true" className="home-card-grid">{[0,1,2].map(i=><div className="home-work-card space-y-4" key={i}><Skeleton className="h-4 w-2/3"/><Skeleton className="h-7 w-full rounded-lg"/><Skeleton className="h-2.5 w-1/2"/></div>)}</div>:error?<p role="alert" className="home-empty-card text-sm text-muted-foreground">Couldn’t load unfinished work. Open a conversation to continue.</p>:work.length?<div className="home-card-grid">{work.slice(0,3).map(workCard)}</div>:<div className="home-empty-card"><CheckCheck className="size-5 text-muted-foreground"/><div><p className="text-sm font-medium">No unfinished work</p><p className="mt-1 text-xs text-muted-foreground">Saved to-dos, goals, and running workflows appear here.</p></div></div>}</section>
 </div>;
}
