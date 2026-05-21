# noise-barrier-calc

[![Status: v0.8](https://img.shields.io/badge/status-v0.8_working-orange.svg)](#status)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Standards: ISO 9613-2 §7.4](https://img.shields.io/badge/standards-ISO_9613--2_%C2%A77.4-orange.svg)](#physics)

> **EN** — Browser-based acoustic-barrier insertion-loss calculator.

Place a source (point, line or area), draw a barrier on the map, optionally
download OSM buildings as passive obstacles, and the tool computes how much
noise the barrier blocks at every point of a receiver grid.

Demonstration tool for **environmental acoustics**, runs entirely in the
browser. Companion to [acmap](https://github.com/stefanofante/acmap)
(acoustic mapping), sharing the same physics engine.

Vanilla JavaScript split across a small set of files under `js/`. No build,
no bundler. A static web server is required (browsers refuse to load
`<script src>` from `file://` and CORS blocks tile/Overpass requests).

---

## Features

- ✅ **ISO 9613-2:1996 §7.4 diffraction** (default) — full screening formula with
  meteorological correction K<sub>met</sub> (downwind), C2=20, C3=1, max 20 dB single
- ✅ **Maekawa (1968)** alternative — original Fresnel-number formula, max 25 dB
- ✅ **Three source types** — linear (`Lw'` dB/m), areal (`Lw''` dB/m²), point (`Lw` dB)
- ✅ **Acoustic barrier** as polyline with adjustable height + base elevation
- ✅ **OSM buildings via Overpass API** as passive obstacles
  (worst-screen-wins: one obstacle per source–receiver pair)
- ✅ **Spatial scene filter** — only buildings inside the scene bbox
  (source ∪ barrier ∪ receiver-grid + 10 m buffer) participate; "X of Y" badge
- ✅ **Filled IL contour bands** at 5 dB (default), isolines at 5 dB, receiver points,
  zoom-adaptive metric grid (5–25 m)
- ✅ **Vertical cross-section** — click any receiver for source→barrier→receiver
  geometry with δ path-difference and IL
- ✅ **Spectrum info popover** — description, mode-aware formula, octave-band
  mini bar chart
- ✅ **Geolocate control** (📍 top-left, last center persisted)
- ✅ **Screenshot export** (📷 top-right, composite map + legend + results PNG;
  html2canvas lazy-loaded on first click)
- ✅ **CSV export** of the receiver grid (coords, distance, Leq, IL, diffracted)
- ✅ **Light / dark theme** toggle (persisted), responsive fluid layout
- ✅ **Fully client-side** — your data never leaves the browser
  (internet only needed on first load for CDN libs, OSM tiles, Overpass)

---

## Quick start

The site ships as plain HTML + a few JS files. Browsers will not execute
`<script src="js/...">` from a `file://` URL, and OSM tiles / Overpass
requests are blocked by CORS in that mode. **Serve the folder over HTTP** —
any static server works:

```sh
# Python 3 (most systems already have it)
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Then open <http://localhost:8000/> in a modern browser.

> First load needs internet access: the page pulls Leaflet, d3-contour and
> (lazily) html2canvas from CDN, the OpenStreetMap tiles, and — only when you
> click "Download buildings" — the Overpass API. After that all computation is
> local; user-drawn geometry never leaves the page.

### Workflow

1. Select source type (line / area / point)
2. Choose spectrum preset and set `Lw'`, `Lw''`, or `Lw`
3. Click "Draw on map" and place the source
4. Set barrier height + base elevation, draw the barrier
5. Select diffraction method (ISO 9613-2 default)
6. Adjust receiver grid, atmosphere, DPCM class as needed
7. (Optional) "Download buildings" → toggle "Buildings participate in calculation"
8. Click "Compute" — watch the progress spinner
9. Inspect the heatmap (filled bands + isolines)
10. Click "Vertical cross-section" → click any receiver for geometry
11. "Export receivers CSV" / 📷 screenshot as needed

---

## Status

**v0.8 working** — functional prototype, browser-based.

| Version | Status | Highlights |
|---------|--------|------------|
| v0.1    | done   | Point/line/area sources, single Maekawa diffraction, receiver grid + insertion loss |
| v0.2    | done   | Source visibility fixes, point source mode, reset button, cursor readout |
| v0.3    | done   | Vertical cross-section diagram, CSV export of receiver grid |
| v0.4    | done   | ISO 9613-2 §7.4 complete formula (C2, C3 placeholder, K<sub>met</sub>) + method toggle |
| v0.5    | done   | Metric grid overlay (5m visual reference), responsive chunked calc, progress spinner |
| v0.6    | done   | Filled contour bands at 5 dB, continuous color legend with tick marks |
| v0.7    | done   | EN i18n + IT/EN runtime toggle, OSM buildings (Overpass) as passive obstacles, spatial scene filter + participation badge, geolocate, screenshot export, spectrum info popover; libs via CDN |
| v0.8    | done   | Adaptive grid (bbox + buffer), manual receivers (max 5) with results table + CSV flag, results explainer + diffracted-only stats + sublabels, auto-redraw on view-mode, defensive h=NaN fallback, OSM tooltip offset, compact multi-column panel layout |
| v0.9+   | planned | Multi-barrier cascade, lateral diffraction, source spectra from CSV |

---

## What it does NOT do

This is a **demonstration tool**. It does not replace certified software
(CadnaA, SoundPLAN, NoiseModelling) for legal/peritial barrier design.
See the in-tool disclaimer strip for the full statement. Specifically:

- Single-screen "worst-screen-wins" obstacle model (one obstacle per
  source–receiver pair) — **not** rigorous multi-screen ISO 9613-2
- Multi-barrier in cascade (C<sub>3</sub> fixed to 1 in ISO 9613-2)
- Lateral diffraction around barrier edges
- Sound transmission through the barrier (assumed opaque)
- Reflections from source side or between barriers
- NMPB-Routes-2008 / NMPB-Fer / CNOSSOS-EU frameworks
- Profiled meteorology (vertical wind/temperature gradients)
- Stylized preset spectra only — not real measured spectra

For certified barrier design, consult a registered acoustic engineer
(in Italy: *Tecnico Competente in Acustica* registered with ENTECA).

---

## Physics

Standard outdoor sound propagation model. For each source point → receiver pair:

| Term | Standard | Description |
|------|----------|-------------|
| `A_div = 20·log10(d) + 11` | (geometric) | Spherical spreading from point source |
| `A_atm` | ISO 9613-1:1993 | Atmospheric absorption per 1/3 octave band (63 Hz – 8 kHz) |
| `A_gr` | ISO 9613-2:1996 §7.3.2 | Ground effect with G-factor (0=hard, 1=porous) |
| `A_dif` | ISO 9613-2:1996 §7.4 OR Maekawa 1968 | Barrier diffraction (selectable) |

### Source discretization

| Source type | Discretization | Per-point Lw |
|-------------|----------------|--------------|
| Linear      | 5m along polyline | `Lw = Lw' + 10·log10(5)` |
| Areal       | 10m × 10m grid | `Lw = Lw'' + 10·log10(100)` |
| Point       | 1 point | `Lw = Lw_total` |

### Diffraction formulas (selectable)

**Maekawa (1968)** — original formula, infinite barrier assumed:
```
A_dif = 10·log10(3 + 20·N)
N = 2·δ/λ                 (Fresnel number)
δ = (d_st + d_tr) - d_sr  (path difference, meters)
```
Max attenuation: 25 dB.

**ISO 9613-2:1996 §7.4** — full screening formula (default):
```
Dz = 10·log10(3 + (C2/λ)·C3·z·Kmet)

C2 = 20                     (no separate ground reflections)
C3 = 1                      (single barrier; ≠1 for double — not implemented)
z = δ                       (path difference)
Kmet = exp(-(1/2000)·√(d_ss·d_sr/(2z)))   (downwind meteorological correction)
```
Max attenuation: 20 dB (single barrier).

The standard formula (C2=20) is consistently 1–3 dB more conservative than
Maekawa in the mid-frequency range, and includes a meteorological correction
reducing effectiveness over long distances (>500m downwind).

### OSM buildings (worst-screen-wins)

When "Buildings participate in calculation" is active, OSM building footprints
(downloaded via Overpass) act as opaque obstacles. For each source–receiver
pair, the single obstacle (barrier or building) with the **largest**
path-difference δ is used. Heights come from OSM `height` /
`building:levels` tags, falling back to a user-set default. This is **not**
rigorous multi-screen; real cascaded attenuation is typically higher.

### Total receiver level

Per-band sound pressures are A-weighted and summed energetically across the
spectrum, then across all source points:

```
Leq_A = 10·log10(Σ_points Σ_bands 10^((Lp_band + A_weight)/10))
```

**Insertion Loss** = Leq_without_barrier − Leq_with_barrier.

---

## References

- **ISO 9613-1:1993** — Acoustics — Attenuation of sound during propagation outdoors. Part 1: absorption of sound by the atmosphere
- **ISO 9613-2:1996** — Acoustics — Attenuation of sound during propagation outdoors. Part 2: general method of calculation (incl. §7.4 screening)
- Maekawa, Z. (1968). *Noise reduction by screens*. Applied Acoustics, 1(3), 157–173
- **DPCM 14/11/1997** — Determinazione dei valori limite delle sorgenti sonore (Italian acoustic zoning)

---

## Tech stack

- **Vanilla JavaScript** (ES5-friendly), no bundler, no build pipeline
- **Multi-file static site** (`index.html` + `js/**`) — served by any static HTTP
  server; physics/OSM/screenshot logic split into small modules under `js/`
- Libraries via CDN (true single-file standalone):
  - [Leaflet 1.9.4](https://leafletjs.com) — BSD 2-Clause
  - [d3-contour 4.0.2](https://github.com/d3/d3-contour) — ISC
  - [html2canvas 1.4.1](https://html2canvas.hertzen.com) — MIT (lazy-loaded on first screenshot)
- **OpenStreetMap tiles** (ODbL) · **Overpass API** for buildings
- Physics: **ISO 9613-2:1996 §7.4** + **Maekawa 1968**
- **No backend, no analytics, no tracking** — fully client-side

User data (source, barrier, receivers) never leaves the browser.

---

## Repository structure

```
noise-barrier-calc/
├── LICENSE                   Apache-2.0
├── NOTICE                    Attribution + third-party
├── README.md                 This file
├── CONTRIBUTING.md           Contributor guidelines
├── CHANGELOG.md              Version history
├── .gitignore
├── index.html                HTML shell, loads the JS modules below
├── js/
│   ├── physics/              Constants, spectra, atmosphere, ground,
│   │                         diffraction, geometry, propagation
│   ├── osm/                  Overpass fetch + footprint parsing
│   ├── ui/                   Screenshot control
│   ├── i18n/                 English string table + DOM binding runtime
│   └── app.js                Map, drawing, calculation, results UI
├── scripts/
│   └── fetch-vendor.sh       (legacy) downloads libraries to vendor/
├── vendor/                   (legacy) vendored libraries — v0.7+ uses CDN
├── examples/
│   └── README.md             Coming: GeoJSON scenarios
└── docs/
    ├── physics.md            Detailed physics derivation
    └── design-guide.md       UI and code conventions
```

> Note: from v0.7+ the app loads libraries from CDN, so the `vendor/`
> folder and `scripts/fetch-vendor.sh` are no longer required to run the
> site; they are kept for offline/air-gapped reference.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome.

## License

[Apache License 2.0](LICENSE). See also [NOTICE](NOTICE).

## Author

[Stefano Fante](https://github.com/stefanofante) — [ST-LINE S.r.l.](https://stline.it)
(Treviso, Italy), part of the [Open Lab](https://stline.it/open-lab/) activities.

For commercial-grade acoustic mapping with multi-source, real terrain (DTM 5m),
regional DBT data, CNOSSOS-EU/NMPB-Routes-2008, certified validation, and
peritial-grade reports, see **Acustica Pro** (in development).
