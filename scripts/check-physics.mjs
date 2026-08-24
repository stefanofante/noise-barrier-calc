/**
 * scripts/check-physics.mjs - numerical regression guard on the acoustic
 * engine in js/physics/.
 *
 * WHY
 * js/physics/ is generated from the site's TypeScript by
 * scripts/sync-physics.mjs. A sync can therefore change numbers, and in an
 * acoustic tool a silent numerical change is the worst kind of regression:
 * nothing breaks, the output just becomes quietly wrong. This script pins the
 * values that must NOT move.
 *
 * WHAT IT CHECKS
 * 1. Exact backward compatibility of the two named methods. `maekawa` and
 *    `iso9613-1996` must return what the pre-2024 engine returned. The
 *    reference values below were produced with that engine (repo v0.8.1) and
 *    are frozen: those methods are documented as stable, so any movement is a
 *    bug, not an upgrade.
 * 2. That the default method (`iso9613`, which since v0.9 maps to the 2024
 *    formulation) stays within a declared tolerance of the 1996 values. The
 *    spread measured when the engine was upgraded is 0.21 dB at most over the
 *    band/geometry grid below; the check allows 0.30 dB - wide enough not to
 *    be brittle, narrow enough to catch a real formula change.
 * 3. That every symbol the app relies on exists.
 *
 * The modules are concatenated and evaluated as ONE script, the way the
 * browser loads them: they share a single global scope, so top-level `const`
 * bindings (which are not properties of the global object) resolve across
 * files exactly as they do in index.html.
 *
 * USAGE
 *   node scripts/check-physics.mjs
 * Exit 0 = pass, 1 = at least one value moved.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const MODULES = [
  'constants', 'spectra', 'atm', 'ground', 'diffraction', 'geometry', 'propagation',
];

const NEEDED = [
  'diffraction', 'diffMaekawa', 'diffISO9613_1996', 'diffISO9613_2024',
  'diffISO9613_2024Lateral', 'lateralBarrierDeltas', 'combineDiffraction',
  'propagatePoint', 'propagatePointBands',
  'atmAttenuation', 'groundAtt', 'pathDelta', 'segIntersect',
  'firstBarrierHit', 'latlngToLocal', 'localToLatLng',
  'discretizeLine', 'discretizeRect', 'discretizeLineAdaptive',
  'polylineLength', 'SPECTRA', 'FREQ_BANDS', 'SPEED_OF_SOUND',
];

let src = '';
for (const m of MODULES) {
  const f = path.resolve('js', 'physics', `${m}.js`);
  if (!fs.existsSync(f)) { console.error(`Missing module: ${f}`); process.exit(1); }
  src += fs.readFileSync(f, 'utf8') + ';\n';
}
// trailing expression: hands the symbols back to the host
src += 'globalThis.__api = {' + NEEDED.map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') + '};';

const ctx = { console, Math, Object, Array, isNaN, parseFloat, isFinite, globalThis: null };
vm.createContext(ctx);
ctx.globalThis = ctx;
vm.runInContext(src, ctx);
const api = ctx.__api;

/* [method, f_Hz, delta_m, expected_dB] with d_ss = 50 m, d_sr = 80 m. */
const REF = [
  ['maekawa', 63, 0.2, 6.50248], ['maekawa', 63, 1, 10.148119],
  ['maekawa', 63, 3, 13.986485], ['maekawa', 63, 6, 16.728515],
  ['maekawa', 125, 0.2, 7.719879], ['maekawa', 125, 1, 12.449512],
  ['maekawa', 125, 3, 16.696123], ['maekawa', 125, 6, 19.564737],
  ['maekawa', 250, 0.2, 9.460052], ['maekawa', 250, 1, 15.07242],
  ['maekawa', 250, 3, 19.564737], ['maekawa', 250, 6, 22.502421],
  ['maekawa', 500, 0.2, 11.661875], ['maekawa', 500, 1, 17.875245],
  ['maekawa', 500, 3, 22.502421], ['maekawa', 500, 6, 25],
  ['maekawa', 1000, 0.2, 14.203455], ['maekawa', 1000, 1, 20.777968],
  ['maekawa', 1000, 3, 25], ['maekawa', 1000, 6, 25],
  ['maekawa', 2000, 0.2, 16.95895], ['maekawa', 2000, 1, 23.733464],
  ['maekawa', 2000, 3, 25], ['maekawa', 2000, 6, 25],
  ['maekawa', 4000, 0.2, 19.836013], ['maekawa', 4000, 1, 25],
  ['maekawa', 4000, 3, 25], ['maekawa', 4000, 6, 25],
  ['maekawa', 8000, 0.2, 22.77813], ['maekawa', 8000, 1, 25],
  ['maekawa', 8000, 3, 25], ['maekawa', 8000, 6, 25],
  ['iso9613-1996', 63, 0.2, 5.680682], ['iso9613-1996', 63, 1, 8.19033],
  ['iso9613-1996', 63, 3, 11.423597], ['iso9613-1996', 63, 6, 13.951608],
  ['iso9613-1996', 125, 0.2, 6.421312], ['iso9613-1996', 125, 1, 10.055005],
  ['iso9613-1996', 125, 3, 13.906776], ['iso9613-1996', 125, 6, 16.659034],
  ['iso9613-1996', 250, 0.2, 7.614214], ['iso9613-1996', 250, 1, 12.369129],
  ['iso9613-1996', 250, 3, 16.643677], ['iso9613-1996', 250, 6, 19.526412],
  ['iso9613-1996', 500, 0.2, 9.317897], ['iso9613-1996', 500, 1, 14.984462],
  ['iso9613-1996', 500, 3, 19.51054], ['iso9613-1996', 500, 6, 20],
  ['iso9613-1996', 1000, 0.2, 11.490051], ['iso9613-1996', 1000, 1, 17.782937],
  ['iso9613-1996', 1000, 3, 20], ['iso9613-1996', 1000, 6, 20],
  ['iso9613-1996', 2000, 0.2, 14.011611], ['iso9613-1996', 2000, 1, 20],
  ['iso9613-1996', 2000, 3, 20], ['iso9613-1996', 2000, 6, 20],
  ['iso9613-1996', 4000, 0.2, 16.755237], ['iso9613-1996', 4000, 1, 20],
  ['iso9613-1996', 4000, 3, 20], ['iso9613-1996', 4000, 6, 20],
  ['iso9613-1996', 8000, 0.2, 19.625797], ['iso9613-1996', 8000, 1, 20],
  ['iso9613-1996', 8000, 3, 20], ['iso9613-1996', 8000, 6, 20],
];

