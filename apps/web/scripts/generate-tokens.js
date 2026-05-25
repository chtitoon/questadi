#!/usr/bin/env node
// Reads packages/design/tokens/source.json → src/styles/tokens.css
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(
  readFileSync(join(__dirname, '../../../packages/design/tokens/source.json'), 'utf8')
);

function resolveAlias(ref, t) {
  const [group, shade] = ref.split('.');
  return t.color[group][shade];
}

function buildCss(t) {
  const lines = [
    `@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');`,
    ``,
    `:root {`,
  ];

  for (const [shade, value] of Object.entries(t.color.brand))
    lines.push(`  --color-brand-${shade}: ${value};`);
  lines.push('');

  for (const [shade, value] of Object.entries(t.color.neutral))
    lines.push(`  --color-neutral-${shade}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.color.semantic))
    lines.push(`  --color-${name}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.typography.family))
    lines.push(`  --font-family-${name}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.typography.size))
    lines.push(`  --text-${name}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.typography.weight))
    lines.push(`  --font-${name}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.typography.leading))
    lines.push(`  --leading-${name}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.typography.tracking))
    lines.push(`  --tracking-${name}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.spacing))
    lines.push(`  --space-${name}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.radius))
    lines.push(`  --radius-${name}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.shadow))
    lines.push(`  --shadow-${name}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.duration))
    lines.push(`  --duration-${name}: ${value};`);
  lines.push('');

  for (const [name, value] of Object.entries(t.easing))
    lines.push(`  --easing-${name}: ${value};`);

  lines.push('');
  for (const [name, ref] of Object.entries(t.alias.light))
    lines.push(`  --${name}: ${resolveAlias(ref, t)};`);

  lines.push(`}`);
  lines.push(``);
  lines.push(`@media (prefers-color-scheme: dark) {`);
  lines.push(`  :root {`);
  for (const [name, ref] of Object.entries(t.alias.dark))
    lines.push(`    --${name}: ${resolveAlias(ref, t)};`);
  lines.push(`  }`);
  lines.push(`}`);

  return lines.join('\n');
}

writeFileSync(join(__dirname, '../src/styles/tokens.css'), buildCss(tokens), 'utf8');
console.log('✓ src/styles/tokens.css');
