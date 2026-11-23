type Bridge = { cwd: string; state: any };
type Session = { path: string; cwd: string; name?: string; preview?: string };
export function desktopTrayData(
  sessions: Session[],
  bridges: Map<string, Bridge>,
) {
  const title = (value: string) =>
    value.replace(/[\r\n\t]/g, " ").slice(0, 100);
  const recent = sessions.slice(0, 3).map((session) => ({
    key: [...bridges].find(
      ([, bridge]) => bridge.state?.sessionFile === session.path,
    )?.[0],
    path: session.path,
    cwd: session.cwd,
    name: title(session.name || session.preview || "Untitled session"),
  }));
  const running = [...bridges]
    .filter(([, bridge]) => bridge.state?.isStreaming)
    .map(([key, bridge]) => ({
      key,
      path: bridge.state?.sessionFile,
      cwd: bridge.cwd,
      name: title(bridge.state?.sessionName || "Running session"),
    }));
  return { recent, running };
}
