# Contributing to noise-barrier-calc

Thanks for considering a contribution. This is a small open-source tool maintained
in spare time, so please be patient with response times.

## Scope

This tool is intentionally **minimal and educational**. It demonstrates
ISO 9613-2 + Maekawa diffraction calculation in browser. It is **not**
intended to become a full alternative to CadnaA / SoundPLAN / NoiseModelling.

Features that are **in scope**:
- Bug fixes (geometry, units, edge cases)
- Better visualization (heatmaps, charts, accessibility)
- Cleaner UI/UX
- Additional spectrum presets backed by reputable sources
- Better documentation, examples, translations

Features that are **out of scope** (won't merge):
- Multi-screen ISO 9613-2 §7.4 with C3 ≠ 1 (planned for sibling commercial product, not this open lab tool)
- NMPB-Routes-2008 or CNOSSOS-EU model implementations
- DBT regional data integration (Italian, French, etc.)
- DTM-based real terrain
- Reflections, lateral diffraction, profiled meteorology

These belong to commercial-grade acoustic software, not to a browser demo.

## How to propose a change

1. **Open an issue first** for non-trivial changes — let's discuss scope and approach
2. For typos, small bugs, or documentation: PR directly is fine
3. Fork → branch named after the issue (e.g. `fix/123-cursor-offset`) → PR against `main`

## Code style

- Vanilla JavaScript, single file `index.html`
- No bundler, no transpilation, no npm dependencies in runtime
- Vendored libraries live in `vendor/` (gitignored, fetched by script)
- Indentation: 2 spaces
- Use `const`/`let`, never `var`
- Avoid global namespace pollution

## Physics changes

Any change to the physics formulas (`atmAttenuation`, `groundAtt`, `diffMaekawa`,
`diffISO9613`, `pathDelta`, `propagatePoint`) must:

1. Cite the standard / paper reference in code comment
2. Include a validation against a known reference case (in PR description)
3. Pass the existing unit-test scenarios documented in `docs/physics.md`

Numerical-only "improvements" to formulas (e.g., tuning constants without
literature reference) will not be merged.

## License

By contributing, you agree your contribution is licensed under Apache-2.0.
