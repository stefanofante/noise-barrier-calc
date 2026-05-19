#!/usr/bin/env bash
#
# fetch-vendor.sh
# Downloads vendored libraries used by index.html into the vendor/ directory.
#
# Run from the repository root:
#   bash scripts/fetch-vendor.sh
#
# Required tool: curl (or wget — adjust commands)
# Network access required.
#
# License of vendored libraries:
#   - Leaflet 1.9.4 — BSD 2-Clause
#   - d3-contour 4.0.2 — ISC
#
# See vendor/README.md for license details and update procedure.

set -e

VENDOR_DIR="$(dirname "$0")/../vendor"
mkdir -p "$VENDOR_DIR/leaflet" "$VENDOR_DIR/d3-contour"

echo "Downloading Leaflet 1.9.4..."
curl -fSL -o "$VENDOR_DIR/leaflet/leaflet.css" \
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
curl -fSL -o "$VENDOR_DIR/leaflet/leaflet.js" \
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"

# Leaflet shipping images for markers / controls
mkdir -p "$VENDOR_DIR/leaflet/images"
for img in marker-icon.png marker-icon-2x.png marker-shadow.png \
           layers.png layers-2x.png; do
  curl -fSL -o "$VENDOR_DIR/leaflet/images/$img" \
    "https://unpkg.com/leaflet@1.9.4/dist/images/$img"
done

echo "Downloading d3-contour 4.0.2..."
curl -fSL -o "$VENDOR_DIR/d3-contour/d3-contour.min.js" \
  "https://unpkg.com/d3-contour@4.0.2/dist/d3-contour.min.js"

echo
echo "Vendor libraries fetched into $VENDOR_DIR"
echo "Now serve the repo over HTTP and open index.html:"
echo "  python3 -m http.server 8000"
echo "  open http://localhost:8000/"
