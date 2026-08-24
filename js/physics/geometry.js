/* ============================================================================
 * physics/geometry.js — GENERATED FILE. DO NOT EDIT BY HAND.
 * ----------------------------------------------------------------------------
 * Produced by scripts/sync-physics.mjs from src/lib/physics/geometry.ts of the
 * ST-LINE site, which is the authoritative implementation (unit-tested there).
 * Edit the TypeScript source and re-run the script; edits made here are lost
 * on the next sync.
 * ========================================================================== */
"use strict";
/**
 * physics/geometry.ts — helper geometrici puri condivisi.
 * Verbatim da barriers-proto-v06. (La geometria OSM-specifica di acmap —
 * firstBuildingHit/parseOverpass — resta nel componente acmap.)
 */
/** Intersezione segmento (1-2) con segmento (3-4). null se non si toccano. */
function segIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-12)
        return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return { t, x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    }
    return null;
}
/** Primo punto in cui il raggio S→R interseca la polilinea barriera. */
function firstBarrierHit(sx, sy, rx, ry, barrierPolyLocal) {
    if (!barrierPolyLocal || barrierPolyLocal.length < 2)
        return null;
    let best = null;
    for (let i = 0; i < barrierPolyLocal.length - 1; i++) {
        const [x3, y3] = barrierPolyLocal[i];
        const [x4, y4] = barrierPolyLocal[i + 1];
        const hit = segIntersect(sx, sy, rx, ry, x3, y3, x4, y4);
        if (hit && (!best || hit.t < best.t))
            best = hit;
    }
    return best;
}
/** lat/lon → metri locali [x=est, y=nord] rispetto a (refLat, refLng). */
function latlngToLocal(lat, lng, refLat, refLng) {
    const dLat = (lat - refLat) * 111111;
    const dLng = (lng - refLng) * 111111 * Math.cos(refLat * Math.PI / 180);
    return [dLng, dLat];
}
/** metri locali → lat/lon rispetto a (refLat, refLng). */
function localToLatLng(x, y, refLat, refLng) {
    const lat = refLat + y / 111111;
    const lng = refLng + x / (111111 * Math.cos(refLat * Math.PI / 180));
    return [lat, lng];
}
/** Lunghezza polilinea (m) in coordinate locali. */
function polylineLength(pts) {
    let len = 0;
    for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i + 1][0] - pts[i][0];
        const dy = pts[i + 1][1] - pts[i][1];
        len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
}
/** Discretizza una polilinea in punti spaziati ~`step` metri. */
function discretizeLine(polyLocal, step) {
    const pts = [];
    for (let i = 0; i < polyLocal.length - 1; i++) {
        const [x1, y1] = polyLocal[i];
        const [x2, y2] = polyLocal[i + 1];
        const segLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const nSteps = Math.max(1, Math.round(segLen / step));
        for (let k = 0; k < nSteps; k++) {
            const t = k / nSteps;
            pts.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]);
        }
    }
    pts.push(polyLocal[polyLocal.length - 1]);
    return pts;
}
/** Discretizza una polilinea con densità adattiva: passo `denseStep`
 * sulla zona focus (estesa ±focusLength/2 dall'arc-length della
 * proiezione di `focusCenter` sulla polilinea), passo `baseStep`
 * fuori. Ogni puntuale porta lo step della regione di provenienza,
 * usato downstream per Lw locale.
 *
 * Caso d'uso primario nel Calcolo barriere: discretizzazione fine
 * della sorgente lineare nella zona schermata dalla barriera
 * (sorgenti rappresentate da puntuali ravvicinati sotto la barriera
 * + puntuali radi sulle code).
 */
function discretizeLineAdaptive(polyLocal, focusCenter, focusLength, denseStep = 2.5, baseStep = 5) {
    if (polyLocal.length === 0)
        return [];
    if (polyLocal.length === 1)
        return [{ pos: polyLocal[0], step: baseStep }];
    // Arc-length cumulato.
    const cumLens = [0];
    for (let i = 0; i < polyLocal.length - 1; i++) {
        const dx = polyLocal[i + 1][0] - polyLocal[i][0];
        const dy = polyLocal[i + 1][1] - polyLocal[i][1];
        cumLens.push(cumLens[i] + Math.sqrt(dx * dx + dy * dy));
    }
    const sTotal = cumLens[cumLens.length - 1];
    if (sTotal < 1e-9)
        return [{ pos: polyLocal[0], step: baseStep }];
    // Proiezione di focusCenter sulla polilinea → s_anchor (arc-length).
    let sAnchor = 0;
    let bestDist2 = Infinity;
    for (let i = 0; i < polyLocal.length - 1; i++) {
        const [ax, ay] = polyLocal[i];
        const [bx, by] = polyLocal[i + 1];
        const dx = bx - ax, dy = by - ay;
        const L2 = dx * dx + dy * dy;
        if (L2 < 1e-12)
            continue;
        let t = ((focusCenter[0] - ax) * dx + (focusCenter[1] - ay) * dy) / L2;
        if (t < 0)
            t = 0;
        else if (t > 1)
            t = 1;
        const px = ax + t * dx, py = ay + t * dy;
        const d2 = (focusCenter[0] - px) ** 2 + (focusCenter[1] - py) ** 2;
        if (d2 < bestDist2) {
            bestDist2 = d2;
            sAnchor = cumLens[i] + t * Math.sqrt(L2);
        }
    }
    const sFocusMin = Math.max(0, sAnchor - focusLength / 2);
    const sFocusMax = Math.min(sTotal, sAnchor + focusLength / 2);
    // Posizione lungo la polilinea a un dato arc-length s.
    const posAt = (s) => {
        if (s <= 0)
            return [polyLocal[0][0], polyLocal[0][1]];
        if (s >= sTotal) {
            const last = polyLocal[polyLocal.length - 1];
            return [last[0], last[1]];
        }
        let i = 0;
        while (i < cumLens.length - 1 && cumLens[i + 1] < s)
            i++;
        const segLen = cumLens[i + 1] - cumLens[i];
        const t = segLen > 1e-12 ? (s - cumLens[i]) / segLen : 0;
        return [
            polyLocal[i][0] + t * (polyLocal[i + 1][0] - polyLocal[i][0]),
            polyLocal[i][1] + t * (polyLocal[i + 1][1] - polyLocal[i][1]),
        ];
    };
    const samples = [];
    let s = 0;
    while (s < sTotal) {
        const stepHere = (s >= sFocusMin && s <= sFocusMax) ? denseStep : baseStep;
        samples.push({ pos: posAt(s), step: stepHere });
        s += stepHere;
    }
    // Endpoint finale con lo step della propria regione.
    const endStep = (sTotal >= sFocusMin && sTotal <= sFocusMax) ? denseStep : baseStep;
    samples.push({ pos: posAt(sTotal), step: endStep });
    return samples;
}
/** Discretizza un rettangolo (4 corner locali) in griglia di punti. */
function discretizeRect(corners, step) {
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pts = [];
    for (let x = x0 + step / 2; x < x1; x += step) {
        for (let y = y0 + step / 2; y < y1; y += step) {
            pts.push([x, y]);
        }
    }
    return pts;
}
