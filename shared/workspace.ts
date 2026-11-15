export function workspacePath(value:string) {const path=value.replace(/\\/g,"/").replace(/\/+$/,"");return /^[a-z]:/i.test(path)?path.toLowerCase():path;}
export function projectForSession<T extends {path:string}>(session:{cwd?:string},projects:T[]):T|undefined {
 const cwd=workspacePath(session.cwd||"");return [...projects].sort((a,b)=>b.path.length-a.path.length).find(p=>{const root=workspacePath(p.path);return cwd===root||cwd.startsWith(root+"/");});
}
