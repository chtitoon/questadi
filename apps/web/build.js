#!/usr/bin/env node
'use strict';

const fs   = require('node:fs');
const path = require('node:path');

const ROOT   = __dirname;
const DIST   = path.join(ROOT, 'dist');
const DESIGN = path.join(ROOT, '../../packages/design');

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'design/logo'), { recursive: true });

// HTML — as-is
for (const f of ['index.html', 'a.html']) {
  fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f));
}

// JS — replace __API_BASE_URL__ with /api (proxied by the Pages Function)
for (const f of ['q.js', 'a.js']) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  fs.writeFileSync(path.join(DIST, f), src.replace('__API_BASE_URL__', '/api'));
}

// Design assets
fs.copyFileSync(path.join(DESIGN, 'tokens/dist/tokens.css'),               path.join(DIST, 'design/tokens.css'));
fs.copyFileSync(path.join(DESIGN, 'branding/logos/light-transparent.png'), path.join(DIST, 'design/logo/light.png'));
fs.copyFileSync(path.join(DESIGN, 'branding/logos/dark-transparent.png'),  path.join(DIST, 'design/logo/dark.png'));

// SPA routing — /q/:token → index.html, /a/:accountId → a.html
fs.writeFileSync(path.join(DIST, '_redirects'), [
  '/q/* /index.html 200',
  '/a/* /a.html 200',
].join('\n') + '\n');

console.log('Built → dist/');
