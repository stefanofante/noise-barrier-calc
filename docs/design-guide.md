# Barrier design guide

> ⚠️ **Pre-development**: this document is being prepared in parallel
> with the tool. The acoustic principles below are stable; the tool
> features they reference may not be implemented yet.

A practical guide to designing a noise barrier — written for someone
who needs the conclusion in 10 minutes, not 100 pages of theory.

---

## What a barrier does (and doesn't)

A barrier reduces noise by **forcing sound to bend** over its top
edge. The longer the detour the sound must take (relative to its
wavelength), the more it loses.

This means:

- **High frequencies attenuate well**. Short wavelengths see a tall
  barrier as a big obstacle.
- **Low frequencies attenuate poorly**. Bass content of trucks,
  trains, machinery is largely unblockable. The barrier helps with
  the "hiss" not with the "rumble".
- **Receivers close to the barrier benefit most**. The geometric
  detour is larger as a fraction of the direct path.
- **High receivers benefit less**. If you're on the third floor
  looking over the top of the barrier, you're in line of sight —
  it does nothing for you.

---

## Rules of thumb

These give you a quick sanity check before running the calculation:

### Practical insertion loss ranges

For a barrier that fully blocks the line of sight from source to
receiver:

| Insertion loss | Achievability |
|---|---|
| < 5 dB | Barrier too low, or receiver above the top |
| 5–10 dB | Typical for "noticeable improvement", common in modest residential applications |
| 10–15 dB | Good barrier, well-designed, source-receiver geometry favorable |
| 15–20 dB | Excellent, edge cases (very tall barrier, low receiver, soft ground) |
| > 20 dB | Theoretical only — practical limits intervene (transmission through barrier, lateral diffraction around ends, reflections) |

Even a perfectly designed Maekawa screen has a **practical limit
around 15–18 dB** because side diffraction and ground effect kick in.

### Common pitfalls

- **A barrier that's too short laterally** lets sound around its
  ends. Even a 5m tall barrier 30m long is useless if the source is
  100m wide.
- **A barrier with gaps** (doors, drainage openings, transparent
  panels) has effective TL ~3-5 dB even if the rest is concrete.
  Gaps dominate transmission.
- **Earth berms vs walls**. A grass-covered earth berm of the same
  geometric height performs similarly to a wall but with different
  visual/cost tradeoffs.

---

## What this tool models well

- Single screen, vertical, with uniform height
- Single source-receiver geometry
- Maekawa diffraction over the top
- Atmospheric absorption, ground effect, geometric spreading

This is **adequate for**:
- Sanity checks before commissioning detailed studies
- Educational walkthroughs of how barrier height/distance/source
  position affect performance
- Quick comparisons between alternative layouts

## What it doesn't model

- **Ends of the barrier**: real barriers wrap around. Side diffraction
  is significant if the barrier doesn't extend well past source ends.
  Rule of thumb: barrier length should be ≥ 4× the source-receiver
  distance to make end effects negligible.
- **Multiple sources**: a real road has hundreds of vehicles distributed
  along the road. Approximating with a single point source is rough.
- **Reflections** off the barrier (back toward the source side) or off
  nearby buildings.
- **Transmission through the barrier**. Assumed infinite (perfectly
  opaque). For a real concrete wall this is OK at moderate frequencies.
- **Earth berms with grass**. The geometry is similar to a wall, but
  the ground impedance interaction differs. We treat them identically.
- **Practical degradations**: weather, age, gaps, transparent panels.

For real design, see CadnaA / SoundPLAN / NoiseModelling, or hire
a registered acoustic engineer.

---

## Quick design workflow

When this tool is implemented, expect this workflow:

1. **Place the source** at the dominant noise origin (center of
   road segment, factory machinery, etc.)
2. **Decide receiver location** — typically the most affected
   facade, or a grid covering the protected area
3. **Place a barrier** along where it would physically go (property
   line, road shoulder, ridge)
4. **Set initial height** — start with 2-3m for car traffic, 3-4m for
   heavy traffic, 4-6m for railways
5. **Look at the insertion loss** — if < 5 dB, the barrier is too short
   or wrong location. Try increasing height or moving closer to source.
6. **Check the limit compliance** — if the receiver was at 65 dB(A)
   and the barrier gives 8 dB IL, the result is 57 dB(A). Is that
   below your class limit?
7. **Iterate on height** — typically the cost-effectiveness curve
   plateaus around 3-4m for most scenarios. Going to 6m may only buy
   you 2-3 more dB.

---

## When to NOT use a barrier

Sometimes a barrier is the wrong solution:

- **Very low source** (e.g., generator at ground level near a tall
  building) → noise enclosure is more effective than a barrier
- **Source on multiple sides** → barrier on one side only deflects,
  not reduces total
- **Cumulative receivers spread over wide area** → barrier helps
  one zone, transfers issue elsewhere
- **Low-frequency dominant noise** (compressor, ventilation) →
  barriers help < 5 dB on bass content. Use vibration isolation
  and source treatment instead.

---

## References

- **Kotzen B., English C.** (2009), *Environmental Noise Barriers:
  A Guide to Their Acoustic and Visual Design*, 2nd ed., Spon Press
  — the practical reference for barrier engineers
- **Beranek L.L.** (1988), *Noise and Vibration Control* — classic
  textbook, chapter on barriers
- **Watts G., Godfrey N.** (1999), *Effects on roadside noise levels
  of sound absorptive materials in noise barriers*, Applied
  Acoustics 58(4), 385–402
- **Watts G., Morgan P.A., Surgand M.** (2004), *Assessment of the
  diffraction efficiency of novel barrier profiles*, J. Sound Vib.
  274 (3-5), 669-683 — for non-flat-top barrier designs
