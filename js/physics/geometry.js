"use strict";
/* ============================================================================
 * physics/geometry.js — 2D geometry helpers + lat/lng <-> local projection
 * ----------------------------------------------------------------------------
 *   segIntersect(...)               — segment-segment intersection (t,u in [0,1])
 *   firstBarrierHit(sx,sy,rx,ry,p)  — first hit between S->R segment and a
 *                                     barrier polyline (returns nearest in t)
 *   latlngToLocal / localToLatLng   — equirectangular projection around a
 *                                     reference lat/lng (good for <~1 km)
 *   polylineLength(pts)             — total length in meters of a 2D polyline
 *   discretizeLine(poly, step)      — uniform sampling of a polyline
 *   discretizeRect(corners, step)   — cell-centre sampling of a rectangle
 * ========================================================================== */

function segIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  var den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-12) return null; // parallel/coincident segments
  var t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  var u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { t: t, x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }
  return null;
}

function firstBarrierHit(sx, sy, rx, ry, barrierPolyLocal) {
  if (!barrierPolyLocal || barrierPolyLocal.length < 2) return null;
  var best = null;
  for (var i = 0; i < barrierPolyLocal.length - 1; i++) {
    var p3 = barrierPolyLocal[i];
    var p4 = barrierPolyLocal[i + 1];
    var hit = segIntersect(sx, sy, rx, ry, p3[0], p3[1], p4[0], p4[1]);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  return best;
}

function latlngToLocal(lat, lng, refLat, refLng) {
  // Equirectangular projection (1 deg ≈ 111111 m; longitude scaled by cos lat).
  var dLat = (lat - refLat) * 111111;
  var dLng = (lng - refLng) * 111111 * Math.cos(refLat * Math.PI / 180);
  return [dLng, dLat];
}

function localToLatLng(x, y, refLat, refLng) {
  var lat = refLat + y / 111111;
  var lng = refLng + x / (111111 * Math.cos(refLat * Math.PI / 180));
  return [lat, lng];
}

function polylineLength(pts) {
  var len = 0;
  for (var i = 0; i < pts.length - 1; i++) {
    var dx = pts[i + 1][0] - pts[i][0];
    var dy = pts[i + 1][1] - pts[i][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function discretizeLine(polyLocal, step) {
  var pts = [];
  for (var i = 0; i < polyLocal.length - 1; i++) {
    var x1 = polyLocal[i][0], y1 = polyLocal[i][1];
    var x2 = polyLocal[i + 1][0], y2 = polyLocal[i + 1][1];
    var segLen = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    var nSteps = Math.max(1, Math.round(segLen / step));
    for (var k = 0; k < nSteps; k++) {
      var t = k / nSteps;
      pts.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]);
    }
  }
  pts.push(polyLocal[polyLocal.length - 1]);
  return pts;
}

function discretizeRect(corners, step) {
  var xs = corners.map(function (c) { return c[0]; });
  var ys = corners.map(function (c) { return c[1]; });
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
  var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  var pts = [];
  for (var x = x0 + step / 2; x < x1; x += step) {
    for (var y = y0 + step / 2; y < y1; y += step) {
      pts.push([x, y]);
    }
  }
  return pts;
}
