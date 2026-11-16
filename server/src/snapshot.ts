type RpcClient = { send: (command: Record<string, unknown>, timeoutMs?: number) => Promise<any>; protocolVersion?: number; protocolReady?: Promise<void> };

export async function openSessionFile(client: RpcClient, sessionPath: string) {
  // open_session adopts a directory; switch_session opens a specific JSONL file.
  const result = await client.send({ type: "switch_session", sessionPath });
  if (result.cancelled) throw new Error("Session switch was cancelled by OMP");
}

/** Read the full transcript. OMP limits paged reads to 256 messages. */
export async function readChatSnapshot(client: RpcClient) {
  await client.protocolReady;
  const [state, transcript] = await Promise.all([
    client.send({ type: "get_state" }, 30_000),
    readMessages(client),
  ]);
  if (!Array.isArray(transcript?.messages)) throw new Error("OMP returned an invalid transcript");
  return { state, messages: transcript.messages, totalMessages: transcript.messages.length };
}

async function readMessages(client: RpcClient) {
  if (client.protocolVersion !== 2) return client.send({ type: 'get_messages' }, 30_000);
  const messages: any[] = [];
  let cursor: string | undefined;
  let total: number | undefined;
  const cursors = new Set<string>();
  try {
    do {
      const page = await client.send({ type: 'get_messages_page', ...(cursor ? { cursor } : {}), limit: 100 }, 30_000);
      if (!Array.isArray(page.messages) || !Number.isInteger(page.totalMessages) || page.totalMessages < 0 ||
          (total !== undefined && total !== page.totalMessages)) throw new Error('OMP returned an invalid transcript page');
      total = page.totalMessages;
      messages.push(...page.messages);
      if (messages.length > total!) throw new Error('OMP returned too many transcript messages');
      cursor = page.nextCursor;
      if (cursor && (typeof cursor !== 'string' || cursors.has(cursor) || !page.messages.length)) throw new Error('OMP repeated a transcript cursor');
      if (cursor) cursors.add(cursor);
    } while (cursor);
    if (messages.length !== total) throw new Error('OMP returned an incomplete transcript');
    return { messages };
  } catch (error: any) {
    if (error.code === 'session_busy' || error.code === 'stale_cursor') return client.send({ type: 'get_messages' }, 30_000);
    throw error;
  }
}
