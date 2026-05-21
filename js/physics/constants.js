"use strict";
/* ============================================================================
 * physics/constants.js — Acoustic constants and A-weighting table
 * ----------------------------------------------------------------------------
 * SPEED_OF_SOUND : reference speed of sound in air (m/s, ~20 °C).
 * FREQ_BANDS     : octave-band centre frequencies used across the toolchain.
 * A_WEIGHTING    : A-weighting correction (dB) per octave band, IEC 61672-1.
 * Exposed as globals so plain <script> modules can share them without bundling.
 * ========================================================================== */

var SPEED_OF_SOUND = 343.0;

var FREQ_BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000];

var A_WEIGHTING = {
  63: -26.2, 125: -16.1, 250: -8.6, 500: -3.2,
  1000: 0.0, 2000: 1.2, 4000: 1.0, 8000: -1.1,
};
