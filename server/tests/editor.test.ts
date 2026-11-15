import assert from 'node:assert/strict';
import test from 'node:test';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {readEditorFile,saveEditorFile,resolveEditorPath,reportedFileRoots} from '../src/editor.ts';
test('file editor preserves UTF-8 and line endings, rejects stale saves and path escapes',async()=>{
 const root=await fs.mkdtemp(path.resolve('.tmp/editor-test-'));const file=path.join(root,'example.cpp');
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
