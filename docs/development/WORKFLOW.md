# Memory MCP Development Workflow

> Updated 2026-04-26 for v12.2.0. The previous version of this file referenced a pre-Phase-13 layout and a 15-tool count — both obsolete.

## Repository Setup

- **Repo**: `https://github.com/danielsimonjr/memory-mcp`
- **npm package**: `@danielsimonjr/memory-mcp`
- **Branch**: `main` (direct-to-master flow — no PR-only workflow enforced)
- **Source layout** (v12.2.0): 5 TypeScript files in `src/` after the Phase 13 extraction; all core graph logic lives in [`@danielsimonjr/memoryjs`](https://github.com/danielsimonjr/memoryjs).

## Making Changes

### 1. Install + verify clean state

```bash
bun install
bun run typecheck
SKIP_BENCHMARKS=1 bun run test
```

### 2. Edit code in `src/`

| File | Role |
|---|---|
| `src/index.ts` | Entry point; constructs `ManagerContext` |
| `src/server/MCPServer.ts` | MCP `Server` setup + `ListTools` / `CallTool` handlers |
| `src/server/toolDefinitions.ts` | Array of 160 tool schemas |
| `src/server/toolHandlers.ts` | Per-tool handler registry |
| `src/server/responseCompressor.ts` | Auto-brotli for >256KB responses |

### 3. Test-driven development (TDD strict)

Per the project workflow:

1. **Plan** — design the change (use `feature-dev:code-architect` / `Plan` / `superpowers:writing-plans` for non-trivial scope).
2. **Review the plan** before writing code.
3. **Write failing tests** in `tests/unit/` or `tests/e2e/tools/`.
4. **Confirm RED** via `bunx vitest run <file>`.
5. **Implement** until tests pass GREEN.
6. **Run typecheck** — `bun run typecheck` must be clean (`tsc --noEmit --noUnusedLocals --noUnusedParameters --strict`).
7. **Run full suite** — `SKIP_BENCHMARKS=1 bun run test`. All 665+ tests must pass.

### 4. Code review (mandatory, even for solo work)

- Dispatch `pr-review-toolkit:code-reviewer` on the unstaged diff.
- Address every reviewer finding above confidence 70.

### 5. Code simplifier

- Dispatch `code-simplifier:code-simplifier` on the diff.
- Apply suggestions that preserve behavior without reducing clarity.

### 6. Update tracking

- For phase work: flip checkboxes in any active phase plan in `docs/planning/`.
- For doc-only updates: no tracking required.

### 7. Update CHANGELOG

Under `## [Unreleased]` (or the active version section), add an entry under one of `### Added` / `### Changed` / `### Fixed` / `### Removed`. Follow Keep a Changelog format.

### 8. Atomic commit

```bash
git add <specific files>
git commit -m "$(cat <<'EOF'
type(scope): subject line under 70 chars

Body paragraph explaining the why and what. Reference any related
plan / issue / smoke-test finding.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Type prefixes: `fix`, `feat`, `refactor`, `docs`, `test`, `chore`, `release`.

> **Cardinal rule:** one task = one commit. Don't bundle unrelated changes. If a hook fails, fix the root cause and create a NEW commit (do not amend).

### 9. Push direct to main

```bash
git push origin main
```

No PR flow required for solo work; PRs are welcome for external contributions per [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Release Workflow

1. Verify `bun run typecheck && SKIP_BENCHMARKS=1 bun run test` clean.
2. Decide bump (patch / minor / major) per semver.
3. Update `package.json` `version` and `description` (if surface meaningfully changed).
4. Rename `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD` in `CHANGELOG.md`.
5. Atomic `release: vX.Y.Z` commit covering only `package.json` + `CHANGELOG.md` (and any auto-doc regenerations).
6. Annotated tag: `git tag -a vX.Y.Z -m "release: vX.Y.Z — <summary>"`.
7. Push: `git push origin main && git push origin --tags`.
8. (Optional) `npm publish --access public`.

> **Memoryjs-style `/RELEASE` slash command** is available in the memoryjs repo. memory-mcp has no equivalent slash command yet — release steps run manually per the above checklist.

## Quick Commands

```bash
bun run typecheck                      # Strict TS check
SKIP_BENCHMARKS=1 bun run test         # Default test run
bunx vitest run tests/unit/server/     # Single dir
bunx vitest run -t "should X"          # Pattern match
bun run build                          # Compile to dist/
bun run clean                          # Remove dist/
node dist/index.js                     # Run server locally (Node is the shipped runtime)
git log --oneline -10                  # Recent commits
```

## Cross-references

- [`CLAUDE.md`](../../CLAUDE.md) — architecture overview, tool category table, environment variables
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — external contribution guidelines
- [`CHANGELOG.md`](../../CHANGELOG.md) — version history (Keep a Changelog format)
- [`docs/architecture/API.md`](../architecture/API.md) — full per-tool API reference
- [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) — system architecture details
