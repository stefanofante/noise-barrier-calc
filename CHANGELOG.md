# Changelog

All notable changes to noise-barrier-calc will be documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned for v0.1

First working version with the following minimum features:

- Leaflet map with OpenStreetMap base tiles
- Point source placement (click on map) with $L_W$, height, and
  spectrum parameters
- Barrier definition as polyline with uniform height
- Single-receiver calculation: sound level at the receiver, with
  and without barrier; insertion loss in dB(A)
- ISO 9613-2 propagation: divergence, atmospheric absorption,
  ground effect, Maekawa diffraction over the barrier
- Cross-section diagram showing source / barrier / receiver in 2D
  vertical plane

### Planned for v0.2

- Receiver grid (square area) with per-receiver insertion loss
- Map visualization of IL color-coded
- Aggregate statistics (mean IL, max IL, % below limit)
- Comparison view: with vs without barrier as toggleable overlays

### Planned for v0.3

- Cross-section diagram refinement
- CSV export of receivers
- GeoJSON export of source + barrier geometry
- PNG export of map

### Planned for v0.4

- Extract shared physics engine into separate package, used by
  both this tool and `acmap`

---

## Pre-development phase

This repository was created in May 2026 to establish proper
open-source licensing and structure before development starts.
The first commit publishes:

- Project scaffolding
- README with planned features and limitations
- CONTRIBUTING guidelines
- LICENSE (Apache-2.0) and NOTICE
- Placeholder `index.html` indicating dev status

Development is sequenced after the integration of the companion
[`acmap`](https://github.com/stefanofante/acmap) tool into the
ST-LINE website. See [stline.it/open-lab](https://stline.it/open-lab)
for the live status of both tools.

---

[Unreleased]: https://github.com/stefanofante/noise-barrier-calc
