# vendor/

This directory is **gitignored** for the actual library files. Run the
script to populate it locally before serving the app:

```bash
bash scripts/fetch-vendor.sh
```

## What gets downloaded

| Library | Version | Files | License |
|---------|---------|-------|---------|
| [Leaflet](https://leafletjs.com) | 1.9.4 | `leaflet/leaflet.css`, `leaflet/leaflet.js`, `leaflet/images/*` | BSD 2-Clause |
| [d3-contour](https://github.com/d3/d3-contour) | 4.0.2 | `d3-contour/d3-contour.min.js` | ISC |

## Why vendored, not CDN?

- **Reproducibility**: same code always loads, no surprise upstream changes
- **Privacy**: no requests to third-party CDNs that could fingerprint users
- **Offline**: works without internet after initial fetch (except for OSM tiles)
- **License compliance**: clear local copy of LICENSE for each library

## Updating versions

To update to a newer library version, edit `scripts/fetch-vendor.sh`,
re-run it, test, and commit `scripts/fetch-vendor.sh` (not the vendored files).

Track upstream releases:
- Leaflet: https://github.com/Leaflet/Leaflet/releases
- d3-contour: https://github.com/d3/d3-contour/releases

## License files

Local copies of each library's license can be retrieved from the upstream
repositories. Apache-2.0 of this project does **not** override upstream
licenses for vendored code — each library remains under its own license.
