/**
 * scripts/sync-physics.mjs — regenerates js/physics/*.js from the TypeScript
 * source of the ST-LINE site, which is the authoritative implementation of the
 * acoustic engine (it is the one covered by unit tests).
 *
 * WHY THIS EXISTS
 * The engine lived in two places: the TypeScript modules under
 * src/lib/physics of the site, and a hand-maintained ES5 copy here. They
 * drifted: by August 2026 the site had the ISO 9613-2:2024 formulation,
 * lateral diffraction (§7.4.3) and the §7.4.4 combining rule, while this repo
 * was still on the 1996-only engine. Hand-porting an acoustic engine is
 * exactly the kind of work where a transcription slip becomes a silent
 * numerical error, so it is not done by hand any more.
 *
 * HOW IT WORKS
 * TypeScript is used only as a type stripper (`tsc --removeComments false`),
 * then the ES module syntax is removed so the output keeps working as classic
 * <script> files with global functions, which is what index.html loads. No
 * bundler, no runtime dependency added.
 *
 * USAGE
 *   node scripts/sync-physics.mjs [path-to-site-physics-dir]
 * Default source: ../website/src/lib/physics
 *
 * After running, re-check the numbers with scripts/check-physics.mjs.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const MODULES = [
  'constants', 'spectra', 'atm', 'ground', 'diffraction', 'geometry', 'propagation',
];

const src = process.argv[2] || path.resolve('..', 'website', 'src', 'lib', 'physics');
const outDir = path.resolve('js', 'physics');

if (!fs.existsSync(src)) {
  console.error(`Source not found: ${src}`);
  console.error('Pass the site physics directory as the first argument.');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbc-physics-'));
const inputs = MODULES.map((m) => path.join(src, `${m}.ts`));
for (const f of inputs) {
  if (!fs.existsSync(f)) { console.error(`Missing module: ${f}`); process.exit(1); }
}

/**
 * Locates the TypeScript compiler. This repo deliberately has no npm
 * dependencies (it must stay openable as a plain file), so tsc is looked up
 * where it certainly exists: in the node_modules of the site the sources come
 * from. A local install, if present, wins.
 */
function findTsc() {
  const candidates = [
    path.resolve('node_modules', 'typescript', 'bin', 'tsc'),
    // src is <siteRoot>/src/lib/physics -> up three levels
    path.resolve(src, '..', '..', '..', 'node_modules', 'typescript', 'bin', 'tsc'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

const tsc = findTsc();
if (!tsc) {
  console.error('TypeScript compiler not found. Looked in:');
  console.error('  ./node_modules/typescript/bin/tsc');
  console.error('  <site>/node_modules/typescript/bin/tsc');
  console.error('Install it locally (npm i -D typescript) or point the first');
  console.error('argument at a site checkout that has its dependencies installed.');
  process.exit(1);
}

// Type stripping only. --ignoreConfig so the site's tsconfig does not apply.
execFileSync(process.execPath, [
  tsc, '--ignoreConfig', ...inputs,
  '--outDir', tmp,
  '--target', 'es2019',
  '--module', 'esnext',
  '--removeComments', 'false',
  '--skipLibCheck',
], { stdio: 'inherit' });

const banner = (name) => `/* ============================================================================
 * physics/${name}.js — GENERATED FILE. DO NOT EDIT BY HAND.
 * ----------------------------------------------------------------------------
 * Produced by scripts/sync-physics.mjs from src/lib/physics/${name}.ts of the
 * ST-LINE site, which is the authoritative implementation (unit-tested there).
 * Edit the TypeScript source and re-run the script; edits made here are lost
 * on the next sync.
 * ========================================================================== */
`;

let total = 0;
for (const m of MODULES) {
  const jsPath = path.join(tmp, `${m}.js`);
  let code = fs.readFileSync(jsPath, 'utf8');
  // ESM -> classic script globals: the modules are loaded in dependency order
  // by index.html, so cross-module references resolve as globals.
  code = code
    .replace(/^\s*import\s[^\n]*\n/gm, '')
    .replace(/^export\s+/gm, '');
  let out = banner(m) + '"use strict";\n' + code.trimStart();
  // Compatibility shim. The site exposes two named spectrum sets
  // (ACMAP_SPECTRA and BARRIER_SPECTRA) where this repo has always used a
  // single `SPECTRA`. Aliasing it here keeps app.js untouched and makes the
  // choice explicit: this is the barrier tool, so it takes the barrier set.
  if (m === 'spectra') {
    out += '\n/* Alias kept for this repo: app.js refers to SPECTRA. */\n' +
           'var SPECTRA = BARRIER_SPECTRA;\n';
  }
  fs.writeFileSync(path.join(outDir, `${m}.js`), out);
  total += out.split('\n').length;
  console.log(`  ${m}.js  ${out.split('\n').length} lines`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nRegenerated ${MODULES.length} modules, ${total} lines total.`);
console.log('Now run: node scripts/check-physics.mjs');
