# Design Guide — noise-barrier-calc

UI design conventions and code organization principles. Documented here so
contributors stay aligned with the existing style.

## Visual identity

The tool is part of ST-LINE's Open Lab. It inherits the design system tokens
but in a self-contained CSS within `index.html` (no external stylesheet).

### Color tokens (CSS variables)

```css
--bg: #ECECEA           /* page background (light) */
--bg-alt: #E2E2DF       /* sidebar, alt background */
--surface: #ffffff      /* card / panel */
--line: #C8C8C4         /* borders */
--ink: #15171a          /* primary text */
--ink-2: #44474b        /* secondary text */
--area-ac: #B07A2A      /* acoustics accent (warm) */
--accent: #91A82E       /* primary accent (lime-olive) */
```

Dark theme is the inverse: dark surfaces, light text, accents brightened.

### Typography

- Inter Tight (sans) for body text
- JetBrains Mono / Fira Mono for technical labels, statistics, numeric input
- All Italian-language UI, with documentation also in English (in `docs/`)

### Section numbering

The sidebar is numbered `1 · Tipo sorgente`, `2 · Disegna sorgente`, etc.,
to give a clear step-by-step workflow. This is intentional UX, not just
visual chrome.

## Layout

- **2-column grid**: left sidebar 340px fixed, right map area flex
- **Hero** at top, **disclaimer + CTA + docs** at bottom
- **Cross-section panel** appears between map and disclaimer when activated
- **Mobile**: stacks vertically below 900px

## Color encoding for results

### Leq (dBA)
Continuous HSL gradient **green → yellow → red**:
- 35 dBA → green (`hsl(120, 70%, 50%)`)
- 57 dBA → yellow (mid)
- 80 dBA → red (`hsl(0, 70%, 50%)`)

Verdè = silenzioso (good), rosso = rumoroso (bad).

### Insertion Loss (dB)
Continuous HSL gradient **red → yellow → green**:
- 0 dB → red (barrier useless)
- 10 dB → yellow
- 20 dB → green (barrier effective)

Verde = molto attenuante (good), rosso = poca attenuazione (bad).

Same green-yellow-red intuition, opposite encoding. The user develops
muscle memory: **green is always good, red is always problem**.

### Contour bands

Each 5 dB threshold creates a filled polygon (via `d3-contour`). Color of
each band = `colorForLeq(midpoint)` or `colorForIL(midpoint)`. Opacity 0.55
to not fully obscure OSM tiles below.

## Source visualization

- **Linear**: red polyline (`#d8302a`, weight 5)
- **Areal**: red rectangle with semi-transparent fill (opacity 0.15)
- **Point**: red circle with glow (outer halo radius 14, inner solid radius 7)
- All have dark outline for visibility on any map tile

## Barrier visualization

Double polyline rendering for visibility:
- Black outer outline (weight 9)
- Bright orange (`#ff8c1a`) inner line (weight 6)
- Vertices marked with circles

## Metric grid overlay

When activated:
- Lines every 5m (zoom ≥17), 10m (zoom 16), or 25m (zoom <16)
- Major lines (every 4 multiples) labeled with `5m`, `10m`, ...
- Color: bright blue (light theme) or bright orange (dark theme)
- Labels have background box for readability

## Cross-section SVG

- 800×320 viewport, scaled to 100% width
- Source: red circle left
- Receiver: blue circle right
- Barrier: black/orange rectangle when intersecting
- Direct ray: dashed gray
- Diffracted ray: solid orange (S → barrier top → R)
- Right-side info panel with all numeric values

## Code organization within `index.html`

Single file, ordered as:

1. **Document head**: meta, vendored library tags, full CSS
2. **Body markup**: header → hero → tool layout (sidebar + map) → cross-section → disclaimer → CTA → docs
3. **`<script>`**: monolithic, organized in commented sections:
   - PHYSICS (atmospheric, ground, diffraction methods)
   - GEOMETRY (segment intersection, polyline distance, lat/lng conversion)
   - THEME toggle
   - MAP (Leaflet init, metric grid overlay)
   - STATE (module-level variables)
   - MODE TOGGLE (source type radio)
   - DRAWING (click handlers, polyline/rectangle/point)
   - RENDER (source, barrier, results)
   - CALCULATION (`computePropagation` async chunked)
   - SPINNER helpers
   - LEGEND (continuous gradient generator)
   - CROSS-SECTION (SVG renderer)
   - EXPORT CSV
   - VIEW MODE LISTENER (legend sync)
   - METHOD RADIO HIGHLIGHT
   - INIT

Within sections, public functions go at the top, helpers at the bottom.

## Naming conventions

- **CSS classes**: kebab-case (`tool-layout`, `crosssection-panel`)
- **JavaScript identifiers**: camelCase (`computePropagation`, `srcMode`)
- **Constants** (true module-level constants): UPPER_SNAKE_CASE
  (`FREQ_BANDS`, `SPEED_OF_SOUND`)
- **Frequency bands**: 8 third-octave centers (63, 125, 250, 500, 1000,
  2000, 4000, 8000 Hz). A-weighting constants per band hard-coded.

## Internationalization

The UI is currently **Italian only**. When integrated into `stline.it/tools/`,
an `?lang=en` parameter will switch all strings. The string table is not yet
extracted from the HTML — `i18n` refactor is planned for a later sprint.

## Accessibility (planned)

- All buttons have visible focus rings (via `:focus`)
- Color is not the sole carrier of information (numbers displayed in tooltip)
- TBD: keyboard navigation for drawing mode, ARIA labels for spinner/cross-section

## Performance notes

- Calculation chunked every 4 grid rows (async yield) to keep UI responsive
- Grid limited to ~3000 receivers in normal use (extent 300m / step 15m)
- Metric grid auto-disables above 400 lines (zoom-out to avoid freeze)
- Vendor libraries loaded once, no runtime CDN requests

## What NOT to add

(Mirrors `CONTRIBUTING.md` "out of scope"):

- Heavy 3D visualization (Three.js, WebGL) — would balloon the bundle
- Server-side rendering — would break the "no backend" promise
- Authentication, user accounts, cloud storage — explicitly out
- Real-time multi-user editing — out
- Anything that adds a build step (Webpack, Rollup, npm scripts beyond fetch-vendor.sh) — out
