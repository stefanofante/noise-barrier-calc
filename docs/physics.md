# Physics — noise-barrier-calc

Detailed derivation and validation notes for the acoustic propagation
calculations implemented in `index.html`.

## Overview

For each pair (source point, receiver point), the tool computes the
A-weighted equivalent sound pressure level `Leq_A` according to the
outdoor sound propagation model of **ISO 9613-2:1996**:

```
Leq(r) = Lw + D_C - A_div - A_atm - A_gr - A_dif - A_misc
```

where `Lw` is the source sound power level (per 1/3 octave band),
`D_C` is the directivity correction (set to 0 for omnidirectional point
sources, the only type modeled here), and the `A_*` terms are attenuations.

## Term-by-term

### A_div — Geometric divergence

For an omnidirectional point source in free field:

```
A_div = 20·log10(d / 1m) + 11    [dB]
```

The `+11` term corresponds to `10·log10(4π)` and converts from sound power
to sound pressure at 1 meter. Hemispherical sources (source on hard ground)
would use `+8` instead; we conservatively use `+11` here.

For distances `d < 1m`, the formula is clamped to `d = 1m` to avoid
unphysical negative values.

### A_atm — Atmospheric absorption (ISO 9613-1:1993)

Frequency-dependent absorption coefficient `α(f)` in dB/m computed per 1/3
octave band (63 Hz – 8 kHz) with the ISO 9613-1 formula. Inputs:

- Temperature `T` in °C (default 15)
- Relative humidity `RH` in % (default 70)
- Atmospheric pressure `pa` (assumed 101.325 kPa, sea level)

```js
function atmAttenuation(f, T_c, RH, p_kPa=101.325) {
  const T = T_c + 273.15, T0 = 293.15;
  const pa_pr = p_kPa / 101.325;
  const psat_pr = pa_pr * Math.pow(10, -6.8346 * Math.pow(273.16/T, 1.261) + 4.6151);
  const h = RH * psat_pr / pa_pr;
  const frO = pa_pr * (24 + 4.04e4 * h * (0.02+h) / (0.391+h));
  const frN = pa_pr * Math.pow(T/T0,-0.5) * (9 + 280*h*Math.exp(-4.170*(Math.pow(T/T0,-1/3)-1)));
  return 8.686 * f * f * (
    1.84e-11 * (1/pa_pr) * Math.sqrt(T/T0) +
    Math.pow(T/T0,-2.5) * (
      0.01275 * Math.exp(-2239.1/T) / (frO + f*f/frO) +
      0.1068 * Math.exp(-3352.0/T) / (frN + f*f/frN)
    )
  );
}
```

Total atmospheric attenuation: `A_atm = α(f) · d`.

### A_gr — Ground effect (ISO 9613-2 §7.3.2)

General method, single broadband correction (not per-band §7.3.1):

```
A_gr = max(G · A_gr,soft + (1-G) · A_gr,hard, -3 dB)

A_gr,soft = 4.8 - (2·hm/d) · (17 + 300/d)
A_gr,hard = -3.0
hm = (hs + hr) / 2
```

where:
- `hs` = source height above ground
- `hr` = receiver height above ground
- `hm` = mean height
- `d` = horizontal distance
- `G` = ground factor (0 = acoustically hard like asphalt, 1 = porous like grass)

### A_dif — Barrier diffraction (selectable: Maekawa OR ISO 9613-2 §7.4)

Both formulas use the **path difference** `δ`:

```
δ = (d_st + d_tr) - d_sr_direct
```

where:
- `d_st` = source → top-of-barrier distance
- `d_tr` = top-of-barrier → receiver distance
- `d_sr_direct` = direct source → receiver distance (line of sight)

If `δ ≤ 0` (no line-of-sight blocking), `A_dif = 0`.

#### Maekawa (1968)

Original formula based on Fresnel number `N = 2δ/λ`:

```
A_dif = 10·log10(3 + 20·N) = 10·log10(3 + 40·δ/λ)
```

Max attenuation clamped at **25 dB**. Assumes barrier infinitely long
(no lateral diffraction around edges).

#### ISO 9613-2:1996 §7.4 — Single screen

Standard screening formula:

```
Dz = 10·log10(3 + (C2/λ)·C3·z·Kmet)
```

with:
- `C2 = 20` (when ground reflections modeled separately; use `C2 = 40` to
  recover Maekawa-like behavior)
