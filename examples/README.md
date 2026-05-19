# examples/

Example scenarios for noise-barrier-calc.

## Planned (not yet populated)

### `urban-road-barrier.geojson`
Linear source representing an urban road (Lw' = 70 dB/m, urban_road spectrum)
with a 3-meter acoustic barrier parallel to it at 5-meter offset.
Receiver grid 300m × 300m at hr = 4m. Treviso location.

### `industrial-area-barrier.geojson`
Areal source representing a small industrial zone (Lw'' = 55 dB/m², industrial spectrum)
with an L-shaped barrier h = 4m on two sides. Tests cross-corner diffraction.

### `point-source-machinery.geojson`
Single point source (Lw = 105 dB, low-frequency dominant) representing an
industrial fan or compressor, with a small barrier shielding a residential
window 30m away.

## How to use (future)

```bash
# Once examples are available, load via URL parameter:
# https://stline.it/tools/calcolo-barriere/?scenario=urban-road-barrier
```

For now, replicate the scenarios manually following parameter values in the
filenames above.

## Contributing examples

Real-world scenarios from your acoustic engineering work are welcome.
Anonymize coordinates if needed, document the assumptions, and submit a PR.
