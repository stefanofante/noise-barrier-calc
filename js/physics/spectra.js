/* ============================================================================
 * physics/spectra.js — GENERATED FILE. DO NOT EDIT BY HAND.
 * ----------------------------------------------------------------------------
 * Produced by scripts/sync-physics.mjs from src/lib/physics/spectra.ts of the
 * ST-LINE site, which is the authoritative implementation (unit-tested there).
 * Edit the TypeScript source and re-run the script; edits made here are lost
 * on the next sync.
 * ========================================================================== */
"use strict";
/**
 * physics/spectra.ts — spettri sorgente per banda (dB relativi a Lw).
 *
 * Due set distinti, uno per tool, mantenuti separati per NON alterare i
 * numeri di acmap (regressione = identità entro 0.01 dB):
 *  - ACMAP_SPECTRA: set storico del tool Mappa acustica (acmap-proto-v03)
 *  - BARRIER_SPECTRA: set del tool Calcolo barriere (barriers-proto-v06)
 *
 * Valori verbatim dai rispettivi proto.
 */
/**
 * Spettri di acmap (Mappa acustica). I 5 storici (flat/traffic/rail/
 * industrial/lowfreq) NON vanno modificati: regressione = identità.
 * Aggiungere NUOVE chiavi è safe (non altera i valori esistenti).
 *
 * Sotto i 5 storici: 4 preset di sorgenti specifiche a bassa frequenza
 * (turbina eolica, trasformatore, ronzio impianto, chiller HVAC) — dB
 * relativi al Lw totale, firme tipiche per banda di ottava.
 */
const ACMAP_SPECTRA = {
    flat: { 63: -9.03, 125: -9.03, 250: -9.03, 500: -9.03, 1000: -9.03, 2000: -9.03, 4000: -9.03, 8000: -9.03 },
    traffic: { 63: -14, 125: -10, 250: -7, 500: -6, 1000: -5, 2000: -7, 4000: -11, 8000: -16 },
    rail: { 63: -16, 125: -13, 250: -9, 500: -6, 1000: -5, 2000: -6, 4000: -10, 8000: -15 },
    industrial: { 63: -11, 125: -10, 250: -9, 500: -8, 1000: -8, 2000: -9, 4000: -10, 8000: -13 },
    lowfreq: { 63: -5, 125: -6, 250: -8, 500: -10, 1000: -12, 2000: -15, 4000: -19, 8000: -23 },
    // Sorgenti specifiche a bassa frequenza:
    wind_turbine: { 63: -3, 125: -5, 250: -8, 500: -11, 1000: -14, 2000: -18, 4000: -23, 8000: -28 },
    transformer: { 63: -2, 125: -8, 250: -4, 500: -10, 1000: -16, 2000: -20, 4000: -25, 8000: -30 },
    industrial_plant_hum: { 63: -4, 125: -6, 250: -7, 500: -9, 1000: -11, 2000: -14, 4000: -18, 8000: -23 },
    hvac_chiller: { 63: -8, 125: -6, 250: -7, 500: -8, 1000: -9, 2000: -11, 4000: -14, 8000: -18 },
};
/** Spettri di barriers-proto-v06 (Calcolo barriere). */
const BARRIER_SPECTRA = {
    urban_road: { 63: -14, 125: -10, 250: -7, 500: -6, 1000: -5, 2000: -7, 4000: -11, 8000: -16 },
    extraurban_road: { 63: -15, 125: -10, 250: -7, 500: -5, 1000: -5, 2000: -7, 4000: -12, 8000: -17 },
    highway: { 63: -16, 125: -10, 250: -7, 500: -5, 1000: -4, 2000: -6, 4000: -12, 8000: -18 },
    train_pass: { 63: -16, 125: -13, 250: -9, 500: -6, 1000: -5, 2000: -6, 4000: -10, 8000: -15 },
    train_freight: { 63: -13, 125: -11, 250: -8, 500: -7, 1000: -6, 2000: -8, 4000: -12, 8000: -17 },
    industrial: { 63: -11, 125: -10, 250: -9, 500: -8, 1000: -8, 2000: -9, 4000: -10, 8000: -13 },
};

/* Alias kept for this repo: app.js refers to SPECTRA. */
var SPECTRA = BARRIER_SPECTRA;
