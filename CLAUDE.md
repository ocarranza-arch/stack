# Stack — notes for any AI working in this repo

Stack is a personal PWA (dose, med, body, site tracker) served by GitHub Pages straight from `main`.
No build step: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.json` are what ship.
All user data lives in the phone's localStorage (`stack_v1`), backed up to a private gist.

## Rules
1. **Never edit `main` directly.** Branch, commit, push, open a PR. Merging the PR is the deploy.
2. **Tests must pass:** `npm test` (logic) and `npm run test:smoke` (browser). CI runs both on every push/PR.
3. **Every bug fix gets a regression test** in `tests/logic.test.js` that fails on the old code.
4. **Version:** run `npm run bump` once per release. Never hand-edit BUILD or the sw.js cache name.
5. **Make small, targeted edits.** Do not regenerate or re-paste whole files. That is how the v17 parser
   bug got in (`[^0-9.]` became `[-9.]`).
6. **Dose math invariant:** syringe units = mL × 100 for mg, mcg and IU. Inputs are pre-filled with
   exact stored values, never rounded ones.
7. `norm()` runs on every app open and must be idempotent: loading saved data must not change it.
8. Keep the sw.js fetch strategy network-first. Cache-first served stale app.js after releases.

## Layout
- `app.js` — state (`S`), `norm()` migration, dose math (`conc`, `unitsFor`, `mlFor`), views, `bind()`.
- `tests/harness.js` loads app.js in a Node sandbox; `tests/smoke.js` drives Chromium.
- `RELEASE.md` — release checklist.
