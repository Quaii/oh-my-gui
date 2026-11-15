import {timingSafeEqual} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';

/** Desktop-only loopback session. No changes to normal browser-server behavior. */
export function desktopAccess(req:IncomingMessage,res:ServerResponse,url:URL,token:string|undefined):boolean {
  if(!token)return true;
  const equal=(value:string)=>{const a=Buffer.from(value),b=Buffer.from(token);return a.length===b.length&&timingSafeEqual(a,b);};
  res.setHeader('Referrer-Policy','no-referrer');
  const deny=()=>{res.writeHead(403,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Desktop session required');return false;};
  if(req.headers.host!==url.host||(req.headers.origin&&req.headers.origin!==url.origin))return deny();
  if(url.pathname==='/desktop/bootstrap'&&equal(url.searchParams.get('token')||'')){
    res.writeHead(303,{'Set-Cookie':`omp_desktop=${token}; HttpOnly; SameSite=Strict; Path=/`,'Location':'/','Cache-Control':'no-store'});res.end();return false;
  }
  const cookie=(req.headers.cookie||'').split(';').map(value=>value.trim()).find(value=>value.startsWith('omp_desktop='))?.slice('omp_desktop='.length)||'';
  if(!equal(cookie))return deny();
  return true;
}
