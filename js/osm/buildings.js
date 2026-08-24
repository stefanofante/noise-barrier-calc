"use strict";
/* ============================================================================
 * osm/buildings.js — Overpass API fetch + Overpass JSON -> local polygons
 * ----------------------------------------------------------------------------
 *   osmToLocal(latlng, srcLat, srcLng)               — convenience projection
 *   polygonCentroid(polyLatLng)                      — naive centroid (lat/lng)
 *   parseOverpassBuildings(json, refLat, refLng, h)  — Overpass JSON -> objects
 *   fetchOSMBuildingsResult(opts)  — Promise<{buildings, offline, cached}>
 *   fetchOSMBuildings(opts)        — Promise<Array<Building>>
 *
 * Each building has:
 *   { id, polygon (local x/y), polygonLatLng, centroid, height (m),
 *     heightSource: 'height' | 'levels' | 'default',
 *     heightBasis: exact tag/criterion the height came from,
 *     height_estimated: true unless an explicit height tag was found,
 *     levelsVal?, osmId, tags }
 *
 * ----------------------------------------------------------------------------
 * REVISION 2026-08-24 — three defects fixed. They affected RESULTS, not just
 * shape, so they are documented here and not only in the changelog.
 *
 * 1. MULTIPOLYGONS WERE DISCARDED. The query asks for both `way` and
 *    `relation`, but the parser only pushed to the output for
 *    `el.type === 'way'`. Every building mapped as a multipolygon — courtyard
 *    buildings, inner yards, churches, sheds with skylights, many historic
 *    town blocks — was downloaded, used bandwidth and vanished with no
 *    warning. Measured on a real Overpass response for central Treviso:
 *    129 relations out of 1365 elements, i.e. 9.5% of the buildings silently
 *    dropped, and every one of them reconstructible. They are now recomposed
 *    by stitching the `outer` member ways (see ringsFromRelation).
 *
 * 2. THE HEIGHT CHAIN WAS TOO SHORT. Only `height` and `building:levels` were
 *    read. In Italy `building:height` and `est_height` are also commonly
 *    tagged; and the edge that diffracts is the eaves/ridge, not the top
 *    floor slab, so `roof:height` must be added when present. The flat 9 m
 *    default was the worst offender: on the same Treviso bbox ZERO buildings
 *    carried an explicit height tag and only 8 had `building:levels`, so
 *    99.4% fell back to 9 m — including 112 churches and 38 sheds. The
 *    fallback is now per typology (see TYPOLOGY_HEIGHT).
 *
 * 3. `levels x 3` COUNTED AS MEASURED DATA. A height derived from a floor
 *    count is an estimate, not a measurement. Since data transparency is this
 *    tool's stated selling point, `height_estimated` is now true for anything
 *    that does not come from an explicit height tag, and `heightBasis`
 *    exposes the exact tag used.
 *
 * Plus hardened networking: mirror list ordered by measured availability,
 * staggered requests, in-memory cache, and an explicit offline state instead
 * of silently looking like an area with no buildings.
 * ========================================================================== */

function osmToLocal(latlng, srcLat, srcLng) {
  var dLat = (latlng[0] - srcLat) * 111111;
  var dLon = (latlng[1] - srcLng) * 111111 * Math.cos(srcLat * Math.PI / 180);
  return [dLon, dLat];
}

function polygonCentroid(polyLatLng) {
  // Average of vertices, excluding the duplicated closing vertex.
  var sumLat = 0, sumLng = 0;
  var n = polyLatLng.length - 1;
  for (var i = 0; i < n; i++) {
    sumLat += polyLatLng[i][0];
    sumLng += polyLatLng[i][1];
  }
  return [sumLat / n, sumLng / n];
}

/* ------------------------------- height chain ----------------------------- */

/* Assumed storey height per typology (m). A warehouse tagged
 * `building:levels=1` is not 3 m tall: an industrial storey is around 6 m.
 * Used ONLY to turn a floor count into metres. */
var FLOOR_HEIGHT = {
  industrial: 6.0, warehouse: 6.0, factory: 6.0, hangar: 8.0,
  retail: 4.5, commercial: 4.5, supermarket: 4.5, shop: 4.0,
  office: 3.5, school: 3.5, hospital: 3.5, church: 6.0
};
var FLOOR_HEIGHT_DEFAULT = 3.0;

