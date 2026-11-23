import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildBlobPath} from '../../web/src/lib/liquid-toggle.ts';

test('liquid thumb stays finite and inside both switch sizes throughout travel',()=>{
  for(const [width,height]of [[44,24],[32,18]]){
    for(const progress of [0,.1,.25,.5,.75,.9,1])for(const stretch of [0,.5,1]){
      const path=buildBlobPath(width,height,progress,stretch);
      assert.ok(path.endsWith(' Z'));
      const coordinates=path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      assert.ok(coordinates.every(Number.isFinite));
      for(let i=0;i<coordinates.length;i+=2){
        assert.ok(coordinates[i]>=0&&coordinates[i]<=width,`x outside ${width}: ${path}`);
        assert.ok(coordinates[i+1]>=0&&coordinates[i+1]<=height,`y outside ${height}: ${path}`);
      }
    }
  }
});

test('settled on/off thumb geometry is identical apart from horizontal travel',()=>{
  const numbers=(path:string)=>path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const off=numbers(buildBlobPath(44,24,0,0)),on=numbers(buildBlobPath(44,24,1,0));
  for(let i=0;i<off.length;i++)assert.ok(Math.abs(on[i]-off[i]-(i%2===0?20:0))<.02);
});
