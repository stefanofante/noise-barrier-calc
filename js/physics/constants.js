/* ============================================================================
 * physics/constants.js — GENERATED FILE. DO NOT EDIT BY HAND.
 * ----------------------------------------------------------------------------
 * Produced by scripts/sync-physics.mjs from src/lib/physics/constants.ts of the
 * ST-LINE site, which is the authoritative implementation (unit-tested there).
 * Edit the TypeScript source and re-run the script; edits made here are lost
 * on the next sync.
 * ========================================================================== */
"use strict";
/**
 * physics/constants.ts — costanti acustiche condivise.
 * Fonte unica per tutti i tool del sito (acmap, barrier-calc, …).
 * Valori verbatim dai proto (identici tra acmap-proto-v03 e
 * barriers-proto-v06): nessuna modifica numerica → regressione safe.
 */
/** Velocità del suono (m/s) a ~20 °C. */
const SPEED_OF_SOUND = 343.0;
/** Bande di ottava nominali usate dal calcolo (Hz). */
const FREQ_BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
/** Ponderazione A per banda (dB) — IEC 61672. */
const A_WEIGHTING = {
    63: -26.2, 125: -16.1, 250: -8.6, 500: -3.2,
    1000: 0.0, 2000: 1.2, 4000: 1.0, 8000: -1.1,
};
/** Ponderazione C per banda (dB) — IEC 61672. Attenua molto meno
 *  delle basse frequenze rispetto alla A → indicata per rumore
 *  impulsivo e a bassa frequenza. */
const C_WEIGHTING = {
    63: -0.8, 125: -0.2, 250: 0.0, 500: 0.0,
    1000: 0.0, 2000: -0.2, 4000: -0.8, 8000: -3.0,
};
