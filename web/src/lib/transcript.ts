import { isDeviceMountNotice } from "./conversation-actions.ts";
function text(content:any):string {return typeof content==="string"?content:Array.isArray(content)?content.filter(b=>b?.type==="text").map(b=>b.text||"").join(""):"";}
export function hasVisibleMessage(message:any):boolean {
 if(["developer","custom","hookMessage"].includes(message.role)&&isDeviceMountNotice(text(message.content)||message.text||"",message.level||message.severity||"info"))return false;
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
export function responsePhase(live:any,tools:any[]):'thinking'|'researching'|'analyzing'|'writing'{
 if(tools.some(t=>/web|fetch|search/.test(t.name)))return 'researching';if(tools.length)return 'analyzing';
 const blocks=coalesceAssistantBlocks(live?.content);const tail=blocks.at(-1);
 return tail?.type==='text'&&tail.text?.trim()?'writing':tail?.type==='toolCall'?'analyzing':'thinking';
}
/** One visible assistant turn per user request, retaining the native end index for file/checkpoint actions. */
export function groupedTranscript(messages:any[],live?:any){
 const input=transcriptItems(live?[...messages,live]:messages),output:any[]=[];
 for(const [position,item] of input.entries()){const previous=output.at(-1);const streaming=!!live&&item.index===messages.length;
  const taskReminder=(message:any)=>['developer','custom','hookMessage'].includes(message.role)&&/incomplete todo|unfinished/i.test(text(message.content)||message.text||'');
  // Automatic todo reminders belong to the ongoing turn, rather than creating
  // another top-level answer/thought pair. Keep the original messages intact.
  if(taskReminder(item.message)&&previous?.message.role==='assistant'&&input.slice(position+1).find(next=>!taskReminder(next.message))?.message.role==='assistant'){
   previous.message={...previous.message,turnMessages:[...(previous.message.turnMessages||[previous.message]),item.message]};continue;
  }
  if(item.message.role==='assistant'&&previous?.message.role==='assistant'){
   const turnMessages=[...(previous.message.turnMessages||[previous.message]),item.message];
   previous.message={...item.message,turnMessages};previous.index=item.index;previous.streaming=streaming;
  }else output.push({...item,firstIndex:item.index,streaming});
 }return output;
}
