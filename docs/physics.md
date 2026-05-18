# Acoustic physics in noise-barrier-calc

> ⚠️ **Pre-development**: this document describes the **planned**
> physics implementation. The actual code is not yet in place.

This document derives the formulas that **will be** implemented
for noise barrier attenuation calculation. The implementation will
follow ISO 9613-2:1996 §7.4 (Maekawa diffraction) and shares its
foundation with [`acmap`](https://github.com/stefanofante/acmap)
(see [acmap's physics doc](https://github.com/stefanofante/acmap/blob/main/docs/physics.md)
for the complete derivation).

This page focuses on what's **specific** to the barrier case.

---

## Barrier as a diffraction screen

A noise barrier is treated as a **vertical screen of uniform height**
along a polyline. Geometrically it's identical to an infinitely thin
wall.

Given:
- Source at $(x_s, y_s)$ in 2D plan with height $h_s$
- Barrier polyline as ordered vertices $(x_1, y_1), (x_2, y_2), ...$
  with single height $h_b$
- Receiver at $(x_r, y_r)$ with height $h_r$

For each receiver, the question is: **does the segment
$\overline{SR}$ in 2D plan view cross any segment of the barrier
polyline?**

If it doesn't: no diffraction, the receiver is in line of sight,
$A_{dif} = 0$.

If it does: find the intersection point $(x_c, y_c)$. This is
where the source-to-receiver path crosses the barrier in plan view.
Now we drop into the vertical plane along the $SR$ segment and
compute the Maekawa diffraction as in `acmap`.

---

## Vertical geometry

Once we have the crossing point, the 2D vertical plane analysis is
identical to acmap's:

- Source $S$ at horizontal distance 0 (along the SR direction),
  vertical height $h_s$
- Barrier top $T$ at horizontal distance $d_{sb}$ (= distance from
  source to crossing point), height $h_b$
- Receiver $R$ at horizontal distance $d_{sb} + d_{br}$ (where
  $d_{br}$ = crossing point to receiver), height $h_r$

The path difference:

$$\delta = \sqrt{d_{sb}^2 + (h_b - h_s)^2} + \sqrt{d_{br}^2 + (h_r - h_b)^2} - \sqrt{(d_{sb}+d_{br})^2 + (h_r - h_s)^2}$$

(Only computed if $h_b$ is above the line-of-sight at the crossing
point. Otherwise $\delta = 0$.)

Then Maekawa per band:

$$A_{dif}(f) = 10 \log_{10}\left(3 + \frac{40 \delta f}{c}\right)$$

with $c = 343$ m/s.

---

## Multiple barrier segments

A polyline barrier is a sequence of straight segments. The $SR$
line might cross **multiple segments** of the same barrier (if the
barrier wraps around or zigzags).

For now, the plan is to handle this conservatively: **take the
crossing point closest to the source-receiver midpoint**, treating
the rest as if not present. This may underestimate attenuation for
complex shapes but is consistent with the single-Maekawa philosophy
of the tool.

Future versions may implement a more rigorous multi-edge
combination, but this would require the §7.4.2 combination rule
and careful geometric reasoning.

---

## Insertion loss

The **insertion loss** is the design metric for barriers:

$$IL = L_{eq,A,\text{no barrier}} - L_{eq,A,\text{with barrier}}$$

It directly answers "**how much quieter** does the barrier make this
receiver?".

The tool will display IL prominently — typically a number in
dB(A) with a color-coded annotation (e.g., 0 dB = ineffective,
10 dB = noticeable, 15 dB = very effective).

---

## Limitations (planned)

- **Single barrier only**. Multiple barriers in cascade are not
  modeled. Real road-noise reduction projects often use double
  barriers (top of cut + earth berm + wall), and these can't be
  computed here.
- **No reflection contributions**. Sound reflecting off the
  barrier's source side is ignored. For tall barriers near urban
  facades, this can be 1-3 dB error.
- **No transmission loss through the barrier**. The barrier is
  assumed acoustically opaque. For real materials:
  - Masonry, dense concrete: opaque (correct)
  - Wood, light panels: 15-25 dB TL (we assume infinite — overstates IL)
  - Hedges, vegetation: 5-10 dB TL (we badly overstate)
- **Uniform barrier height** along the polyline. Real barriers
  often have stepped heights or earth-berm combinations.
- **No barrier-base ground effect**. The acoustic shadow at the
  barrier base interacts with ground in subtle ways not modeled.
- **Single source**. Real roads have hundreds of vehicles distributed
  along the corridor; we approximate with a single equivalent point
  source.

For real barrier design, use **CadnaA, SoundPLAN, NoiseModelling**
or a registered acoustic engineer.

---

## References

Same as [acmap physics](https://github.com/stefanofante/acmap/blob/main/docs/physics.md):

- ISO 9613-1:1993 (atmospheric absorption)
- ISO 9613-2:1996 §7 (propagation + diffraction)
- Maekawa Z. (1968), *Noise reduction by screens*, Applied
  Acoustics 1(3), 157–173

Specific to barriers:

- Kotzen B., English C. (2009), *Environmental Noise Barriers: A
  Guide to Their Acoustic and Visual Design*, 2nd ed., Spon Press
- Beranek L.L. (1988), *Noise and Vibration Control* (chapter on
  barriers)
- Watts G., Godfrey N. (1999), *Effects on roadside noise levels
  of sound absorptive materials in noise barriers*, Applied
  Acoustics 58(4)