/* Assumed height per typology (m) when there is neither a height tag nor a
 * floor count. Replaces the single flat default, which was the main source of
 * error on industrial sheds. These are declared design estimates, not data:
 * heightSource stays 'default' and height_estimated stays true. */
var TYPOLOGY_HEIGHT = {
  // single-storey productive / retail
  industrial: 8.0, warehouse: 8.0, factory: 8.0, retail: 8.0,
  commercial: 8.0, supermarket: 8.0, hangar: 10.0,
  // low-rise residential
  house: 6.0, detached: 6.0, semidetached_house: 6.0, terrace: 6.0,
  bungalow: 4.0, cabin: 4.0,
  // multi-storey residential / collective
  apartments: 12.0, residential: 12.0, dormitory: 12.0,
  hotel: 12.0, office: 12.0, school: 10.0, hospital: 14.0,
  // low ancillary structures
  garage: 3.0, garages: 3.0, shed: 3.0, hut: 3.0, greenhouse: 3.5,
  service: 3.0, kiosk: 3.0,
  // places of worship (bell towers are building=tower, not church)
  church: 15.0, cathedral: 20.0, chapel: 8.0, mosque: 12.0, synagogue: 12.0
};

/* `building=*` values that are NOT obstacles: they shield nothing while
 * inflating both the payload and the data-quality statistics. */
var NON_OBSTACLE = ['roof', 'carport', 'canopy'];

/* Reads a numeric tag tolerating the unit ("12 m", "12m", "12"). */
function numTag(tags, key) {
  var raw = tags[key];
  if (!raw) return null;
  var v = parseFloat(String(raw).replace(',', '.'));
  return (!isNaN(v) && v > 0) ? v : null;
}

/* Height resolution chain, from the most authoritative datum to the most
 * conjectural:
 *   height -> building:height -> est_height
 *   -> (building:levels [+ roof:levels]) x per-typology storey height
 *      [+ roof:height when present]
 *   -> per-typology default -> user default
 */
function resolveHeight(tags, defaultH) {
  var bt = tags.building || '';
  var explicitKeys = ['height', 'building:height', 'est_height'];
  for (var i = 0; i < explicitKeys.length; i++) {
    var v = numTag(tags, explicitKeys[i]);
    if (v !== null) {
      return { height: v, source: 'height', basis: explicitKeys[i], levelsVal: null };
    }
  }

  var lv = numTag(tags, 'building:levels');
  if (lv !== null) {
    var fh = FLOOR_HEIGHT[bt] || FLOOR_HEIGHT_DEFAULT;
    var roofLv = numTag(tags, 'roof:levels') || 0;
    var roofH = numTag(tags, 'roof:height');
    var h = (lv + roofLv) * fh;
    var basis = roofLv > 0 ? 'building:levels+roof' : 'building:levels';
    if (roofH !== null) { h = lv * fh + roofH; basis = 'building:levels+roof'; }
    return { height: h, source: 'levels', basis: basis, levelsVal: lv };
  }

  if (TYPOLOGY_HEIGHT[bt] !== undefined) {
    return { height: TYPOLOGY_HEIGHT[bt], source: 'default', basis: 'typology', levelsVal: null };
  }
  return { height: defaultH, source: 'default', basis: 'user-default', levelsVal: null };
}

/* ------------------- multipolygon ring reconstruction --------------------- */

/* Two vertices are the same node? ~1e-7 deg is about 1 cm, below OSM's own
 * tolerance. */
var RING_EPS = 1e-7;
function samePoint(a, b) {
  return Math.abs(a[0] - b[0]) < RING_EPS && Math.abs(a[1] - b[1]) < RING_EPS;
}

/* Rebuilds the CLOSED rings from the `outer` members of a multipolygon
 * relation. With `out geom` each member way already carries its geometry, but
 * one ring can be split across several ways: they must be stitched by
 * matching endpoints, reversing a segment when needed.
 *
 * `inner` rings (courtyards, cloisters, skylights) are DISCARDED on purpose:
 * downstream we need a solid polygon as an obstacle, and an inner courtyard
 * does not open an acoustic gap through the building. */
