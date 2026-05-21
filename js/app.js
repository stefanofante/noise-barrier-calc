"use strict";
/* ============================================================================
 * app.js — Barrier-calculator init (Leaflet map, drawing, compute, UI wiring)
 * ----------------------------------------------------------------------------
 * Verbatim logic preserved from the original single-file demo. Exposes a
 * single global `initBarrierCalc()`, plus a bootstrap that calls
 * `initChrome()` first and `initBarrierCalc()` second on DOMContentLoaded.
 * Depends (in load order) on:
 *   physics/{constants, spectra, atm, ground, diffraction, geometry, propagation}
 *   osm/buildings, ui/screenshot, i18n/strings, i18n/runtime
 * ========================================================================== */

function initBarrierCalc() {
  var L = window.L;
  var d3 = window.d3;
  var isDarkTheme = function () {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  };

  var map = L.map('map', { scrollWheelZoom: false }).setView([45.66, 12.24], 16);

  try {
    var saved = JSON.parse(localStorage.getItem('stline-barrier-last-center') || 'null');
    if (saved && typeof saved.lat === 'number' && typeof saved.lon === 'number') {
      map.setView([saved.lat, saved.lon], saved.zoom || 16);
    }
  } catch (e) {}

  var LocateControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
      var btn = L.DomUtil.create('button', 'leaflet-control-locate leaflet-bar');
      btn.type = 'button';
      btn.innerHTML = '📍';
      btn.title = s.locateMe;
      btn.setAttribute('aria-label', s.locateMe);
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', locateUser);
      return btn;
    }
  });

  function locateUser() {
    if (!('geolocation' in navigator)) {
      alert(s.geolocationUnsupported);
      return;
    }
    var ctrl = document.querySelector('.leaflet-control-locate');
    if (ctrl) ctrl.classList.add('locating');
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var latitude = pos.coords.latitude, longitude = pos.coords.longitude;
        var zoom = 16;
        map.setView([latitude, longitude], zoom);
        localStorage.setItem(
          'stline-barrier-last-center',
          JSON.stringify({ lat: latitude, lon: longitude, zoom: zoom })
        );
        if (ctrl) ctrl.classList.remove('locating');
      },
      function (err) {
        console.warn('[BarrierCalc] Geolocation error:', err.message);
        if (ctrl) ctrl.classList.remove('locating');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  new LocateControl().addTo(map);

  createScreenshotControl({
    title: s.screenshot,
    inProgressTitle: s.screenshotInProgress,
    onClick: function () {
      return captureToolScreenshot({
        mapEl: document.getElementById('map'),
        legendEl: document.querySelector('.legend'),
        resultsEl: document.getElementById('bc-results'),
        filename: 'barriers-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.png',
        toolLabel: 'ST-LINE BarrierCalculator',
      }).catch(function (err) {
        console.error('[Screenshot]', err);
        alert(s.screenshotError);
      });
    },
  }).addTo(map);

  (function () {
    var mapEl = document.getElementById('map');
    var hintTimer;
    mapEl.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        var delta = e.deltaY < 0 ? 1 : -1;
        var newZoom = Math.max(
          map.getMinZoom(),
          Math.min(map.getMaxZoom(), map.getZoom() + delta)
        );
        map.setZoom(newZoom);
      } else {
        var hint = mapEl.querySelector('.zoom-hint');
        if (!hint) {
          hint = document.createElement('div');
          hint.className = 'zoom-hint';
          hint.textContent = (s && s.zoomHint) || 'Ctrl + scroll';
          mapEl.appendChild(hint);
        }
        hint.classList.add('visible');
        clearTimeout(hintTimer);
        hintTimer = setTimeout(function () { hint.classList.remove('visible'); }, 1200);
      }
    }, { passive: false });
  })();

  var osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    crossOrigin: 'anonymous',
    maxZoom: 19
  });
  osmTileLayer.addTo(map);

  setTimeout(function () { if (map) map.invalidateSize(); }, 100);

  // ===== METRIC GRID OVERLAY =====
  var MetricGrid = L.Layer.extend({
    onAdd: function (map) {
      this._map = map;
      var size = map.getSize();
      var canvas = L.DomUtil.create('canvas', 'metric-grid-canvas');
      canvas.width = size.x;
      canvas.height = size.y;
      this._canvas = canvas;
      map.getPanes().overlayPane.appendChild(canvas);
      map.on('moveend zoomend resize', this._redraw, this);
      this._redraw();
      return this;
    },
    onRemove: function (map) {
      if (this._canvas) {
        map.getPanes().overlayPane.removeChild(this._canvas);
        this._canvas = null;
      }
      map.off('moveend zoomend resize', this._redraw, this);
      return this;
    },
    _redraw: function () {
      if (!this._canvas || !this._map) return;
      var map = this._map;
      var size = map.getSize();
      var canvas = this._canvas;
      canvas.width = size.x;
      canvas.height = size.y;

      var topLeftLatLng = map.containerPointToLatLng([0, 0]);
      var topLeftPoint = map.latLngToLayerPoint(topLeftLatLng);
      L.DomUtil.setPosition(canvas, topLeftPoint);

      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, size.x, size.y);

      var zoom = map.getZoom();
      var stepM = 5;
      if (zoom < 16) stepM = 25;
      else if (zoom < 17) stepM = 10;
      var labelEvery = stepM <= 5 ? 4 : (stepM <= 10 ? 2 : 1);

      var center = map.getCenter();
      var oneMeterLng = 1 / (111111 * Math.cos(center.lat * Math.PI / 180));
      var oneMeterLat = 1 / 111111;

      var bounds = map.getBounds();
      var minLng = bounds.getWest();
      var maxLng = bounds.getEast();
      var minLat = bounds.getSouth();
      var maxLat = bounds.getNorth();

      var minXm = (minLng - center.lng) / oneMeterLng;
      var maxXm = (maxLng - center.lng) / oneMeterLng;
      var minYm = (minLat - center.lat) / oneMeterLat;
      var maxYm = (maxLat - center.lat) / oneMeterLat;

      var xStart = Math.floor(minXm / stepM) * stepM;
      var xEnd = Math.ceil(maxXm / stepM) * stepM;
      var yStart = Math.floor(minYm / stepM) * stepM;
      var yEnd = Math.ceil(maxYm / stepM) * stepM;

      var nLinesX = (xEnd - xStart) / stepM;
      var nLinesY = (yEnd - yStart) / stepM;
      if (nLinesX + nLinesY > 400) return;

      var isDark = isDarkTheme();
      var lineColor = isDark ? 'rgba(255,140,26,0.55)' : 'rgba(0,90,180,0.55)';
      var majorColor = isDark ? 'rgba(255,140,26,0.85)' : 'rgba(0,90,180,0.85)';
      var labelColor = isDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)';
      var labelBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)';

      ctx.font = 'bold 11px "JetBrains Mono", monospace';

      for (var xm = xStart; xm <= xEnd; xm += stepM) {
        var lng = center.lng + xm * oneMeterLng;
        var pxA = map.latLngToContainerPoint([minLat, lng]);
        var pxB = map.latLngToContainerPoint([maxLat, lng]);
        var isMajor = (Math.round(xm / stepM) % labelEvery === 0);
        ctx.strokeStyle = isMajor ? majorColor : lineColor;
        ctx.lineWidth = isMajor ? 1.2 : 0.8;
        ctx.beginPath();
        ctx.moveTo(pxA.x + 0.5, pxA.y);
        ctx.lineTo(pxB.x + 0.5, pxB.y);
        ctx.stroke();
        if (isMajor && xm !== 0) {
          var txt = xm + 'm';
          var tw = ctx.measureText(txt).width;
          ctx.fillStyle = labelBg;
          ctx.fillRect(pxA.x + 2, pxA.y + 2, tw + 6, 14);
          ctx.fillStyle = labelColor;
          ctx.fillText(txt, pxA.x + 5, pxA.y + 13);
        }
      }
      for (var ym = yStart; ym <= yEnd; ym += stepM) {
        var lat = center.lat + ym * oneMeterLat;
        var pxA2 = map.latLngToContainerPoint([lat, minLng]);
        var pxB2 = map.latLngToContainerPoint([lat, maxLng]);
        var isMajor2 = (Math.round(ym / stepM) % labelEvery === 0);
        ctx.strokeStyle = isMajor2 ? majorColor : lineColor;
        ctx.lineWidth = isMajor2 ? 1.2 : 0.8;
        ctx.beginPath();
        ctx.moveTo(pxA2.x, pxA2.y + 0.5);
        ctx.lineTo(pxB2.x, pxB2.y + 0.5);
        ctx.stroke();
        if (isMajor2 && ym !== 0) {
          var txt2 = ym + 'm';
          var tw2 = ctx.measureText(txt2).width;
          ctx.fillStyle = labelBg;
          ctx.fillRect(pxA2.x + 2, pxA2.y - 14, tw2 + 6, 14);
          ctx.fillStyle = labelColor;
          ctx.fillText(txt2, pxA2.x + 5, pxA2.y - 3);
        }
      }

      ctx.fillStyle = isDark ? 'rgba(255,140,26,1)' : 'rgba(0,90,180,1)';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      var ind = '▦ ' + stepM + 'm';
      var iw = ctx.measureText(ind).width;
      ctx.fillStyle = labelBg;
      ctx.fillRect(size.x - iw - 18, 4, iw + 12, 18);
      ctx.fillStyle = isDark ? 'rgba(255,140,26,1)' : 'rgba(0,90,180,1)';
      ctx.fillText(ind, size.x - 10, 17);
      ctx.textAlign = 'start';
    }
  });

  var metricGrid = new MetricGrid();
  var metricGridActive = false;

  function setMetricGridActive(active) {
    metricGridActive = active;
    var btn = document.getElementById('grid-toggle');
    var chk = document.getElementById('show-metric-grid');
    if (active) {
      metricGrid.addTo(map);
      btn.classList.add('active');
      chk.checked = true;
    } else {
      map.removeLayer(metricGrid);
      btn.classList.remove('active');
      chk.checked = false;
    }
  }

  document.getElementById('grid-toggle').addEventListener('click', function () {
    setMetricGridActive(!metricGridActive);
  });
  document.getElementById('show-metric-grid').addEventListener('change', function (e) {
    setMetricGridActive(e.target.checked);
  });

  // ===== STATE =====
  var srcMode = 'line';
  var sourceLatLng = null;
  var barrierLatLng = null;
  var sourceLayer = null;
  var barrierLayer = null;
  var resultLayer = null;
  var drawMode = null;
  var tempDrawPoints = [];
  var tempDrawLayer = null;

  var lastGrid = null;
  var lastRefLat = null;
  var lastRefLng = null;
  var lastStep = null;
  var lastMethod = 'iso9613';
  // v0.8 — adaptive grid (source bbox + buffer) + auto-redraw + manual receivers
  var lastGridXMin = null;
  var lastGridXMax = null;
  var lastGridYMin = null;
  var lastGridYMax = null;
  var lastViewMode = null;
  var lastManualReceivers = null;
  var manualReceivers = [];
  var MAX_MANUAL_RECEIVERS = 5;
  var pickReceiverMode = false;

  var buildings = [];
  var buildingLayer = null;

  function renderBuildings() {
    if (buildingLayer) { map.removeLayer(buildingLayer); buildingLayer = null; }
    if (!document.getElementById('show-buildings').checked || buildings.length === 0) return;
    buildingLayer = L.layerGroup().addTo(map);
    var isDark = isDarkTheme();
    var borderColor = isDark ? '#2a2d33' : '#5e5e5a';
    buildings.forEach(function (b) {
      if (!b.polygonLatLng) return;
      var isEstimated = b.heightSource === 'default';
      var t = Math.max(0, Math.min(1, (b.height - 3) / 27));
      var fillColor = isDark
        ? 'rgba(108,208,255,' + (0.10 + 0.22 * t).toFixed(3) + ')'
        : 'rgba(40,145,199,' + (0.10 + 0.22 * t).toFixed(3) + ')';
      var opts = { color: borderColor, weight: 1.2, opacity: 0.85, fillColor: fillColor, fillOpacity: 1 };
      if (isEstimated) { opts.dashArray = '4,3'; opts.weight = 1.5; }
      L.polygon(b.polygonLatLng, opts).bindTooltip(
        'h ' + b.height.toFixed(1) + ' m' + (isEstimated ? ' ' + s.bldEstTag : '') +
        (b.tags && b.tags.name ? ' · ' + b.tags.name : ''),
        { direction: 'top', offset: [0, -8], sticky: true }
      ).addTo(buildingLayer);
    });
  }

  function loadBuildings() {
    var statusEl = document.getElementById('building-status');
    var bounds = map.getBounds();
    var center = bounds.getCenter();
    var cLat = center.lat, cLng = center.lng;
    var halfLat = (bounds.getNorth() - bounds.getSouth()) / 2 * 111111;
    var halfLng = (bounds.getEast() - bounds.getWest()) / 2 * 111111 * Math.cos(cLat * Math.PI / 180);
    var radius = Math.min(Math.max(halfLat, halfLng), 1500);
    var defaultHeight = parseFloat(document.getElementById('bld-default-h').value) || 9;
    var btn = document.getElementById('btn-load-buildings');
    btn.disabled = true;
    statusEl.textContent = s.bldLoading;
    return fetchOSMBuildings({
      center: { lat: cLat, lng: cLng },
      radius: radius,
      refLat: cLat, refLng: cLng,
      defaultHeight: defaultHeight,
    }).then(function (result) {
      buildings = result;
      var est = buildings.filter(function (b) { return b.heightSource === 'default'; }).length;
      var meas = buildings.length - est;
      statusEl.textContent = buildings.length
        ? '✓ ' + buildings.length + ' ' + s.bldWord + ' · ' + meas + ' ' + s.bldWithOsm + ' · ' + est + ' ' + s.bldEstimated + ' (' + defaultHeight + 'm)'
        : s.bldNone;
      if (buildings.length > 0) {
        var showCheckbox = document.getElementById('show-buildings');
        if (showCheckbox && !showCheckbox.checked) {
          showCheckbox.checked = true;
          localStorage.setItem(SHOW_BUILDINGS_KEY, 'true');
        }
        renderBuildings();
      }
      updateParticipationBadge();
    }).catch(function (err) {
      buildings = [];
      statusEl.textContent = s.bldErr + (err && err.message ? err.message : err);
      updateParticipationBadge();
    }).then(function () {
      btn.disabled = false;
    });
  }

  var SHOW_BUILDINGS_KEY = 'stline-barrier-calc-show-buildings';
  var savedShowBuildings = localStorage.getItem(SHOW_BUILDINGS_KEY) === 'true';
  var showBuildingsCheckbox = document.getElementById('show-buildings');
  if (showBuildingsCheckbox) showBuildingsCheckbox.checked = savedShowBuildings;

  document.getElementById('btn-load-buildings').addEventListener('click', loadBuildings);
  document.getElementById('show-buildings').addEventListener('change', function (e) {
    localStorage.setItem(SHOW_BUILDINGS_KEY, e.target.checked ? 'true' : 'false');
    renderBuildings();
  });
  document.getElementById('buildings-affect-calc').addEventListener('change', function () { updateParticipationBadge(); });
  document.getElementById('grid-buffer').addEventListener('input', function () { updateParticipationBadge(); });

  // ===== MODE TOGGLE =====
  var modeLineBtn = document.getElementById('mode-line');
  var modeAreaBtn = document.getElementById('mode-area');
  var modePointBtn = document.getElementById('mode-point');
  var modeHint = document.getElementById('mode-hint');
  var lwLineWrap = document.getElementById('lw-line-wrap');
  var lwAreaWrap = document.getElementById('lw-area-wrap');
  var lwPointWrap = document.getElementById('lw-point-wrap');

  function setMode(mode) {
    srcMode = mode;
    [modeLineBtn, modeAreaBtn, modePointBtn].forEach(function (b) { b.classList.remove('active'); });
    if (mode === 'line') {
      modeLineBtn.classList.add('active');
      modeHint.textContent = s.modeHintLine;
      lwLineWrap.style.display = 'block';
      lwAreaWrap.style.display = 'none';
      lwPointWrap.style.display = 'none';
    } else if (mode === 'area') {
      modeAreaBtn.classList.add('active');
      modeHint.textContent = s.modeHintArea;
      lwLineWrap.style.display = 'none';
      lwAreaWrap.style.display = 'block';
      lwPointWrap.style.display = 'none';
    } else {
      modePointBtn.classList.add('active');
      modeHint.textContent = s.modeHintPoint;
      lwLineWrap.style.display = 'none';
      lwAreaWrap.style.display = 'none';
      lwPointWrap.style.display = 'block';
    }
    clearSource();
  }

  modeLineBtn.addEventListener('click', function () { setMode('line'); });
  modeAreaBtn.addEventListener('click', function () { setMode('area'); });
  modePointBtn.addEventListener('click', function () { setMode('point'); });

  // ===== DRAWING =====
  var fabHint = document.getElementById('fab-hint');

  document.getElementById('btn-draw-src').addEventListener('click', function () { startDrawing('source'); });
  document.getElementById('btn-draw-barrier').addEventListener('click', function () { startDrawing('barrier'); });
  document.getElementById('btn-clear-src').addEventListener('click', function () { clearSource(); });
  document.getElementById('btn-clear-barrier').addEventListener('click', function () { clearBarrier(); });

  var lastClick = 0;
  var firstAreaClick = null;

  function startDrawing(what) {
    drawMode = what;
    tempDrawPoints = [];
    firstAreaClick = null;
    if (tempDrawLayer) { map.removeLayer(tempDrawLayer); tempDrawLayer = null; }
    map.doubleClickZoom.disable();
    document.getElementById('map').classList.add('draw-mode');
    var hintTxt;
    if (what === 'source') {
      if (srcMode === 'line') hintTxt = s.hintDrawLine;
      else if (srcMode === 'area') hintTxt = s.hintDrawArea;
      else hintTxt = s.hintDrawPoint;
    } else {
      hintTxt = s.hintDrawBarrier;
    }
    fabHint.textContent = hintTxt;
    fabHint.classList.add('active');
  }

  function stopDrawing() {
    drawMode = null;
    tempDrawPoints = [];
    firstAreaClick = null;
    if (tempDrawLayer) { map.removeLayer(tempDrawLayer); tempDrawLayer = null; }
    map.doubleClickZoom.enable();
    document.getElementById('map').classList.remove('draw-mode');
    fabHint.classList.remove('active');
  }

  map.on('click', function (e) {
    if (!drawMode) return;
    var now = Date.now();
    var isDoubleClick = (now - lastClick) < 350;
    lastClick = now;

    if (drawMode === 'source' && srcMode === 'point') {
      sourceLatLng = [[e.latlng.lat, e.latlng.lng]];
      renderSource();
      updateSourceStatus();
      stopDrawing();
      return;
    }

    if (drawMode === 'source' && srcMode === 'area') {
      if (!firstAreaClick) {
        firstAreaClick = [e.latlng.lat, e.latlng.lng];
        tempDrawPoints = [firstAreaClick];
        if (tempDrawLayer) map.removeLayer(tempDrawLayer);
        tempDrawLayer = L.circleMarker(e.latlng, { radius: 5, fillColor: '#d8302a', color: '#fff', fillOpacity: 0.9 }).addTo(map);
        fabHint.textContent = s.hintDrawAreaSecond;
      } else {
        var bounds = L.latLngBounds([firstAreaClick, [e.latlng.lat, e.latlng.lng]]);
        sourceLatLng = [
          [bounds.getSouth(), bounds.getWest()],
          [bounds.getSouth(), bounds.getEast()],
          [bounds.getNorth(), bounds.getEast()],
          [bounds.getNorth(), bounds.getWest()],
        ];
        firstAreaClick = null;
        renderSource();
        updateSourceStatus();
        stopDrawing();
      }
      return;
    }

    var pt = [e.latlng.lat, e.latlng.lng];
    if (isDoubleClick && tempDrawPoints.length >= 2) {
      finishPolylineDrawing();
      return;
    }
    tempDrawPoints.push(pt);

    if (tempDrawLayer) map.removeLayer(tempDrawLayer);
    var isBarrier = drawMode === 'barrier';
    var drawColor = isBarrier ? '#ff8c1a' : '#d8302a';
    var drawWeight = isBarrier ? 5 : 4;
    tempDrawLayer = L.layerGroup();
    L.polyline(tempDrawPoints, {
      color: '#000', weight: drawWeight + 3, opacity: 0.7, dashArray: '4,4'
    }).addTo(tempDrawLayer);
    L.polyline(tempDrawPoints, {
      color: drawColor, weight: drawWeight, dashArray: '4,4', opacity: 1
    }).addTo(tempDrawLayer);
    tempDrawPoints.forEach(function (p) {
      L.circleMarker(p, {
        radius: 5, fillColor: drawColor, color: '#fff', fillOpacity: 1, weight: 2
      }).addTo(tempDrawLayer);
    });
    tempDrawLayer.addTo(map);
  });

  function finishPolylineDrawing() {
    if (drawMode === 'source') {
      sourceLatLng = tempDrawPoints.slice();
      renderSource();
      updateSourceStatus();
    } else if (drawMode === 'barrier') {
      barrierLatLng = tempDrawPoints.slice();
      renderBarrier();
      updateBarrierStatus();
    }
    stopDrawing();
  }

  function renderSource() {
    if (sourceLayer) map.removeLayer(sourceLayer);
    if (!sourceLatLng) return;
    if (srcMode === 'line') {
      sourceLayer = L.polyline(sourceLatLng, {
        color: '#d8302a', weight: 5, opacity: 0.85
      }).addTo(map).bindTooltip(s.ttSrcLine, { direction: 'top' });
    } else if (srcMode === 'area') {
      sourceLayer = L.polygon(sourceLatLng, {
        color: '#d8302a', weight: 2, fillColor: '#d8302a', fillOpacity: 0.15
      }).addTo(map).bindTooltip(s.ttSrcArea, { direction: 'top' });
    } else {
      sourceLayer = L.layerGroup();
      var lat = sourceLatLng[0][0], lng = sourceLatLng[0][1];
      L.circleMarker([lat, lng], {
        radius: 14, color: '#d8302a', weight: 3, fillColor: '#d8302a', fillOpacity: 0.15
      }).addTo(sourceLayer);
      L.circleMarker([lat, lng], {
        radius: 7, color: '#fff', weight: 2, fillColor: '#d8302a', fillOpacity: 1
      }).addTo(sourceLayer)
        .bindTooltip(s.ttSrcPoint + ' Lw=' + document.getElementById('lw-point').value + ' dB', { direction: 'top' });
      sourceLayer.addTo(map);
    }
  }

  function renderBarrier() {
    if (barrierLayer) map.removeLayer(barrierLayer);
    if (!barrierLatLng || barrierLatLng.length < 2) return;
    barrierLayer = L.layerGroup();
    L.polyline(barrierLatLng, {
      color: '#000', weight: 9, opacity: 1
    }).addTo(barrierLayer);
    L.polyline(barrierLatLng, {
      color: '#ff8c1a', weight: 6, opacity: 1
    }).addTo(barrierLayer)
      .bindTooltip(s.ttBarrier + ' h=' + document.getElementById('barrier-h').value + 'm', { direction: 'top', sticky: true });
    barrierLatLng.forEach(function (pt) {
      L.circleMarker(pt, {
        radius: 5, fillColor: '#ff8c1a', color: '#000', weight: 2, fillOpacity: 1
      }).addTo(barrierLayer);
    });
    barrierLayer.addTo(map);
  }

  function clearSource() {
    if (sourceLayer) { map.removeLayer(sourceLayer); sourceLayer = null; }
    sourceLatLng = null;
    updateSourceStatus();
    clearResult();
  }
  function clearBarrier() {
    if (barrierLayer) { map.removeLayer(barrierLayer); barrierLayer = null; }
    barrierLatLng = null;
    updateBarrierStatus();
    clearResult();
  }
  // v0.8 — keepManual default true: clearSource / clearBarrier / recompute
  // do NOT wipe manual receivers; only "Reset all" passes keepManual:false.
  function clearResult(opts) {
    var keepManual = !(opts && opts.keepManual === false);
    if (resultLayer) { map.removeLayer(resultLayer); resultLayer = null; }
    document.getElementById('status-bar').classList.remove('active');
    document.getElementById('cursor-readout').classList.remove('active');
    document.getElementById('btn-crosssection').disabled = true;
    document.getElementById('btn-export-csv').disabled = true;
    document.getElementById('crosssection-panel').classList.remove('active');
    lastGrid = null;
    ['stat-il-mean', 'stat-il-max', 'stat-leq-with', 'stat-below',
     'stat-il-mean-diff', 'stat-il-max-diff', 'stat-n-diff'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    if (!keepManual) {
      manualReceivers.forEach(function (r) { map.removeLayer(r.marker); });
      manualReceivers.length = 0;
      lastManualReceivers = null;
      cancelReceiverPick();
      if (typeof renderManualReceiversList === 'function') renderManualReceiversList();
      if (typeof renderManualReceiversTable === 'function') renderManualReceiversTable();
    }
  }

  function updateSourceStatus() {
    var el = document.getElementById('src-status');
    if (!sourceLatLng) {
      el.textContent = s.srcStatusEmpty;
      el.classList.remove('active');
      updateParticipationBadge();
      return;
    }
    el.classList.add('active');
    if (srcMode === 'line') {
      var refLat = sourceLatLng[0][0];
      var refLng = sourceLatLng[0][1];
      var localPts = sourceLatLng.map(function (p) { return latlngToLocal(p[0], p[1], refLat, refLng); });
      var len = polylineLength(localPts);
      el.innerHTML = '<strong>' + s.sLine + '</strong>: ' + sourceLatLng.length + ' ' + s.vertices + ', ' + len.toFixed(0) + 'm';
    } else if (srcMode === 'area') {
      var refLat2 = sourceLatLng[0][0];
      var refLng2 = sourceLatLng[0][1];
      var local = sourceLatLng.map(function (p) { return latlngToLocal(p[0], p[1], refLat2, refLng2); });
      var xs = local.map(function (c) { return c[0]; });
      var ys = local.map(function (c) { return c[1]; });
      var w = Math.max.apply(null, xs) - Math.min.apply(null, xs);
      var h = Math.max.apply(null, ys) - Math.min.apply(null, ys);
      el.innerHTML = '<strong>' + s.sArea + '</strong>: ' + w.toFixed(0) + ' × ' + h.toFixed(0) + 'm = ' + (w * h).toFixed(0) + 'm²';
    } else {
      el.innerHTML = '<strong>' + s.sPoint + '</strong>: ' + s.placed;
    }
    updateParticipationBadge();
  }

  function updateBarrierStatus() {
    var el = document.getElementById('barrier-status');
    if (!barrierLatLng || barrierLatLng.length < 2) {
      el.textContent = s.barrierStatusEmpty;
      el.classList.remove('active');
      updateParticipationBadge();
      return;
    }
    el.classList.add('active');
    var refLat = barrierLatLng[0][0];
    var refLng = barrierLatLng[0][1];
    var localPts = barrierLatLng.map(function (p) { return latlngToLocal(p[0], p[1], refLat, refLng); });
    var len = polylineLength(localPts);
    var h = document.getElementById('barrier-h').value;
    el.innerHTML = '<strong>' + s.ttBarrier + '</strong>: ' + barrierLatLng.length + ' ' + s.vertices + ', ' + len.toFixed(0) + 'm, h=' + h + 'm';
    updateParticipationBadge();
  }

  document.getElementById('barrier-h').addEventListener('change', function () {
    if (barrierLatLng) {
      renderBarrier();
      updateBarrierStatus();
    }
  });

  // ===== CALCULATION =====
  function colorForIL(il) {
    var t = Math.max(0, Math.min(1, il / 20));
    var hue = t * 120;
    return 'hsl(' + hue + ', 70%, 50%)';
  }
  function colorForLeq(leq) {
    var t = Math.max(0, Math.min(1, (leq - 35) / 45));
    var hue = 120 - t * 120;
    return 'hsl(' + hue + ', 70%, 50%)';
  }

  document.getElementById('btn-calc').addEventListener('click', function () {
    if (!sourceLatLng) { alert(s.jsDrawSourceFirst); return; }
    if (srcMode === 'line' && sourceLatLng.length < 2) {
      alert(s.jsLineNeeds2);
      return;
    }
    if (!barrierLatLng || barrierLatLng.length < 2) {
      if (!confirm(s.jsNoBarrierConfirm)) return;
    }
    computePropagation();
  });

  document.getElementById('btn-reset').addEventListener('click', function () {
    if (!confirm(s.jsResetConfirm)) return;
    clearSource();
    clearBarrier();
    clearResult({ keepManual: false });
    stopDrawing();
    document.getElementById('calc-status').textContent = '';
  });

  var LAT_DEG_PER_M = 1 / 111320;
  var lonDegPerM = function (lat) { return 1 / (111320 * Math.cos(lat * Math.PI / 180)); };

  function computeSceneBounds(allPts, bufferM) {
    if (!allPts || allPts.length === 0) return null;
    var minLat = Infinity, maxLat = -Infinity;
    var minLon = Infinity, maxLon = -Infinity;
    for (var i = 0; i < allPts.length; i++) {
      var lat = allPts[i][0], lon = allPts[i][1];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
    var midLat = (minLat + maxLat) / 2;
    var latBuf = bufferM * LAT_DEG_PER_M;
    var lonBuf = bufferM * lonDegPerM(midLat);
    return {
      minLat: minLat - latBuf, maxLat: maxLat + latBuf,
      minLon: minLon - lonBuf, maxLon: maxLon + lonBuf,
    };
  }

  function buildingInScene(b, scene) {
    var poly = b.polygonLatLng;
    if (!poly || !poly.length || !scene) return false;
    var bMinLat = Infinity, bMaxLat = -Infinity;
    var bMinLon = Infinity, bMaxLon = -Infinity;
    for (var i = 0; i < poly.length; i++) {
      var lat = poly[i][0], lon = poly[i][1];
      if (lat < bMinLat) bMinLat = lat;
      if (lat > bMaxLat) bMaxLat = lat;
      if (lon < bMinLon) bMinLon = lon;
      if (lon > bMaxLon) bMaxLon = lon;
    }
    return !(bMaxLat < scene.minLat || bMinLat > scene.maxLat ||
             bMaxLon < scene.minLon || bMinLon > scene.maxLon);
  }

  function sceneBoundsForCalc() {
    if (!sourceLatLng || !sourceLatLng.length) return null;
    var pts = sourceLatLng.slice();
    if (barrierLatLng && barrierLatLng.length) pts = pts.concat(barrierLatLng);
    var refLat = sourceLatLng.reduce(function (a, p) { return a + p[0]; }, 0) / sourceLatLng.length;
    var refLng = sourceLatLng.reduce(function (a, p) { return a + p[1]; }, 0) / sourceLatLng.length;
    // v0.8 — adaptive receiver grid: source bbox (local coords)
    // + buffer per side (was a fixed extent/2 centered on the centroid).
    var buffer = parseFloat(document.getElementById('grid-buffer').value);
    var srcLocal = sourceLatLng.map(function (p) { return latlngToLocal(p[0], p[1], refLat, refLng); });
    var xs = srcLocal.map(function (c) { return c[0]; });
    var ys = srcLocal.map(function (c) { return c[1]; });
    var xMin = Math.min.apply(null, xs) - buffer;
    var xMax = Math.max.apply(null, xs) + buffer;
    var yMin = Math.min.apply(null, ys) - buffer;
    var yMax = Math.max.apply(null, ys) + buffer;
    var corners = [[xMin, yMin], [xMax, yMin], [xMin, yMax], [xMax, yMax]];
    for (var i = 0; i < corners.length; i++) {
      pts.push(localToLatLng(corners[i][0], corners[i][1], refLat, refLng));
    }
    return computeSceneBounds(pts, 10);
  }

  function updateParticipationBadge(inScene, total) {
    var badge = document.getElementById('participation-badge');
    if (!badge) return;
    var on = document.getElementById('buildings-affect-calc').checked
      && buildings.length > 0 && sourceLatLng && sourceLatLng.length > 0;
    if (!on) { badge.style.display = 'none'; return; }
    if (inScene == null) {
      var scene = sceneBoundsForCalc();
      total = buildings.length;
      inScene = scene ? buildings.filter(function (b) { return buildingInScene(b, scene); }).length : 0;
    }
    document.getElementById('participation-count').textContent =
      inScene + ' ' + s.ofConnector + ' ' + total;
    badge.style.display = 'flex';
  }

  function computePropagation() {
    var Lw_line = parseFloat(document.getElementById('lw-line').value);
    var Lw_area = parseFloat(document.getElementById('lw-area').value);
    var Lw_point = parseFloat(document.getElementById('lw-point').value);
    var hs = parseFloat(document.getElementById('src-h').value);
    var hr = parseFloat(document.getElementById('rec-h').value);
    var buffer = parseFloat(document.getElementById('grid-buffer').value);
    var step = parseFloat(document.getElementById('grid-step').value);
    var G = parseFloat(document.getElementById('ground-G').value);
    var T = parseFloat(document.getElementById('atm-T').value);
    var RH = parseFloat(document.getElementById('atm-RH').value);
    var spectrumKey = document.getElementById('src-spectrum').value;
    var diffMethod = document.querySelector('input[name="method"]:checked').value;
    var spectrum = SPECTRA[spectrumKey];
    // v0.8 — defensive fix: empty barrier height field -> parseFloat('') = NaN
    // would propagate catastrophically (IL = Infinity). Fallback: barrier
    // absent (hb_total = base if valid, else 0), calculation NOT blocked,
    // warning prefixed to calc-status.
    var _h_in = parseFloat(document.getElementById('barrier-h').value);
    var _hb_in = parseFloat(document.getElementById('barrier-base').value);
    var hb_total;
    var hMissingWarn = false;
    if (isNaN(_h_in)) {
      hb_total = isNaN(_hb_in) ? 0 : _hb_in;
      hMissingWarn = true;
    } else {
      hb_total = _h_in + (isNaN(_hb_in) ? 0 : _hb_in);
    }
    var viewMode = document.getElementById('view-mode').value;
    var limit = (function () {
      var v = document.getElementById('class-norm').value;
      return v ? parseFloat(v.split(':')[1]) : null;
    })();

    document.getElementById('calc-status').textContent = '';
    clearResult();
    showSpinner(0, s.jsInit);

    return new Promise(function (r) { setTimeout(r, 30); }).then(function () {
      var t0 = performance.now();

      var refLat = sourceLatLng.reduce(function (a, p) { return a + p[0]; }, 0) / sourceLatLng.length;
      var refLng = sourceLatLng.reduce(function (a, p) { return a + p[1]; }, 0) / sourceLatLng.length;

      var sourceLocal = sourceLatLng.map(function (p) { return latlngToLocal(p[0], p[1], refLat, refLng); });
      var sourcePoints, LwPerPoint;
      if (srcMode === 'line') {
        var stepSrc = 5;
        sourcePoints = discretizeLine(sourceLocal, stepSrc);
        LwPerPoint = Lw_line + 10 * Math.log10(stepSrc);
      } else if (srcMode === 'area') {
        var stepArea = 10;
        sourcePoints = discretizeRect(sourceLocal, stepArea);
        LwPerPoint = Lw_area + 10 * Math.log10(stepArea * stepArea);
      } else {
        sourcePoints = [sourceLocal[0]];
        LwPerPoint = Lw_point;
      }

      var barrierLocal = null;
      if (barrierLatLng && barrierLatLng.length >= 2) {
        barrierLocal = barrierLatLng.map(function (p) { return latlngToLocal(p[0], p[1], refLat, refLng); });
      }

      var buildingsAffectCalc =
        document.getElementById('buildings-affect-calc').checked && buildings.length > 0;
      var buildingsLocal = null;
      if (buildingsAffectCalc) {
        var scene = sceneBoundsForCalc();
        var buildingsForCalc = scene
          ? buildings.filter(function (b) { return buildingInScene(b, scene); }) : [];
        updateParticipationBadge(buildingsForCalc.length, buildings.length);
        buildingsLocal = buildingsForCalc.map(function (b) {
          return {
            height: b.height,
            poly: b.polygonLatLng.map(function (pp) { return latlngToLocal(pp[0], pp[1], refLat, refLng); }),
          };
        });
      }

      // v0.8 — adaptive receiver grid: source bbox (local coords) + buffer
      // per side, snapped to step (consistent with renderIsolines). For a
      // point source bbox = 0×0 → grid ±buffer is backward-compatible with
      // the old extent=2·buffer centred behaviour.
      var srcXs = sourceLocal.map(function (c) { return c[0]; });
      var srcYs = sourceLocal.map(function (c) { return c[1]; });
      var srcXMin = Math.min.apply(null, srcXs);
      var srcXMax = Math.max.apply(null, srcXs);
      var srcYMin = Math.min.apply(null, srcYs);
      var srcYMax = Math.max.apply(null, srcYs);
      var snapToStep = function (v, dir) {
        return dir > 0 ? Math.ceil(v / step) * step : Math.floor(v / step) * step;
      };
      var gridXMin = snapToStep(srcXMin - buffer, -1);
      var gridXMax = snapToStep(srcXMax + buffer, +1);
      var gridYMin = snapToStep(srcYMin - buffer, -1);
      var gridYMax = snapToStep(srcYMax + buffer, +1);

      var grid = [];
      var nPoints = 0;
      var nDiff = 0;
      var nRecBuilding = 0;
      var nPairBuilding = 0;

      // Area source: skip receivers that fall inside the source footprint.
      var areaXMin = srcXMin, areaXMax = srcXMax;
      var areaYMin = srcYMin, areaYMax = srcYMax;

      var dxValues = [], dyValues = [];
      for (var dxv = gridXMin; dxv <= gridXMax; dxv += step) dxValues.push(dxv);
      for (var dyv = gridYMin; dyv <= gridYMax; dyv += step) dyValues.push(dyv);
      var totalRows = dyValues.length;
      var totalCols = dxValues.length;

      function processRow(rowIdx) {
        if (rowIdx >= totalRows) return Promise.resolve();
        var dy = dyValues[rowIdx];
        for (var colIdx = 0; colIdx < totalCols; colIdx++) {
          var dx = dxValues[colIdx];
          var rx = dx, ry = dy;

          if (srcMode === 'area') {
            if (rx >= areaXMin && rx <= areaXMax && ry >= areaYMin && ry <= areaYMax) continue;
          }

          var energyNoB = 0;
          var energyWithB = 0;
          var receiverDiffracted = false;
          var recUsedBuilding = false;
          for (var spi = 0; spi < sourcePoints.length; spi++) {
            var sx = sourcePoints[spi][0], sy = sourcePoints[spi][1];
            var ddx = rx - sx;
            var ddy = ry - sy;
            var dist = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dist < 1) continue;

            // v0.9 — worst-screen restricted to BUILDINGS: shared baseline
            // for the two scenarios. Buildings (if in calculation) exist in
            // BOTH without and with the barrier → IL isolates the effect of
            // the barrier alone, not barrier + buildings together.
            var diffBld = 0, d_sb_bld = 0, d_sr_bld = 0, usedBld = false;
            if (buildingsLocal) {
              for (var bli = 0; bli < buildingsLocal.length; bli++) {
                var bl = buildingsLocal[bli];
                var bhit = firstBarrierHit(sx, sy, rx, ry, bl.poly);
                if (!bhit) continue;
                var d_sb_b = Math.sqrt(Math.pow(bhit.x - sx, 2) + Math.pow(bhit.y - sy, 2));
                var d_br_b = Math.sqrt(Math.pow(rx - bhit.x, 2) + Math.pow(ry - bhit.y, 2));
                var dd = pathDelta(d_sb_b, d_br_b, hs, hr, bl.height);
                if (dd > diffBld) { diffBld = dd; d_sb_bld = d_sb_b; d_sr_bld = dist; usedBld = true; }
              }
            }
            var Leq_no_pt = propagatePoint({ Lw: LwPerPoint, spectrum: spectrum, dist: dist, hs: hs, hr: hr, T: T, RH: RH, G: G, diffDelta: diffBld, method: diffMethod, d_ss: d_sb_bld, d_sr: d_sr_bld });
            energyNoB += Math.pow(10, Leq_no_pt / 10);

            var diffBar = 0, d_sb_bar = 0, d_sr_bar = 0;
            if (barrierLocal) {
              var hit = firstBarrierHit(sx, sy, rx, ry, barrierLocal);
              if (hit) {
                var d_sb = Math.sqrt(Math.pow(hit.x - sx, 2) + Math.pow(hit.y - sy, 2));
                var d_br = Math.sqrt(Math.pow(rx - hit.x, 2) + Math.pow(ry - hit.y, 2));
                diffBar = pathDelta(d_sb, d_br, hs, hr, hb_total);
                d_sb_bar = d_sb; d_sr_bar = dist;
              }
            }
            var diffDelta = diffBld, d_sb_iso = d_sb_bld, d_sr_iso = d_sr_bld;
            if (diffBar > diffBld) { diffDelta = diffBar; d_sb_iso = d_sb_bar; d_sr_iso = d_sr_bar; }
            if (diffDelta > 0) {
              receiverDiffracted = true;
              if (usedBld && diffBld >= diffBar) { recUsedBuilding = true; nPairBuilding++; }
            }
            var Leq_w_pt = propagatePoint({ Lw: LwPerPoint, spectrum: spectrum, dist: dist, hs: hs, hr: hr, T: T, RH: RH, G: G, diffDelta: diffDelta, method: diffMethod, d_ss: d_sb_iso, d_sr: d_sr_iso });
            energyWithB += Math.pow(10, Leq_w_pt / 10);
          }
          if (energyNoB <= 0) continue;
          var Leq_no = 10 * Math.log10(energyNoB);
          var Leq_w = energyWithB > 0 ? 10 * Math.log10(energyWithB) : -Infinity;
          var IL = Leq_no - Leq_w;
          if (Leq_no < 25 && Leq_w < 25) continue;

          var ll = localToLatLng(rx, ry, refLat, refLng);
          grid.push({ lat: ll[0], lng: ll[1], rx: rx, ry: ry, Leq_no: Leq_no, Leq_w: Leq_w, IL: IL, diffracted: receiverDiffracted });
          nPoints++;
          if (receiverDiffracted) nDiff++;
          if (recUsedBuilding) nRecBuilding++;
        }

        if ((rowIdx + 1) % 4 === 0 || rowIdx === totalRows - 1) {
          var pct = Math.round((rowIdx + 1) / totalRows * 100);
          updateSpinner(pct, nPoints + ' ' + s.receivers + ' · ' + s.row + ' ' + (rowIdx + 1) + '/' + totalRows);
          return new Promise(function (r) { setTimeout(r, 0); }).then(function () { return processRow(rowIdx + 1); });
        }
        return processRow(rowIdx + 1);
      }

      return processRow(0).then(function () {
        // v0.8 — manual receivers: same pass, same worst-screen logic as the
        // grid loop. Independent of grid validity → computed even with an
        // empty grid.
        if (manualReceivers.length > 0) {
          for (var mi = 0; mi < manualReceivers.length; mi++) {
            var r = manualReceivers[mi];
            var mloc = latlngToLocal(r.lat, r.lng, refLat, refLng);
            var mrx = mloc[0], mry = mloc[1];
            var mEnergyNoB = 0, mEnergyWithB = 0, mDiff = false;
            for (var mspi = 0; mspi < sourcePoints.length; mspi++) {
              var msx = sourcePoints[mspi][0], msy = sourcePoints[mspi][1];
              var mdist = Math.sqrt((mrx - msx) * (mrx - msx) + (mry - msy) * (mry - msy));
              if (mdist < 1) continue;
              // v0.9 — same logic as the grid loop: buildings as common
              // baseline, IL isolates the barrier alone.
              var mDiffBld = 0, mDsbBld = 0, mDsrBld = 0;
              if (buildingsLocal) {
                for (var mbli = 0; mbli < buildingsLocal.length; mbli++) {
                  var mbl = buildingsLocal[mbli];
                  var mbhit = firstBarrierHit(msx, msy, mrx, mry, mbl.poly);
                  if (!mbhit) continue;
                  var mdsbb = Math.sqrt(Math.pow(mbhit.x - msx, 2) + Math.pow(mbhit.y - msy, 2));
                  var mdbrb = Math.sqrt(Math.pow(mrx - mbhit.x, 2) + Math.pow(mry - mbhit.y, 2));
                  var mdd = pathDelta(mdsbb, mdbrb, hs, hr, mbl.height);
                  if (mdd > mDiffBld) { mDiffBld = mdd; mDsbBld = mdsbb; mDsrBld = mdist; }
                }
              }
              var mLn = propagatePoint({ Lw: LwPerPoint, spectrum: spectrum, dist: mdist, hs: hs, hr: hr, T: T, RH: RH, G: G, diffDelta: mDiffBld, method: diffMethod, d_ss: mDsbBld, d_sr: mDsrBld });
              mEnergyNoB += Math.pow(10, mLn / 10);
              var mDiffBar = 0, mDsbBar = 0, mDsrBar = 0;
              if (barrierLocal) {
                var mhit = firstBarrierHit(msx, msy, mrx, mry, barrierLocal);
                if (mhit) {
                  var mdsb = Math.sqrt(Math.pow(mhit.x - msx, 2) + Math.pow(mhit.y - msy, 2));
                  var mdbr = Math.sqrt(Math.pow(mrx - mhit.x, 2) + Math.pow(mry - mhit.y, 2));
                  mDiffBar = pathDelta(mdsb, mdbr, hs, hr, hb_total);
                  mDsbBar = mdsb; mDsrBar = mdist;
                }
              }
              var mDelta = mDiffBld, mDsb = mDsbBld, mDsr = mDsrBld;
              if (mDiffBar > mDiffBld) { mDelta = mDiffBar; mDsb = mDsbBar; mDsr = mDsrBar; }
              if (mDelta > 0) mDiff = true;
              var mLw = propagatePoint({ Lw: LwPerPoint, spectrum: spectrum, dist: mdist, hs: hs, hr: hr, T: T, RH: RH, G: G, diffDelta: mDelta, method: diffMethod, d_ss: mDsb, d_sr: mDsr });
              mEnergyWithB += Math.pow(10, mLw / 10);
            }
            r.Leq_no = 10 * Math.log10(mEnergyNoB);
            r.Leq_w = mEnergyWithB > 0 ? 10 * Math.log10(mEnergyWithB) : -Infinity;
            r.IL = r.Leq_no - r.Leq_w;
            r.diffracted = mDiff;
            r.distSrc = Math.sqrt(mrx * mrx + mry * mry);
            r.marker.setTooltipContent(
              '<strong>' + mrEsc(r.label) + '</strong><br>' +
              s.statLeqWith + ': ' + (isFinite(r.Leq_w) ? r.Leq_w.toFixed(1) + ' dBA' : '—') + '<br>' +
              '<strong>IL: ' + r.IL.toFixed(1) + ' dB</strong>' + (r.diffracted ? ' · ' + s.diffractedTag : '')
            );
          }
          lastManualReceivers = manualReceivers.map(function (r) {
            return { id: r.id, label: r.label, lat: r.lat, lng: r.lng,
                     IL: r.IL, Leq_no: r.Leq_no, Leq_w: r.Leq_w,
                     diffracted: r.diffracted, distSrc: r.distSrc };
          });
          if (typeof renderManualReceiversTable === 'function') renderManualReceiversTable();
          document.getElementById('btn-export-csv').disabled = false;
        }

        if (grid.length === 0) {
          hideSpinner();
          document.getElementById('calc-status').textContent = s.jsNoValidReceiver;
          return;
        }

        updateSpinner(100, s.jsRendering);
        return new Promise(function (r) { setTimeout(r, 20); }).then(function () {
          resultLayer = L.layerGroup().addTo(map);

          var wantBands = document.getElementById('show-bands').checked;
          var wantLines = document.getElementById('show-isolines').checked;
          if ((wantBands || wantLines) && grid.length > 4) {
            renderIsolines(grid, refLat, refLng, gridXMin, gridXMax,
                           gridYMin, gridYMax, step, viewMode);
          }

          renderGridPoints(grid, viewMode, step);

          lastGrid = grid;
          lastRefLat = refLat;
          lastRefLng = refLng;
          lastStep = step;
          lastMethod = diffMethod;
          lastGridXMin = gridXMin;
          lastGridXMax = gridXMax;
          lastGridYMin = gridYMin;
          lastGridYMax = gridYMax;
          lastViewMode = viewMode;
          document.getElementById('cursor-readout').classList.add('active');
          document.getElementById('btn-crosssection').disabled = false;
          document.getElementById('btn-export-csv').disabled = false;

          var ILs = grid.map(function (p) { return p.IL; });
          var Leqs_w = grid.map(function (p) { return p.Leq_w; }).filter(function (x) { return isFinite(x); });
          var il_mean = ILs.reduce(function (a, v) { return a + v; }, 0) / ILs.length;
          var il_max = Math.max.apply(null, ILs);
          var leq_w_mean = 10 * Math.log10(Leqs_w.reduce(function (a, v) { return a + Math.pow(10, v / 10); }, 0) / Leqs_w.length);
          var below = limit ? Leqs_w.filter(function (v) { return v < limit; }).length / Leqs_w.length * 100 : null;

          // v0.8 — "diffracted-only" statistics: subset of receivers that
          // actually intercept the barrier (more representative of barrier
          // effectiveness than the average over the whole grid).
          var ILs_diff = grid.filter(function (p) { return p.diffracted; }).map(function (p) { return p.IL; });
          var il_mean_diff = ILs_diff.length > 0
            ? ILs_diff.reduce(function (a, v) { return a + v; }, 0) / ILs_diff.length : null;
          var il_max_diff = ILs_diff.length > 0 ? Math.max.apply(null, ILs_diff) : null;

          document.getElementById('stat-il-mean').textContent = il_mean.toFixed(1) + ' dB';
          document.getElementById('stat-il-max').textContent = il_max.toFixed(1) + ' dB';
          document.getElementById('stat-leq-with').textContent = leq_w_mean.toFixed(1);
          document.getElementById('stat-below').textContent = below !== null ? Math.round(below) + '%' : '—';
          document.getElementById('stat-il-mean-diff').textContent =
            il_mean_diff !== null ? il_mean_diff.toFixed(1) + ' dB' : '—';
          document.getElementById('stat-il-max-diff').textContent =
            il_max_diff !== null ? il_max_diff.toFixed(1) + ' dB' : '—';
          document.getElementById('stat-n-diff').textContent = nDiff + ' / ' + grid.length;

          var t1 = performance.now();
          document.getElementById('calc-status').textContent =
            nPoints + ' ' + s.receivers + ' · ' + sourcePoints.length + ' ' + s.pointSources + ' · ' + (t1 - t0).toFixed(0) + ' ms';
          if (hMissingWarn) {
            document.getElementById('calc-status').textContent =
              s.hMissingWarn + ' · ' + document.getElementById('calc-status').textContent;
          }

          document.getElementById('status-bar').classList.add('active');
          var methodLabel = diffMethod === 'iso9613' ? 'ISO 9613-2 §7.4' : 'Maekawa (1968)';
          var srcLabel = srcMode === 'line' ? s.sLineLow : srcMode === 'area' ? s.sAreaLow : s.sPointLow;
          var bldLine = buildingsAffectCalc
            ? '<br>' + s.bldInCalc + ' ' + buildings.length + ' · ' + nRecBuilding + '/' + nPoints + ' ' + s.recDominantBld
            : '';
          document.getElementById('status-bar').innerHTML =
            '<span class="ok">●</span> ' + s.sourceWord + ' ' + srcLabel + ' · ' + spectrumKey + '<br>' +
            sourcePoints.length + ' ' + s.pointsShort + ' · ' + nPoints + ' ' + s.receivers + '<br>' +
            (barrierLocal ? s.ttBarrier + ' h=' + hb_total + 'm · ' + nDiff + ' ' + s.diffractedRec : s.noBarrier) + bldLine + '<br>' +
            '<strong>' + methodLabel + '</strong> · T=' + T + '°C RH=' + RH + '%';

          if (buildingsAffectCalc) {
            document.getElementById('building-status').textContent =
              '✓ ' + buildings.length + ' ' + s.bldInCalcFull + ' · ' + nRecBuilding + '/' + nPoints + ' ' + s.recWithDomBld + ' (' + nPairBuilding + ' ' + s.pairs + ')';
          }

          updateLegend(viewMode);
          hideSpinner();
        });
      });
    });
  }

  function showSpinner(pct, detail) {
    var sp = document.getElementById('calc-spinner');
    sp.classList.add('active');
    document.getElementById('spinner-progress').textContent = (pct || 0) + '%';
    document.getElementById('spinner-detail').textContent = detail || '—';
  }
  function updateSpinner(pct, detail) {
    document.getElementById('spinner-progress').textContent = pct + '%';
    document.getElementById('spinner-detail').textContent = detail;
  }
  function hideSpinner() {
    document.getElementById('calc-spinner').classList.remove('active');
  }

  function updateLegend(viewMode) {
    var title = document.getElementById('legend-title');
    var grad = document.getElementById('legend-gradient');
    var labels = document.getElementById('legend-labels');

    var stops, ticks, unit;

    if (viewMode === 'il') {
      title.textContent = 'Insertion Loss';
      unit = 'dB';
      ticks = [0, 5, 10, 15, 20];
      stops = [];
      for (var v = 0; v <= 20; v++) {
        var pct = (v / 20) * 100;
        stops.push(colorForIL(v) + ' ' + pct + '%');
      }
    } else {
      title.textContent = 'Leq dB(A)';
      unit = 'dB(A)';
      ticks = [35, 45, 55, 65, 75, 80];
      stops = [];
      for (var v2 = 35; v2 <= 80; v2++) {
        var pct2 = ((v2 - 35) / 45) * 100;
        stops.push(colorForLeq(v2) + ' ' + pct2 + '%');
      }
    }

    grad.style.background = 'linear-gradient(to right, ' + stops.join(', ') + ')';
    labels.innerHTML = ticks.map(function (t) { return '<span>' + t + '</span>'; }).join('');

    var unitEl = document.querySelector('.legend .legend-unit');
    if (!unitEl) {
      unitEl = document.createElement('div');
      unitEl.className = 'legend-unit';
      document.querySelector('.legend').appendChild(unitEl);
    }
    unitEl.textContent = unit;
  }

  // v0.8 — rectangular Nx×Ny matrix with explicit origin (gridXMin,
  // gridYMin). Old (extent, halfExt) approach broke for non-centered/
  // non-square grids (extended line/area sources truncated visually);
  // also fixes a ~half-step contour-overlay misregistration latent in
  // the old (x − N/2)*step mapping.
  function renderIsolines(grid, refLat, refLng, gridXMin, gridXMax,
                          gridYMin, gridYMax, step, viewMode) {
    var Nx = Math.round((gridXMax - gridXMin) / step) + 1;
    var Ny = Math.round((gridYMax - gridYMin) / step) + 1;
    var matrix = new Array(Nx * Ny).fill(-Infinity);
    grid.forEach(function (p) {
      var j = Math.round((p.rx - gridXMin) / step);
      var i = Math.round((p.ry - gridYMin) / step);
      if (i >= 0 && i < Ny && j >= 0 && j < Nx) {
        matrix[i * Nx + j] = (viewMode === 'il') ? p.IL :
                             (viewMode === 'with') ? p.Leq_w : p.Leq_no;
      }
    });
    var fillValue = (viewMode === 'il') ? 0 : 30;
    for (var k = 0; k < matrix.length; k++) {
      if (matrix[k] === -Infinity) matrix[k] = fillValue;
    }

    var thresholds = (viewMode === 'il')
      ? [1, 3, 5, 8, 10, 12, 15, 20]
      : [35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

    var showBands = document.getElementById('show-bands').checked;
    var showLines = document.getElementById('show-isolines').checked;

    var ringToLatLngs = function (ring) {
      return ring.map(function (xy) {
        var rx = gridXMin + xy[0] * step;
        var ry = gridYMin + xy[1] * step;
        return localToLatLng(rx, ry, refLat, refLng);
      });
    };

    if (showBands) {
      var contoursB = d3.contours().size([Nx, Ny]).thresholds(thresholds)(matrix);
      contoursB.forEach(function (c, idx) {
        var nextThr = thresholds[idx + 1];
        var bandMid = nextThr !== undefined ? (c.value + nextThr) / 2 : c.value + 2.5;
        var fillColor = (viewMode === 'il') ? colorForIL(bandMid) : colorForLeq(bandMid);
        c.coordinates.forEach(function (poly) {
          if (poly.length === 0) return;
          var outer = ringToLatLngs(poly[0]);
          var holes = poly.slice(1).map(ringToLatLngs);
          var polyData = holes.length > 0 ? [outer].concat(holes) : outer;
          L.polygon(polyData, {
            color: fillColor, weight: 0, fillColor: fillColor,
            fillOpacity: 0.55, interactive: false
          }).addTo(resultLayer);
        });
      });
    }

    if (showLines) {
      var contoursL = d3.contours().size([Nx, Ny]).thresholds(thresholds)(matrix);
      contoursL.forEach(function (c) {
        var lvl = c.value;
        var lineColor = viewMode === 'il' ? colorForIL(lvl) : colorForLeq(lvl);
        c.coordinates.forEach(function (poly) {
          poly.forEach(function (ring) {
            var latlngs = ringToLatLngs(ring);
            L.polyline(latlngs, {
              color: '#000', weight: 2, opacity: 0.35, interactive: false
            }).addTo(resultLayer);
            L.polyline(latlngs, {
              color: lineColor, weight: 1.5, opacity: 0.95
            }).bindTooltip(lvl + ' ' + (viewMode === 'il' ? 'dB IL' : 'dBA'), { sticky: true }).addTo(resultLayer);
          });
        });
      });
    }
  }

  // ===== CURSOR READOUT =====
  map.on('mousemove', function (e) {
    if (!lastGrid || lastGrid.length === 0) return;
    var loc = latlngToLocal(e.latlng.lat, e.latlng.lng, lastRefLat, lastRefLng);
    var cx = loc[0], cy = loc[1];
    var nearest = null;
    var bestDist = Infinity;
    for (var i = 0; i < lastGrid.length; i++) {
      var p = lastGrid[i];
      var dx = p.rx - cx, dy = p.ry - cy;
      var d2 = dx * dx + dy * dy;
      if (d2 < bestDist) { bestDist = d2; nearest = p; }
    }
    var dist = Math.sqrt(bestDist);
    if (!nearest || dist > lastStep * 1.5) {
      document.getElementById('cr-no').textContent = '—';
      document.getElementById('cr-w').textContent = '—';
      document.getElementById('cr-il').textContent = '—';
      document.getElementById('cr-dist').textContent = '—';
      return;
    }
    document.getElementById('cr-no').textContent = nearest.Leq_no.toFixed(1) + ' dBA';
    document.getElementById('cr-w').textContent = isFinite(nearest.Leq_w) ? nearest.Leq_w.toFixed(1) + ' dBA' : '—';
    document.getElementById('cr-il').textContent = nearest.IL.toFixed(1) + ' dB';
    var distSrc = Math.sqrt(nearest.rx * nearest.rx + nearest.ry * nearest.ry);
    document.getElementById('cr-dist').textContent = distSrc.toFixed(0) + ' m';
  });

  // ===== CROSS-SECTION =====
  var pickMode = false;

  document.getElementById('btn-crosssection').addEventListener('click', function () {
    if (!lastGrid || lastGrid.length === 0) {
      alert(s.jsRunCalcFirst);
      return;
    }
    pickMode = !pickMode;
    var mapEl = document.getElementById('map');
    if (pickMode) {
      cancelReceiverPick();  // v0.8 mutex: no active manual-receiver pick
      mapEl.classList.add('pick-mode');
      fabHint.textContent = s.hintPickReceiver;
      fabHint.classList.add('active');
    } else {
      mapEl.classList.remove('pick-mode');
      fabHint.classList.remove('active');
    }
  });

  map.on('click', function (e) {
    if (pickReceiverMode || !pickMode || !lastGrid) return;
    var loc = latlngToLocal(e.latlng.lat, e.latlng.lng, lastRefLat, lastRefLng);
    var cx = loc[0], cy = loc[1];
    var nearest = null;
    var bestDist = Infinity;
    for (var i = 0; i < lastGrid.length; i++) {
      var p = lastGrid[i];
      var d2 = Math.pow(p.rx - cx, 2) + Math.pow(p.ry - cy, 2);
      if (d2 < bestDist) { bestDist = d2; nearest = p; }
    }
    if (!nearest || Math.sqrt(bestDist) > lastStep * 2) return;
    pickMode = false;
    document.getElementById('map').classList.remove('pick-mode');
    fabHint.classList.remove('active');
    renderCrossSection(nearest);
  });

  function renderCrossSection(receiver) {
    var hs = parseFloat(document.getElementById('src-h').value);
    var hr = parseFloat(document.getElementById('rec-h').value);
    // v0.8 — NaN-safe: empty h/base fields must not produce invalid geometry.
    var _h = parseFloat(document.getElementById('barrier-h').value);
    var _hb = parseFloat(document.getElementById('barrier-base').value);
    var hb_total = (isNaN(_h) ? 0 : _h) + (isNaN(_hb) ? 0 : _hb);

    if (!sourceLatLng || sourceLatLng.length === 0) return;
    var sourceLocalCs = sourceLatLng.map(function (p) { return latlngToLocal(p[0], p[1], lastRefLat, lastRefLng); });

    var srcPts;
    if (srcMode === 'line') {
      srcPts = discretizeLine(sourceLocalCs, 5);
    } else if (srcMode === 'area') {
      srcPts = discretizeRect(sourceLocalCs, 10);
    } else {
      srcPts = [sourceLocalCs[0]];
    }

    var closestSrc = null;
    var minD = Infinity;
    for (var spi = 0; spi < srcPts.length; spi++) {
      var sp = srcPts[spi];
      var d = Math.pow(sp[0] - receiver.rx, 2) + Math.pow(sp[1] - receiver.ry, 2);
      if (d < minD) { minD = d; closestSrc = sp; }
    }
    var d_sr_horiz = Math.sqrt(minD);

    var barrierIntersection = null;
    var d_sb = null, d_br = null, delta = 0;
    if (barrierLatLng && barrierLatLng.length >= 2) {
      var barrierLocalCs = barrierLatLng.map(function (p) { return latlngToLocal(p[0], p[1], lastRefLat, lastRefLng); });
      var hit = firstBarrierHit(closestSrc[0], closestSrc[1], receiver.rx, receiver.ry, barrierLocalCs);
      if (hit) {
        d_sb = Math.sqrt(Math.pow(hit.x - closestSrc[0], 2) + Math.pow(hit.y - closestSrc[1], 2));
        d_br = Math.sqrt(Math.pow(receiver.rx - hit.x, 2) + Math.pow(receiver.ry - hit.y, 2));
        barrierIntersection = hit;
        delta = pathDelta(d_sb, d_br, hs, hr, hb_total);
      }
    }

    var svg = document.getElementById('cs-svg');
    var W = 800, H = 320;
    var padL = 60, padR = 240, padT = 30, padB = 50;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var maxX = Math.max(d_sr_horiz, 50);
    var maxY = Math.max(hb_total, hr, hs, 5) * 1.3;
    var xScale = function (x) { return padL + (x / maxX) * plotW; };
    var yScale = function (y) { return padT + plotH - (y / maxY) * plotH; };

    var svgContent = '';

    var yTicks = [0, 2, 5, 10, 15, 20].filter(function (v) { return v <= maxY; });
    for (var yti = 0; yti < yTicks.length; yti++) {
      var yT = yTicks[yti];
      if (yT === 0) continue;
      svgContent += '<line class="cs-grid-line" x1="' + padL + '" y1="' + yScale(yT) + '" x2="' + (W - padR) + '" y2="' + yScale(yT) + '"/>';
      svgContent += '<text class="cs-tick-label" x="' + (padL - 8) + '" y="' + (yScale(yT) + 4) + '" text-anchor="end">' + yT + '</text>';
    }
    var nXTicks = 5;
    for (var xi = 0; xi <= nXTicks; xi++) {
      var x = (maxX / nXTicks) * xi;
      svgContent += '<line class="cs-grid-line" x1="' + xScale(x) + '" y1="' + padT + '" x2="' + xScale(x) + '" y2="' + (padT + plotH) + '"/>';
      svgContent += '<text class="cs-tick-label" x="' + xScale(x) + '" y="' + (padT + plotH + 16) + '" text-anchor="middle">' + x.toFixed(0) + '</text>';
    }

    svgContent += '<line class="cs-axis" x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (W - padR) + '" y2="' + (padT + plotH) + '"/>';
    svgContent += '<line class="cs-axis" x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + plotH) + '"/>';
    svgContent += '<text class="cs-axis-label" x="' + ((padL + W - padR) / 2) + '" y="' + (H - 12) + '" text-anchor="middle">' + s.csDistAxis + '</text>';
    svgContent += '<text class="cs-axis-label" x="' + 20 + '" y="' + (padT + plotH / 2) + '" text-anchor="middle" transform="rotate(-90, 20, ' + (padT + plotH / 2) + ')">' + s.csElevAxis + '</text>';

    svgContent += '<line class="cs-ground" x1="' + padL + '" y1="' + yScale(0) + '" x2="' + (W - padR) + '" y2="' + yScale(0) + '"/>';
    svgContent += '<line class="cs-los-direct" x1="' + xScale(0) + '" y1="' + yScale(hs) + '" x2="' + xScale(d_sr_horiz) + '" y2="' + yScale(hr) + '"/>';

    if (barrierIntersection) {
      var bx = xScale(d_sb);
      var bWidth = 6;
      svgContent += '<rect class="cs-barrier" x="' + (bx - bWidth / 2) + '" y="' + yScale(hb_total) + '" width="' + bWidth + '" height="' + (yScale(0) - yScale(hb_total)) + '"/>';
      svgContent += '<text class="cs-barrier-label" x="' + bx + '" y="' + (yScale(hb_total) - 6) + '" text-anchor="middle">h=' + hb_total + 'm</text>';
      svgContent += '<polyline class="cs-los-diffracted" points="' + xScale(0) + ',' + yScale(hs) + ' ' + bx + ',' + yScale(hb_total) + ' ' + xScale(d_sr_horiz) + ',' + yScale(hr) + '"/>';
    }

    svgContent += '<circle class="cs-source" cx="' + xScale(0) + '" cy="' + yScale(hs) + '" r="7"/>';
    svgContent += '<text class="cs-source-label" x="' + (xScale(0) + 12) + '" y="' + (yScale(hs) + 4) + '">' + s.csSource + hs + 'm</text>';
    svgContent += '<circle class="cs-receiver" cx="' + xScale(d_sr_horiz) + '" cy="' + yScale(hr) + '" r="7"/>';
    svgContent += '<text class="cs-receiver-label" x="' + (xScale(d_sr_horiz) - 12) + '" y="' + (yScale(hr) - 10) + '" text-anchor="end">' + s.csReceiver + hr + 'm</text>';

    var infoX = W - padR + 20;
    var infoY = padT;
    var infoW = padR - 30;
    var infoH = plotH;
    svgContent += '<rect class="cs-info-box" x="' + infoX + '" y="' + infoY + '" width="' + infoW + '" height="' + infoH + '" rx="4"/>';

    var txtY = infoY + 22;
    var lineH = 18;
    svgContent += '<text class="cs-info-text dim" x="' + (infoX + 12) + '" y="' + txtY + '">' + s.csDistSR + '</text>';
    svgContent += '<text class="cs-info-text" x="' + (infoX + infoW - 12) + '" y="' + txtY + '" text-anchor="end">' + d_sr_horiz.toFixed(1) + ' m</text>';
    txtY += lineH;
    svgContent += '<text class="cs-info-text dim" x="' + (infoX + 12) + '" y="' + txtY + '">' + s.csSrcElev + '</text>';
    svgContent += '<text class="cs-info-text" x="' + (infoX + infoW - 12) + '" y="' + txtY + '" text-anchor="end">' + hs + ' m</text>';
    txtY += lineH;
    svgContent += '<text class="cs-info-text dim" x="' + (infoX + 12) + '" y="' + txtY + '">' + s.csRecElev + '</text>';
    svgContent += '<text class="cs-info-text" x="' + (infoX + infoW - 12) + '" y="' + txtY + '" text-anchor="end">' + hr + ' m</text>';
    txtY += lineH * 1.5;

    if (barrierIntersection) {
      svgContent += '<text class="cs-info-text dim" x="' + (infoX + 12) + '" y="' + txtY + '">' + s.csBarrierH + '</text>';
      svgContent += '<text class="cs-info-text" x="' + (infoX + infoW - 12) + '" y="' + txtY + '" text-anchor="end">' + hb_total + ' m</text>';
      txtY += lineH;
      svgContent += '<text class="cs-info-text dim" x="' + (infoX + 12) + '" y="' + txtY + '">' + s.csDistSB + '</text>';
      svgContent += '<text class="cs-info-text" x="' + (infoX + infoW - 12) + '" y="' + txtY + '" text-anchor="end">' + d_sb.toFixed(1) + ' m</text>';
      txtY += lineH;
      svgContent += '<text class="cs-info-text dim" x="' + (infoX + 12) + '" y="' + txtY + '">' + s.csDistBR + '</text>';
      svgContent += '<text class="cs-info-text" x="' + (infoX + infoW - 12) + '" y="' + txtY + '" text-anchor="end">' + d_br.toFixed(1) + ' m</text>';
      txtY += lineH;
      svgContent += '<text class="cs-info-text dim" x="' + (infoX + 12) + '" y="' + txtY + '">δ path-diff</text>';
      svgContent += '<text class="cs-info-text accent" x="' + (infoX + infoW - 12) + '" y="' + txtY + '" text-anchor="end">' + delta.toFixed(2) + ' m</text>';
      txtY += lineH * 1.5;
    }

    svgContent += '<text class="cs-info-text dim" x="' + (infoX + 12) + '" y="' + txtY + '">' + s.leqWithoutShort + '</text>';
    svgContent += '<text class="cs-info-text" x="' + (infoX + infoW - 12) + '" y="' + txtY + '" text-anchor="end">' + receiver.Leq_no.toFixed(1) + ' dBA</text>';
    txtY += lineH;
    svgContent += '<text class="cs-info-text dim" x="' + (infoX + 12) + '" y="' + txtY + '">' + s.leqWithShort + '</text>';
    svgContent += '<text class="cs-info-text" x="' + (infoX + infoW - 12) + '" y="' + txtY + '" text-anchor="end">' + (isFinite(receiver.Leq_w) ? receiver.Leq_w.toFixed(1) + ' dBA' : '—') + '</text>';
    txtY += lineH;
    svgContent += '<text class="cs-info-text dim" x="' + (infoX + 12) + '" y="' + txtY + '" style="font-size:12px">IL</text>';
    svgContent += '<text class="cs-info-text accent" x="' + (infoX + infoW - 12) + '" y="' + txtY + '" text-anchor="end" style="font-size:14px;font-weight:600">' + receiver.IL.toFixed(1) + ' dB</text>';

    var legY = infoY + infoH - 48;
    svgContent += '<line class="cs-los-direct" x1="' + (infoX + 12) + '" y1="' + legY + '" x2="' + (infoX + 36) + '" y2="' + legY + '"/>';
    svgContent += '<text class="cs-info-text dim" x="' + (infoX + 42) + '" y="' + (legY + 3) + '" style="font-size:10px">' + s.csDirectRay + '</text>';
    svgContent += '<line class="cs-los-diffracted" x1="' + (infoX + 12) + '" y1="' + (legY + 16) + '" x2="' + (infoX + 36) + '" y2="' + (legY + 16) + '"/>';
    svgContent += '<text class="cs-info-text dim" x="' + (infoX + 42) + '" y="' + (legY + 19) + '" style="font-size:10px">' + s.csDiffractedRay + '</text>';

    svg.innerHTML = svgContent;

    var panel = document.getElementById('crosssection-panel');
    panel.classList.add('active');
    var methodLbl = lastMethod === 'iso9613' ? 'ISO 9613-2 §7.4' : 'Maekawa';
    document.getElementById('cs-meta').innerHTML =
      '<strong>' + methodLbl + '</strong> · ' + s.csReceiverAt + d_sr_horiz.toFixed(0) + 'm · IL <strong>' + receiver.IL.toFixed(1) + ' dB</strong>' +
      (barrierIntersection ? ' · path-diff <strong>' + delta.toFixed(2) + 'm</strong>' : ' · ' + s.csLosFree);

    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.getElementById('btn-close-cs').addEventListener('click', function () {
    document.getElementById('crosssection-panel').classList.remove('active');
  });

  // ===== EXPORT CSV =====
  document.getElementById('btn-export-csv').addEventListener('click', function () {
    var hasGrid = lastGrid && lastGrid.length > 0;
    var hasManual = lastManualReceivers && lastManualReceivers.length > 0;
    if (!hasGrid && !hasManual) {
      alert(s.jsRunCalcFirst);
      return;
    }
    // v0.8 — extended schema: columns `label` (first) and `manual` (last).
    var csvField = function (v) { return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var rows = ['label,lat,lon,distance_m,leq_no_barrier_dBA,leq_with_barrier_dBA,insertion_loss_dB,diffracted,manual'];
    if (hasGrid) {
      for (var i = 0; i < lastGrid.length; i++) {
        var p = lastGrid[i];
        var distSrc = Math.sqrt(p.rx * p.rx + p.ry * p.ry);
        rows.push([
          '',
          p.lat.toFixed(7),
          p.lng.toFixed(7),
          distSrc.toFixed(1),
          p.Leq_no.toFixed(2),
          isFinite(p.Leq_w) ? p.Leq_w.toFixed(2) : '',
          p.IL.toFixed(2),
          p.diffracted ? 'true' : 'false',
          'false'
        ].join(','));
      }
    }
    if (hasManual) {
      for (var mri = 0; mri < lastManualReceivers.length; mri++) {
        var mr = lastManualReceivers[mri];
        rows.push([
          csvField(mr.label),
          mr.lat.toFixed(7),
          mr.lng.toFixed(7),
          mr.distSrc.toFixed(1),
          mr.Leq_no.toFixed(2),
          isFinite(mr.Leq_w) ? mr.Leq_w.toFixed(2) : '',
          mr.IL.toFixed(2),
          mr.diffracted ? 'true' : 'false',
          'true'
        ].join(','));
      }
    }
    var csv = rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = 'barriers-receivers-' + ts + '.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  // ===== OSM TILE TOGGLE =====
  var OSM_STORAGE_KEY = 'stline-barrier-calc-osm-on';
  var osmCheckbox = document.getElementById('show-osm');

  var osmShouldBeOn = localStorage.getItem(OSM_STORAGE_KEY) !== 'false';
  osmCheckbox.checked = osmShouldBeOn;
  if (!osmShouldBeOn) {
    map.removeLayer(osmTileLayer);
    document.getElementById('map').classList.add('osm-off');
  }

  osmCheckbox.addEventListener('change', function (e) {
    var mapEl = document.getElementById('map');
    if (e.target.checked) {
      osmTileLayer.addTo(map);
      mapEl.classList.remove('osm-off');
      setTimeout(function () {
        map.invalidateSize();
        osmTileLayer.redraw();
      }, 50);
      localStorage.setItem(OSM_STORAGE_KEY, 'true');
    } else {
      map.removeLayer(osmTileLayer);
      mapEl.classList.add('osm-off');
      localStorage.setItem(OSM_STORAGE_KEY, 'false');
    }
  });

  // ===========================================================
  // v0.8 — MANUAL RECEIVERS + grid-points helper + view redraw
  // ===========================================================
  function mrEsc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function mrIcon(label) {
    return L.divIcon({
      className: 'manual-receiver-marker',
      html: '<div class="mr-pin">' + mrEsc(label) + '</div>',
      iconSize: [32, 41], iconAnchor: [16, 39]
    });
  }

  function cancelReceiverPick() {
    if (!pickReceiverMode) return;
    pickReceiverMode = false;
    var ps = document.getElementById('manual-pick-status');
    if (ps) ps.style.display = 'none';
    document.getElementById('map').style.cursor = '';
  }

  // Grid points overlay (circle markers, opt-in via "show-grid"):
  // extracted from computePropagation → reusable by redrawIsolines so
  // markers persist on view-mode change (previously they vanished with
  // clearLayers and came back only after an explicit "Compute").
  function renderGridPoints(grid, viewMode, step) {
    var showGrid = document.getElementById('show-grid');
    if (!showGrid || !showGrid.checked) return;
    if (!grid || grid.length === 0) return;
    grid.forEach(function (p) {
      var color, value;
      if (viewMode === 'il') {
        color = colorForIL(p.IL);
        value = 'IL ' + p.IL.toFixed(1) + ' dB';
      } else if (viewMode === 'with') {
        color = colorForLeq(p.Leq_w);
        value = p.Leq_w.toFixed(1) + ' dBA ' + s.withSuffix;
      } else {
        color = colorForLeq(p.Leq_no);
        value = p.Leq_no.toFixed(1) + ' dBA ' + s.withoutSuffix;
      }
      L.circleMarker([p.lat, p.lng], {
        radius: step * 0.6, fillColor: color, fillOpacity: 0.75, stroke: false
      }).bindTooltip(
        '<strong>' + value + '</strong><br>' +
        s.leqWithoutShort + ': ' + p.Leq_no.toFixed(1) + ' dBA<br>' +
        s.leqWithShort + ': ' + p.Leq_w.toFixed(1) + ' dBA<br>' +
        '<strong style="color:' + colorForIL(p.IL) + '">IL: ' + p.IL.toFixed(1) + ' dB</strong>' +
        (p.diffracted ? ' · ' + s.diffractedTag : ''),
        { direction: 'top', sticky: true, opacity: 0.95 }
      ).addTo(resultLayer);
    });
  }

  // View-mode switch — no recompute, just rerender. Every receiver in
  // lastGrid already carries IL/Leq_w/Leq_no.
  function redrawIsolines(viewMode) {
    if (!lastGrid || lastGrid.length === 0) {
      updateLegend(viewMode);
      return;
    }
    if (resultLayer) resultLayer.clearLayers();
    var wantBands = document.getElementById('show-bands').checked;
    var wantLines = document.getElementById('show-isolines').checked;
    if ((wantBands || wantLines) && lastGrid.length > 4) {
      renderIsolines(lastGrid, lastRefLat, lastRefLng,
                     lastGridXMin, lastGridXMax, lastGridYMin, lastGridYMax,
                     lastStep, viewMode);
    }
    renderGridPoints(lastGrid, viewMode, lastStep);
    renderManualReceiversTable();
    updateLegend(viewMode);
    lastViewMode = viewMode;
    var st = document.getElementById('calc-status');
    if (st) st.textContent = '';
  }

  // Manual receivers handlers
  document.getElementById('btn-add-manual-receiver').addEventListener('click', function () {
    if (manualReceivers.length >= MAX_MANUAL_RECEIVERS) {
      alert(s.manualMaxReached);
      return;
    }
    pickReceiverMode = !pickReceiverMode;
    if (pickReceiverMode) {
      // Mutex with source/barrier drawing and vertical-section picking.
      stopDrawing();
      if (pickMode) {
        pickMode = false;
        document.getElementById('map').classList.remove('pick-mode');
        fabHint.classList.remove('active');
      }
    }
    document.getElementById('manual-pick-status').style.display =
      pickReceiverMode ? 'block' : 'none';
    document.getElementById('map').style.cursor = pickReceiverMode ? 'crosshair' : '';
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cancelReceiverPick();
  });

  map.on('click', function (e) {
    if (!pickReceiverMode) return;
    if (manualReceivers.length >= MAX_MANUAL_RECEIVERS) { cancelReceiverPick(); return; }
    var id = manualReceivers.length + 1;
    var label = 'R' + id;
    var lat = e.latlng.lat, lng = e.latlng.lng;
    var marker = L.marker([lat, lng], { icon: mrIcon(label), draggable: true }).addTo(map);
    marker.bindTooltip(label + ' · ' + s.manualTableNotComputed,
      { direction: 'top', offset: [0, -14], sticky: true });
    marker.on('dragend', function () {
      var ll = marker.getLatLng();
      var rec = null;
      for (var i = 0; i < manualReceivers.length; i++) {
        if (manualReceivers[i].marker === marker) { rec = manualReceivers[i]; break; }
      }
      if (!rec) return;
      rec.lat = ll.lat; rec.lng = ll.lng;
      rec.IL = undefined; rec.Leq_no = undefined; rec.Leq_w = undefined;
      rec.diffracted = undefined; rec.distSrc = undefined;
      marker.setTooltipContent(rec.label + ' · ' + s.manualTableNotComputed);
      renderManualReceiversTable();
    });
    manualReceivers.push({ id: id, label: label, lat: lat, lng: lng, marker: marker });
    cancelReceiverPick();
    renderManualReceiversList();
    renderManualReceiversTable();
  });

  document.getElementById('btn-clear-all-manual').addEventListener('click', function () {
    if (manualReceivers.length === 0) return;
    if (!confirm(s.manualClearConfirm)) return;
    manualReceivers.forEach(function (r) { map.removeLayer(r.marker); });
    manualReceivers.length = 0;
    lastManualReceivers = null;
    cancelReceiverPick();
    renderManualReceiversList();
    renderManualReceiversTable();
  });

  function deleteManualReceiver(id) {
    var idx = -1;
    for (var i = 0; i < manualReceivers.length; i++) {
      if (manualReceivers[i].id === id) { idx = i; break; }
    }
    if (idx < 0) return;
    map.removeLayer(manualReceivers[idx].marker);
    manualReceivers.splice(idx, 1);
    // Renumber: update id and, ONLY for auto labels (R{id}), label + icon.
    manualReceivers.forEach(function (r, i2) {
      var newId = i2 + 1;
      if (r.label === 'R' + r.id) {
        r.label = 'R' + newId;
        r.marker.setIcon(mrIcon(r.label));
      }
      r.id = newId;
    });
    renderManualReceiversList();
    renderManualReceiversTable();
  }

  function renderManualReceiversList() {
    var listEl = document.getElementById('manual-receivers-list');
    var clearAllBtn = document.getElementById('btn-clear-all-manual');
    listEl.innerHTML = '';
    if (manualReceivers.length === 0) { clearAllBtn.style.display = 'none'; return; }
    clearAllBtn.style.display = '';
    manualReceivers.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'manual-receiver-row';
      row.innerHTML =
        '<input type="text" class="mr-label-input" value="' + mrEsc(r.label) + '" ' +
        'placeholder="' + mrEsc(s.manualReceiverPlaceholder) + '" data-id="' + r.id + '" />' +
        '<button class="mr-delete-btn" data-id="' + r.id + '" ' +
        'title="' + mrEsc(s.manualDeleteTitle) + '">' + s.manualRBtnDelete + '</button>';
      listEl.appendChild(row);
    });
    var inputs = listEl.querySelectorAll('.mr-label-input');
    for (var ii = 0; ii < inputs.length; ii++) {
      inputs[ii].addEventListener('input', function (ev) {
        var id = parseInt(ev.target.dataset.id, 10);
        var rec = null;
        for (var k = 0; k < manualReceivers.length; k++) {
          if (manualReceivers[k].id === id) { rec = manualReceivers[k]; break; }
        }
        if (!rec) return;
        rec.label = ev.target.value || ('R' + id);
        rec.marker.setTooltipContent(rec.IL !== undefined
          ? rec.label + ' · IL ' + rec.IL.toFixed(1) + ' dB'
          : rec.label + ' · ' + s.manualTableNotComputed);
        renderManualReceiversTable();
      });
    }
    var btns = listEl.querySelectorAll('.mr-delete-btn');
    for (var bb = 0; bb < btns.length; bb++) {
      btns[bb].addEventListener('click', function (ev) {
        deleteManualReceiver(parseInt(ev.currentTarget.dataset.id, 10));
      });
    }
  }

  function renderManualReceiversTable() {
    var wrap = document.getElementById('manual-receivers-table-wrap');
    var tbody = document.getElementById('manual-receivers-tbody');
    if (manualReceivers.length === 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    var limit = (function () {
      var v = document.getElementById('class-norm').value;
      return v ? parseFloat(v.split(':')[1]) : null;
    })();
    tbody.innerHTML = '';
    for (var i = 0; i < manualReceivers.length; i++) {
      var r = manualReceivers[i];
      var tr = document.createElement('tr');
      if (r.IL !== undefined) {
        var statusHtml;
        if (limit !== null && isFinite(r.Leq_w)) {
          statusHtml = r.Leq_w < limit
            ? '<span class="status-ok">' + s.manualStatusOk + '</span>'
            : '<span class="status-over">' + s.manualStatusOver + '</span>';
        } else {
          statusHtml = '<span class="status-none">' + s.manualStatusNoLimit + '</span>';
        }
        tr.innerHTML =
          '<td><strong>' + mrEsc(r.label) + '</strong>' +
          (r.diffracted ? ' <span class="diff-tag">' + s.diffractedTag + '</span>' : '') + '</td>' +
          '<td>' + r.distSrc.toFixed(0) + ' m</td>' +
          '<td>' + r.Leq_no.toFixed(1) + ' dBA</td>' +
          '<td>' + (isFinite(r.Leq_w) ? r.Leq_w.toFixed(1) + ' dBA' : '—') + '</td>' +
          '<td style="color:' + colorForIL(r.IL) + '"><strong>' + r.IL.toFixed(1) + ' dB</strong></td>' +
          '<td>' + statusHtml + '</td>';
      } else {
        tr.innerHTML =
          '<td><strong>' + mrEsc(r.label) + '</strong></td><td>—</td><td>—</td><td>—</td><td>—</td>' +
          '<td><em>' + s.manualTableNotComputed + '</em></td>';
      }
      tbody.appendChild(tr);
    }
  }

  // show-grid toggle: live redraw (reuses redrawIsolines).
  document.getElementById('show-grid').addEventListener('change', function () {
    if (lastGrid && lastGrid.length > 0) redrawIsolines(lastViewMode || 'il');
  });

  // ===== VIEW MODE + METHOD listeners =====
  // v0.8 — view-mode change auto-rerender (no warning, no recompute):
  // every receiver already carries IL/Leq_w/Leq_no.
  document.getElementById('view-mode').addEventListener('change', function (e) {
    redrawIsolines(e.target.value);
  });

  document.querySelectorAll('input[name="method"]').forEach(function (input) {
    input.addEventListener('change', function () {
      document.querySelectorAll('.method-toggle label').forEach(function (l) { l.classList.remove('checked'); });
      input.closest('label').classList.add('checked');
      if (lastGrid) {
        document.getElementById('calc-status').textContent = s.jsMethodChanged;
      }
    });
  });

  new MutationObserver(function () {
    if (metricGridActive) metricGrid._redraw();
    if (buildingLayer) renderBuildings();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ===== Feature-C — spectrum info popover + octave mini bar-chart =====
  (function () {
    var SPEC_DESC_KEY = {
      urban_road: 'specDescUrbanRoad',
      extraurban_road: 'specDescExtraurban',
      highway: 'specDescHighway',
      train_pass: 'specDescTrainPass',
      train_freight: 'specDescTrainFreight',
      industrial: 'specDescIndustrial',
    };
    var SPEC_BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
    var SPEC_LABELS = ['63', '125', '250', '500', '1k', '2k', '4k', '8k'];

    var infoBtn = document.getElementById('btn-spectrum-info');
    var popover = document.getElementById('spectrum-info-popover');
    var selectEl = document.getElementById('src-spectrum');
    if (infoBtn && popover && selectEl) {
      var closeBtn = popover.querySelector('.info-popover-close');

      function formulaForCurrentMode() {
        if (srcMode === 'line') return "Lw_tot = Lw' + 10·log₁₀(L)";
        if (srcMode === 'area') return "Lw_tot = Lw'' + 10·log₁₀(A)";
        return "Lw_tot = Lw";
      }

      function renderSpectrumChart(spec) {
        var canvas = document.getElementById('spectrum-canvas');
        var ctx = canvas.getContext('2d');
        var W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        var values = SPEC_BANDS.map(function (f) { return spec[f]; });
        var minV = Math.min.apply(null, values);
        var maxV = Math.max.apply(null, values);
        var range = Math.max(maxV - minV, 5);
        var padX = 22, padY = 14;
        var innerW = W - padX * 2;
        var innerH = H - padY * 2;
        var barW = innerW / values.length * 0.7;
        var gap = innerW / values.length * 0.3;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(padX, H - padY);
        ctx.lineTo(W - padX, H - padY);
        ctx.stroke();
        ctx.fillStyle = '#ff8c1a';
        values.forEach(function (v, i) {
          var x = padX + i * (barW + gap) + gap / 2;
          var h = ((v - minV) / range) * innerH;
          ctx.fillRect(x, H - padY - h, barW, h);
        });
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '9px ui-monospace, monospace';
        ctx.textAlign = 'right';
        ctx.fillText('' + maxV.toFixed(0), padX - 3, padY + 8);
        ctx.fillText('' + minV.toFixed(0), padX - 3, H - padY);
        ctx.textAlign = 'center';
        SPEC_LABELS.forEach(function (b, i) {
          var x = padX + i * (barW + gap) + gap / 2 + barW / 2;
          ctx.fillText(b, x, H - 2);
        });
      }

      function renderSpectrumInfo() {
        var key = selectEl.value;
        var spec = SPECTRA[key];
        if (!spec) return;
        document.getElementById('info-popover-title').textContent =
          selectEl.options[selectEl.selectedIndex].text;
        document.getElementById('info-popover-desc').textContent =
          s[SPEC_DESC_KEY[key]] || '';
        document.getElementById('info-popover-formula').textContent =
          formulaForCurrentMode();
        renderSpectrumChart(spec);
      }
      window.__barrierRerenderSpectrum = function () {
        if (!popover.hidden) renderSpectrumInfo();
      };

      function openInfoPopover() {
        popover.hidden = false;
        infoBtn.setAttribute('aria-expanded', 'true');
        renderSpectrumInfo();
      }
      function closeInfoPopover() {
        popover.hidden = true;
        infoBtn.setAttribute('aria-expanded', 'false');
      }

      infoBtn.addEventListener('click', function () {
        if (popover.hidden) openInfoPopover();
        else closeInfoPopover();
      });
      closeBtn.addEventListener('click', closeInfoPopover);
      selectEl.addEventListener('change', function () {
        if (!popover.hidden) renderSpectrumInfo();
      });
      document.addEventListener('click', function (e) {
        if (popover.hidden) return;
        if (!popover.contains(e.target) && e.target !== infoBtn) closeInfoPopover();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !popover.hidden) closeInfoPopover();
      });
    }
  })();

  // Re-render hook exposed so external code can refresh dynamic strings.
  window.__barrierRerender = function () {
    setMode(srcMode);
    updateSourceStatus();
    updateBarrierStatus();
    var vm = document.getElementById('view-mode').value;
    updateLegend(vm);
    if (window.__barrierRerenderSpectrum) window.__barrierRerenderSpectrum();
  };

  // === INIT ===
  updateLegend('il');
  updateSourceStatus();
  updateBarrierStatus();
}

/* ===== Bootstrap ===== */
function __boot() {
  initChrome();
  initBarrierCalc();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __boot);
} else {
  __boot();
}
