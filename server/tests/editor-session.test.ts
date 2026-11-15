import assert from 'node:assert/strict';
import test from 'node:test';
import {editorReducer,isDirty,type EditorSession} from '../../web/src/lib/editor-session.ts';
const initial=():EditorSession=>({documents:[],active:null});
const open=(state:EditorSession,path:string,content='original')=>editorReducer(state,{type:'open',document:{path,content,version:'v1'}});
test('file tabs retain independent drafts, saved baselines, and Windows file identity',()=>{
 let state=open(initial(),'C:/work/a.ts');state=editorReducer(state,{type:'edit',path:'C:/work/a.ts',content:'draft A'});state=open(state,'C:/work/b.ts');state=editorReducer(state,{type:'edit',path:'C:/work/b.ts',content:'draft B'});
 state=editorReducer(state,{type:'activate',path:'c:\\WORK\\A.ts'});assert.equal(state.active,'C:/work/a.ts');assert.deepEqual(state.documents.map(d=>[d.content,d.savedContent,isDirty(d)]),[['draft A','original',true],['draft B','original',true]]);
 state=open(state,'c:/WORK/a.ts','disk content');assert.equal(state.documents.length,2);assert.equal(state.documents[0].content,'draft A');
});
test('saving a tab preserves newer edits made while the disk write is pending',()=>{
 let state=open(initial(),'/work/a.ts');state=editorReducer(state,{type:'edit',path:'/work/a.ts',content:'submitted'});state=editorReducer(state,{type:'saving',path:'/work/a.ts'});state=editorReducer(state,{type:'edit',path:'/work/a.ts',content:'newer edit'});state=editorReducer(state,{type:'saved',path:'/work/a.ts',content:'submitted',version:'v2'});
 assert.equal(state.documents[0].content,'newer edit');assert.equal(state.documents[0].savedContent,'submitted');assert.equal(state.documents[0].version,'v2');assert.equal(isDirty(state.documents[0]),true);
});
test('closing tabs selects a neighboring document, and background loads do not steal focus',()=>{
 let state=open(open(initial(),'/work/a.ts'),'/work/b.ts');state=editorReducer(state,{type:'open',document:{path:'/work/c.ts',content:'C',version:'v1'},activate:false});assert.equal(state.active,'/work/b.ts');state=editorReducer(state,{type:'close',path:'/work/b.ts'});assert.equal(state.active,'/work/c.ts');state=editorReducer(state,{type:'close',path:'/work/a.ts'});assert.equal(state.active,'/work/c.ts');
 state=editorReducer(state,{type:'open',document:{path:'/work/c.ts',content:'reloaded',version:'v2'},reload:true});assert.equal(state.documents[0].generation,2);assert.equal(isDirty(state.documents[0]),false);
});
