"use strict";
/* ============================================================================
 * physics/ground.js — Ground effect attenuation (ISO 9613-2 §7.3, simplified)
 * ----------------------------------------------------------------------------
 * Simplified general formulation suitable for the demonstrative grid mode.
 * `d`  : horizontal distance source-receiver (m)
 * `hs` : source height (m)
 * `hr` : receiver height (m)
 * `G`  : ground factor in [0, 1] (0 = acoustically hard, 1 = porous/soft)
 * Returns attenuation A_gr in dB (clamped at -3 dB).
 * ========================================================================== */

function groundAtt(d, hs, hr, G) {
  if (d < 1) return 0;
  var hm = (hs + hr) / 2;
  var soft = 4.8 - (2 * hm / d) * (17 + 300 / d);
  return Math.max(G * soft + (1 - G) * (-3), -3);
}