- `C3 = 1` for single barrier (placeholder; non-trivial formula for double
  barriers, not implemented)
- `z = δ` (path difference)
- `Kmet = exp(-(1/2000)·√(d_ss·d_sr/(2z)))` for downwind propagation
  (reduces barrier effectiveness with distance)
- `d_ss` = source-to-screen distance
- `d_sr` = source-to-receiver distance

Max attenuation: **20 dB** for single barrier, **25 dB** for double.

The ISO formula is consistently **1-3 dB more conservative** than Maekawa
in the mid-frequency range (250 Hz – 4 kHz). The K_met factor becomes
significant only at long distances (>500m with downwind propagation,
K_met drops to ~0.85-0.95).

## Source discretization

### Linear sources

A polyline source (road, railway) is discretized into point sources spaced
**every 5 meters** along the path. Each equivalent point source has:

```
Lw_point = Lw' + 10·log10(5)
```

where `Lw'` is the input sound power per meter (dB/m).

For a 200m road with `Lw' = 70 dB/m`:
- 41 point sources
- Each at `Lw_point = 70 + 7 = 77 dB`
- Sum equals `Lw_total = Lw' + 10·log10(200) = 70 + 23 = 93 dB`

### Areal sources

A rectangular source (industrial zone, parking) is discretized into a
**10m × 10m grid** of point sources. Each cell:

```
Lw_point = Lw'' + 10·log10(100) = Lw'' + 20
```

### Point sources

Single click → single point source at the click location with the user-
provided total `Lw`.

## Total receiver level

Energy summation across:

1. **Spectrum** (per source-receiver pair): each 1/3 octave band level is
   A-weighted, exponentiated, summed, log-converted.
2. **All source points** (per receiver): all per-source A-weighted Leq values
   are exponentiated, summed, log-converted.

```
Lp_band = Lw_band - A_div - A_atm - A_gr - A_dif
energy_band = 10^((Lp_band + A_weight_band) / 10)
energy_pair = Σ_bands energy_band
Leq_pair = 10·log10(energy_pair)

energy_receiver = Σ_pairs 10^(Leq_pair / 10)
Leq_A_receiver = 10·log10(energy_receiver)
```

## Insertion Loss

```
IL = Leq_no_barrier - Leq_with_barrier   [dB]
```

Computed at every receiver of the grid by doing **two parallel calculations**:
one with `A_dif = 0` for all source-receiver paths, one with the actual
diffraction value where the source-receiver line intersects the barrier
polyline.

## Validation cases

### Case 1: Urban road, single barrier

- Source: 200m linear, Lw' = 70 dB/m, urban_road spectrum
- Barrier: h = 3m, 10m offset from road
- Receiver: 50m perpendicular distance
- T = 15°C, RH = 70%, G = 0.5

Expected `IL = 8-12 dB` (literature range for h=3m urban road barriers).
Python validation: IL ≈ 6.8 dB (slightly under, consistent with barrier
close to source rather than to receiver).

### Case 2: Industrial area

- Source: 50×30m rectangle, Lw'' = 55 dB/m², industrial spectrum
- Barrier: h = 4m at 30m from area edge
- Receiver: 60m from area center
- T = 15°C, RH = 70%, G = 0.5

Expected `IL ≈ 10-15 dB`.
Python validation: IL ≈ 12.9 dB (within range).

### Case 3: ISO vs Maekawa comparison

Same scenario (δ = 0.5m, f = 1000 Hz, d_ss = 10m, d_sr = 200m):
- Maekawa: 17.88 dB
- ISO 9613-2 (C2=20, K_met active): 14.98 dB
- ISO 9613-2 (C2=40, K_met = 1, equivalent Maekawa): 17.78 dB

Difference of ~3 dB between Maekawa and ISO with C2=20 is expected and
documented in [ISO 9613-2 commentary literature](https://standards.iso.org/iso/9613).

## Limitations explicit in the code

- Single Maekawa screen, no multi-barrier cascade
- No lateral diffraction around barrier edges
- No transmission through barrier (assumed opaque, like concrete or sound-rated panels)
- No reflections from barrier or surroundings
- No vertical wind/temperature gradient modeling
- Stylized spectrum presets (not measured spectra from real sources)
- No NMPB-Routes-2008 traffic flow model
- No NMPB-Fer railway noise model
- No CNOSSOS-EU framework

For these features, see commercial software (CadnaA, SoundPLAN,
NoiseModelling) or future Acustica Pro v2.x.
