import {test} from "node:test";
import assert from "node:assert/strict";
import {buildModelTrend, modelSliceCorners} from "../../web/src/lib/usage.ts";
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

test("multi-day trends sum by local date and retain idle dates across daylight saving time", () => {
 const model = {provider:"a",model:"same",totalInputTokens:23};
 const {daily,points} = buildModelTrend([
  {...model,timestamp:Date.parse("2026-10-23T22:15Z"),tokens:10},
  {...model,timestamp:Date.parse("2026-10-24T14:00Z"),tokens:8},
  {...model,timestamp:Date.parse("2026-10-27T09:30Z"),tokens:5},
 ],[model],"tokens","Europe/Berlin");
 assert.equal(daily,true);
 assert.deepEqual(points.map(point=>new Date(point.timestamp).toISOString().slice(0,10)),[
  "2026-10-24","2026-10-25","2026-10-26","2026-10-27",
 ]);
 assert.deepEqual(points.map(point=>point.m0),[18,0,0,5]);
});

test("donut corners stay rounded next to tiny slices without swallowing them", () => {
 const angles = [200, 120, 39.97, 0.03];
 const corners = angles.map(sweep => modelSliceCorners(sweep, angles.length, 65, 88));
 for (const [index, corner] of corners.entries()) {
  assert.ok(corner.cornerRadius > 0);
  assert.ok(2 * corner.inset <= angles[index] / 4);
 }
 assert.equal(corners[0].cornerRadius, 5);
 assert.equal(corners[0].inset, 1);
 assert.equal(corners[2].inset, 1);
 assert.ok(corners[3].cornerRadius < 0.02);
 assert.deepEqual(modelSliceCorners(360, 1, 65, 88), { inset: 0, cornerRadius: 0 });
});
