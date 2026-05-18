# Vendored libraries

This folder will host third-party libraries used by `index.html`
once the tool is implemented:

```
vendor/
├── leaflet/
│   ├── leaflet.css      # Leaflet 1.9.4
│   ├── leaflet.js
│   └── images/
├── papaparse.min.js     # PapaParse 5.4.1
└── d3-contour.min.js    # d3-contour 4.0.2
```

Note: this tool does **not** use `leaflet.heat` (heatmaps are not
relevant for a barrier-design workflow). Otherwise the dependency
set matches [`acmap`](https://github.com/stefanofante/acmap).

## Why vendored?

Same rationale as `acmap`: offline use, reproducibility, privacy.

## How to fetch them

```bash
./scripts/fetch-vendor.sh
```

## Licenses

All vendored libraries use permissive licenses (BSD-2-Clause, MIT,
ISC). See [`NOTICE`](../NOTICE) for attribution details.