function ringsFromRelation(el) {
  var segs = [];
  var members = el.members || [];
  for (var mi = 0; mi < members.length; mi++) {
    var m = members[mi];
    // an empty role means 'outer' by OSM multipolygon convention
    var role = m.role || 'outer';
    if (role !== 'outer') continue;
    if (m.type !== 'way' || !m.geometry || !m.geometry.length) continue;
    var pts = [];
    for (var gi = 0; gi < m.geometry.length; gi++) {
      var g = m.geometry[gi];
      if (g && typeof g.lat === 'number' && typeof g.lon === 'number') pts.push([g.lat, g.lon]);
    }
    if (pts.length >= 2) segs.push(pts);
  }

  var rings = [];
  var used = [];
  for (var u = 0; u < segs.length; u++) used.push(false);

  for (var i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    var ring = segs[i].slice();
    var closed = ring.length > 3 && samePoint(ring[0], ring[ring.length - 1]);
    var progress = true;
    while (!closed && progress) {
      progress = false;
      var tail = ring[ring.length - 1];
      for (var j = 0; j < segs.length; j++) {
        if (used[j]) continue;
        var sg = segs[j];
        if (samePoint(tail, sg[0])) {
          ring = ring.concat(sg.slice(1)); used[j] = true; progress = true;
        } else if (samePoint(tail, sg[sg.length - 1])) {
          ring = ring.concat(sg.slice(0, -1).reverse()); used[j] = true; progress = true;
        }
        if (progress) break;
      }
      closed = ring.length > 3 && samePoint(ring[0], ring[ring.length - 1]);
    }

    // Ring that cannot be closed (incomplete OSM data inside the bbox: one of
    // the boundary ways falls outside). Close it by fiat only if it has enough
    // vertices to be a sensible polygon, otherwise drop it.
    if (!closed) {
      if (ring.length < 4) continue;
      ring.push([ring[0][0], ring[0][1]]);
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}

/* ------------------------------ parsing ----------------------------------- */

function makeBuilding(id, osmId, polyLatLng, tags, hr, refLat, refLng) {
  // close the ring when the last vertex does not repeat the first
  if (polyLatLng.length > 2) {
    var first = polyLatLng[0], last = polyLatLng[polyLatLng.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      polyLatLng = polyLatLng.concat([[first[0], first[1]]]);
    }
  }
  var polyLocal = polyLatLng.map(function (p) { return osmToLocal(p, refLat, refLng); });
  return {
    id: id,
    polygon: polyLocal,
    polygonLatLng: polyLatLng,
    centroid: polygonCentroid(polyLatLng),
    height: hr.height,
    heightSource: hr.source,
    heightBasis: hr.basis,
    height_estimated: hr.source !== 'height',
    levelsVal: hr.levelsVal,
    osmId: osmId,
    tags: tags
  };
}

function parseOverpassBuildings(osmJson, refLat, refLng, defaultH) {
  var buildings = [];
  var elements = (osmJson && osmJson.elements) || [];
  for (var ei = 0; ei < elements.length; ei++) {
    var el = elements[ei];
    var tags = el.tags || {};
    // Roofs/carports/canopies do not shield: drop them (the query filters them
    // too, but a mirror may ignore the filter).
    if (NON_OBSTACLE.indexOf(tags.building) !== -1) continue;

    var hr = resolveHeight(tags, defaultH);

    if (el.type === 'way' && el.geometry) {
      var polyLatLng = [];
      for (var gi = 0; gi < el.geometry.length; gi++) {
        var g = el.geometry[gi];
        if (g && typeof g.lat === 'number' && typeof g.lon === 'number') {
          polyLatLng.push([g.lat, g.lon]);
        }
      }
      if (polyLatLng.length < 3) continue;
      buildings.push(makeBuilding(el.id, el.id, polyLatLng, tags, hr, refLat, refLng));
    } else if (el.type === 'relation') {
      // A multipolygon can carry SEVERAL outer rings (a block with more than
      // one built body): each becomes its own building, sharing the tags.
      // Synthetic negative id so it cannot collide with way ids.
      var rings = ringsFromRelation(el);
      for (var ri = 0; ri < rings.length; ri++) {
        buildings.push(makeBuilding(
          -(el.id * 100 + ri), el.id, rings[ri], tags, hr, refLat, refLng));
      }
    }
  }
  return buildings;
}

/* --------------------------- network: mirrors ----------------------------- */

/* Order decided by MEASUREMENT, not convention (benchmark 2026-08-24 on a
 * bbox of central Treviso, three runs):
 *   overpass-api.de   200 in 1.4 s when up, but also 429 and 504 -> first,
 *                     because when it answers it is by far the fastest
 *   maps.mail.ru      200 in every run (2.5-14 s): slow but the only one
 *                     always available -> second, the real safety net
 *   kumi.systems      502/500 in every run, and takes 30-36 s to say so
 *                     (historically the best mirror: kept LAST for when it
 *                     comes back, where it does no harm because we do not
 *                     wait for it once another has answered)
 * Dropped: overpass.private.coffee (no answer, hangs 35 s),
 * overpass.openstreetmap.ru and overpass.osm.jp (connection refused).
 * If an endpoint becomes reliable again, move it up — but only after
 * measuring it, not because a guide mentions it. */
var OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

/* Per-endpoint timeout, deliberately GENEROUS. With staggered requests the
 * perceived latency is that of the FASTEST mirror in flight, not the sum of
 * the timeouts, so a long timeout slows nothing down: it only avoids killing
 * a slow but working mirror. 8 s was a real regression — maps.mail.ru answers
 * between 2.5 and 14 s and is the only always-available endpoint, so at 8 s
 * it got aborted before responding and, with the primary returning 504, the
 * building fetch failed outright. 20 s stays under the `[timeout:25]`
 * declared server-side in the query. */
var OVERPASS_TIMEOUT_MS = 20000;

/* Delay after which the next mirror is started WITHOUT abandoning the
 * previous one (hedged request). If the first endpoint answers within this
 * window no other server is contacted at all; if it lags, the second runs in
 * parallel and the first valid answer wins. 900 ms sits above Overpass's
 * typical response time on small bboxes, so in normal use the alternates are
 * never touched. No cap on in-flight requests and no aborting of earlier
 * attempts: the 2-concurrent-slot limit is PER INSTANCE and we send exactly
 * one request per host, so no instance ever sees more than one slot in use. */
var OVERPASS_STAGGER_MS = 900;

/* In-memory cache of the RAW Overpass response (not of the parsed buildings:
 * parsing depends on defaultHeight and refLat/refLng, which can change with
 * no need to re-download). The key quantises the centre to ~0.0004 deg
 * (about 45 m) at equal radius, so nudging the view by a few tens of metres —
 * or recomputing after changing a parameter — does not repeat the query. This
 * is the main defence against self-inflicted 429s. */
var CACHE_CELL_DEG = 0.0004;
var CACHE_TTL_MS = 10 * 60 * 1000;
var CACHE_MAX = 24;
var rawCache = {};   // key -> { json, t, offline }

function cacheKey(center, radius) {
  function q(v) { return (Math.round(v / CACHE_CELL_DEG) * CACHE_CELL_DEG).toFixed(5); }
  return q(center.lat) + ',' + q(center.lng) + ',' + Math.round(radius);
}

/* Clears the Overpass cache (tests, or an explicit reload). */
function clearBuildingsCache() { rawCache = {}; }

function overpassFetch(url, body) {
  var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, OVERPASS_TIMEOUT_MS);
  var init = {
    method: 'POST',
    body: body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  };
  if (ctrl) init.signal = ctrl.signal;
  return fetch(url, init).then(function (resp) {
    if (!resp.ok) throw new Error('Overpass ' + resp.status);
    return resp.json();
  }).then(function (json) {
    clearTimeout(timer);
    return json;
  }, function (err) {
    clearTimeout(timer);
    throw err;
  });
}

/* Queries the endpoints with STAGGERED requests: starts with the first and
 * every OVERPASS_STAGGER_MS adds another without abandoning those already in
 * flight; the first valid answer wins. An endpoint that fails immediately
 * (429/504/network) moves on to the next without waiting the stagger.
 * `onTry` is called for each endpoint contacted, so the caller can tell the
 * user it is trying an alternate rather than appearing stuck. */
function overpassAny(body, onTry) {
  var errors = [];
  var settled = false;

  return new Promise(function (resolve, reject) {
    var pending = 0;
    var launched = 0;

    function launch(i) {
      if (i >= OVERPASS_ENDPOINTS.length || settled) return;
      launched = Math.max(launched, i + 1);
      var url = OVERPASS_ENDPOINTS[i];
      if (onTry) { try { onTry(url, i); } catch (e) { /* UI hook: non fatal */ } }
      pending++;
      overpassFetch(url, body).then(function (json) {
        pending--;
        if (settled) return;
        settled = true;
        resolve({ json: json, url: url });
      }, function (err) {
        pending--;
        errors.push(url + ': ' + (err && err.message ? err.message : String(err)));
        if (settled) return;
        if (launched < OVERPASS_ENDPOINTS.length) launch(launched);
        else if (pending === 0) {
          reject(new Error('all Overpass mirrors failed - ' + errors.join(' | ')));
        }
      });
      // hedge: add the next endpoint after the stagger, if not already started
      if (i + 1 < OVERPASS_ENDPOINTS.length) {
        setTimeout(function () {
          if (!settled && launched === i + 1) launch(i + 1);
        }, OVERPASS_STAGGER_MS);
      }
    }

    launch(0);
  });
}

/* Downloads OSM buildings inside the bbox center +/- radius and returns them
 * in local coordinates relative to refLat/refLng, together with the outcome
 * of the fetch.
 *
 * On total failure it returns an EMPTY list with offline:true. It does not
 * fabricate buildings: in an acoustic tool, presenting invented geometry as
 * if it were real is worse than saying "no data" — the result looks plausible
 * and is wrong. Stating it in the UI is the caller's job. */
function fetchOSMBuildingsResult(opts) {
  var center = opts.center, radius = opts.radius;
  var refLat = opts.refLat, refLng = opts.refLng, defaultHeight = opts.defaultHeight;

  var key = cacheKey(center, radius);
  var hit = rawCache[key];
  if (hit && (Date.now() - hit.t) < CACHE_TTL_MS) {
    return Promise.resolve({
      buildings: parseOverpassBuildings(hit.json, refLat, refLng, defaultHeight),
      offline: hit.offline,
      cached: true
    });
  }

  var dLat = radius / 111111;
  var dLng = radius / (111111 * Math.cos(center.lat * Math.PI / 180));
  var bbox = (center.lat - dLat) + ',' + (center.lng - dLng) + ',' +
             (center.lat + dLat) + ',' + (center.lng + dLng);

  // The filter drops roofs/carports/canopies upstream: they shield nothing and
  // inflate both payload and statistics.
  var notObstacle = '["building"!~"^(' + NON_OBSTACLE.join('|') + ')$"]';
  var query = '[out:json][timeout:25];\n(\n' +
    '  way["building"]' + notObstacle + '(' + bbox + ');\n' +
    '  relation["building"]' + notObstacle + '(' + bbox + ');\n' +
    ');\nout body geom;';
  var body = 'data=' + encodeURIComponent(query);

  function store(json, offline) {
    var keys = Object.keys(rawCache);
    if (keys.length >= CACHE_MAX) {
      var oldest = keys[0];
      for (var i = 1; i < keys.length; i++) {
        if (rawCache[keys[i]].t < rawCache[oldest].t) oldest = keys[i];
      }
      delete rawCache[oldest];
    }
    rawCache[key] = { json: json, t: Date.now(), offline: offline };
  }

  return overpassAny(body, opts.onTry).then(function (res) {
    store(res.json, false);
    return {
      buildings: parseOverpassBuildings(res.json, refLat, refLng, defaultHeight),
      offline: false,
      cached: false
    };
  }, function (err) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[osm/buildings] ' + (err && err.message ? err.message : err));
    }
    return { buildings: [], offline: true, cached: false };
  });
}

/* Historic signature: the list of buildings only. Kept because existing
 * callers use it; whoever needs to tell the offline degradation apart from
 * "no buildings here" should use fetchOSMBuildingsResult. */
function fetchOSMBuildings(opts) {
  return fetchOSMBuildingsResult(opts).then(function (r) { return r.buildings; });
}
