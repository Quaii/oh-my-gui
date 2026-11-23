import { isDeviceMountNotice } from "./conversation-actions.ts";
function text(content:any):string {return typeof content==="string"?content:Array.isArray(content)?content.filter(b=>b?.type==="text").map(b=>b.text||"").join(""):"";}
export function hasVisibleMessage(message:any):boolean {
 if(isTurnNote(message.role)&&isDeviceMountNotice(text(message.content)||message.text||"",message.level||message.severity||"info"))return false;
 if(message.role==="toolResult")return false;
 if(message.role==="assistant")return !!message.errorMessage||(Array.isArray(message.content)?message.content.some((b:any)=>b&&(b.type==="toolCall"||b.type==="image"||b.type==="redactedThinking"||b.type==="text"&&String(b.text||"").trim()||b.type==="thinking"&&String(b.thinking||b.text||"").trim())):!!text(message.content).trim());
 if(["bashExecution","pythonExecution","compactionSummary","branchSummary"].includes(message.role))return true;
 return !!(text(message.content)||message.text||message.summary)||(Array.isArray(message.content)&&message.content.some((b:any)=>b.type==="image"));
}
export function transcriptItems(messages:any[]) {
 const items:{message:any;index:number;continuation:boolean}[]=[];
 messages.forEach((message,index)=>{if(hasVisibleMessage(message)){const previous=items.at(-1)?.message;items.push({message,index,continuation:message.role==="assistant"&&previous?.role==="assistant"});}});return items;
}

/** Stream deltas may open many adjacent thinking blocks. Preserve tool/text boundaries. */
export function coalesceAssistantBlocks(content:any):any[] {
 const blocks=Array.isArray(content)?content:typeof content==='string'?[{type:'text',text:content}]:[],result:any[]=[];
 for(const block of blocks){if(!block)continue;
  if(block.type==='thinking'){const value=typeof block.thinking==='string'?block.thinking:typeof block.text==='string'?block.text:Array.isArray(block.thinking)?block.thinking.map((b:any)=>b.text||'').join(''):'';
   const previous=result.at(-1);if(previous?.type==='thinking')previous.thinking+="\n\n"+value;else result.push({...block,thinking:value});
  }else if(block.type==='text'&&result.at(-1)?.type==='text'){result.at(-1).text+=block.text||'';}else result.push({...block});
 }return result;
}
export function isTurnNote(role: string) {
  return ["developer", "custom", "hookMessage", "system"].includes(role);
}

export function activityToolKind(name: string) {
  if (["edit", "write", "ast_edit", "apply_patch"].includes(name)) return "change";
  if (["bash", "powershell", "terminal", "exec_command"].includes(name)) return "command";
  if (/(^|_)web_search$/.test(name)) return "search";
  if (["read", "glob", "grep", "ls", "find"].includes(name)) return "inspect";
  return "other";
}

type TranscriptRow = ReturnType<typeof transcriptItems>[number] & { firstIndex: number; streaming: boolean };

/** A stable row for contiguous work; native indices still own restore and file actions. */
export function groupedTranscript(messages: any[], live?: any, running = false): TranscriptRow[] {
  const rows: TranscriptRow[] = [];
  let activity: ReturnType<typeof transcriptItems> = [];
  const flush = () => {
    if (!activity.length) return;
    const first = activity[0];
    const lastAssistant = activity.findLast(item => item.message.role === "assistant");
    const anchor = lastAssistant ?? first;
    rows.push({
      ...anchor,
      firstIndex: first.index,
      continuation: false,
      streaming: !!live && anchor.index === messages.length,
      message: { ...anchor.message, role: lastAssistant ? "assistant" : "turnActivity", turnMessages: activity.map(item => item.message) },
    });
    activity = [];
  };

  for (const item of transcriptItems(live ? [...messages, live] : messages)) {
    if (item.message.role === "assistant" || isTurnNote(item.message.role)) {
      activity.push(item);
    } else {
      flush();
      rows.push({ ...item, firstIndex: item.index, streaming: false });
    }
  }
  flush();
  if (running && rows.at(-1)?.message.role === "user") {
    rows.push({
      message: { role: "turnActivity", turnMessages: [] },
      index: messages.length,
      firstIndex: messages.length,
      continuation: false,
      streaming: false,
    });
  }
  return rows;
}

export function isThinkingTurn(messages: any[]) {
  return messages.every(message => message.role !== "assistant" ||
    (!message.errorMessage && coalesceAssistantBlocks(message.content).every(block =>
      block.type === "thinking" || block.type === "redactedThinking" ||
      (block.type === "text" && !block.text?.trim()))));
}

/** Keep narrated progress in order and only promote the final response after the last tool call. */
export function splitAssistantTurn(messages: any[]) {
  const assistant = messages.findLastIndex(message => message.role === "assistant");
  const activity: any[] = [];
  let reply: any;
  const simpleReply = assistant >= 0 && messages.every(message =>
    message.role === "assistant" && !message.errorMessage &&
    coalesceAssistantBlocks(message.content).every(block => block.type === "text" || block.type === "image"));
  if (simpleReply) {
    reply = { ...messages[assistant], content: coalesceAssistantBlocks(messages.flatMap(message => coalesceAssistantBlocks(message.content))) };
    return { activity, reply };
  }

  messages.forEach((message, index) => {
    if (message.role !== "assistant") {
      activity.push(message);
      return;
    }
    const blocks = coalesceAssistantBlocks(message.content);
    const lastTool = blocks.findLastIndex(block => block.type === "toolCall");
    if (index !== assistant) {
      activity.push({ ...message, content: blocks });
      return;
    }
    const replyBlocks = blocks.slice(lastTool + 1).filter(block => block.type === "text" || block.type === "image");
    const activityBlocks = blocks.filter((block, i) => i <= lastTool || (block.type !== "text" && block.type !== "image"));
    if (activityBlocks.length) activity.push({ ...message, content: activityBlocks, errorMessage: undefined });
    if (replyBlocks.length || message.errorMessage) reply = { ...message, content: replyBlocks };
  });
  return { activity, reply };
}

export function conversationSections(messages: any[]) {
  const sections: { id: string; label: string; preview?: string }[] = [];
  let section: (typeof sections)[number] | undefined;
  let turn: any[] = [];
  const excerpt = (value: string, limit: number) => {
    const flat = value.replace(/\s+/g, " ").trim();
    return flat.length > limit ? flat.slice(0, limit - 1).trimEnd() + "…" : flat;
  };
  const finish = () => {
    if (!section) return;
    const { reply } = splitAssistantTurn(turn);
    const preview = excerpt(text(reply?.content), 280);
    sections.push(preview ? { ...section, preview } : section);
  };

  messages.forEach((message, index) => {
    if (message.role === "user") {
      finish();
      section = { id: `msg-${index}`, label: excerpt(text(message.content), 140) || "Image request" };
      turn = [];
    } else if (section && (message.role === "assistant" || isTurnNote(message.role)) && hasVisibleMessage(message)) {
      turn.push(message);
    }
  });
  finish();
  return sections;
}
