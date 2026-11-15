export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text };
  }
  if (!res.ok) throw new Error(body?.error || `${res.status} ${res.statusText}`);
  return body as T;
}

export const get = <T = any>(p: string) => api<T>(p);
export const post = <T = any>(p: string, body: unknown) => api<T>(p, { method: "POST", body: JSON.stringify(body) });
export const put = <T = any>(p: string, body: unknown) => api<T>(p, { method: "PUT", body: JSON.stringify(body) });
export const del = <T = any>(p: string) => api<T>(p, { method: "DELETE" });

/** Subscribe to the SSE stream. Returns an unsubscribe function. */
export function subscribeEvents(
  key: string,
  onRecord: (rec: any) => void,
  onStatus?: (s: "open" | "closed" | "error") => void
): () => void {
  const es = new EventSource(`/api/events?key=${encodeURIComponent(key)}`);
  es.onopen = () => onStatus?.("open");
  es.onmessage = (ev) => {
    try {
      onRecord(JSON.parse(ev.data));
    } catch {}
  };
  es.onerror = () => onStatus?.("error");
  return () => {
    es.close();
    onStatus?.("closed");
  };
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)}${units[i]}`;
}

export function money(n: number | null | undefined): string {
  if (typeof n !== "number") return "-";
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function ago(iso: string | number | undefined): string {
  if (!iso) return "";
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  const d = Date.now() - t;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(t).toLocaleDateString();
}
