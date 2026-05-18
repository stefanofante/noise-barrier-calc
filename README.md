# noise-barrier-calc

> Browser-based noise-barrier attenuation calculator — design a
> sound barrier on a map, compute its insertion loss (the dB
> reduction it produces) with ISO 9613-2 Maekawa diffraction over
> the barrier crest.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/status-planned-orange)]()
[![ISO 9613-2](https://img.shields.io/badge/Method-ISO%209613--2-informational)](https://www.iso.org/standard/20649.html)

A companion tool to [`acmap`](https://github.com/stefanofante/acmap):
same single-file philosophy, same physics engine, but focused on a
specific use case — **does my barrier really cut the noise I want it
to cut?**

> ⚠️ **Status: planned, not yet implemented.** This repository hosts
> the project structure, license, documentation, and roadmap. The
> tool itself (`index.html`) is a placeholder. Active development
> will start as Sprint B.4 of ST-LINE's Open Lab roadmap, after the
> companion `acmap` tool is integrated into the ST-LINE website
> ([stline.it/open-lab](https://stline.it/open-lab)).

---

## Why a separate tool

Couldn't this be a "barrier mode" inside `acmap`? Yes, technically.
But practically:

- **The use case is specific and frequent.** A "Tecnico Competente
  in Acustica" (TCA) facing a barrier project doesn't need full
  mapping — they need quick: "if I put a 3m barrier here, do I get
  below the limit?"
- **The UX is cleaner standalone.** Source fixed + barrier polyline
  + receiver point or grid + insertion loss number. No mode
  switching, no dataset upload.
- **The physics engine is shared anyway.** Building diffraction in
  `acmap` and barrier diffraction here use the same ISO 9613-2 §7.4
  Maekawa formula. The geometry differs (polygon vs polyline), the
  acoustic math doesn't.

When the physics module is extracted from `acmap` into a separate
shared package (planned), both tools will depend on it.

---

## What it will do

### Planned workflow

1. **Open the tool**, see a Leaflet map (default Treviso)
2. **Place a source**: click on the map, set $L_W$, height, spectrum
3. **Draw a barrier**: click multiple points to define a polyline,
   set its uniform height
4. **Define receiver(s)**: either a single point (click) or a grid
5. **See immediately**:
   - Sound level at each receiver **with the barrier**
   - Sound level at each receiver **without the barrier** (greyed)
   - **Insertion loss** = difference (the design metric)
6. **Adjust** any parameter — recompute is automatic
7. **Export** results: CSV of receivers, GeoJSON of geometry,
   PNG of map

### Planned outputs

- **Per-receiver insertion loss**: how many dB the barrier removes
- **Aggregated stats**: mean IL, max IL, % receivers below a chosen
  legal limit
- **Visualization**:
  - Map with receivers colored by IL or by absolute level
  - Cross-section diagram (source / barrier / receivers in 2D
    vertical plane)
  - Effectiveness assessment ("the barrier works well here, fails
    there")

### Planned source spectra

Same five as `acmap`: flat, road traffic, rail, industrial, low-freq.

### Planned limitations (declared upfront)

This will be a **demonstrative tool**, NOT a barrier-design
software. Limitations will include:

- Single-source, single-barrier setups only
- Uniform barrier height along the polyline (no stepped barriers)
- Maekawa single-screen diffraction only (no multi-edge, no
  earth-berm sound paths)
- No reflection contributions from the barrier's source side
- No barrier transmission loss (we assume barrier is acoustically
  opaque — typical for masonry; not true for hedges or thin
  partitions)
- No frequency-dependent absorption of the barrier surface
- No ground effect interaction with the barrier base (real barriers
  have a small contribution from this)

For real barrier design, see software like CadnaA, SoundPLAN, or
NoiseModelling.

---

## Physics (preview)

Same as [`acmap`'s physics doc](https://github.com/stefanofante/acmap/blob/main/docs/physics.md),
except:

- The diffracting object is a **line segment with height** (polyline
  with constant height), not a polygon
- The geometric test is **segment-segment intersection** (S→R line
  crossing the barrier polyline) instead of segment-polygon
- The path-delta calculation $\delta$ is the same: $(d_{ST} + d_{TR})
  - d_{SR}$, where $T$ is the top of the barrier at the intersection
  point

The Maekawa formula:

$$A_{dif}(f) = 10 \log_{10}(3 + 20 N)$$

with $N = 2\delta/\lambda$ — identical to `acmap`.

---

## Architecture (planned)

```
noise-barrier-calc/
├── index.html              # The tool, single file (TBD)
├── vendor/                 # Same vendored libraries as acmap
│   ├── leaflet/
│   ├── papaparse.min.js
│   └── d3-contour.min.js
├── examples/
│   └── highway-scenario.json
├── docs/
│   ├── physics.md
│   ├── design-guide.md     # acoustic engineer perspective
│   └── screenshots/
├── scripts/
│   └── fetch-vendor.sh     # Same as acmap
├── LICENSE                 # Apache-2.0
├── NOTICE                  # Third-party attributions
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```

---

## Roadmap

| Version | Status | Features |
|---|---|---|
| v0.1 | **planned** | First working version: source + barrier + single receiver |
| v0.2 | planned | Receiver grid + insertion loss visualization |
| v0.3 | planned | Cross-section diagram + result export |
| v0.4 | planned | Shared physics module with `acmap` |

Expected ETA: tied to the ST-LINE Open Lab roadmap. The companion
`acmap` integration comes first; `noise-barrier-calc` follows.

---

## Why publish the empty repo now?

To establish the project under proper open-source licensing from
the start, and to allow the companion `acmap` to link to it as a
"sister tool" before it's actually built. Subscribers and watchers
can follow development from day zero.

If you want to **be notified when the first working version ships**,
click the "Watch" button on this repo.

---

## Author and affiliation

Maintained by [Stefano Fante](https://github.com/stefanofante),
founder of [ST-LINE S.r.l.](https://stline.it) (Treviso, Italy).
ST-LINE is an electronic-design firm with a complementary practice
in environmental acoustics; this tool is part of its
[Open Lab](https://stline.it/open-lab) initiative.

This tool, like its companion `acmap`, is part of the development
road toward [Acustica Pro](https://stline.it/prodotti/acustica-pro),
ST-LINE's upcoming professional software for environmental
acoustics analysis.

---

## See also

- [`acmap`](https://github.com/stefanofante/acmap) — companion
  mapping tool, with the same physics engine
- [stline.it/open-lab](https://stline.it/open-lab) — ST-LINE Open
  Lab full index

---

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE)
for details, [NOTICE](NOTICE) for third-party attributions.
