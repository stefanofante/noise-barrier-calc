# Changelog

All notable changes to this project will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
