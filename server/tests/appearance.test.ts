import {test} from "node:test";
import assert from "node:assert/strict";
import {validateAppearance,DEFAULT_APPEARANCE} from "../../web/src/lib/appearance.ts";

test("old appearance exports gain safe defaults and preserve custom colors",()=>{
 const result=validateAppearance({accent:"#ff5f2e",scale:110,icons:"phosphor",glass:false});
 assert.equal(result.accent,"#ff5f2e");assert.equal(result.glass,false);
 assert.equal(result.chatSize,DEFAULT_APPEARANCE.chatSize);assert.equal(result.headingFont,"inherit");
 assert.equal(result.backgroundOpacity,25);
});
test("workspace theme options round-trip and reject invalid styles",()=>{
 const custom={...DEFAULT_APPEARANCE,sidebar:"#202020",chatArea:"#101010",replies:"#eeeeee",codeBlocks:"#151515",chatSize:18,lineHeight:2,radius:24,uiFont:"system",contrast:"high",shadow:"deep",translucentSidebar:true};
 assert.deepEqual(validateAppearance(JSON.parse(JSON.stringify(custom))),custom);
 for(const invalid of [{foreground:"red"},{radius:999},{uiFont:"url(bad)"},{glass:"false"},{chatSize:-1},{backgroundOpacity:101},{backgroundOpacity:-1},{backgroundOpacity:NaN},{image:"https://example.com/image.png"}])assert.throws(()=>validateAppearance(invalid));
});
