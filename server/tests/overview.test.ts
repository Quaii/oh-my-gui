import {test} from "node:test";
import assert from "node:assert/strict";
import {durableTodo,currentTodoPhases} from "../src/overview.ts";
import {projectForSession} from "../../shared/workspace.ts";
test("project membership uses real folder boundaries and prefers the closest registered project",()=>{
 const projects=[{path:"C:\\Work\\app"},{path:"C:\\Work\\app\\nested"}];
 assert.equal(projectForSession({cwd:"c:/work/app-other"},projects),undefined);
 assert.equal(projectForSession({cwd:"c:/WORK/app/nested/src"},projects),projects[1]);
 assert.equal(projectForSession({cwd:"/Work/App"},[{path:"/work/app"}]),undefined);
});
test("unfinished work follows the active transcript branch and ignores failed or view-only snapshots",()=>{
 const phases=[{name:"Plan",tasks:[{content:"Ship",status:"pending"}]}];
 assert.equal(durableTodo({type:"message",message:{role:"toolResult",toolName:"todo",isError:true,details:{phases}}}),undefined);
 assert.equal(durableTodo({type:"message",message:{role:"toolResult",toolName:"todo",details:{op:"view",phases}}}),undefined);
 assert.deepEqual(durableTodo({type:"custom",customType:"user_todo_edit",data:{phases}}),phases);
 assert.deepEqual(currentTodoPhases([{id:"a",parentId:null,phases},{id:"b",parentId:"a",phases:[]},{id:"other",parentId:"a"}]),phases);
 assert.deepEqual(currentTodoPhases([{id:"a",parentId:null,phases},{id:"b",parentId:"a",phases:[]}]),[]);
});