const D_SS = 50, D_SR = 80;
let fail = 0;

console.log('1. exact backward compatibility (maekawa, iso9613-1996)');
for (const [method, f, delta, expected] of REF) {
  const got = api.diffraction(method, f, delta, D_SS, D_SR);
  if (Math.abs(got - expected) > 1e-6) {
    console.log(`   FAIL ${method} f=${f} d=${delta}: expected ${expected}, got ${got.toFixed(6)}`);
    fail++;
  }
}
console.log(`   ${REF.length} reference values checked`);

console.log('2. default method within the declared tolerance of 1996');
const TOL = 0.30;
let maxDelta = 0;
for (const f of [63, 125, 250, 500, 1000, 2000, 4000, 8000]) {
  for (const d of [0.2, 1, 3, 6]) {
    const a = api.diffraction('iso9613-1996', f, d, D_SS, D_SR);
    const b = api.diffraction('iso9613', f, d, D_SS, D_SR);
    maxDelta = Math.max(maxDelta, Math.abs(b - a));
  }
}
if (maxDelta > TOL) {
  console.log(`   FAIL max spread ${maxDelta.toFixed(3)} dB exceeds ${TOL} dB`);
  fail++;
} else {
  console.log(`   max spread ${maxDelta.toFixed(3)} dB (limit ${TOL})`);
}

console.log('3. API surface used by the app');
for (const n of NEEDED) {
  if (api[n] === undefined) { console.log(`   FAIL missing: ${n}`); fail++; }
}
console.log(`   ${NEEDED.length} symbols checked`);

if (fail) { console.log(`\n${fail} check(s) FAILED`); process.exit(1); }
console.log('\nall checks passed');
