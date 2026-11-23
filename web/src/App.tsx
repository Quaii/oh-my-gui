import {useReducedMotion} from 'motion/react';
import {PageTransition} from './components/transitions/page-transition';
import {LayoutMotion} from './components/transitions/WorkspaceMotion';
import {transitionUpdate} from './lib/motion';
import {FileOpenContext} from "./lib/file-workspace";
import {ProjectSuggestions}from"./components/ProjectSuggestions";
import {replyVersions} from "./lib/message-versions";
import {MessageVersions} from "./components/MessageVersions";
import {PromptSuggestions} from "./components/PromptSuggestions";
import {projectForSession} from "../../shared/workspace";
import {groupedTranscript,responsePhase} from "./lib/transcript";
import { SettingsPage } from "./pages/SettingsPage";
import { ChatSkeleton, HomeSkeleton, PanelSkeleton } from "@/components/ui/loading-shapes";
import { conversationRestoreTargets } from "./lib/conversation-actions";
import { FilesChanged } from "./components/FilesChanged";
import { fileChangeSummaries } from "./lib/file-changes";
import { HomeOverview, ProjectDialog } from "./components/Projects";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { get, post, del, subscribeEvents } from "./lib/api";
import { chatReducer, initialChat, dismissToast, type ChatState } from "./lib/store";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { RightRail } from "./components/RightRail";
import { Composer } from "./components/Composer";
import { RuntimeOutput, ExtensionWidgets } from './components/RuntimeOutput';
import { CommandPalette } from "./components/CommandPalette";
import { MessageRow, AssistantMessage, buildResultMap } from "./components/Message";
import { DialogHost, Toasts } from "./components/Dialogs";

import { navigate, useRoutePath } from "./lib/route";
import { filterChatCommands, getPalettePrefs, subscribePalette } from "./lib/settings";
import { clearSessionMeta } from "./lib/sessionmeta";
import { Brand } from "./components/Brand";
import {SharedWorkspaceBackground} from "./components/SharedWorkspaceBackground";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal, SettingsSkeleton } from "@/components/ui/skeleton-reveal";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import AiStatus from "@/components/ui/ai-status";
import ProximitySidebar from "@/components/ui/proximity-sidebar";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDown, ArrowUpRight, Code2, ScanSearch, GitPullRequest } from "lucide-react";

const FileWorkspace=lazy(()=>import("./components/FileWorkspace"));
const LS_CWD = "ompfe.cwd";
const LS_FLAGS = "ompfe.flags";
const LS_RAIL = "ompfe.rail";
const LS_SIDEBAR = "ompfe.sidebar.collapsed";

