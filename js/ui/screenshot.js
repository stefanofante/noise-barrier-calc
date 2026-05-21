"use strict";
/* ============================================================================
 * ui/screenshot.js — Leaflet screenshot control (html2canvas, lazy-loaded)
 * ----------------------------------------------------------------------------
 *   loadHtml2Canvas()                      — lazy-load html2canvas from a CDN
 *   captureToolScreenshot({ mapEl, legendEl, resultsEl, filename, toolLabel,
 *                           inProgressTitle })
 *       Captures the map + legend + side results panel into a single PNG.
 *   createScreenshotControl({ position, title, inProgressTitle, onClick })
 *       Returns a Leaflet control with a camera button wired to `onClick`.
 *
 * html2canvas is fetched on-demand to keep the initial page weight small.
 * ========================================================================== */

var __html2canvasPromise = null;
function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (__html2canvasPromise) return __html2canvasPromise;
  __html2canvasPromise = new Promise(function (resolve, reject) {
    var sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    sc.onload = function () { resolve(window.html2canvas); };
    sc.onerror = function () { reject(new Error('html2canvas load failed')); };
    document.head.appendChild(sc);
  });
  return __html2canvasPromise;
}

function captureToolScreenshot(opts) {
  var mapEl = opts.mapEl, legendEl = opts.legendEl, resultsEl = opts.resultsEl, filename = opts.filename;
  var h2c;
  return loadHtml2Canvas().then(function (lib) {
    h2c = lib;
    return h2c(mapEl, {
      useCORS: true, allowTaint: false, backgroundColor: null, scale: 1, logging: false,
    });
  }).then(function (mapCanvas) {
    var legendP = legendEl
      ? h2c(legendEl, { useCORS: true, backgroundColor: null, scale: 1, logging: false })
      : Promise.resolve(null);
    return legendP.then(function (legendCanvas) {
      var resultsP = resultsEl
        ? h2c(resultsEl, { useCORS: true, backgroundColor: '#1a1a1a', scale: 1, logging: false })
        : Promise.resolve(null);
      return resultsP.then(function (resultsCanvas) {
        var padding = 16;
        var sidebarW = resultsCanvas ? Math.max(280, resultsCanvas.width + padding * 2) : 0;
        var finalW = mapCanvas.width + sidebarW;
        var finalH = mapCanvas.height + (legendCanvas ? legendCanvas.height + padding : 0);
        var finalCanvas = document.createElement('canvas');
        finalCanvas.width = finalW;
        finalCanvas.height = finalH;
        var ctx = finalCanvas.getContext('2d');
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, finalW, finalH);
        ctx.drawImage(mapCanvas, 0, 0);
        if (legendCanvas) {
          ctx.drawImage(legendCanvas, padding, mapCanvas.height + padding);
        }
        if (resultsCanvas) {
          ctx.drawImage(resultsCanvas, mapCanvas.width + padding, padding);
        }
        var ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '11px ui-monospace, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(opts.toolLabel + ' · ' + ts + ' · stline.it', finalW - padding, finalH - 8);
        return new Promise(function (resolve) {
          finalCanvas.toBlob(function (blob) {
            if (!blob) { resolve(); return; }
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            resolve();
          }, 'image/png', 0.95);
        });
      });
    });
  });
}

function createScreenshotControl(opts) {
  var L = window.L;
  var ScreenshotControl = L.Control.extend({
    options: { position: opts.position || 'topright' },
    onAdd: function () {
      var btn = L.DomUtil.create('button', 'leaflet-control-screenshot leaflet-bar');
      btn.type = 'button';
      btn.innerHTML = '📷';
      btn.title = opts.title;
      btn.setAttribute('aria-label', opts.title);
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', function () {
        if (btn.classList.contains('capturing')) return;
        btn.classList.add('capturing');
        btn.title = opts.inProgressTitle;
        btn.innerHTML = '⏳';
        Promise.resolve(opts.onClick()).then(function () {
          btn.classList.remove('capturing');
          btn.title = opts.title;
          btn.innerHTML = '📷';
        }, function () {
          btn.classList.remove('capturing');
          btn.title = opts.title;
          btn.innerHTML = '📷';
        });
      });
      return btn;
    },
  });
  return new ScreenshotControl();
}
