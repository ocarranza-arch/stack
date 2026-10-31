# Release Checklist

Most of this is now automated. Tests run on every push and every pull request
(GitHub → Actions tab). A red ✗ means do not merge.

## 1. Pre-flight
- [ ] Data backed up: Sync → Push on the phone, or Tools → Export JSON.
- [ ] Work happens on a branch, never straight on `main` (`main` is what GitHub Pages serves).

## 2. Make the change
- [ ] `npm run bump` — sets the same version in `app.js` (BUILD) and `sw.js` (cache name).
- [ ] Every bug fix gets a test in `tests/logic.test.js` that fails before the fix and passes after.

## 3. Test (automatic in CI; run locally if you can)
- [ ] `npm test` — logic: number parsing, dose math (units = mL × 100), inventory log/undo,
      scheduling, PRN placement, paused compounds, version sync, Calendar in nav slot 2.
- [ ] `npm run test:smoke` — real browser at iPhone size: every tab, log/undo, dose screen,
      Calendar day check-off, Build string, service worker.
- [ ] Manual only (needs your token): Sync Push then Pull; Export then Import.

## 4. Deploy
- [ ] Open a pull request; wait for the green ✓ on it.
- [ ] Merge. GitHub Pages redeploys in about a minute.
- [ ] On the phone: close the app fully and reopen it. Tools should show the new Build.
      (The service worker is network-first, so Force refresh should no longer be needed.)

## 5. Post-deploy
- [ ] Log one throwaway dose, confirm inventory drops, undo it, confirm it returns.
- [ ] Tag the release (`git tag vN && git push --tags`).

## Rollback
- Revert the merge commit on GitHub (the PR page has a Revert button), merge the revert PR.
- If data is corrupted: Sync → Pull an older gist revision, or Tools → Import the last export.
