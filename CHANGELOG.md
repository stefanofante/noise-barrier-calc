# Changelog

All notable changes to this project will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.1] — 2026-05-21

### Fixed
- **Insertion Loss with OSM buildings** — the *no-barrier* scenario now includes building diffraction when buildings take part in the calculation. Previously `Leq_no` was always free-field, so `IL = Leq_no − Leq_w` conflated the barrier's effect with the buildings' shielding (receivers shadowed only by a building showed a large IL even far from the barrier). Buildings now form a common baseline for both scenarios → the IL isolates the barrier's own contribution. Without buildings in the calculation, behaviour is unchanged. Applied to both the grid loop and the manual-receiver pass.

### Changed
- **Repository layout: multi-file static site.** The single-file `index.html` has been split into an HTML shell plus 12 vanilla-JS modules under `js/` (`physics/{constants,spectra,atm,ground,diffraction,geometry,propagation}.js`, `osm/buildings.js`, `ui/screenshot.js`, `i18n/{strings,runtime}.js`, `app.js`). Physics, OSM logic and DOM behaviour are byte-equivalent to v0.8.1 single-file; only the file boundaries changed. **Running the site now requires a static HTTP server** (`python -m http.server 8000`, `npx serve .`, `php -S localhost:8000`); browsers refuse to execute `<script src="js/...">` from a `file://` URL.
- **English-only UI.** The IT/EN runtime toggle and the Italian branch of the `STRINGS` dictionary have been removed. `<html lang>` is now `en`, page title and meta description are English, and the `#lang-toggle` button is gone. The `data-i18n-text` / `data-i18n-html` binding system is kept (DOM still gets filled from `STRINGS.en` at boot) so `app.js` can keep its `s.someKey` lookups unchanged.

### Technical
- Synced from the ST-LINE site companion component `BarrierCalculator.astro`. Physics engine otherwise unchanged.

---

## [0.8.0] — 2026-05-20

### Added
- **Adaptive receiver grid** — grid bbox auto-fits source bbox + buffer per side (snapped to step). Replaces the previous fixed 300 m × 300 m square centered on the source centroid that truncated extended line/area sources.
  - Input renamed `grid-extent` → `grid-buffer`. Default 300 → 150 (buffer per side; 150 m around a 0-size point = 300 m total = legacy behavior). Range 50–800 → 25–500. i18n key `gridExtentLabel` → `gridBufferLabel`.
- **Manual receivers (max 5)** — new panel section "9 · Ricevitori manuali" / "9 · Manual receivers". Click-to-place with crosshair + ESC to cancel; numbered cyan square-pin markers (R1..R5) draggable; per-receiver editable label + delete + "Clear all"; auto-renumber on individual delete. Computed in the same pass as the grid (reuses worst-screen logic + `firstBarrierHit`), with a results table below the stats: Label / Source dist. / Leq w-o / Leq with / IL (colored) / Status vs limit.
- **Results explainer** — always-visible block above the stat-boxes ("Cosa rappresentano i risultati" / "What the results represent") clarifying that IL MEAN/MAX are arithmetic over the *entire* grid (incl. front/lateral receivers with IL≈0), while LEQ WITH BARR. is the energy-averaged mean.
- **"Diffracted only" stats** — supplementary row of 3 stat-boxes (IL mean / IL max / count) computed on `grid.filter(p => p.diffracted)`, more indicative of barrier effectiveness than the full-grid mean.
- **Sublabels under each stat-value** (10.5 px mono, muted) explaining what each statistic is computed on.
- **Auto-redraw on view-mode change** — switching the view-mode dropdown (IL / Leq with / Leq without) now rerenders isolines + grid points immediately without a "recompute" warning. Toggling "show grid points" also live-redraws.
- **Defensive h=NaN fallback** — empty barrier height field no longer produces `IL = Infinity`. Falls back to `hb_total = base | 0` (= "no barrier"), calculation proceeds, warning prepended to `calc-status`. Applied to `renderCrossSection` too so the vertical cross-section doesn't draw invalid geometry.

