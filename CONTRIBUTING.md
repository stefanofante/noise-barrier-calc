# Contributing to noise-barrier-calc

Thank you for considering a contribution. This project is small,
single-author, hobby-paced. Please read this short guide before
opening issues or pull requests.

---

## Ground rules

1. **Be respectful** in issues and discussions.
2. **Search first**: check open and closed issues before reporting.
3. **One topic per issue / PR**. Don't pile multiple unrelated
   changes together.
4. **Discuss before large changes**. For anything more than a
   bugfix, open an issue first so we can align before you invest
   coding time.

---

## Licensing of contributions

By submitting a Pull Request, an issue patch, or any other
intentional code/documentation contribution, you agree that
your work is licensed under the **Apache License 2.0**, the same
license as the rest of the project. No separate CLA is required.

You retain copyright on your contribution but grant the project
(and downstream users) the rights described in the Apache-2.0
license, including the patent grant.

---

## Reporting bugs

Open a GitHub issue with:

1. **What you were doing** (mode, source position, parameters)
2. **What you expected** to happen
3. **What actually happened** (screenshot helps)
4. **Browser and OS** (e.g., "Firefox 124 on Windows 11")
5. **Console errors** if any (F12 → Console tab)
6. **Reproducible URL or dataset** if possible

For Overpass-related issues, please confirm the URL works in
isolation (try [overpass-turbo.eu](https://overpass-turbo.eu/) with
a similar query) before blaming noise-barrier-calc.

---

## Proposing features

Before submitting feature code, open an issue describing:

- **The use case**: who would benefit, in what concrete situation
- **The acoustic / technical motivation**: why it improves
  scientific accuracy or UX
- **The scope**: what changes, what doesn't, what's out of scope
- **The honesty**: which new limitations the feature introduces

The maintainer reserves the right to decline features that:

- Are out of scope for a demonstrative tool
- Would significantly increase complexity without commensurate value
- Cannot be honestly disclosed in the README's `Limitations` section

---

## Code style

- **Vanilla JavaScript**, no transpilation, no bundler. Keep it that
  way unless there's a compelling reason.
- **Single file**: physics, UI, and rendering live in `index.html`.
  Refactor to multiple files is welcome but discuss first.
- **No frameworks**: no React, Vue, etc. The DOM API is sufficient.
- **No telemetry**: never add analytics, tracking, or any outbound
  request the user didn't initiate.
- **CSS variables** for theming; light + dark mode must both work.
- **Comments**: comment the **why**, not the **what**.

---

## Physics changes

Any change to the acoustic computation deserves extra care:

1. **Reference the standard**: cite the exact ISO 9613-2 clause or
   journal paper for the formula
2. **Add a test case**: if you introduce or modify a formula, update
   the in-tool validation table with at least one new scenario and
   the expected range from literature
3. **Update README limitations**: if your change removes a limitation
   or introduces one, edit the limitations section accordingly

---

## Pull request checklist

Before submitting:

- [ ] Tested in both light and dark mode
- [ ] Tested on at least Chrome/Firefox/Safari
- [ ] No new console errors or warnings introduced
- [ ] If physics changed: validation table updated
- [ ] If UI changed: screenshot included in PR description
- [ ] README or docs updated if behavior changed
- [ ] Commit messages descriptive (no "fix" or "update")

---

## What this project is NOT

To save us both time, contributions in these directions will be
declined:

- **A CAD acoustic mapping software**. Use CadnaA or SoundPLAN.
- **A CNOSSOS-EU full implementation**. Use NoiseModelling.
- **A mobile app**. The browser is the target.
- **A backend service**. The whole point is no backend.
- **Production-grade certified output**. Out of scope.

If your contribution would push the project in one of these
directions, consider forking and renaming — keep this project
deliberately small.

---

## Recognition

All contributors are credited in commit history. Major contributors
will be added to a `CONTRIBUTORS.md` file when it makes sense to
create one.
