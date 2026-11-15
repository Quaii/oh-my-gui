type RpcClient = { send: (command: Record<string, unknown>, timeoutMs?: number) => Promise<any> };

export async function openSessionFile(client: RpcClient, sessionPath: string) {
  // open_session adopts a directory; switch_session opens a specific JSONL file.
  const result = await client.send({ type: "switch_session", sessionPath });
  if (result.cancelled) throw new Error("Session switch was cancelled by OMP");
}

/** Read the full transcript. OMP limits paged reads to 256 messages. */
export async function readChatSnapshot(client: RpcClient) {
  const [state, transcript] = await Promise.all([
    client.send({ type: "get_state" }, 30_000),
    client.send({ type: "get_messages" }, 30_000),
  ]);
  if (!Array.isArray(transcript?.messages)) throw new Error("OMP returned an invalid transcript");
  return { state, messages: transcript.messages, totalMessages: transcript.messages.length };
}
