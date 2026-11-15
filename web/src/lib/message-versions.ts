export type ReplyVersion={id:string;message:any;messages:any[];userText:string};
/** Native sibling user entries are regenerated/edited versions at the same branch point. */
export function replyVersions(entries:any[],timestamp:any):ReplyVersion[]{
 const byId=new Map(entries.map(e=>[e.id,e])),children=new Map<string,any[]>();for(const e of entries){const list=children.get(e.parentId)||[];list.push(e);children.set(e.parentId,list);}
 const current=entries.find(e=>e.type==='message'&&e.message?.role==='assistant'&&String(e.message.timestamp)===String(timestamp));if(!current)return [];
 let user=current;const seen=new Set();while(user?.message?.role!=='user'){if(!user||seen.has(user.id))return [];seen.add(user.id);user=byId.get(user.parentId);}
 const siblings=(children.get(user.parentId)||[]).filter(e=>e.type==='message'&&e.message?.role==='user');if(siblings.length<2)return [];
 const versions:ReplyVersion[]=[];
 for(const sibling of siblings){const walk=(entry:any,path:any[],depth:number)=>{if(depth>2000||versions.length>=12)return;const next=(children.get(entry.id)||[]).filter(e=>e.message?.role!=='user');const messages=[...path,...(entry.type==='message'?[entry.message]:[])];if(!next.length){const last=messages.findLast(m=>m.role==='assistant');if(last){const leaf=entries.find(e=>e.message===last);versions.push({id:leaf.id,message:{...last,turnMessages:messages.filter(m=>m.role==='assistant')},messages,userText:typeof sibling.message.content==='string'?sibling.message.content:(sibling.message.content||[]).filter((b:any)=>b.type==='text').map((b:any)=>b.text).join('\n')});}}else for(const child of next)walk(child,messages,depth+1);};walk(sibling,[],0);}
 return [...new Map(versions.map(v=>[v.id,v])).values()];
}
