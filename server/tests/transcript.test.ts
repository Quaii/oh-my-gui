import {test} from "node:test";
import assert from "node:assert/strict";
import {transcriptItems} from "../../web/src/lib/transcript.ts";
test("hidden results and empty thinking do not reserve transcript rows; assistant steps keep native indices",()=>{
 const items=transcriptItems([{role:"user",content:"Hi"},{role:"assistant",content:[{type:"thinking",thinking:""}]},{role:"assistant",content:[{type:"toolCall",name:"bash"}]},{role:"toolResult",content:"output"},{role:"assistant",content:[{type:"text",text:"Done"}]}]);
 assert.deepEqual(items.map(i=>i.index),[0,2,4]);assert.equal(items[2].continuation,true);assert.equal(items[1].continuation,false);
});
