import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const MAX_BYTES=2*1024*1024;
const hash=(value:Buffer)=>createHash('sha256').update(value).digest('hex');
const inside=(root:string,file:string)=>{const rel=path.relative(root,file);return !rel||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
export async function resolveEditorPath(roots:string[],requested:string){
 const file=await fs.realpath(path.resolve(requested));
 const realRoots=await Promise.all(roots.map(r=>fs.realpath(r).catch(()=>null)));
 if(!realRoots.some(root=>root&&inside(root,file)))throw new Error('File is outside the selected workspace and reported changes.');
 return file;
}
export async function readEditorFile(roots:string[],requested:string){
 const file=await resolveEditorPath(roots,requested),stat=await fs.stat(file);
 if(!stat.isFile())throw new Error('Select a file to open.');if(stat.size>MAX_BYTES)throw new Error('This editor supports text files up to 2 MB.');
 const data=await fs.readFile(file);if(data.includes(0))throw new Error('Binary files cannot be edited here.');
 const content=data.toString('utf8');if(!Buffer.from(content,'utf8').equals(data))throw new Error('This file is not UTF-8 text.');
 return {path:file,content,version:hash(data),size:data.length};
}
export async function saveEditorFile(roots:string[],requested:string,content:string,version:string){
 if(Buffer.byteLength(content,'utf8')>MAX_BYTES)throw new Error('This editor supports text files up to 2 MB.');
 const current=await readEditorFile(roots,requested);
 if(current.version!==version)throw new Error('The file changed on disk. Reload it before saving your edits.');
 await fs.writeFile(current.path,content,'utf8');return readEditorFile(roots,current.path);
}
export async function listEditorFiles(roots:string[],requested:string,query=''){
 const directory=await resolveEditorPath(roots,requested),entries=await fs.readdir(directory,{withFileTypes:true});
 return {path:directory,entries:entries.filter(e=>!e.isSymbolicLink()&&!['.git','node_modules'].includes(e.name)&&e.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>Number(b.isDirectory())-Number(a.isDirectory())||a.name.localeCompare(b.name)).slice(0,200).map(e=>({name:e.name,path:path.join(directory,e.name),directory:e.isDirectory()}))};
}
export function reportedFileRoots(cwd:string,messages:any[]){
 const results=new Map(messages.filter(m=>m.role==='toolResult').map(m=>[m.toolCallId??m.tool_use_id??m.id,m]));
 const roots=[cwd];
 for(const message of messages)for(const block of Array.isArray(message.content)?message.content:[]){
  if(block.type!=='toolCall'||!['read','write','edit','ast_edit'].includes(block.name))continue;
  const result=results.get(block.id);if(!result||result.isError)continue;
  let args=block.arguments;try{if(typeof args==='string')args=JSON.parse(args);}catch{continue;}
  const file=args?.path??args?.file_path??args?.file;if(typeof file==='string')roots.push(path.dirname(path.resolve(cwd,file)));
 }
 return [...new Set(roots)];
}
