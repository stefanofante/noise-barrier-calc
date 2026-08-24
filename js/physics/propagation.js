/* ============================================================================
 * physics/propagation.js — GENERATED FILE. DO NOT EDIT BY HAND.
 * ----------------------------------------------------------------------------
 * Produced by scripts/sync-physics.mjs from src/lib/physics/propagation.ts of the
 * ST-LINE site, which is the authoritative implementation (unit-tested there).
 * Edit the TypeScript source and re-run the script; edits made here are lost
 * on the next sync.
 * ========================================================================== */
"use strict";
/**
 * physics/propagation.ts — Leq A-pesato al ricevitore (ISO 9613-2 §7).
 * Verbatim da barriers-proto-v06.
 *
 * Retrocompatibilità acmap: la firma ha `method='iso9613'` di default
 * (richiesto dal tool barriere), ma acmap DEVE chiamare con
 * method='maekawa' per restare byte-identico al proto v0.3 (il suo
 * vecchio propagatePoint usava Maekawa). Vedi nota refactor AcousticMap.
 */
/**
 * Versione completa: ritorna Leq totale + Lp pesato per ognuna delle
 * 8 bande di ottava. Usata dai tool per le visualizzazioni FFT/tooltip.
 * Stessa fisica di propagatePoint (che ora è un wrapper di questa).
 */
function propagatePointBands({ Lw, spectrum, dist, hs, hr, T, RH, G, diffDelta = 0, method = 'iso9613', d_ss = 0, d_sr = 0, latZ1 = 0, latZ2 = 0, weighting = 'A', }) {
    if (dist < 1)
        dist = 1;
    const A_div = 20 * Math.log10(dist) + 11;
    const A_gr = groundAtt(dist, hs, hr, G);
    // Tabella di ponderazione per banda: A (dBA), C (dBC), Z = nessuna
    // (null → peso 0 per ogni banda = livello lineare reale).
    const weights = weighting === 'A' ? A_WEIGHTING
        : weighting === 'C' ? C_WEIGHTING
            : null;
    // Diffrazione laterale §7.4.3: attiva solo per la 2024 e quando il
    // cammino sopra il bordo esiste (diffDelta > 0) e almeno un cammino
    // laterale è rilevante. Per Maekawa/1996 i campi latZ sono ignorati.
    const is2024 = method === 'iso9613-2024' || method === 'iso9613';
    const useLateral = is2024 && diffDelta > 0 && (latZ1 > 0 || latZ2 > 0);
    let energy = 0;
    const bands = {};
    const bandsLin = {};
    for (const f of FREQ_BANDS) {
        const Lw_f = Lw + spectrum[f];
        const A_atm = atmAttenuation(f, T, RH) * dist;
        // `dist` = distanza diretta sorgente-ricevitore → 6° arg `d` per la
        // Kmet ISO 9613-2:2024 (ignorato da Maekawa / 1996).
        let A_dif = diffraction(method, f, diffDelta, d_ss, d_sr, dist);
        if (useLateral) {
            // Combina sopra-bordo + laterali §7.4.3 con la formula (25) §7.4.4.
            const lam = SPEED_OF_SOUND / f;
            const s1 = latZ1 > 0 ? diffISO9613_2024Lateral(latZ1, lam) : null;
            const s2 = latZ2 > 0 ? diffISO9613_2024Lateral(latZ2, lam) : null;
            A_dif = combineDiffraction(A_dif, s1, s2);
        }
        const Lp = Lw_f - A_div - A_atm - A_gr - A_dif;
        const w = weights ? weights[f] : 0;
        bandsLin[f] = Lp; // Lp lineare (non pesato) della banda
        bands[f] = Lp + w; // Lp pesato della banda
        energy += Math.pow(10, (Lp + w) / 10);
    }
    const leq = energy <= 0 ? -Infinity : 10 * Math.log10(energy);
    return { leq, bands, bandsLin };
}
/**
 * Leq pesato totale al ricevitore (ISO 9613-2 §7). Wrapper di
 * propagatePointBands che ne ritorna solo `.leq` — backward compat
 * assoluta con tutti i chiamanti esistenti (firma e output invariati).
 * Object args: il default `method='iso9613'` è per il tool barriere;
 * acmap passa esplicitamente `method:'maekawa'`. Il default
 * `weighting='A'` mantiene byte-identico l'output.
 */
function propagatePoint(args) {
    return propagatePointBands(args).leq;
}