export default function App() {
  const [chat, dispatch] = useState<ChatState>(initialChat);
  const [boot, setBoot] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [thinkingLevels, setThinkingLevels] = useState<string[]>(["off", "low", "medium", "high", "xhigh", "max"]);
  const [stats, setStats] = useState<any>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const route = useRoutePath();
  const inSettings = route.startsWith("/settings");
  const openSettings = useCallback(() => navigate("/settings"), []);
  const closeSettings = useCallback(() => navigate("/"), []);
  const [focusedEditor,setFocusedEditor]=useState<string|null>(null);
  const [fileWorkspaces,setFileWorkspaces]=useState<Record<string,{cwd:string;request:{path?:string;n:number}}>>({});
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [seed, setSeed] = useState<{ text: string; n: number } | null>(null);
  const [railOpen, setRailOpen] = useState<boolean>(() => localStorage.getItem(LS_RAIL) === "1");
  const [mobileNav, setMobileNav] = useState(false);
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1280px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const sync = () => setWide(query.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem(LS_SIDEBAR) === "1"
  );
  const [flags, setFlagsState] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_FLAGS) || "[]");
    } catch {
      return [];
    }
  });

  const keyRef = useRef<string | null>(null);
  const attachVersion = useRef(0);
  const unsubRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const cwd = boot?.cwd ?? localStorage.getItem(LS_CWD) ?? "";
  const changedFilesCwd = (boot?.allSessions ?? boot?.sessions ?? []).find((session:any) => session.path === activePath)?.cwd || cwd;
  const changedFilesRoot = projectForSession({cwd:changedFilesCwd},boot?.control?.projects || [])?.path || changedFilesCwd;
  const fileRequest=chat.key?fileWorkspaces[chat.key]?.request:null;

  const openFiles=useCallback((path?:string)=>{const key=keyRef.current;if(!key)return;transitionUpdate(()=>{setHome(false);setFileWorkspaces(previous=>({...previous,[key]:{cwd,request:{path,n:Date.now()}}}));});},[cwd]);

  const [paletteVersion, setPaletteVersion] = useState(0);
  useEffect(() => subscribePalette(() => setPaletteVersion((v) => v + 1)), []);
  const paletteCommands = useMemo(
    () => filterChatCommands(chat.commands ?? [], getPalettePrefs()),
    [chat.commands, paletteVersion]
  );

  const setChat = useCallback((rec: any) => {
    dispatch((s) => chatReducer(s, rec));
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_RAIL, railOpen ? "1" : "0");
  }, [railOpen]);

  useEffect(() => {
    localStorage.setItem(LS_SIDEBAR, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  /* ---------- bootstrap ---------- */
  useEffect(() => {
    const initialCwd = localStorage.getItem(LS_CWD) || "";
    const url = initialCwd ? `/api/bootstrap?cwd=${encodeURIComponent(initialCwd)}` : "/api/bootstrap";
    get(url)
      .then((b) => {
        setBoot(b);
        localStorage.setItem(LS_CWD, b.cwd);
      })
      .catch((e) => setChat({ type: "snapshot_error", message: String(e) }));
  }, []);

  const reconnects=useRef(0);
  const [offline,setOffline]=useState(false);
  const [home,setHome] = useState(true);
  const [projectDialog,setProjectDialog] = useState(false);

  /* ---------- session lifecycle ---------- */
  const refreshModels = useCallback(async () => {
    const key = keyRef.current;
    if (!key) return;
    const version = attachVersion.current;
    const result = await post("/api/cmd", { key, cmd: { type: "get_available_models" } }).catch(() => null);
    if (result?.ok && version === attachVersion.current) setModels(result.data?.models ?? []);
  }, []);

  const attach = useCallback(
    async (key: string, sessionPath?: string, sessionCwd?:string) => {
      if (!cwd) return;
      const version = ++attachVersion.current;
      unsubRef.current?.();
      unsubRef.current = null;
      setConnected(false);
      setModels([]);
      setStats(null);
      keyRef.current = key;
      dispatch({ ...initialChat, key, loaded: false });
      setActivePath(sessionPath ?? null);
      try {
        await post("/api/bridge", { key, cwd:sessionCwd||cwd, sessionPath, args: flags });
        if (version !== attachVersion.current) return;
        unsubRef.current = subscribeEvents(
          key,
          (rec) => {
            if (version !== attachVersion.current) return;
            setChat(rec);
            if (rec.type === 'provider_login_finished' && rec.connected) void refreshModels();
          },
          (s) => version === attachVersion.current && setConnected(s === "open")
        );
        const [m, lv, cmds, st] = await Promise.all([
          post("/api/cmd", { key, cmd: { type: "get_available_models" } }).catch(() => null),
          post("/api/cmd", { key, cmd: { type: "get_available_thinking_levels" } }).catch(() => null),
          post("/api/cmd", { key, cmd: { type: "get_available_commands" } }).catch(() => null),
          post("/api/cmd", { key, cmd: { type: "get_session_stats" } }).catch(() => null),
        ]);
        if (version !== attachVersion.current) return;
        if (m?.ok) setModels(m.data?.models ?? []);
        if (lv?.ok) setThinkingLevels(lv.data?.levels ?? []);
        if (cmds?.ok) dispatch((s) => ({ ...s, commands: cmds.data?.commands ?? [] }));
        if (st?.ok) setStats(st.data);
      } catch (e: any) {
        if (version !== attachVersion.current) return;
        setChat({ type: "snapshot_error", message: String(e?.message ?? e) });
      }
    },
    [cwd, flags, refreshModels]
  );

  useEffect(() => {
    if (!boot || keyRef.current) return;
    const last = boot.sessions?.[0];
    attach(`s:${last?.path ?? "new-" + Date.now()}`, last?.path);
  }, [boot, attach]);

  useEffect(()=>{if(connected){reconnects.current=0;setOffline(false);return;}if(!chat.loaded)return;const timer=window.setTimeout(()=>{setOffline(true);if(!chat.error && reconnects.current<2 && keyRef.current){reconnects.current++;void attach(keyRef.current,activePath || chat.state?.sessionFile || undefined);}},2000);return()=>clearTimeout(timer);},[connected,chat.loaded,chat.error,attach,activePath]);

  const refreshState = useCallback(async () => {
    const key = keyRef.current;
    if (!key) return;
    const [st, s, cmds,agents] = await Promise.all([
      post("/api/cmd", { key, cmd: { type: "get_state" } }).catch(() => null),
      post("/api/cmd", { key, cmd: { type: "get_session_stats" } }).catch(() => null),
      post("/api/cmd", { key, cmd: { type: "get_available_commands" } }).catch(() => null),
      post("/api/cmd", { key, cmd: { type: "get_subagents" } }).catch(() => null),
    ]);
    if (key !== keyRef.current) return;
    if (st?.ok) dispatch((x) => ({ ...x, state: st.data,todos:st.data?.todoPhases??x.todos }));
    if(agents?.ok)dispatch(x=>chatReducer(x,{type:'subagents_snapshot',subagents:agents.data?.subagents??(Array.isArray(agents.data)?agents.data:[])}));
    if (s?.ok) setStats(s.data);
    if (cmds?.ok) dispatch((x) => ({ ...x, commands: cmds.data?.commands ?? [] }));
  }, []);

  useEffect(()=>{if(!chat.running||!chat.loaded)return;void refreshState();const timer=setInterval(refreshState,2500);return()=>clearInterval(timer);},[chat.running,chat.loaded,refreshState]);

  const refreshSessions = useCallback(async () => {
    const b = await get(`/api/bootstrap?cwd=${encodeURIComponent(cwd)}`).catch(() => null);
    if (b) setBoot((prev: any) => ({ ...prev, sessions: b.sessions,allSessions:b.allSessions,control:b.control }));
  }, [cwd]);
  useEffect(() => {
    if (!chat.loaded || !chat.state) return;
    const path = chat.state.sessionFile ?? null;
    if (path !== activePath) { setActivePath(path); void refreshSessions(); }
  }, [chat.loaded, chat.state?.sessionFile, activePath, refreshSessions]);

  const sendCmd = useCallback(
    async (cmd: any) => {
      const key = keyRef.current;
      if (!key) return null;
      const r = await post("/api/cmd", { key, cmd }).catch((e) => ({ ok: false, error: String(e) }));
      if (!r.ok) {
        setChat({
          type: "extension_ui_request",
          method: "notify",
          notifyType: "error",
          message: r.error ?? "command failed",
          id: Math.random().toString(36),
        });
      }
      refreshState();
      return r;
    },
    [refreshState, setChat]
  );

  const onSend = useCallback(
    async (text: string, images: any[]) => {
      const key = keyRef.current;
      if (!key || chat.running || chat.state?.isStreaming) return false;
      const cmd: any = { type: "prompt", message: text };
      if (images.length) cmd.images = images.map((i) => ({ type: "image", data: i.data, mimeType: i.mimeType }));
      const r = await post("/api/cmd", { key, cmd }).catch((e) => ({ ok: false, error: String(e) }));
      if (!r.ok) {
        setChat({
          type: "extension_ui_request",
          method: "notify",
          notifyType: "error",
          message: r.error,
          id: Math.random().toString(36),
        });
      }
      setTimeout(() => refreshState(), 400);
      return !!r.ok;
    },
    [chat.running, chat.state?.isStreaming, refreshState, setChat]
  );

  const onAbort = useCallback(async () => {
    const key = keyRef.current;
    if (!key) return;
    await post("/api/cmd", { key, cmd: { type: "abort" } }).catch(() => {});
    refreshState();
  }, [refreshState]);

  const onRespond = useCallback(async (d: any, response: any) => {
    const key = keyRef.current;
    if (!key) return false;
    try {
      await post("/api/ui", { key, response: { id: d.id, ...response } });
      if (key !== keyRef.current) return false;
      dispatch((s) => ({ ...s, dialogs: s.dialogs.filter((x) => x.id !== d.id) }));
      return true;
    } catch (error: any) {
      setChat({ type: 'extension_ui_request', method: 'notify', notifyType: 'error', message: 'Could not deliver your answer: ' + error.message });
      return false;
    }
  }, []);

  const copy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  }, []);

  /* ---------- settle → resync ---------- */
  const wasRunning = useRef(false);
  useEffect(() => {
    if (chat.running) {
      wasRunning.current = true;
      return;
    }
    if (!wasRunning.current || !chat.loaded) return;
    wasRunning.current = false;
    const t = setTimeout(async () => {
      const key = keyRef.current;
      if (!key) return;
      const s = await post("/api/cmd", { key, cmd: { type: "get_session_stats" } }).catch(() => null);
      if (s?.ok) setStats(s.data);
      refreshState();
      refreshSessions();
    }, 600);
    return () => clearTimeout(t);
  }, [chat.running, chat.loaded, refreshState, refreshSessions]);

  /* ---------- scroll ---------- */
  const scrollToLatest = useCallback((smooth = true) => {
    if (home || inSettings) return;
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  }, [home,inSettings]);

  useEffect(() => {
    if (inSettings) return;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      stickRef.current = near;
      setAtBottom(near);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [home,inSettings]);

  useEffect(() => {
    if (home && !inSettings) scrollRef.current?.scrollTo({top:0,behavior:"instant"});
  }, [home,inSettings]);

  useEffect(() => {
    if (stickRef.current) scrollToLatest(false);
  }, [chat.messages, chat.live, chat.tools, chat.outputs, scrollToLatest]);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if(e.defaultPrevented)return;
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "TEXTAREA" || tag === "INPUT";
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        if (inSettings) navigate("/");
        else navigate("/settings");
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setRailOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        transitionUpdate(()=>setSidebarCollapsed((v) => !v));
      }
      if (e.key === "Escape" && !typing) {
        if (inSettings) navigate("/");
        else if (chat.running || chat.state?.isStreaming) onAbort();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chat.running, chat.state?.isStreaming, onAbort, inSettings]);

  /* ---------- actions ---------- */
  const leaveProject=async()=>{const b=await get("/api/bootstrap");localStorage.setItem(LS_CWD,b.cwd);setBoot(b);navigate("/");setHome(false);await attach(`new:${Date.now()}`,undefined,b.cwd);};
  const newSession = () => {void leaveProject();};
  const newProjectChat=(path:string)=>{localStorage.setItem(LS_CWD,path);setBoot((b:any)=>({...b,cwd:path}));navigate("/");setHome(false);attach(`new:${Date.now()}`,undefined,path);};
  const openSession = (s: any) => { navigate("/");setHome(false);if(s.cwd){localStorage.setItem(LS_CWD,s.cwd);setBoot((b:any)=>({...b,cwd:s.cwd}));}attach(`s:${s.path}`,s.path,s.cwd); };
  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.action === 'settings') { openSettings(); return; }
      const session = detail?.session;
      if (detail?.action !== 'chat') return;
      if (typeof session?.key === 'string') {
        navigate('/');
        setHome(false);
        if (session.cwd) {
          setBoot((previous: any) => ({...previous, cwd: session.cwd}));
          localStorage.setItem(LS_CWD, session.cwd);
        }
        void attach(session.key, session.path, session.cwd);
      } else if (typeof session?.path === 'string') openSession(session);
    };
    window.addEventListener('omp:tray-action', handle);
    return () => window.removeEventListener('omp:tray-action', handle);
  }, [attach]);
  const deleteSession = async (s: any) => {
    await del(`/api/session?path=${encodeURIComponent(s.path)}`).catch(() => {});
    clearSessionMeta(s.path);
    if (activePath === s.path) newSession();
    refreshSessions();
  };
  const renameSession = async (s: any, name: string) => {
    if (!name) return;
    if (activePath === s.path) {
      await sendCmd({ type: "set_session_name", name });
    } else {
      await attach(`s:${s.path}`, s.path);
      await new Promise((r) => setTimeout(r, 800));
      await sendCmd({ type: "set_session_name", name });
    }
    setTimeout(refreshSessions, 400);
  };
  const changeCwd = (next: string) => {
    navigate("/"); setHome(false); unsubRef.current?.(); ++attachVersion.current;
    dispatch({...initialChat});setConnected(false);setModels([]);setStats(null);setActivePath(null);
    localStorage.setItem(LS_CWD, next);
    setBoot(null);
    keyRef.current = null;
    get(`/api/bootstrap?cwd=${encodeURIComponent(next)}`)
      .then((b) => setBoot(b))
      .catch(() => {});
  };
  const setFlags = (f: string[]) => {
    setFlagsState(f);
    localStorage.setItem(LS_FLAGS, JSON.stringify(f));
  };

  const regenerate = useCallback(
    async (index: number) => {
      if(chat.running||chat.state?.isStreaming)return;
      const user=chat.messages.slice(0,index).findLast(m=>m.role==='user');if(!user)return;
      const r=await post('/api/cmd',{key:keyRef.current,cmd:{type:'get_entries'}});if(!r.ok)return;
      const entry=(r.data?.entries||[]).find((e:any)=>e.type==='message'&&e.message?.role==='user'&&String(e.message.timestamp)===String(user.timestamp));if(!entry)return;
      const rewound=await sendCmd({type:'navigate_tree',entryId:entry.id,summarize:false});if(!rewound?.ok||rewound.data?.cancelled)return;
      await attach(keyRef.current!,activePath||undefined);
      const text=typeof user.content==='string'?user.content:(user.content||[]).filter((b:any)=>b.type==='text').map((b:any)=>b.text).join('\n');
      await onSend(text,(user.content||[]).filter?.((b:any)=>b.type==='image')||[]);
    },
    [chat.messages,chat.running,chat.state?.isStreaming,onSend,sendCmd,attach,activePath]
  );

  async function editMessage(index:number,text:string){
    if(chat.running||chat.state?.isStreaming)return false;
    const user=chat.messages[index];if(user?.role!=='user')return false;
    const response=await post('/api/cmd',{key:keyRef.current,cmd:{type:'get_entries'}});
    const entry=(response.data?.entries||[]).find((e:any)=>e.type==='message'&&e.message?.role==='user'&&String(e.message.timestamp)===String(user.timestamp));if(!entry)return false;
    const rewound=await sendCmd({type:'navigate_tree',entryId:entry.id,summarize:false});if(!rewound?.ok||rewound.data?.cancelled)return false;
    await attach(keyRef.current!,activePath||undefined);
    return onSend(text,Array.isArray(user.content)?user.content.filter((b:any)=>b.type==='image'):[]);
  }

  const results = useMemo(() => buildResultMap(chat.messages), [chat.messages]);
  const changes = useMemo(()=>fileChangeSummaries(chat.messages,results),[chat.messages,results]);
  const running = !!(chat.running || chat.state?.isStreaming);
  const visibleMessages = chat.messages;
  const renderedMessages=useMemo(()=>groupedTranscript(visibleMessages,chat.live),[visibleMessages,chat.live]);
  const [entries,setEntries] = useState<any[]>([]);
  useEffect(()=>{let active=true;if(!chat.loaded || running || !chat.key)return;post("/api/cmd",{key:chat.key,cmd:{type:"get_entries"}}).then(r=>{if(active)setEntries(r.ok?r.data?.entries || []:[])}).catch(()=>{if(active)setEntries([])});return()=>{active=false}},[chat.key,chat.loaded,running,chat.messages.length]);
  const restoreTargets = useMemo(() => conversationRestoreTargets(chat.messages, entries), [entries, chat.messages]);
  async function restoreMessage(index: number) {
    const entryId = restoreTargets.get(index);
    if (running || !entryId) return;
    const response = await sendCmd({ type: "navigate_tree", entryId, summarize: false });
    if (response?.ok && !response.data?.cancelled) await attach(keyRef.current!, activePath || undefined);
  }
  const empty = chat.loaded && visibleMessages.length === 0 && !chat.live;

  const turnSections=useMemo(()=>visibleMessages.flatMap((m,i)=>{if(m.role!=="user")return [];const text=typeof m.content==="string"?m.content:(m.content || []).filter((b:any)=>b.type==="text").map((b:any)=>b.text).join(" ");return [{id:`msg-${i}`,label:String(text).replace(/\s+/g," ").slice(0,80)||"Image request"}]}).slice(-12),[visibleMessages]);

  const runningTools = Object.values(chat.tools ?? {}).filter((t: any) => !t.endedAt);
  const aiState=responsePhase(chat.live,runningTools);
  const composerRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{const node=composerRef.current;if(!node)return;const observer=new ResizeObserver(()=>node.closest<HTMLElement>(".workspace-main")?.style.setProperty("--composer-height",`${node.offsetHeight}px`));observer.observe(node);return()=>observer.disconnect();},[home,empty]);

  return (
    <FileOpenContext.Provider value={openFiles}><div className="app-shell relative isolate flex h-full w-full overflow-hidden bg-background text-foreground">
      {!inSettings&&<SharedWorkspaceBackground/>}
      <PageTransition id={inSettings?"settings":"workspace"} transition="fade" duration={180} className={`workspace-route flex h-full min-h-0 min-w-0 flex-1 ${fileRequest&&focusedEditor===chat.key&&!inSettings&&!home?"editor-focused":""}`}>
      {inSettings ? (
        <SettingsPage
          onBack={closeSettings}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={()=>transitionUpdate(()=>setSidebarCollapsed(v=>!v))}
          chat={chat}
          config={boot?.config}
          onConfigSaved={(c) => setBoot((b: any) => ({ ...b, config: c }))}
          onSend={(t) => onSend(t, [])}
          flags={flags}
          setFlags={setFlags}
          onRestart={async () => { if(running) { dispatch(s=>({...s,toasts:[...s.toasts,{id:String(Date.now()),kind:"info",text:"Finish or stop the current turn before restarting the runtime."}]})); return; } const current=keyRef.current; const file=activePath || chat.state?.sessionFile; unsubRef.current?.(); if(current) await del(`/api/bridge?key=${encodeURIComponent(current)}`); await attach(current || `new:${Date.now()}`,file || undefined); }}
          info={{ ...boot, cwd, projectPath: projectForSession({ cwd }, boot?.control?.projects || [])?.path }}
          onRefreshState={refreshState}
          onRefreshModels={refreshModels}
        />
      ) : (
        <>
      <LayoutMotion><div className="sidebar-container hidden h-full shrink-0 overflow-hidden md:flex" style={{width:sidebarCollapsed?64:264}}>
        <Sidebar
          cwd={cwd}
          loading={!boot}
          onHome={()=>transitionUpdate(()=>setHome(true))}
          onNewProject={()=>setProjectDialog(true)}
          onLeaveProject={leaveProject}
          onNewProjectChat={newProjectChat}
          projects={boot?.control?.projects || []}
          sessions={boot?.allSessions ?? boot?.sessions ?? []}
          activeSessionPath={activePath}
          busy={running}
          connected={connected}
          collapsed={sidebarCollapsed}
          onNew={newSession}
          onOpen={openSession}
          onDelete={deleteSession}
          onRename={renameSession}
          onOpenSettings={openSettings}
          onChangeCwd={changeCwd}
          onRefresh={() => {
            refreshSessions();
            refreshState();
          }}
          onToggleCollapsed={() => transitionUpdate(()=>setSidebarCollapsed((v) => !v))}
        />
      </div></LayoutMotion>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            cwd={cwd}
            loading={!boot}
            onHome={()=>{setHome(true);setMobileNav(false);}}
            onNewProject={()=>{setProjectDialog(true);setMobileNav(false);}}
            projects={boot?.control?.projects || []}
            sessions={boot?.allSessions ?? boot?.sessions ?? []}
            activeSessionPath={activePath}
            busy={running}
            connected={connected}
            collapsed={false}
            onNew={() => {
              newSession();
              setMobileNav(false);
            }}
            onOpen={(s) => {
              openSession(s);
              setMobileNav(false);
            }}
            onDelete={deleteSession}
            onRename={renameSession}
            onOpenSettings={() => {
              openSettings();
              setMobileNav(false);
            }}
            onChangeCwd={(next) => {
              changeCwd(next);
              setMobileNav(false);
            }}
            onRefresh={() => {
              refreshSessions();
              refreshState();
            }}
            onToggleCollapsed={() => setMobileNav(false)}
          />
        </SheetContent>
      </Sheet>

      <main className={`workspace-main relative isolate flex min-w-0 flex-1 flex-col ${home?"is-home":empty?"is-empty":""}`}>

        <TopBar
          showWindowControls={!fileRequest || home}
          title={home ? "Home" : chat.title || boot?.sessions?.find((s:any)=>s.path===activePath)?.name || (chat.messages.length ? "Untitled session" : "New session")}
          cwd={cwd}
          inProject={!!projectForSession({cwd},boot?.control?.projects||[])}
          onLeaveProject={leaveProject}
          connected={connected}
          modelId={chat.state?.model?.id}
          provider={chat.state?.model?.provider}
          running={running}
          notice={chat.notice}
          contextPercent={chat.state?.contextUsage?.percent}
          onOpenFiles={!home?()=>openFiles():undefined}
          filesOpen={!!fileRequest}
          showWorkspaceCards={!home&&!fileRequest}
          inspector={home||fileRequest?null:<RightRail enabled={!home} manual={railOpen} chat={chat} stats={stats} cwd={cwd} onCancelSubagent={id=>sendCmd({type:"cancel_subagent",subagentId:id})} onRequestPlan={()=>{setHome(false);setRailOpen(false);setSeed({text:"Help me create a step-by-step plan for ",n:Date.now()});}} />}
          railOpen={railOpen}
          onOpenSidebar={() => setMobileNav(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenSettings={openSettings}
          onToggleRail={() => transitionUpdate(()=>setRailOpen((v) => !v))}
        />

        <div className="transcript-region relative min-h-0 flex-1">
          <div ref={scrollRef} className="h-full overflow-y-auto">
          {home ? <SkeletonReveal loading={!boot} skeleton={<HomeSkeleton/>} label="Loading workspace"><HomeOverview projects={boot?.control?.projects || []} sessions={boot?.allSessions || boot?.sessions || []} onCreate={()=>setProjectDialog(true)} onProject={changeCwd} onSession={openSession}/></SkeletonReveal> : <>
            <div className="transcript-content mx-auto w-full max-w-[800px] px-6 py-8">
              {false && chat.error && (
                <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-[12.5px] text-destructive">
                  {chat.error}
                </div>
              )}
              {chat.loaded && visibleMessages.length === 0 && !chat.live && (
                <EmptyState cwd={projectForSession<{path:string;name:string}>({cwd},boot?.control?.projects||[])?.name||""} onPick={(text) => void onSend(text,[])} />
              )}
              <SkeletonReveal loading={!chat.loaded} skeleton={<ChatSkeleton/>} label="Loading conversation history">
              <div className="transcript-list">
                {renderedMessages.map(({message:m,index:i,firstIndex,streaming,continuation}) => (
                  <div key={`msg-${firstIndex}`} id={`msg-${i}`} className={`transcript-message scroll-mt-24 ${continuation?"is-continuation":""} ${["developer","custom","hookMessage"].includes(m.role)?"is-note":""}`}>
                    {m.role==="assistant"&&!streaming&&replyVersions(entries,m.timestamp).length>1?(<MessageVersions
                      versions={replyVersions(entries,m.timestamp)} currentTimestamp={m.timestamp} files={changes.get(i)} cwd={changedFilesCwd} projectRoot={changedFilesRoot}
                      onContinue={async id=>{const r=await sendCmd({type:"navigate_tree",entryId:id,summarize:false});if(r?.ok&&!r.data?.cancelled)await attach(keyRef.current!,activePath||undefined);}}
                      streaming={streaming}
                      tools={chat.tools}
                      results={results}
                      actions={{
                        onCopy: copy,
                        onRestore: !streaming && restoreTargets.has(i) ? () => void restoreMessage(i) : undefined,
                        restoreDisabled: running,
                        onRegenerate: m.role === "assistant" ? () => regenerate(i) : undefined,
                        onEdit:
                          m.role === "user" && !running
                            ? (text) => editMessage(i,text)
                            : undefined,
                      }}
                    />):(<MessageRow
                      message={m}
                      streaming={streaming}
                      tools={chat.tools}
                      results={results}
                      actions={{
                        onCopy: copy,
                        onRestore: !streaming && restoreTargets.has(i) ? () => void restoreMessage(i) : undefined,
                        restoreDisabled: running,
                        onRegenerate: m.role === "assistant" ? () => regenerate(i) : undefined,
                        onEdit:
                          m.role === "user" && !running
                            ? (text) => editMessage(i,text)
                            : undefined,
                      }}
                    />)}
                    {changes.has(i) && !(m.role==="assistant"&&!streaming&&replyVersions(entries,m.timestamp).length>1) && <FilesChanged files={changes.get(i)!} cwd={changedFilesCwd} projectRoot={changedFilesRoot} />}
                  </div>
                ))}

                <RuntimeOutput outputs={chat.outputs} links={chat.authLinks} />
              </div>
              </SkeletonReveal>
            </div>
          </>}
          </div>

          {!home && !atBottom && visibleMessages.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => scrollToLatest()}
                  aria-label="Jump to latest"
                  className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-popover px-3 py-1.5 text-[11.5px] text-fog-200 elevate transition-colors t-fast hover:bg-secondary hover:text-fog-100"
                >
                  <ArrowDown className="size-3" />
                  latest
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">You are reading older messages</TooltipContent>
            </Tooltip>
          )}

          {!home && turnSections.length > 3 && (
            <ProximitySidebar
              sections={turnSections}
              side="left"
              className="absolute inset-y-0 left-0 z-10 hidden xl:flex"
            />
          )}
        </div>

        {!home && <div ref={composerRef} className="composer-region relative z-10 shrink-0 px-6 pt-3 pb-5">
          <div className="composer-frame relative mx-auto w-full max-w-[752px]"><div className="composer-blur-gradient" aria-hidden="true"/>
            {running && (
              <div className="mb-2 flex items-center gap-2">
                <AiStatus state={aiState as any} className="text-[11.5px] text-muted-foreground" />
                {runningTools.length > 0 && (
                  <span className="truncate font-mono text-[10.5px] text-muted-foreground">
                    {runningTools.map((t: any) => t.name).join(", ")}
                  </span>
                )}
                {turnSections.length > 1 && (
                  <ScrollProgress
                    placement="inline"
                    containerRef={scrollRef}
                    sections={turnSections.map((t) => ({ id: t.id, label: t.label }))}
                    offset={60}
                    className="ml-auto hidden md:block"
                  />
                )}
              </div>
            )}
            <ExtensionWidgets widgets={chat.widgets} placement="aboveEditor" />
            {projectForSession({cwd},boot?.control?.projects||[])&&chat.loaded&&<ProjectSuggestions chatKey={chat.key} projectPath={cwd} revision={chat.messages.length} running={running} empty={empty} onSelect={text=>void onSend(text,[])}/>}
            <Composer
              launchFlags={flags}
              chat={chat}
              stats={stats}
              commands={paletteCommands}
              models={models}
              thinkingLevels={thinkingLevels}
              onSend={onSend}
              onAbort={onAbort}
              onModelChange={(provider, id) => sendCmd({ type: "set_model", provider, modelId: id })}
              onThinkingChange={(level) => sendCmd({ type: "set_thinking_level", level })}
              onToggleFast={() => sendCmd({ type: "set_fast_mode", enabled: !chat.state?.fastModeEnabled })}
              onSlash={() => {}}
              seed={seed}
              onSeedConsumed={() => setSeed(null)}
            />
            <ExtensionWidgets widgets={chat.widgets} placement="belowEditor" />
          </div>
        </div>}
      </main>

        </>
      )}

      </PageTransition>
      {Object.entries(fileWorkspaces).map(([key,pane])=><Suspense key={key} fallback={null}><FileWorkspace chatKey={key} focused={focusedEditor===key} onToggleFocus={()=>transitionUpdate(()=>setFocusedEditor(current=>current===key?null:key))} cwd={pane.cwd} request={pane.request} hidden={home||inSettings||key!==chat.key} onClose={()=>{setFocusedEditor(current=>current===key?null:current);setFileWorkspaces(previous=>{const next={...previous};delete next[key];return next;});}}/></Suspense>)}
      <ProjectDialog open={projectDialog} onOpenChange={setProjectDialog} cwd={cwd} onCreated={changeCwd}/>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={paletteCommands}
        sessions={boot?.allSessions ?? boot?.sessions ?? []}
        activePath={activePath}
        onSlash={(name) => onSend(`/${name}`, [])}
        onNew={newSession}
        onOpenFiles={()=>openFiles()}
        onOpenSettings={openSettings}
        onRefresh={refreshSessions}
        onOpenSession={openSession}
      />

      {(chat.error || offline) && <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center p-6"><div role="alert" className="pointer-events-auto w-full max-w-md rounded-2xl border bg-popover p-6 shadow-2xl"><h2 className="text-base font-semibold">OMP is unavailable</h2><p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground">{chat.error || "The connection to the runtime was interrupted."}</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Make sure the local server and OMP runtime are running, then reconnect. Runtime details are available in Settings → Installation.</p><button className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={async()=>{reconnects.current=0;setOffline(false);if(!boot){try{const b=await get("/api/bootstrap");setBoot(b);dispatch(s=>({...s,error:null}));}catch(e:any){setChat({type:"snapshot_error",message:e.message});}}else await attach(keyRef.current || `new:${Date.now()}`,activePath || chat.state?.sessionFile || undefined);}}>Reconnect</button></div></div>}
      <DialogHost dialogs={chat.dialogs} authLinks={chat.authLinks} onRespond={onRespond} />
      <Toasts chat={chat} onDismiss={(id) => dispatch((s) => dismissToast(s, id))} />
      <Toaster position="bottom-right" theme="dark" />

    </div></FileOpenContext.Provider>
  );
}

function EmptyState({
  cwd,
  onPick,
}: {
  cwd: string;
  onPick: (text: string) => void;
}) {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const suggestions = [
    { label: "Build", icon: Code2, prompts: ["Build a new feature in this project", "Help me turn an idea into a working prototype", "Write tests for the main entry points"] },
    { label: "Explore", icon: ScanSearch, prompts: ["Walk me through the architecture of this codebase", "Explain how data flows through this project", "Find the most useful place to start contributing"] },
    { label: "Review", icon: GitPullRequest, prompts: ["Review the latest changes for bugs", "Find and fix any failing tests", "Look for performance bottlenecks in this project"] },
  ];
  return (
    <div className="welcome fade-up">
      <div className="mb-7 flex items-center gap-2.5 text-[13px] text-muted-foreground"><Brand className="size-6" />{cwd&&<span>{cwd.split(/[\\/]/).filter(Boolean).pop()}</span>}</div>
      <div>
        <h1 className="text-[clamp(28px,3.2vw,42px)] font-medium leading-[1.15] tracking-[-0.045em]">What are we working on?</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">Build, explore, or review your next idea.</p>
      </div>

    </div>
  );
}
