# noise-barrier-calc

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Status: v0.6](https://img.shields.io/badge/status-v0.6_working-green.svg)](#status)
[![Standards: ISO 9613-2](https://img.shields.io/badge/standards-ISO_9613--2_%C2%A77.4-orange.svg)](#physics)

> **Browser-based acoustic barrier insertion-loss calculator.**
> Place a source (point, line or area), draw a barrier on the map, and the tool
> computes how much noise the barrier blocks at every point of a receiver grid.

Demonstration tool for **environmental acoustics**, runs entirely in the browser.
Companion to [acmap](https://github.com/stefanofante/acmap) (acoustic mapping), sharing the same physics engine.

---

## What it does

- **Three source types** selectable on the map:
  - **Linear** (road, railway): polyline with `Lw'` in dB per meter
  - **Areal** (industrial zone, parking lot): rectangle with `Lw''` in dB per m²
  - **Point** (single machinery, fan, exhaust): single click with total `Lw` in dB
- **Acoustic barrier** as polyline with adjustable height
- **Receiver grid** configurable extent and step
- **Two diffraction methods** selectable:
  - **ISO 9613-2:1996 §7.4** (default, conservative, with K<sub>met</sub> meteorological correction)
  - **Maekawa (1968)** (original formula, max 25 dB)
- **Visualization**:
  - Filled contour bands at 5 dB intervals (default)
  - Isolines at 5 dB
  - Individual receiver points (optional)
  - Continuous color legend with all 5 dB tick marks
  - Metric grid overlay (5–25m, zoom-adaptive)
- **Vertical cross-section**: click any receiver to see source→barrier→receiver
  path geometry with diffraction details
- **CSV export** of receiver grid with coordinates and dB values
- **Spinner with progress %** during background calculation
- **Responsive UI** — calculation chunked, map stays interactive

## What it does NOT do

This is a **demonstration tool**. It does not replace certified software
(CadnaA, SoundPLAN, NoiseModelling) for legal/peritial barrier design.
Specifically not modeled:

- Multi-barrier in cascade (C<sub>3</sub> fixed to 1 in ISO 9613-2)
- Lateral diffraction around barrier edges
- Sound transmission through the barrier (assumed opaque)
- Reflections from source side or between barriers
- NMPB-Routes-2008 for road sources (traffic flow modeling)
- NMPB-Fer for railway sources
- CNOSSOS-EU complete framework
- Profiled meteorology (vertical wind/temperature gradients)
- Real spectra from measurements (provides stylized presets only)

For certified barrier design, consult a registered acoustic engineer or use
omologated software.

---

## Status

**v0.6 working** — functional prototype, browser-based.

| Version | Status | Highlights |
|---------|--------|------------|
| v0.1    | done   | Point/line/area sources, single Maekawa diffraction, receiver grid + insertion loss |
| v0.2    | done   | Source visibility fixes, point source mode, reset button, cursor readout |
| v0.3    | done   | Vertical cross-section diagram, CSV export of receiver grid |
| v0.4    | done   | ISO 9613-2 §7.4 complete formula (C2, C3 placeholder, K<sub>met</sub>) + method toggle |
| v0.5    | done   | Metric grid overlay (5m visual reference), responsive chunked calc, progress spinner |
| v0.6    | done   | Filled contour bands at 5 dB, continuous color legend with tick marks |
| v0.7+   | planned | Multi-barrier cascade, lateral diffraction, source spectra from CSV |

## How to use

### Online (when integrated)

Will be available at `stline.it/tools/calcolo-barriere/` (see [stline.it/tools/](https://stline.it/tools/)).

### Local

1. Clone the repo:
   ```bash
   git clone https://github.com/stefanofante/noise-barrier-calc.git
   cd noise-barrier-calc
   ```

2. Fetch vendored libraries (Leaflet, d3-contour):
   ```bash
   bash scripts/fetch-vendor.sh
   ```

3. Serve over HTTP (NOT `file://` — Leaflet tiles won't load):
   ```bash
   # Linux/macOS
   python3 -m http.server 8000

   # Windows PowerShell
   cd $env:USERPROFILE\<repo-path>
   python -m http.server 8000
   ```

4. Open `http://localhost:8000/` in your browser.

### Quick workflow

1. Select source type (linear / areal / point)
2. Choose spectrum preset and set `Lw'`, `Lw''`, or `Lw`
3. Click "Draw on map" and place the source
4. Set barrier height + base elevation
5. Click "Draw on map" for the barrier and place it
6. Select diffraction method (ISO 9613-2 default)
7. Adjust receiver grid, atmosphere, DPCM class as needed
8. Click "Calculate" — watch the progress spinner
9. Inspect the heatmap with filled bands and isolines
10. Click "Vertical cross-section" → click any receiver for geometry
11. Click "Export CSV" to download the receiver grid

---

## Physics

The tool implements the standard outdoor sound propagation model.

For each source point → receiver pair:

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
Max attenuation: 20 dB (single barrier), 25 dB (double, when C3 implemented).

The two formulas converge when ISO 9613-2 uses C2=40, K<sub>met</sub>=1, but the
standard formula (C2=20) is consistently 1-3 dB more conservative than Maekawa
in the mid-frequency range, and includes meteorological correction reducing
effectiveness over long distances (>500m downwind).

### Total receiver level

All per-band sound pressures are A-weighted and summed energetically across
the spectrum. Then contributions from all source points are summed energetically
at the receiver:

```
Leq_A = 10·log10(Σ_points Σ_bands 10^((Lp_band + A_weight)/10))
```

**Insertion Loss** = Leq_without_barrier − Leq_with_barrier.

---

## References

- **ISO 9613-1:1993** — Acoustics — Attenuation of sound during propagation outdoors. Part 1: Calculation of the absorption of sound by the atmosphere
- **ISO 9613-2:1996** — Acoustics — Attenuation of sound during propagation outdoors. Part 2: General method of calculation
- Maekawa, Z. (1968). *Noise reduction by screens*. Applied Acoustics, 1(3), 157–173
- **DPCM 14/11/1997** — Determinazione dei valori limite delle sorgenti sonore (Italian acoustic zoning)

---

## Tech stack

- **Vanilla JavaScript** (no bundler, no build pipeline)
- **Single-file HTML** (`index.html`) — ~2400 lines, ~90KB
- **Vendored libraries** (`vendor/`, fetched by script):
  - [Leaflet 1.9.4](https://leafletjs.com) — BSD 2-Clause
  - [d3-contour 4.0.2](https://github.com/d3/d3-contour) — ISC
- **OpenStreetMap tiles** (ODbL)
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
├── index.html                Single-file app (v0.6)
├── scripts/
│   └── fetch-vendor.sh       Downloads vendored libraries to vendor/
├── vendor/
│   └── README.md             Explains what's vendored
├── examples/
│   └── README.md             Coming: GeoJSON scenarios
└── docs/
    ├── physics.md            Detailed physics derivation
    └── design-guide.md       UI and code conventions
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome.

## License

[Apache License 2.0](LICENSE).

## Maintained by

[Stefano Fante](https://github.com/stefanofante) — part of the [Open Lab](https://stline.it/open-lab/) activities of [ST-LINE S.r.l.](https://stline.it) (Treviso, Italy).

For commercial-grade acoustic mapping with multi-source, real terrain (DTM 5m),
regional DBT data, CNOSSOS-EU/NMPB-Routes-2008, certified validation, and
peritial-grade reports, see **Acustica Pro v2.x** (in development).
