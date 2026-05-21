"use strict";
/* ============================================================================
 * physics/atm.js — Atmospheric absorption (ISO 9613-1:1993)
 * ----------------------------------------------------------------------------
 * atmAttenuation(f, T_c, RH, p_kPa) -> attenuation coefficient in dB/m at the
 * given frequency `f` (Hz), temperature `T_c` (°C), relative humidity `RH`
 * (%) and atmospheric pressure `p_kPa` (default 101.325 kPa).
 * Multiply the result by the propagation distance (m) to get the total
 * absorption A_atm for that band.
 * ========================================================================== */

function atmAttenuation(f, T_c, RH, p_kPa) {
  if (p_kPa === undefined) p_kPa = 101.325;
  var T = T_c + 273.15, T0 = 293.15;
  var pa_pr = p_kPa / 101.325;
  // Saturation vapour pressure ratio (Antoine-like fit from ISO 9613-1).
  var psat_pr = pa_pr * Math.pow(10, -6.8346 * Math.pow(273.16 / T, 1.261) + 4.6151);
  var h = RH * psat_pr / pa_pr;
  // Oxygen and nitrogen relaxation frequencies.
  var frO = pa_pr * (24 + 4.04e4 * h * (0.02 + h) / (0.391 + h));
  var frN = pa_pr * Math.pow(T / T0, -0.5) * (9 + 280 * h * Math.exp(-4.170 * (Math.pow(T / T0, -1 / 3) - 1)));
  return 8.686 * f * f * (
    1.84e-11 * (1 / pa_pr) * Math.sqrt(T / T0) +
    Math.pow(T / T0, -2.5) * (
      0.01275 * Math.exp(-2239.1 / T) / (frO + f * f / frO) +
      0.1068 * Math.exp(-3352.0 / T) / (frN + f * f / frN)
    )
  );
}
