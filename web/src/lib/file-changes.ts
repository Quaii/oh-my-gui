export type FileChange={path:string;added:number|null;removed:number|null;diff:string;calls:number};
const lines=(s:string)=>s ? s.replace(/\n$/," ").split("\n").length : 0;
export function turnFileChanges(messages:any[],end:number,results:Record<string,any>):FileChange[]{
 let start=end;while(start>0&&messages[start]?.role!=="user")start--;
 const files=new Map<string,FileChange>();
 for(const message of messages.slice(start,end+1))for(const call of Array.isArray(message.content)?message.content:[]){
   if(call.type!=="toolCall"||!["edit","write","ast_edit"].includes(call.name))continue;
   const result=results[call.id];if(!result||result.isError)continue;
   let args=call.arguments;try{if(typeof args==="string")args=JSON.parse(args)}catch{continue}
   const path=args?.path??args?.file_path??args?.file;if(typeof path!=="string")continue;
   const previous=files.get(path);let added:number|null=null,removed:number|null=null;
   const diff=result.details?.diff??result.result?.details?.diff??"";
   if(typeof diff==="string"&&/^[-+]/m.test(diff)){added=diff.split("\n").filter(l=>l.startsWith("+")&&!l.startsWith("+++")).length;removed=diff.split("\n").filter(l=>l.startsWith("-")&&!l.startsWith("---")).length;}
   else if(typeof args.oldText==="string"&&typeof args.newText==="string"){added=lines(args.newText);removed=lines(args.oldText);}
   const edits=Array.isArray(args.edits)?args.edits:[];
   if(edits.length&&edits.every((e:any)=>typeof e.old_text==="string"&&typeof e.new_text==="string")){added=edits.reduce((n:number,e:any)=>n+lines(e.new_text),0);removed=edits.reduce((n:number,e:any)=>n+lines(e.old_text),0);}
   files.set(path,{path,added:added===null||previous?.added===null?null:added+(previous?.added||0),removed:removed===null||previous?.removed===null?null:removed+(previous?.removed||0),diff:typeof diff==="string"?diff:"",calls:(previous?.calls||0)+1});
 }
 return [...files.values()];
}
export function fileChangeSummaries(messages:any[],results:Record<string,any>){
 const summaries=new Map<number,FileChange[]>();let last=-1,start=0;
 const finish=()=>{if(last>=0){const changes=turnFileChanges(messages.slice(start,last+1),last-start,results);if(changes.length)summaries.set(last,changes);}};
 messages.forEach((m,i)=>{if(m.role==="user"){finish();start=i;last=-1;}else if(m.role==="assistant")last=i;});finish();return summaries;
}