### Changed
- **`renderIsolines` signature**: now `(grid, refLat, refLng, gridXMin, gridXMax, gridYMin, gridYMax, step, viewMode)` — rectangular Nx × Ny matrix with explicit origin (the old `(x − N/2)*step` mapping had a latent ~half-step contour-overlay misregistration that is also fixed by this).
- **OSM building tooltip**: added explicit `offset: [0, -8]` (was `{ direction: 'top', sticky: true }` only) so it sits cleanly above the polygon.
- **Panel layout** — multi-column packing (`column-width: 232px`) instead of a CSS grid where the row height was set by the tallest section, eliminating large empty gaps under short sections. The results section (`.span-2`) spans the full width.
- **Stats + manual table** sit side-by-side (`bc-results-flex`, `min-width: 0`); the table stacks below only when page < 860 px.
- **Section order** — Calcola / Reset moved after "9 · Manual receivers" so the operational flow ends add-receivers → compute.
- **CSV export** — schema extended with `label` (first column) and `manual` (last column). Grid rows: `label=""`, `manual="false"`. Manual rows: `label=<user label, CSV-escaped>`, `manual="true"`. Existing CSV parsers from v0.7 need to handle the 2 new columns. **BREAKING** for that schema. Allows manual-only export when the grid is empty.
- **`clearResult`** now takes `{ keepManual: true }` by default — clearing source/barrier or recomputing does NOT wipe hand-placed receivers; only "Reset tutto" passes `{ keepManual: false }`.

### i18n
- ~25 new keys in the standalone `STRINGS` dictionary (IT + EN), wired through the existing `data-i18n-text`/`data-i18n-html` attribute system: `resultsExplainerTitle/Text`, `statILMeanSub/MaxSub/LeqWithSub/BelowSub`, `statILMeanDiff/MaxDiff/NDiff` (+ subs), `hMissingWarn`, `s9Title/Helper`, `btnAddManualReceiver`, `btnClearAllManual`, `pickStatusActive`, `manualReceiverPlaceholder`, `manualMaxReached`, `manualClearConfirm`, `manualTable*`, `manualStatus*`.

### Technical
- Synced with the ST-LINE site companion component `src/components/BarrierCalculator.astro` (post-`0dbed10`). Physics engine and OSM/Overpass logic unchanged.
- New `manual-receiver-marker` is intentionally a **square pin with pointer** (not a circle), so it doesn't visually clash with the round geolocation dot or the round grid markers.

---

## [0.7.0] — 2026-05-19

### Added
- Full EN UI with IT/EN runtime toggle (complete string dictionary, 117+ keys)
- OSM buildings via Overpass API as passive obstacles (worst-screen-wins, one obstacle per source-receiver pair)
- Spatial scene filter: only buildings within the scene bbox (source ∪ barrier ∪ receiver-grid + 10 m buffer) participate; "X of Y" participation badge
- Geolocate control (📍 top-left, localStorage-persisted last center)
- Screenshot export (📷 top-right, composite map + legend + results PNG; html2canvas lazy-loaded)
- Spectrum info popover: description, mode-aware formula, octave-band mini bar chart

### Changed
- Single-file standalone now loads Leaflet / d3-contour / html2canvas from CDN (was vendored)
- Fluid bottom-panel layout (no internal scroll; mobile-responsive)
- Ctrl/Cmd + wheel zoom guard with on-map hint (page scroll otherwise)

### Technical
- Physics/OSM/screenshot extracted verbatim from the ST-LINE site shared modules (develop HEAD, post-ef726c7); ISO 9613-2 §7.4 + Maekawa unchanged
- Synced with src/components/BarrierCalculator.astro

## [0.6.0] — 2026-05-18

### Added
- **Filled contour bands** at 5 dB intervals (mappa acustica style) — default ON
- **Continuous color legend** with tick marks at every 5 dB threshold (240px gradient)
- View-mode listener: legend updates immediately when switching IL/Leq view
- Individual receiver points now OFF by default (redundant with bands)

