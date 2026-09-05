# TODO — memory-mcp

Open work for this repo. Landed changes are described in [`CHANGELOG.md`](CHANGELOG.md); this file
holds only what is still outstanding.

## Open

- [x] **Decide which lockfile is authoritative — `bun.lock` or the root `package-lock.json`.**
  **Resolved 2026-09-05:** deleted the root `package-lock.json`; `bun.lock` is the single source of
  truth for the root package (matches CI `bun install --frozen-lockfile` and Dependabot's npm
  range-only updates). `tools/*` keep their own `package-lock.json` files. Root `/package-lock.json`
  is gitignored so it cannot reappear by accident.

- [x] **Confirm the nightly `schedule` on `typescript.yml` actually fires.** — **VERIFIED
  2026-08-29**: first scheduled run fired at 07:05:39Z, conclusion `success`, event `schedule`.
  The gap is closed by behaviour, not by syntax; the trigger validating was never the same as the
  trigger running. Added 2026-08-28 at 07:00 UTC to cover auto-merged Dependabot commits, which
  GitHub's recursion guard leaves with no `on: push` run. `bc341764` itself stays permanently
  ungauged — it predates the `workflow_dispatch` trigger, so no workflow can be run against it.

## Five-axis assessment — 2026-08-28

Per the workspace standing mandate, recorded so a later reader can see what was looked at and what
was deliberately left.

| Axis | Assessed | Left |
|---|---|---|
| Speed | not touched this pass | — |
| Stability | CI matrix (ubuntu/windows × Node 22/24) green on `main` | — |
| Reliability | **fixed** — `main` could carry an auto-merged commit with no CI run at all; nightly `schedule` + `workflow_dispatch` added | `bc341764` itself stays ungauged; it predates the dispatch trigger and cannot be backfilled |
| Security | **fixed** — `typescript.yml` now pins `permissions: contents: read` rather than inheriting the repo default (`read` today, but a repo-level setting that can widen silently). Advisory audit clean via temp-generated lock | — |
| Maintainability | **fixed** — root `package-lock.json` removed; `bun.lock` is sole root lockfile | tools/* remain npm-locked by design |
