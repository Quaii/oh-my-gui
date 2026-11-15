import {execFile} from'node:child_process';
const cache=new Map<string,{expires:number;value:Promise<any>}>();
function githubCredential(cwd:string):Promise<string>{return new Promise((resolve,reject)=>{const child=execFile('git',['credential','fill'],{cwd,windowsHide:true,timeout:8000,maxBuffer:65536,env:{...process.env,GCM_INTERACTIVE:'Never',GIT_TERMINAL_PROMPT:'0',GCM_GUI_PROMPT:'0'}},(error,stdout)=>{if(error)return reject(Error('GitHub login unavailable'));const values=Object.fromEntries(String(stdout).trim().split(/\r?\n/).map(line=>{const n=line.indexOf('=');return [line.slice(0,n),line.slice(n+1)];}));if(!values.password||values.host&&values.host.toLowerCase()!=='github.com')return reject(Error('GitHub login unavailable'));resolve(values.password);});child.stdin?.end('protocol=https\nhost=github.com\n\n');});}
/** The credential stays in memory and is sent only to GitHub's API, never to the frontend. */
export async function gitLoginActivity(repository:string,branch:string,cwd:string){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repository))throw Error('Invalid GitHub repository');
 const key=cwd+'|'+repository+'|'+branch,hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.value;
 const value=(async()=>{const credential=await githubCredential(cwd),headers={Authorization:'Bearer '+credential,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'omp-frontend'};
  const request=async(path:string)=>{const response=await fetch('https://api.github.com/'+path,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('GitHub request failed ('+response.status+')');return response.json();};
  const [account,issues,contributors]=await Promise.all([request('user'),request('repos/'+repository+'/issues?state=open&per_page=8'),request('repos/'+repository+'/contributors?per_page=8')]);
  return {repository,branch,authenticated:true,contributions:[],account:{login:account.login,avatar_url:account.avatar_url},issues:issues.map((i:any)=>({id:i.id,number:i.number,title:i.title,url:i.html_url,pullRequest:!!i.pull_request})),contributors:contributors.map((c:any)=>({login:c.login,avatar_url:c.avatar_url,url:c.html_url,contributions:c.contributions}))};
 })();cache.set(key,{expires:Date.now()+15000,value});try{return await value;}catch(error){cache.delete(key);throw error;}
}
