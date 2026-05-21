"use strict";
/* ============================================================================
 * physics/propagation.js — Per-band outdoor propagation (point-to-point)
 * ----------------------------------------------------------------------------
 * propagatePoint({ Lw, spectrum, dist, hs, hr, T, RH, G,
 *                  diffDelta?, method?, d_ss?, d_sr? }) -> Leq A-weighted (dB)
 *
 * For each 1/1-octave band f in FREQ_BANDS:
 *   L_p(f) = Lw + spectrum[f] − A_div − A_atm(f) − A_gr − A_dif(f)
 * Bands are summed energetically with A-weighting:
 *   Leq = 10·log10( Σ 10^((L_p + A_w)/10) )
 *
 * Inputs:
 *   Lw         total sound power level for this point source (dB)
 *   spectrum   octave-band shape relative to Lw (see SPECTRA)
 *   dist       distance source-receiver (m)
 *   hs, hr     source / receiver heights (m)
 *   T, RH      temperature (°C), relative humidity (%)
 *   G          ground factor [0..1]
 *   diffDelta  Fresnel path difference δ for diffraction (m), default 0
 *   method     'iso9613' | 'maekawa' (default 'iso9613')
 *   d_ss, d_sr horizontal distances S->barrier and S->R (needed by ISO Kmet)
 * ========================================================================== */

function propagatePoint(args) {
  var Lw = args.Lw, spectrum = args.spectrum, dist = args.dist;
  var hs = args.hs, hr = args.hr, T = args.T, RH = args.RH, G = args.G;
  var diffDelta = args.diffDelta === undefined ? 0 : args.diffDelta;
  var method = args.method === undefined ? 'iso9613' : args.method;
  var d_ss = args.d_ss === undefined ? 0 : args.d_ss;
  var d_sr = args.d_sr === undefined ? 0 : args.d_sr;
  if (dist < 1) dist = 1;
  var A_div = 20 * Math.log10(dist) + 11; // spherical divergence (point src)
  var A_gr = groundAtt(dist, hs, hr, G);
  var energy = 0;
  for (var fi = 0; fi < FREQ_BANDS.length; fi++) {
    var f = FREQ_BANDS[fi];
    var Lw_f = Lw + spectrum[f];
    var A_atm = atmAttenuation(f, T, RH) * dist;
    var A_dif = diffraction(method, f, diffDelta, d_ss, d_sr);
    var Lp = Lw_f - A_div - A_atm - A_gr - A_dif;
    energy += Math.pow(10, (Lp + A_WEIGHTING[f]) / 10);
  }
  if (energy <= 0) return -Infinity;
  return 10 * Math.log10(energy);
}
