/* ============================================================================
 * physics/diffraction.js — GENERATED FILE. DO NOT EDIT BY HAND.
 * ----------------------------------------------------------------------------
 * Produced by scripts/sync-physics.mjs from src/lib/physics/diffraction.ts of the
 * ST-LINE site, which is the authoritative implementation (unit-tested there).
 * Edit the TypeScript source and re-run the script; edits made here are lost
 * on the next sync.
 * ========================================================================== */
"use strict";
/**
 * physics/diffraction.ts — diffrazione su schermo singolo, due metodi.
 * Verbatim da barriers-proto-v06 (diffMaekawa identico ad acmap-proto-v03
 * → acmap, chiamando method='maekawa', resta byte-identico).
 */
/**
 * Maekawa originale (1968): D = 10·log10(3 + 20·N), N = 2δ/λ
 * Barriera infinitamente lunga, no correzione meteo. Max 25 dB.
 */
function diffMaekawa(f, delta) {
    if (delta <= 0)
        return 0;
    const lam = SPEED_OF_SOUND / f;
    const N = 2 * delta / lam;
    if (N < 0)
        return 0;
    const v = 3 + 20 * N;
    if (v <= 1)
        return 0;
    return Math.max(0, Math.min(25, 10 * Math.log10(v)));
}
/**
 * Maekawa — variante in forma chiusa di Kurze & Anderson (1971):
 *   A = 5 + 20·log10( √(2πN) / tanh(√(2πN)) )   per N > 0
 * Approssimazione analitica della curva empirica di Maekawa (1968).
 * Per N ≤ 0 (linea di vista libera) l'attenuazione tende a 0 dB, con
 * raccordo lineare nella zona −0.2 ≤ N < 0. Cap conservativo 24 dB.
 * Rif.: Kurze, U.J. & Anderson, G.S., "Sound attenuation by barriers",
 * Applied Acoustics 4 (1971); cfr. ISO 9613-2:1996 §7.4.
 *
 * NB: distinta da diffMaekawa() (Maekawa originale, 10·log10(3+20N),
 * cap 25) usata da acmap e calcolo-barriere. Aggiunta per il tool
 * "Maekawa explorer", che esplora questa formulazione.
 */
function maekawaAttKA(N) {
    if (N <= -0.2)
        return 0;
    if (N <= 0)
        return 5 * (N + 0.2) / 0.2; // raccordo lineare 0→5 dB
    const x = Math.sqrt(2 * Math.PI * N);
    const att = 5 + 20 * Math.log10(x / Math.tanh(x));
    return Math.max(0, Math.min(24, att));
}
/**
 * Diffrazione Maekawa (forma Kurze-Anderson) da frequenza e differenza
 * di cammino δ. N = 2δ/λ, λ = c/f. δ può essere negativo (LOS libera).
 */
function diffMaekawaKA(f, delta) {
    const lam = SPEED_OF_SOUND / f;
    return maekawaAttKA(2 * delta / lam);
}
/**
 * ISO 9613-2:1996 §7.4 — Screening completo (PRIMA edizione).
 * Dz = 10·log10(3 + (C2/λ)·C3·z·Kmet)
 *   C2 = 20 (no ground refl modellate separatamente)
 *   C3 = 1 (single barrier)
 *   Kmet = exp(-(1/2000)·√(d_ss·d_sr/(2z))) per downwind
 * Max 20 dB (single), 25 dB (double).
 *
 * NOTA (refactor ISO 9613-2:2024): la 1996 canonica ha al numeratore
 * della radice di Kmet anche la distanza diretta `d` — il codice qui
 * implementa una forma SEMPLIFICATA senza `d` (`√(d_ss·d_sr/(2z))`).
 * Questa funzione è MANTENUTA byte-identica come "modalità di confronto
 * 1996": NON viene corretta, per non alterare i risultati storici
 * (vedi diffISO9613_2024 per la formulazione vigente, che `d` lo usa).
 */
