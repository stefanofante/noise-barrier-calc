/* ============================================================================
 * physics/ground.js — GENERATED FILE. DO NOT EDIT BY HAND.
 * ----------------------------------------------------------------------------
 * Produced by scripts/sync-physics.mjs from src/lib/physics/ground.ts of the
 * ST-LINE site, which is the authoritative implementation (unit-tested there).
 * Edit the TypeScript source and re-run the script; edits made here are lost
 * on the next sync.
 * ========================================================================== */
"use strict";
/**
 * physics/ground.ts — effetto suolo ISO 9613-2 §7.3.2 (formula generale,
 * G-factor). Verbatim dai proto (identico acmap ↔ barrier).
 */
/** A_gr (dB). d distanza, hs/hr quote sorgente/ricevitore, G fattore suolo [0..1]. */
function groundAtt(d, hs, hr, G) {
    if (d < 1)
        return 0;
    const hm = (hs + hr) / 2;
    const soft = 4.8 - (2 * hm / d) * (17 + 300 / d);
    return Math.max(G * soft + (1 - G) * (-3), -3);
}
