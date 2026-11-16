import fs from 'node:fs/promises';
import { initialChat, chatReducer } from '../web/src/lib/store.ts';
const result={
  slashOutputIgnored:chatReducer(initialChat,{type:'command_output',text:'AUDIT_FIXTURE_OUTPUT'})===initialChat,
  nativeNoticeIgnored:chatReducer(initialChat,{type:'notice',message:'AUDIT_FIXTURE_NOTICE'})===initialChat,
  editorTextOnlySetsNotice:chatReducer(initialChat,{type:'extension_ui_request',id:'editor-fixture',method:'set_editor_text',text:'fixture text'}).notice==='editor text set by extension',
};
const selected=chatReducer(initialChat,{type:'extension_ui_request',id:'select-fixture',method:'select',options:['one','two'],checkedIndices:[1],selectionMarker:'checkbox',initialIndex:1});
result.checkboxStateDiscarded=!('checkedIndices' in selected.dialogs[0]);
result.cancelDoesNotRemoveTarget=chatReducer(selected,{type:'extension_ui_request',id:'cancel-fixture',method:'cancel',targetId:'select-fixture'}).dialogs.some(dialog=>dialog.id==='select-fixture');
await fs.writeFile('.tmp/omp-gui-fixture-findings.json',JSON.stringify(result,null,2)+'\n');
console.log(result);
