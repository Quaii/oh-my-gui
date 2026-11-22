/** Routine device catalog chatter is retained in history, but has no chat UI. */
export function isDeviceMountNotice(text: string, kind = "info"): boolean {
  if (!["info", "notice", "success"].includes(kind)) return false;
  return /^xd:\/\/:\s+(?:mounted|unmounted)\s+[\w./:-]+(?:\s*,\s*[\w./:-]+)*\s*$/i.test(text.trim());
}

/** Match native entries without changing transcript indices or guessing a branch. */
export function conversationRestoreTargets(messages: any[], entries: any[]): Map<number, string> {
  const targets = new Map<number, string>();
  messages.forEach((message, index) => {
    if (!["user", "assistant"].includes(message.role) || message.timestamp == null) return;
    const matches = entries.filter(entry => entry.type === "message" &&
      entry.message?.role === message.role && entry.message.timestamp != null &&
      String(entry.message.timestamp) === String(message.timestamp));
    if (matches.length === 1 && typeof matches[0].id === "string") targets.set(index, matches[0].id);
  });
  return targets;
}
