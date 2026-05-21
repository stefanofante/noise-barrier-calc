"use strict";
/* ============================================================================
 * osm/buildings.js — Overpass API fetch + Overpass JSON -> local polygons
 * ----------------------------------------------------------------------------
 *   osmToLocal(latlng, srcLat, srcLng)               — convenience projection
 *   polygonCentroid(polyLatLng)                      — naive centroid (lat/lng)
 *   parseOverpassBuildings(json, refLat, refLng, h)  — Overpass JSON -> objects
 *   fetchOSMBuildings({ center, radius, refLat, refLng, defaultHeight })
 *       Promise<Array<Building>>
 *
 * Each building has:
 *   { id, polygon (local x/y), polygonLatLng, centroid, height (m),
 *     heightSource: 'height' | 'levels' | 'default', levelsVal?, osmId, tags }
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

function parseOverpassBuildings(osmJson, refLat, refLng, defaultH) {
  var buildings = [];
  var elements = osmJson.elements || [];
  for (var ei = 0; ei < elements.length; ei++) {
    var el = elements[ei];
    if (!el.geometry && !el.members) continue;
    var tags = el.tags || {};
    var h = null;
    var heightSource = 'default';
    var levelsVal = null;
    // Prefer explicit `height` tag.
    if (tags.height) {
      var parsed = parseFloat(tags.height);
      if (!isNaN(parsed) && parsed > 0) {
        h = parsed;
        heightSource = 'height';
      }
    }
    // Fall back to `building:levels` x 3 m.
    if (h === null && tags['building:levels']) {
      var lv = parseFloat(tags['building:levels']);
      if (!isNaN(lv) && lv > 0) {
        h = lv * 3.0;
        levelsVal = lv;
        heightSource = 'levels';
      }
    }
    // Final fallback: user-supplied default height.
    if (h === null || isNaN(h)) {
      h = defaultH;
      heightSource = 'default';
    }
    if (el.type === 'way' && el.geometry) {
      var polyLatLng = el.geometry.map(function (g) { return [g.lat, g.lon]; });
      // Ensure the polygon ring is explicitly closed.
      if (polyLatLng.length > 2) {
        var first = polyLatLng[0], last = polyLatLng[polyLatLng.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          polyLatLng.push([first[0], first[1]]);
        }
      }
      var polyLocal = polyLatLng.map(function (p) { return osmToLocal(p, refLat, refLng); });
      var centroid = polygonCentroid(polyLatLng);
      buildings.push({
        id: el.id,
        polygon: polyLocal,
        polygonLatLng: polyLatLng,
        centroid: centroid,
        height: h,
        heightSource: heightSource,
        levelsVal: levelsVal,
        osmId: el.id,
        tags: tags,
      });
    }
  }
  return buildings;
}

function fetchOSMBuildings(opts) {
  var center = opts.center, radius = opts.radius;
  var refLat = opts.refLat, refLng = opts.refLng, defaultHeight = opts.defaultHeight;
  // Approximate degree-radius from a metric radius.
  var dLat = radius / 111111;
  var dLng = radius / (111111 * Math.cos(center.lat * Math.PI / 180));
  var south = center.lat - dLat, north = center.lat + dLat;
  var west = center.lng - dLng, east = center.lng + dLng;
  var bbox = south + ',' + west + ',' + north + ',' + east;
  var query = '[out:json][timeout:25];\n(\n  way["building"](' + bbox + ');\n  relation["building"](' + bbox + ');\n);\nout body geom;';
  var url = 'https://overpass-api.de/api/interpreter';
  return fetch(url, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).then(function (resp) {
    if (!resp.ok) throw new Error('Overpass ' + resp.status);
    return resp.json();
  }).then(function (json) {
    return parseOverpassBuildings(json, refLat, refLng, defaultHeight);
  });
}
