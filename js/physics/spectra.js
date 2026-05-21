"use strict";
/* ============================================================================
 * physics/spectra.js — Stylized source spectra (octave bands, dB re Lw)
 * ----------------------------------------------------------------------------
 * Each entry maps centre frequencies (63..8000 Hz) to a relative shape (dB).
 * Values are added to Lw on a per-band basis (Lw_f = Lw + spectrum[f]).
 * NOTE: these spectra are stylized teaching defaults — NOT NMPB-Routes-2008,
 * NMPB-Fer or CNOSSOS-EU. For expert work, replace with certified spectra.
 * ========================================================================== */

var SPECTRA = {
  urban_road:      { 63: -14, 125: -10, 250: -7, 500: -6, 1000: -5, 2000: -7, 4000: -11, 8000: -16 },
  extraurban_road: { 63: -15, 125: -10, 250: -7, 500: -5, 1000: -5, 2000: -7, 4000: -12, 8000: -17 },
  highway:         { 63: -16, 125: -10, 250: -7, 500: -5, 1000: -4, 2000: -6, 4000: -12, 8000: -18 },
  train_pass:      { 63: -16, 125: -13, 250: -9, 500: -6, 1000: -5, 2000: -6, 4000: -10, 8000: -15 },
  train_freight:   { 63: -13, 125: -11, 250: -8, 500: -7, 1000: -6, 2000: -8, 4000: -12, 8000: -17 },
  industrial:      { 63: -11, 125: -10, 250: -9, 500: -8, 1000: -8, 2000: -9, 4000: -10, 8000: -13 },
};
