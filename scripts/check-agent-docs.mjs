import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const files=['AGENTS.md','CLAUDE.md','DESIGN.md','README.md','CAPABILITIES.md','.agents/skills/README.md'];
const skills=await fs.readdir(path.join(root,'.agents/skills'),{withFileTypes:true});
const adapters=await fs.readdir(path.join(root,'.claude/skills'),{withFileTypes:true});
for(const entry of adapters.filter(entry=>entry.isDirectory())){
  if(!skills.some(skill=>skill.isDirectory()&&skill.name===entry.name))failures.push(`.claude/skills/${entry.name}: no canonical skill`);
}
for(const entry of skills.filter(entry=>entry.isDirectory())){
  const name=entry.name;
  const canonical=`.agents/skills/${name}/SKILL.md`;
  const adapter=`.claude/skills/${name}/SKILL.md`;
  files.push(canonical,adapter);
  const metadata=[];
  for(const file of [canonical,adapter]){
    try{
      const text=await fs.readFile(path.join(root,file),'utf8');
      const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if(!match)throw Error('missing YAML frontmatter');
      const meta=parse(match[1]);
      if(meta.name!==name||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.name))throw Error('invalid or mismatched skill name');
      if(typeof meta.description!=='string'||!meta.description.trim())throw Error('missing skill description');
      if(!text.slice(match[0].length).trim())throw Error('empty skill body');
      if(file===adapter&&!text.includes(`../../../${canonical}`))throw Error('adapter does not link to its canonical skill');
      metadata.push(meta);
    }catch(error){failures.push(`${file}: ${error.message}`);}
  }
  if(metadata.length===2&&metadata[0].description!==metadata[1].description)failures.push(`${adapter}: discovery description differs from canonical skill`);
}
for(const file of files){
  let text;
  try{text=await fs.readFile(path.join(root,file),'utf8');}catch(error){failures.push(`${file}: ${error.message}`);continue;}
  for(const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)){
    const href=match[1];
    if(/^(?:[a-z][a-z\d+.-]*:|#)/i.test(href))continue;
    const target=path.resolve(root,path.dirname(file),decodeURIComponent(href.split('#')[0]));
    const relative=path.relative(root,target);
    if(relative.startsWith('..')||path.isAbsolute(relative)){failures.push(`${file}: link escapes repository: ${href}`);continue;}
    try{await fs.stat(target);}catch{failures.push(`${file}: broken local link: ${href}`);}
  }
}
if((await fs.readFile(path.join(root,'CLAUDE.md'),'utf8')).trim()!=='@AGENTS.md')failures.push('CLAUDE.md must import the shared root guide');
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`Checked ${files.length} documentation files, ${skills.filter(entry=>entry.isDirectory()).length} canonical skills and their discovery adapters.`);
