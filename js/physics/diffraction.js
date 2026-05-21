"use strict";
/* ============================================================================
 * physics/diffraction.js — Barrier diffraction (Maekawa 1968 / ISO 9613-2 §7.4)
 * ----------------------------------------------------------------------------
 *   diffMaekawa(f, delta)                  — historical formula, max 25 dB
 *   diffISO9613(f, delta, d_ss, d_sr)      — ISO 9613-2 §7.4, max 20 dB
 *   diffraction(method, f, delta, ds, dr)  — dispatcher selected via UI
 *   pathDelta(d_sb, d_br, hs, hr, hb)      — Fresnel path difference δ (m)
 *
 * Both Dz formulas need the path difference δ = (d_st + d_tr) − d_sr, which
 * is computed from horizontal distances and source/receiver/barrier heights
 * by `pathDelta`. If the barrier does not protrude above the line of sight
 * (hb ≤ y_los), δ = 0 and diffraction is zero.
 * ========================================================================== */

function diffMaekawa(f, delta) {
  if (delta <= 0) return 0;
  var lam = SPEED_OF_SOUND / f;
  var N = 2 * delta / lam;                  // Fresnel number
  if (N < 0) return 0;
  var v = 3 + 20 * N;
  if (v <= 1) return 0;
  return Math.max(0, Math.min(25, 10 * Math.log10(v)));
}

function diffISO9613(f, delta, d_ss, d_sr) {
  if (delta <= 0) return 0;
  var lam = SPEED_OF_SOUND / f;
  var C2 = 20;     // ground reflections handled separately by A_gr
  var C3 = 1;      // single-barrier placeholder (C3 != 1 for double barrier)
  var Kmet = 1.0;  // downwind meteorological correction (defaults to 1)
  if (d_ss > 0 && d_sr > 0 && delta > 0) {
    var arg = (d_ss * d_sr) / (2 * delta);
    if (arg > 0) Kmet = Math.exp(-(1 / 2000) * Math.sqrt(arg));
  }
  var v = 3 + (C2 / lam) * C3 * delta * Kmet;
  if (v <= 1) return 0;
  var Dz = 10 * Math.log10(v);
  var maxDz = (C3 === 1) ? 20 : 25;
  return Math.max(0, Math.min(maxDz, Dz));
}

function diffraction(method, f, delta, d_ss, d_sr) {
  if (method === 'maekawa') return diffMaekawa(f, delta);
  return diffISO9613(f, delta, d_ss, d_sr);
}

function pathDelta(d_sb, d_br, hs, hr, hb) {
  var d_sr = d_sb + d_br;
  if (d_sr < 1) return 0;
  // Intersection height of the direct ray at the barrier x-coordinate.
  var y_los = hs + (d_sb / d_sr) * (hr - hs);
  if (hb <= y_los) return 0; // barrier does not screen the line of sight
  var d_st = Math.sqrt(d_sb * d_sb + (hb - hs) * (hb - hs));
  var d_tr = Math.sqrt(d_br * d_br + (hr - hb) * (hr - hb));
  var d_sr_dir = Math.sqrt(d_sr * d_sr + (hr - hs) * (hr - hs));
  return d_st + d_tr - d_sr_dir;
}