function diffISO9613_1996(f, delta, d_ss, d_sr) {
    if (delta <= 0)
        return 0;
    const lam = SPEED_OF_SOUND / f;
    const C2 = 20;
    const C3 = 1;
    let Kmet = 1.0;
    if (d_ss > 0 && d_sr > 0 && delta > 0) {
        const arg = (d_ss * d_sr) / (2 * delta);
        if (arg > 0)
            Kmet = Math.exp(-(1 / 2000) * Math.sqrt(arg));
    }
    const v = 3 + (C2 / lam) * C3 * delta * Kmet;
    if (v <= 1)
        return 0;
    const Dz = 10 * Math.log10(v);
    const maxDz = (C3 === 1) ? 20 : 25;
    return Math.max(0, Math.min(maxDz, Dz));
}
/** Cap §7.4.4 — diffrazione SOPRA il bordo (piano verticale). */
const ISO_SINGLE_CAP = 20; // dB, diffrazione singola (e = 0)
const ISO_MULTI_CAP = 25; // dB, diffrazione multipla (e > 0)
/** C3 — formula (16)-(17): 1 per diffrazione singola, dipendente da e/λ
 *  per diffrazione multipla. */
function c3of(lambda, e) {
    return (e <= 0)
        ? 1
        : (1 + Math.pow(5 * lambda / e, 2)) / ((1 / 3) + Math.pow(5 * lambda / e, 2));
}
/**
 * Nucleo Dz ISO 9613-2:2024 §7.4.1 — formula (18)-(19), SENZA cap.
 *   Dz = 10·log10[ 1 + (2 + (C2/λ)·C3·z)·Kmet ]   per z > z_min
 *   Dz = 0                                          per z ≤ z_min
 *   z_min = -2λ / (C2·C3)
 * Kmet è passato dal chiamante: formula (21) per la diffrazione sopra
 * il bordo, oppure 1 per la diffrazione laterale (§7.4.1: "For lateral
 * diffraction around obstacles, it shall be assumed that Kmet = 1").
 */
function dz2024Core(z, lambda, Kmet, e, C2) {
    const C3 = c3of(lambda, e);
    const z_min = -2 * lambda / (C2 * C3);
    if (z <= z_min)
        return 0;
    return Math.max(0, 10 * Math.log10(1 + (2 + (C2 / lambda) * C3 * z) * Kmet));
}
/**
 * ISO 9613-2:2024 §7.4.1 — Screening SOPRA il bordo, SECONDA edizione.
 *
 * Formula (18)-(19) con Kmet da formula (21):
 *   Kmet = exp{ -(1/2000)·√[ (max(d_SS,d_SR)+e)·min(d_SS,d_SR)·d
 *                            / (2·(z - z_min)) ] }
 *
 * @param z       differenza di cammino [m] (positiva = raggio sopra il bordo)
 * @param lambda  lunghezza d'onda [m]
 * @param d_ss    cammino sorgente → primo bordo diffrangente [m]
 * @param d_sr    cammino ultimo bordo diffrangente → ricevitore [m]
 * @param d       distanza diretta sorgente-ricevitore [m]
 * @param e       somma delle distanze bordo-bordo [m]; 0 per diffrazione singola
 * @param C2      20 (riflessioni suolo modellate a parte) | 40 (altrimenti)
 * @returns Dz [dB], con cap §7.4.4 (20 dB single / 25 dB multi)
 */
