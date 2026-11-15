export function testSummary(output:string){
 const text=output.replace(/\x1b\[[0-9;]*m/g,''),count=(name:string)=>text.match(new RegExp('(?:^|\\n)[#ℹ\\s]*'+name+'\\s+(\\d+)\\s*(?:\\n|$)','i'))?.[1];
 const total=count('tests'),passed=count('pass'),failed=count('fail');
 if(total===undefined||passed===undefined||failed===undefined)return null;
 const skipped=Number(count('skipped')||0),cancelled=Number(count('cancelled')||0);
 if(Number(passed)+Number(failed)+skipped+cancelled!==Number(total))return null;
 return {total:Number(total),passed:Number(passed),failed:Number(failed),skipped,cancelled};
}
export function commitSummary(command:string,output:string){
 if(!/\bgit\s+commit\b/.test(command))return null;
 const match=output.match(/^\[([^\]\n]+?)\s+(?:\(root-commit\)\s+)?([a-f0-9]{7,40})\]\s+(.+)$/mi);
 return match?{branch:match[1],hash:match[2],message:match[3]}:null;
}
export function packageChanges(path:string,args:any){
 if(!/(^|[\\/])package\.json$/.test(path))return [];
 try{const before=JSON.parse(args.oldText??args.old_string),after=JSON.parse(args.newText??args.new_string),changes:any[]=[];
  for(const group of ['dependencies','devDependencies','peerDependencies','optionalDependencies'])for(const name of new Set([...Object.keys(before[group]||{}),...Object.keys(after[group]||{})])){
   const currentVersion=before[group]?.[name],newVersion=after[group]?.[name];if(currentVersion===newVersion)continue;
   let changeType:string=currentVersion===undefined?'added':newVersion===undefined?'removed':'patch';
   const old=String(currentVersion).match(/(\d+)\.(\d+)\.(\d+)/),next=String(newVersion).match(/(\d+)\.(\d+)\.(\d+)/);
   if(old&&next)changeType=old[1]!==next[1]?'major':old[2]!==next[2]?'minor':'patch';
   changes.push({name,currentVersion,newVersion,changeType,group});
  }return changes;
 }catch{return [];}
}
export function localPreviewURL(text:string){
 for(const match of text.matchAll(/https?:\/\/[^\s<>"']+/g))try{const url=new URL(match[0].replace(/[),.;]+$/,''));if(['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&!url.username&&!url.password&&![...url.searchParams.keys()].some(k=>/token|key|secret|code/i.test(k)))return url.href;}catch{}
 return null;
}
