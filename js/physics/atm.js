/* ============================================================================
 * physics/atm.js — GENERATED FILE. DO NOT EDIT BY HAND.
 * ----------------------------------------------------------------------------
 * Produced by scripts/sync-physics.mjs from src/lib/physics/atm.ts of the
 * ST-LINE site, which is the authoritative implementation (unit-tested there).
 * Edit the TypeScript source and re-run the script; edits made here are lost
 * on the next sync.
 * ========================================================================== */
"use strict";
/**
 * physics/atm.ts — assorbimento atmosferico ISO 9613-1.
 * Coefficiente α (dB/m) per banda, dipendente da f, T, RH, p.
 * Verbatim dai proto (identico acmap ↔ barrier).
 */
/** α atmosferico in dB/m per la banda `f` (Hz). T_c in °C, RH in %, p in kPa. */
function atmAttenuation(f, T_c, RH, p_kPa = 101.325) {
    const T = T_c + 273.15, T0 = 293.15;
    const pa_pr = p_kPa / 101.325;
    const psat_pr = pa_pr * Math.pow(10, -6.8346 * Math.pow(273.16 / T, 1.261) + 4.6151);
    const h = RH * psat_pr / pa_pr;
    const frO = pa_pr * (24 + 4.04e4 * h * (0.02 + h) / (0.391 + h));
    const frN = pa_pr * Math.pow(T / T0, -0.5) * (9 + 280 * h * Math.exp(-4.170 * (Math.pow(T / T0, -1 / 3) - 1)));
    return 8.686 * f * f * (1.84e-11 * (1 / pa_pr) * Math.sqrt(T / T0) +
        Math.pow(T / T0, -2.5) * (0.01275 * Math.exp(-2239.1 / T) / (frO + f * f / frO) +
            0.1068 * Math.exp(-3352.0 / T) / (frN + f * f / frN)));
}