function diffISO9613_2024(z, lambda, d_ss, d_sr, d, e = 0, C2 = 20) {
    const C3 = c3of(lambda, e);
    const z_min = -2 * lambda / (C2 * C3);
    if (z <= z_min)
        return 0;
    // Kmet 2024 — formula (21). Numeratore della radice asimmetrico in
    // d_SS/d_SR e con la distanza diretta d esplicita.
    const maxSR = Math.max(d_ss, d_sr);
    const minSR = Math.min(d_ss, d_sr);
    let Kmet = 1.0;
    const kArg = ((maxSR + e) * minSR * d) / (2 * (z - z_min));
    if (kArg > 0)
        Kmet = Math.exp(-(1 / 2000) * Math.sqrt(kArg));
    const Dz = dz2024Core(z, lambda, Kmet, e, C2);
    const cap = (e > 0) ? ISO_MULTI_CAP : ISO_SINGLE_CAP;
    return Math.min(cap, Dz);
}
/**
 * ISO 9613-2:2024 §7.4.3 — Diffrazione LATERALE attorno ai bordi
 * verticali. Stessa formula Dz (18)-(19) del cammino sopra il bordo,
 * ma con **Kmet = 1** (§7.4.1: per la diffrazione laterale Kmet vale 1).
 * Il path-difference `z` dei raggi laterali è positivo per costruzione
 * (§7.4.3, NOTE).
 *
 * NB sul cap: il §7.4.4 limita Dz a 20/25 dB esplicitamente solo per
 * "diffraction over the top in the vertical plane" → la diffrazione
 * laterale qui NON è cappata (lettura fedele dello standard). La
 * limitazione fisica è gestita a valle dalla combinazione formula (25).
 *
 * @param z       path-difference del raggio laterale [m] (≥ 0)
 * @param lambda  lunghezza d'onda [m]
 * @param e       somma distanze bordo-bordo [m]; 0 per diffrazione singola
 * @param C2      20 (default) | 40
 * @returns Dz laterale [dB], non cappato
 */
function diffISO9613_2024Lateral(z, lambda, e = 0, C2 = 20) {
    return dz2024Core(z, lambda, 1, e, C2);
}
/**
 * ISO 9613-2:2024 §7.4.4 — formula (25). Combina l'attenuazione del
 * cammino sopra il bordo (Abar,top) e dei due cammini laterali
 * (Abar,side1/2) in un'unica Abar:
 *
 *   Abar = -10·log10( 10^(-0.1·Abar,top)
 *                   + 10^(-0.1·Abar,side1)
 *                   + 10^(-0.1·Abar,side2) )
 *
 * Un cammino "non rilevante" → passare `null`/`undefined`: il suo
 * addendo nella parentesi è 0 (NON 1). Se il risultato è negativo,
 * l'Abar effettiva è 0 (§7.4.4).
 *
 * @param topAbar    Abar del cammino sopra il bordo [dB], o null
 * @param side1Abar  Abar del cammino laterale 1 [dB], o null se assente
 * @param side2Abar  Abar del cammino laterale 2 [dB], o null se assente
 * @returns Abar combinata [dB] ≥ 0
 */
function combineDiffraction(topAbar, side1Abar, side2Abar) {
    const term = (a) => (a == null ? 0 : Math.pow(10, -0.1 * a));
    const sum = term(topAbar) + term(side1Abar) + term(side2Abar);
    if (sum <= 0)
        return 0;
    return Math.max(0, -10 * Math.log10(sum));
}
/**
 * Dispatcher diffrazione. Metodi:
 *   'maekawa'       → Maekawa 1968
 *   'iso9613-1996'  → ISO 9613-2:1996 §7.4 (modalità di confronto)
 *   'iso9613-2024'  → ISO 9613-2:2024 §7.4.1 (edizione vigente)
 *   'iso9613'       → alias di 'iso9613-2024' (default storico → 2024)
 * `d` = distanza diretta sorgente-ricevitore (serve alla Kmet 2024).
 */
