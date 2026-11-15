import { test } from "node:test";
import assert from "node:assert/strict";
import { fileChangeSummaries } from "../../web/src/lib/file-changes.ts";
test("file summaries stay within their turn and exclude failed or unrelated operations",()=>{
 const messages=[{role:"user",content:"Edit"},{role:"assistant",content:[{type:"toolCall",id:"a",name:"edit",arguments:{path:"app.tsx",oldText:"old",newText:"new\nline"}},{type:"toolCall",id:"bad",name:"write",arguments:{path:"failed.md",content:"x"}},{type:"toolCall",id:"shell",name:"bash",arguments:{command:"echo x"}}]},{role:"toolResult"},{role:"assistant",content:[{type:"text",text:"Done"}]},{role:"user",content:"Read"},{role:"assistant",content:[{type:"toolCall",id:"read",name:"read",arguments:{path:"app.tsx"}}]},{role:"assistant",content:[{type:"text",text:"Read it"}]}];
 const result=fileChangeSummaries(messages,{a:{result:{content:[]},isError:false},bad:{result:{},isError:true},shell:{result:{},isError:false},read:{result:{},isError:false}});
 assert.equal(result.size,1);assert.deepEqual(result.get(3)?.map(f=>[f.path,f.added,f.removed]),[["app.tsx",2,1]]);assert.equal(result.has(6),false);
});
