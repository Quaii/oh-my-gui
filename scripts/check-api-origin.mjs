import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { loopbackApiRequest } from '../server/src/request-origin.ts';

// Exercise the actual development proxy against an inert origin-checking API.
// No OMP process, account, configuration write or model request is involved.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = http.createServer((request, response) => {
  response.writeHead(loopbackApiRequest(request.headers.host, request.headers.origin) ? 200 : 403);
  response.end();
});
await new Promise(resolve => target.listen(0, '127.0.0.1', resolve));
const previousTarget = process.env.OMP_API_TARGET;
process.env.OMP_API_TARGET = `http://127.0.0.1:${target.address().port}`;
let vite;
try {
  vite = await createServer({
    configFile: path.join(root, 'web/vite.config.ts'),
    server: { host: '127.0.0.1', port: 0, strictPort: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'error',
  });
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  assert.equal((await fetch(base + '/api/health', { headers: { Origin: base } })).status, 200);
  assert.equal((await fetch(base + '/api/health', { headers: { Origin: 'https://remote.example' } })).status, 403);
  assert.equal((await fetch(base + '/api/health', { headers: { Origin: 'null' } })).status, 403);
  console.log('Development API proxy preserves same-origin access and rejects remote/null origins. No OMP requests.');
} finally {
  await vite?.close();
  await new Promise(resolve => target.close(resolve));
  if (previousTarget === undefined) delete process.env.OMP_API_TARGET;
  else process.env.OMP_API_TARGET = previousTarget;
}
