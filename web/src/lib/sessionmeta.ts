/**
 * Client-side session metadata (pin, archive, and sidebar project).
 *
 * OMP stores a session's name in the JSONL file (RPC `set_session_name`), but
 * it has no notion of pinning or archiving a thread. Rather than fake a
 * backend, these preferences live in localStorage keyed by session path. They
 * are only used for organization — deleting the session drops them, and they
 * never leave this browser.
 */

import { projectForSession } from "../../../shared/workspace.ts";

export type SessionMeta = { pinned?: boolean; archived?: boolean; projectId?: string | null };

const KEY = "ompfe.sessionmeta";

type MetaMap = Record<string, SessionMeta>;
const listeners = new Set<() => void>();

function read(): MetaMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as MetaMap) : {};
  } catch {
    return {};
  }
}

function write(map: MetaMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
  listeners.forEach((fn) => fn());
}

export function getSessionMeta(path: string): SessionMeta {
  return read()[path] ?? {};
}

export function setSessionMeta(path: string, patch: SessionMeta) {
  const map = read();
  const next = { ...map[path], ...patch };
  if (!next.pinned && !next.archived && next.projectId === undefined) delete map[path];
  else map[path] = next;
  write(map);
}

export function clearSessionMeta(path: string) {
  const map = read();
  if (!(path in map)) return;
  delete map[path];
  write(map);
}

export function subscribeSessionMeta(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function sidebarProjectForSession<T extends { id: string; path: string }>(
  session: { path: string; cwd?: string },
  projects: T[],
): T | undefined {
  const { projectId } = getSessionMeta(session.path);
  if (projectId === null) return undefined;
  return projects.find(project => project.id === projectId) ?? projectForSession(session, projects);
}

export type Group = { label: string; items: any[] };

const DAY = 86_400_000;

function dayStart(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

/** Pinned first, then Today / Yesterday / Previous 7 days / Older. */
export function groupSessions(sessions: any[], includeArchived = false): Group[] {
  const pinned: any[] = [];
  const buckets: Group[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  const now = dayStart(new Date());

  for (const s of sessions) {
    const m = getSessionMeta(s.path);
    if (m.archived && !includeArchived) continue;
    if (m.pinned && !m.archived) {
      pinned.push(s);
      continue;
    }
    const t = Date.parse(s.updatedAt ?? s.timestamp ?? "") || 0;
    const diff = Math.floor((now - dayStart(new Date(t))) / DAY);
    if (diff <= 0) buckets[0].items.push(s);
    else if (diff === 1) buckets[1].items.push(s);
    else if (diff < 7) buckets[2].items.push(s);
    else buckets[3].items.push(s);
  }

  const out: Group[] = [];
  if (pinned.length) out.push({ label: "Pinned", items: pinned });
  for (const b of buckets) if (b.items.length) out.push(b);
  return out;
}

export function archivedCount(sessions: any[]): number {
  return sessions.reduce((n, s) => n + (getSessionMeta(s.path).archived ? 1 : 0), 0);
}