function diffraction(method, f, delta, d_ss, d_sr, d = 0) {
    switch (method) {
        case 'maekawa':
            return diffMaekawa(f, delta);
        case 'iso9613-1996':
            return diffISO9613_1996(f, delta, d_ss, d_sr);
        case 'iso9613-2024':
        case 'iso9613':
            // δ ≤ 0 a livello tool = nessuna diffrazione (la barriera non
            // intercetta la LOS) → A_dif 0, coerente con 1996/Maekawa. La
            // logica z_min interna alla 2024 resta verificata dai test unit.
            if (delta <= 0)
                return 0;
            return diffISO9613_2024(delta, SPEED_OF_SOUND / f, d_ss, d_sr, d);
        default:
            throw new Error(`Unknown diffraction method: ${method}`);
    }
}
/** Differenza di cammino δ (m) per diffrazione su ostacolo di quota hb. */
function pathDelta(d_sb, d_br, hs, hr, hb) {
    const d_sr = d_sb + d_br;
    if (d_sr < 1)
        return 0;
    const y_los = hs + (d_sb / d_sr) * (hr - hs);
    if (hb <= y_los)
        return 0;
    const d_st = Math.sqrt(d_sb * d_sb + (hb - hs) * (hb - hs));
    const d_tr = Math.sqrt(d_br * d_br + (hr - hb) * (hr - hb));
    const d_sr_dir = Math.sqrt(d_sr * d_sr + (hr - hs) * (hr - hs));
    return d_st + d_tr - d_sr_dir;
}
/** Distanza perpendicolare (in pianta) del punto E dalla retta S-R. */
function perpDistanceToLine(sx, sy, rx, ry, ex, ey) {
    const dx = rx - sx, dy = ry - sy;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9)
        return Math.hypot(ex - sx, ey - sy);
    return Math.abs(dx * (ey - sy) - dy * (ex - sx)) / len;
}
/**
 * ISO 9613-2:2024 §7.4.3 — path-difference z dei due cammini di
 * diffrazione laterale attorno ai bordi verticali (estremi) di una
 * barriera, in vista geometrica.
 *
 * z laterale per un bordo verticale singolo (formula 24, e = 0): il
 * piano di proiezione perpendicolare al bordo verticale è orizzontale,
 * quindi d_SS / d_SR sono distanze ORIZZONTALI sorgente/ricevitore →
 * estremo, `a` è la componente parallela al bordo (= |hr − hs|) e `d`
 * la distanza diretta 3D:
 *   z = √[ (d_SS + d_SR)² + a² ] − d
 *
 * Regola del fattore 8 (§7.4.3): un cammino laterale è scartato se la
 * distanza del suo punto d'appoggio (l'estremo) dalla retta S-R supera
 * di più di 8× la distanza del punto d'appoggio del cammino sopra il
 * bordo (`dPerpTop`, tipicamente hb − quota LOS).
 *
 * @param barrier  polilinea barriera (coord locali orizzontali); estremi
 *                 [0] e [length-1] = i due bordi verticali
 * @param dPerpTop distanza del punto d'appoggio sopra-bordo dalla retta S-R
 * @returns [z1, z2] path-difference laterali (m); 0 = cammino non rilevante
 */
function lateralBarrierDeltas(sx, sy, rx, ry, hs, hr, barrier, dPerpTop) {
    const out = [0, 0];
    if (barrier.length < 2)
        return out;
    const ends = [barrier[0], barrier[barrier.length - 1]];
    const a = Math.abs(hr - hs);
    const d = Math.hypot(Math.hypot(rx - sx, ry - sy), hr - hs);
    for (let i = 0; i < 2; i++) {
        const [ex, ey] = ends[i];
        // Fattore 8: cammino laterale troppo "largo" → contributo trascurabile.
        if (dPerpTop > 0 && perpDistanceToLine(sx, sy, rx, ry, ex, ey) > 8 * dPerpTop) {
            continue;
        }
        const dSS = Math.hypot(ex - sx, ey - sy);
        const dSR = Math.hypot(ex - rx, ey - ry);
        const z = Math.hypot(dSS + dSR, a) - d;
        if (z > 0)
            out[i] = z;
    }
    return out;
}
