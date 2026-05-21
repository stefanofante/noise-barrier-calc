"use strict";
/* ============================================================================
 * i18n/runtime.js — Apply STRINGS to DOM, theme toggle, chrome wiring
 * ----------------------------------------------------------------------------
 * The site ships only English text. We keep the data-i18n binding system so
 * the JS code can continue to read labels via the `s` lookup table without
 * hard-coding text strings in calculator logic.
 *
 *   currentLang  — locked to 'en'
 *   s            — alias for STRINGS.en (used across app.js)
 *   applyI18n()  — fills [data-i18n-text] / [data-i18n-html] from STRINGS
 *   initChrome() — wires the theme toggle and triggers applyI18n
 * ========================================================================== */

var THEME_KEY = 'stline-barrier-theme';
var currentLang = 'en';
var s = STRINGS.en;

function applyI18n() {
  s = STRINGS.en;
  document.documentElement.setAttribute('lang', 'en');
  var els = document.querySelectorAll('[data-i18n-text]');
  for (var i = 0; i < els.length; i++) {
    var k = els[i].getAttribute('data-i18n-text');
    if (s[k] !== undefined) els[i].textContent = s[k];
  }
  var hels = document.querySelectorAll('[data-i18n-html]');
  for (var j = 0; j < hels.length; j++) {
    var hk = hels[j].getAttribute('data-i18n-html');
    if (s[hk] !== undefined) hels[j].innerHTML = s[hk];
  }
  var h1 = document.getElementById('bc-h1');
  if (h1) h1.innerHTML = 'Noise <em>barrier</em> calculator.';
  var ctaLink = document.getElementById('cta-link');
  if (ctaLink) ctaLink.href = 'https://stline.it/en/products/acustica-pro';
  var dbox = document.getElementById('disclaimer-box');
  if (dbox) dbox.innerHTML = s.disclaimer;
}

/* Theme: data-theme on <html>, default dark, localStorage persisted. */
(function () {
  var saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
  var theme = (saved === 'light' || saved === 'dark') ? saved : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();

function initChrome() {
  var themeBtn = document.getElementById('theme-toggle');
  function syncThemeLabel() {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    themeBtn.textContent = cur === 'dark' ? '☀ light' : '☾ dark';
  }
  syncThemeLabel();
  themeBtn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    var nxt = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nxt);
    try { localStorage.setItem(THEME_KEY, nxt); } catch (e) {}
    syncThemeLabel();
  });
  applyI18n();
}
