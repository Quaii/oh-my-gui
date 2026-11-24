import { useEffect, useRef } from "react";
import { Activity, ArrowUpRight, FolderOpen, FolderPlus, ListTodo, MessageSquare, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSessionMeta, sidebarProjectForSession } from "@/lib/sessionmeta";
import type { SessionSummary } from "../../../server/src/sessions";
import type { overviewWork } from "../../../server/src/overview";
import { useRemote } from "./settings/ManagementShared";

type Project = { id: string; name: string; path: string; createdAt?: string };
type Work = NonNullable<Awaited<ReturnType<typeof overviewWork>>[number]>;

type Props = {
  projects: Project[];
  sessions: SessionSummary[];
  runningPaths: ReadonlySet<string>;
  activePath: string | null;
  running: boolean;
  onProject: (path: string) => void;
  onProjectChat: (path: string) => void;
  onSession: (session: SessionSummary) => void;
  onCreate: () => void;
  onNewChat: () => void;
};

const titleOf = (session: SessionSummary) => session.name || session.preview || "Untitled chat";
const taskCount = (count: number) => `${count} unfinished ${count === 1 ? "task" : "tasks"}`;

export function HomeOverview({ projects, sessions, runningPaths, activePath, running, onProject, onProjectChat, onSession, onCreate, onNewChat }: Props) {
  const { data, loading, error, refresh } = useRemote<{ work: Work[] }>("/api/overview");
  const runningSignature = JSON.stringify([[...runningPaths].sort(), running ? activePath : null]);
  const lastRunning = useRef(runningSignature);
  useEffect(() => {
    if (lastRunning.current === runningSignature) return;
    lastRunning.current = runningSignature;
    refresh();
  }, [runningSignature, refresh]);

  const projectOf = (session: SessionSummary) => sidebarProjectForSession(session, projects);
  const recentSessions = sessions.filter(session => !getSessionMeta(session.path).archived);
  const work = new Map((data?.work ?? []).filter(item => !getSessionMeta(item.session.path).archived)
    .map(item => [item.session.path, item]));
  for (const session of recentSessions) {
    const isRunning = session.path === activePath ? running : runningPaths.has(session.path);
    if (!isRunning) continue;
    const item = work.get(session.path);
    work.set(session.path, item ? { ...item, running: true } : {
      session, title: "", pendingTasks: 0, running: true, hasGoal: false, nextTasks: [],
    });
  }
  const priority = [...work.values()].sort((a, b) => Number(b.running) - Number(a.running)
    || b.session.updatedAt.localeCompare(a.session.updatedAt));
  const recent = recentSessions.filter(session => !work.has(session.path)).slice(0, 5);

  const projectsWithActivity = new Map(projects.map(project => [project.id, {
    project, count: 0, latest: Date.parse(project.createdAt ?? "") || 0,
  }]));
  for (const session of recentSessions) {
    const project = projectOf(session);
    const entry = project && projectsWithActivity.get(project.id);
    if (!entry) continue;
    entry.count++;
    entry.latest = Math.max(entry.latest, Date.parse(session.updatedAt) || 0);
  }
  const recentProjects = [...projectsWithActivity.values()].sort((a, b) => b.latest - a.latest).slice(0, 5);

  return <div className="home-dashboard">
    <header className="home-heading">
      <h1>Workspace overview</h1>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onCreate}><FolderPlus className="size-4" /> New project</Button>
        <Button onClick={onNewChat}><Plus className="size-4" /> New chat</Button>
      </div>
    </header>
    <div className="home-layout">
      <section className="home-section" aria-labelledby="home-work-title">
        <div className="home-section-heading">
          <h2 id="home-work-title">Continue work</h2>
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={refresh} disabled={loading} aria-label="Refresh work overview">
              <RefreshCw className="size-3.5" />
            </Button>
          </TooltipTrigger><TooltipContent>Refresh overview</TooltipContent></Tooltip>
        </div>
        <div className="home-work-list">
          {priority.map(item => {
            const { session } = item;
            const nextTasks = item.nextTasks;
            return <button key={session.path} type="button" className="home-work-card" onClick={() => onSession(session)}>
              <span className="home-work-heading">
                {item.running ? <Activity className="size-4 shrink-0 text-primary" /> : <ListTodo className="size-4 shrink-0 text-muted-foreground" />}
                <span className="min-w-0 flex-1 truncate font-semibold">{titleOf(session)}</span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
              </span>
              <span className="home-work-meta">
                <span>{projectOf(session)?.name ?? "Workspace"}</span>
                {item.running && <span className="text-primary">Running</span>}
                {item.pendingTasks > 0 && <span>{taskCount(item.pendingTasks)}</span>}
              </span>
              {(item.hasGoal || nextTasks.length > 0) && <span className="home-work-details">
                {item.hasGoal && <span className="line-clamp-2 font-medium">{item.title}</span>}
                {nextTasks.map((task, index) => <span className="home-work-task" key={index}>
                  <span className="home-task-marker" data-in-progress={task.status === "in_progress"} />
                  <span className="line-clamp-2 min-w-0">{task.content}</span>
                </span>)}
              </span>}
            </button>;
          })}
          {loading && !priority.length && <div className="home-work-card" aria-busy="true"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-7 w-full" /></div>}
          {!loading && error && <p className="home-empty-card" role="alert">Couldn’t load unfinished work. Use Refresh overview to try again.</p>}
          {!loading && !error && !priority.length && <p className="home-empty-card">Running chats, unfinished tasks, and active goals appear here.</p>}
        </div>
      </section>
      <div className="home-side">
        <section className="home-section" aria-labelledby="home-project-title">
          <div className="home-section-heading"><h2 id="home-project-title">Projects</h2></div>
          <div className="home-list-card">
            {recentProjects.map(({ project, count }) => <div className="home-project-row" key={project.id}>
              <button type="button" className="home-list-row" onClick={() => onProject(project.path)}>
                <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-medium">{project.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{count} {count === 1 ? "chat" : "chats"}</span>
              </button>
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={() => onProjectChat(project.path)} aria-label={`New chat in ${project.name}`}>
                  <Plus className="size-4" />
                </Button>
              </TooltipTrigger><TooltipContent>New project chat</TooltipContent></Tooltip>
            </div>)}
            {!recentProjects.length && <p className="home-list-empty">Create a project or open an existing folder to group its chats.</p>}
          </div>
        </section>
        <section className="home-section" aria-labelledby="home-recent-title">
          <div className="home-section-heading"><h2 id="home-recent-title">Recent chats</h2></div>
          <div className="home-list-card">
            {recent.map(session => <button key={session.path} type="button" className="home-list-row items-start" onClick={() => onSession(session)}>
              <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{titleOf(session)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{projectOf(session)?.name ?? "Workspace"}</span>
                {session.name && session.preview && session.preview !== session.name && <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{session.preview}</span>}
              </span>
              <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            </button>)}
            {!recent.length && <p className="home-list-empty">{recentSessions.length ? "Your latest chats are in Continue work." : "New conversations will appear here."}</p>}
          </div>
        </section>
      </div>
    </div>
  </div>;
}
