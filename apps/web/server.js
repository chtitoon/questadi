#!/usr/bin/env node
/* Dev server for apps/web. Serves HTML/JS and proxies /api/* to the backend. */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT       = parseInt(process.env.PORT ?? '4000', 10);
const BACKEND    = process.env.BACKEND_URL ?? 'http://localhost:3000';
const DESIGN_DIR = path.resolve(__dirname, '../../packages/design');

const backendUrl = new URL(BACKEND);

function serveJs(res, filePath) {
  // __API_BASE_URL__ becomes /api — a relative prefix on the same origin,
  // which this server proxies to the backend.
  const src = fs.readFileSync(filePath, 'utf8').replace('__API_BASE_URL__', '/api');
  res.writeHead(200, { 'Content-Type': 'text/javascript' });
  res.end(src);
}

function serveFile(res, filePath, contentType) {
  const body = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(body);
}

function proxy(req, res) {
  // Strip /api prefix before forwarding to backend
  const backendPath = req.url.replace(/^\/api/, '') || '/';
  const options = {
    hostname: backendUrl.hostname,
    port: backendUrl.port || 80,
    path: backendPath,
    method: req.method,
    headers: { ...req.headers, host: backendUrl.host },
  };
  const upstream = http.request(options, (upRes) => {
    res.writeHead(upRes.statusCode, upRes.headers);
    upRes.pipe(res);
  });
  upstream.on('error', () => {
    res.writeHead(502);
    res.end('Backend unavailable');
  });
  req.pipe(upstream);
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

http.createServer((req, res) => {
  const p = new URL(req.url, `http://localhost:${PORT}`).pathname;

  // Proxy API calls to backend
  if (p.startsWith('/api/')) return proxy(req, res);

  // Design assets
  if (p === '/design/tokens.css')     return serveFile(res, path.join(DESIGN_DIR, 'tokens/dist/tokens.css'), 'text/css');
  if (p === '/design/logo/light.png') return serveFile(res, path.join(DESIGN_DIR, 'branding/logos/light-transparent.png'), 'image/png');
  if (p === '/design/logo/dark.png')  return serveFile(res, path.join(DESIGN_DIR, 'branding/logos/dark-transparent.png'), 'image/png');

  // Quote page
  if (p === '/q/q.js' || p.match(/^\/q\/[^/]+\/q\.js$/))    return serveJs(res, path.join(__dirname, 'q.js'));
  if (p.match(/^\/q\/[^/]+$/))                               return serveFile(res, path.join(__dirname, 'index.html'), 'text/html');

  // Author page
  if (p === '/a/a.js' || p.match(/^\/a\/[^/]+\/a\.js$/)) return serveJs(res, path.join(__dirname, 'a.js'));
  if (p.match(/^\/a\/[^/]+$/))                            return serveFile(res, path.join(__dirname, 'a.html'), 'text/html');

  notFound(res);
}).listen(PORT, () => console.log(`Web server on http://localhost:${PORT}  →  backend ${BACKEND}`));
