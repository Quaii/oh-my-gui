import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import {desktopAccess} from '../src/desktop.ts';

test('desktop bootstrap establishes a private cookie and rejects unauthenticated or cross-origin requests',async()=>{
  const token='test-session-secret';
  const server=http.createServer((req,res)=>{
    const base=`http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
    if(desktopAccess(req,res,new URL(req.url||'/',base),token)){res.end('ready');}
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  try{
    assert.equal((await fetch(base+'/api/health')).status,403);
    assert.equal((await fetch(base+'/desktop/bootstrap?token=wrong')).status,403);
    assert.equal((await fetch(base+'/desktop/bootstrap?token='+token,{headers:{Origin:'https://example.com'}})).status,403);
    const bootstrap=await fetch(base+'/desktop/bootstrap?token='+token,{redirect:'manual'});
    assert.equal(bootstrap.status,303);assert.equal(bootstrap.headers.get('location'),'/');
    assert.match(bootstrap.headers.get('set-cookie')||'',/HttpOnly; SameSite=Strict; Path=\//);
    assert.equal(bootstrap.headers.get('referrer-policy'),'no-referrer');
    const headers={Cookie:'omp_desktop='+token};
    assert.equal(await (await fetch(base+'/api/health',{headers})).text(),'ready');
    assert.equal((await fetch(base+'/api/health',{headers:{...headers,Origin:'https://example.com'}})).status,403);
    assert.equal((await fetch(base+'/api/health',{headers:{Cookie:'omp_desktop=short'}})).status,403);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('browser mode does not require a desktop session',()=>{
  assert.equal(desktopAccess({} as any,{} as any,new URL('http://localhost:4317'),undefined),true);
});
