import assert from 'node:assert/strict';
import test from 'node:test';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {readEditorFile,saveEditorFile,resolveEditorPath,reportedFileRoots} from '../src/editor.ts';
test('file editor preserves UTF-8 and line endings, rejects stale saves and path escapes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'omp-editor-test-'));const file=path.join(root,'example.cpp');
 try{await fs.writeFile(file,'int main() {\r\n  return 0;\r\n}\r\n');const original=await readEditorFile([root],file);
 const saved=await saveEditorFile([root],file,original.content.replace('return 0','return 1'),original.version);assert.match(saved.content,/return 1;\r\n/);
 await assert.rejects(()=>saveEditorFile([root],file,'lost update',original.version),/changed on disk/);
 await assert.rejects(()=>resolveEditorPath([root],path.resolve('package.json')),/outside/);
 await fs.writeFile(path.join(root,'binary'),Buffer.from([0,1,2]));await assert.rejects(()=>readEditorFile([root],path.join(root,'binary')),/Binary/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('out-of-workspace browser roots come only from successful native file tools',()=>{
 const cwd=path.resolve('.tmp'),outside=path.resolve('server/example.ts');
 const calls=[{role:'assistant',content:[{type:'toolCall',id:'ok',name:'write',arguments:{path:outside}},{type:'toolCall',id:'failed',name:'write',arguments:{path:path.resolve('web/private')}}]},{role:'toolResult',toolCallId:'ok'},{role:'toolResult',toolCallId:'failed',isError:true}];
 assert.deepEqual(reportedFileRoots(cwd,calls),[cwd,path.dirname(outside)]);
});

test('folder pagination is complete and filters apply before the page limit',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'omp-editor-pages-'));
 try{await Promise.all(Array.from({length:205},(_,i)=>fs.writeFile(path.join(root,'file-'+String(i).padStart(3,'0')+'.txt'),'x')));await fs.mkdir(path.join(root,'folder'));const {listEditorFiles}=await import('../src/editor.ts');const first=await listEditorFiles([root],root),second=await listEditorFiles([root],root,'',first.nextOffset!);
 assert.equal(first.entries[0].directory,true);assert.equal(first.total,206);assert.equal(first.entries.length,200);assert.equal(second.entries.length,6);assert.equal(second.nextOffset,null);assert.equal(new Set([...first.entries,...second.entries].map(e=>e.path)).size,206);assert.equal(first.parent,null);
 const filtered=await listEditorFiles([root],root,'file-204');assert.equal(filtered.entries.length,1);assert.equal(filtered.entries[0].name,'file-204.txt');
 const document=await readEditorFile([root],filtered.entries[0].path);await assert.rejects(()=>saveEditorFile([root],document.path,'bad\0text',document.version),/Binary/);assert.equal((await fs.readFile(document.path,'utf8')),'x');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
