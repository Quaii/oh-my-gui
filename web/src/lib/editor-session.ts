export type EditorDocument={path:string;content:string;savedContent:string;version:string;generation:number;status:'ready'|'saving';error?:string};
export type EditorSession={documents:EditorDocument[];active:string|null};
export const CHECK_EDITOR_DRAFTS = "omp:check-editor-drafts";
export function hasPendingEditorChanges() {
  return !window.dispatchEvent(new Event(CHECK_EDITOR_DRAFTS, { cancelable: true }));
}
export type EditorAction=
 |{type:'open';document:{path:string;content:string;version:string};reload?:boolean;activate?:boolean}
 |{type:'activate';path:string}
 |{type:'edit';path:string;content:string}
 |{type:'saving';path:string}
 |{type:'saved';path:string;content:string;version:string}
 |{type:'error';path:string;error:string}
 |{type:'close';path:string};
export const pathKey=(value:string)=>/^[a-z]:/i.test(value)?value.replaceAll('\\','/').toLowerCase():value.replaceAll('\\','/');
export const fileName=(value:string)=>value.replaceAll('\\','/').split('/').filter(Boolean).pop()||value;
export const containsPath=(root:string,file:string)=>{const a=pathKey(root).replace(/\/$/,''),b=pathKey(file);return a===b||b.startsWith(a+'/');};
export const isDirty=(doc:EditorDocument)=>doc.content!==doc.savedContent;
export function editorReducer(state:EditorSession,action:EditorAction):EditorSession{
 const matches=(path:string)=>pathKey(path)===pathKey(action.type==='open'?action.document.path:action.path);
 if(action.type==='open'){
  const existing=state.documents.find(d=>matches(d.path));
  if(existing&&!action.reload)return {...state,active:existing.path};
  const next:EditorDocument={...action.document,savedContent:action.document.content,generation:(existing?.generation||0)+1,status:'ready'};
  return {active:action.activate===false&&state.active?state.active:next.path,documents:existing?state.documents.map(d=>matches(d.path)?next:d):[...state.documents,next]};
 }
 if(action.type==='activate')return {...state,active:state.documents.find(d=>matches(d.path))?.path||state.active};
 if(action.type==='close'){
  const index=state.documents.findIndex(d=>matches(d.path)),documents=state.documents.filter(d=>!matches(d.path));
  return {documents,active:state.active&&matches(state.active)?documents[Math.min(index,documents.length-1)]?.path||null:state.active};
 }
 return {...state,documents:state.documents.map(doc=>!matches(doc.path)?doc:action.type==='edit'?{...doc,content:action.content}:action.type==='saving'?{...doc,status:'saving',error:undefined}:action.type==='error'?{...doc,status:'ready',error:action.error}:{...doc,status:'ready',savedContent:action.content,version:action.version,error:undefined})};
}