### Changed
- Legend gradient now generated dynamically per dB step (was 3 hard-coded stops)
- Isolines now have dark outline for readability on any background
- Render ordering: bands (bottom) → points → isolines (top) for clarity

## [0.5.0] — 2026-05-18

### Added
- **Metric grid overlay** (5m / 10m / 25m, zoom-adaptive) with high-contrast colors
- Toggle button "▦ Griglia 5m" top-left of map
- Synchronized checkbox in sidebar "Griglia metrica (5–25m)"
- **Progress spinner** with rotating ring, percentage, and detail (rows processed)
- **Async chunked calculation**: yield to browser every 4 rows for responsive UI

### Changed
- `computePropagation` refactored from sync to async with `await Promise(setTimeout(0))`
- UI now remains interactive (pan, zoom) during calculation

## [0.4.0] — 2026-05-18

### Added
- **ISO 9613-2:1996 §7.4 full screening formula** as alternative to Maekawa
  - `Dz = 10·log₁₀(3 + (C₂/λ)·C₃·z·K_met)`
  - Includes meteorological correction K_met for downwind propagation
  - C2=20 (separate ground reflections), C3=1 (single barrier)
  - Max attenuation: 20 dB (single)
- **Radio toggle** "3b · Metodo di calcolo" with ISO 9613-2 (default) and Maekawa
- Method name displayed in status bar and cross-section header
- Warning message if method changed after calculation
- Crosshair cursor in drawing mode
- Documentation section with formula derivations and references

### Changed
- `diffraction(method, f, delta, d_ss, d_sr)` dispatcher replacing direct Maekawa call
- README and CHANGELOG citing ISO 9613-2 explicitly

## [0.3.0] — 2026-05-18

### Added
- **Vertical cross-section diagram** (SVG 800×320px) showing source → barrier → receiver geometry
- Click-receiver pick mode for cross-section selection
- Direct ray (dashed) vs diffracted ray (solid) visualization
- Cross-section info panel with all distances, heights, δ path-difference, IL
- **CSV export** of receiver grid (lat, lon, distance, Leq_no, Leq_with, IL, diffracted)
- Time-stamped filename: `barriers-receivers-YYYY-MM-DDTHH-MM-SS.csv`

## [0.2.0] — 2026-05-18

### Added
- **Point source** mode (third option beyond linear/areal)
- Point source visualization with red glow effect
- **Cursor readout panel** bottom-right showing live Leq/IL values on mouse hover
- **Reset button** (full clear with confirmation)
- Diagnostic logs in browser console for debugging

### Changed
- Barrier rendering now uses double polyline (dark outline + bright orange core)
  for visibility on any map/theme
- Source rendering also has dark outline during drawing
- `doubleClickZoom` disabled during drawing to prevent zoom on completion click
- Continuous HSL color gradients replace stepped colors:
  - Leq: green → yellow → red (35–80 dBA)
  - IL: red → yellow → green (0–20 dB) — green = good attenuation
- Receiver markers larger (radius `step·0.6`) and more saturated (opacity 0.75)

## [0.1.0] — 2026-05-18

### Added
- Initial working prototype
- Three source types: linear polyline, area rectangle, point
- Spectrum presets: urban road, extraurban road, highway, train passenger,
  train freight, industrial
- User-defined `Lw'` (dB/m) for line sources and `Lw''` (dB/m²) for areas
- Barrier drawn as polyline with adjustable height + base elevation
- Receiver grid centered on source centroid, configurable extent/step
- ISO 9613-1 atmospheric absorption per 1/3 octave band (63 Hz – 8 kHz)
- ISO 9613-2 §7.3.2 ground attenuation with G-factor
- Maekawa (1968) single-screen diffraction
- DPCM 14/11/97 class threshold visualization (classes I–VI)
- Statistics panel: IL mean/max, Leq mean with barrier, % below limit
- Configurable atmosphere (T, RH)
- Cross-section physics validated in Python against literature values

## [0.0.1] — 2026-05-18

### Added
- Repository scaffolding (LICENSE, README, CONTRIBUTING, vendor setup script)
- Placeholder `index.html` documenting planned features
