import {test} from "node:test";
import assert from "node:assert/strict";
import {buildModelTrend} from "../../web/src/lib/usage.ts";
test("model token trends preserve provider identity and fill idle buckets with zero",()=>{
 const models=[{provider:"a",model:"same",totalInputTokens:100},{provider:"b",model:"same",totalInputTokens:50}];
 const {models:keys,points}=buildModelTrend([{timestamp:0,provider:"a",model:"same",tokens:100},{timestamp:7_200_000,provider:"b",model:"same",tokens:50}],models,"tokens");
 assert.equal(keys.length,2);assert.notEqual(keys[0].id,keys[1].id);assert.equal(points.length,3);assert.equal(points[0].m0,100);assert.equal(points[1].m0+points[1].m1,0);assert.equal(points[2].m1,50);
});
test("overflow models aggregate into an honest Other series",()=>{
 const models=Array.from({length:7},(_,i)=>({provider:"a",model:String(i),totalInputTokens:10-i}));
 const {models:keys,points}=buildModelTrend(models.map(m=>({...m,timestamp:0,tokens:10})),models,"tokens");
 assert.equal(keys.length,6);assert.equal(points[0].m5,20);assert.equal(Object.values(points[0]).reduce((n,v)=>n+v,0),70);
});
