# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install           # Install all dependencies
npm run build         # Build TypeScript → JavaScript (tsc)
npm test              # Run tests with coverage (vitest)
npm run typecheck     # Strict type checking (includes --noUnusedLocals --noUnusedParameters)
npm run watch         # Watch mode for development
npm run clean         # Remove dist/ directory

# Run a single test file
npx vitest run tests/e2e/tools/entity-tools.test.ts

# Run tests matching a pattern
npx vitest run -t "should create entities"

# Run server locally (after building)
node dist/index.js

# Skip benchmark tests
# PowerShell:
$env:SKIP_BENCHMARKS=1; npm test
# Bash/Unix:
SKIP_BENCHMARKS=1 npm test

# Standalone tools (in tools/ directory)
npm run tools:install # Install dependencies for all standalone tools
npm run tools:build   # Build all standalone tools
```

## Architecture Overview

This is an **MCP protocol wrapper** around the `@danielsimonjr/memoryjs` library, exposing **241 knowledge graph tools** via the Model Context Protocol. After the Phase 13 extraction, this repo contains only 5 TypeScript source files — all core graph logic lives in memoryjs (currently `^3.0.0`). Phase 15 (v12.2.0) added 23 tools surfacing memoryjs v1.14+ features (bitemporal validity, OCC, RBAC, procedural memory, active retrieval, causal reasoning, world model). Phase 16 (v12.3.0) added 53 tools surfacing memoryjs v2.1.0 — `do_not_remember` exclusions (5), decision rationale + ADR markdown dual-write (10), structured project context (12), heuristic guidelines (10), tool affordance + `ToolCallObserver` pipeline (11), observation dedup (2), spell correction (3). Releases after Phase 16 added 12 more tools — a small "active project scope" pair (v12.3.2 backport) and a v12.5.0 engineering/diagnostics category. v12.7.0 upgraded to memoryjs 3.0.0 and added 16 tools — event memory (5), reconstructive memory (3 + 2 snapshot persistence), relation consolidation (2), agent reflection (4) — plus v3 graph-channel/explain options on `hybrid_search`, bringing the total to 241. Latest: v12.7.0 (npm + plugin).

**npm:** `@danielsimonjr/memory-mcp` | **Core lib:** `@danielsimonjr/memoryjs` (versions in package.json)

### Layered Architecture

```
memory-mcp (this repo)              @danielsimonjr/memoryjs (npm dependency)
┌──────────────────────────┐        ┌──────────────────────────────────┐
│  src/index.ts            │        │  ManagerContext (lazy init)      │
│  src/server/MCPServer.ts │───────▶│  EntityManager, RelationManager │
│  src/server/toolDefs.ts  │imports │  SearchManager, IOManager, etc. │
│  src/server/toolHandlers │        │  GraphStorage / SQLiteStorage   │
│  src/server/responseComp.│        │  StorageFactory                 │
└──────────────────────────┘        └──────────────────────────────────┘
```

### Source Files (src/) — 5 files total

| File | Role |
|------|------|
| `index.ts` | Entry point. Creates `ManagerContext`, starts `MCPServer`. Re-exports types from memoryjs for backward compatibility. |
| `server/MCPServer.ts` | Creates MCP `Server`, registers `ListToolsRequest` and `CallToolRequest` handlers. Uses stdio transport. |
| `server/toolDefinitions.ts` | Array of 241 tool schemas (name, description, inputSchema). Organized by category with comment headers. |
| `server/toolHandlers.ts` | Handler registry (`Record<string, ToolHandler>`). Each handler validates args with Zod schemas from memoryjs, calls the appropriate manager method, and returns formatted responses. Large-response tools are wrapped with `withCompression()`. |
| `server/responseCompressor.ts` | Auto-compresses responses >256KB with brotli + base64 encoding. Uses `compress`/`decompress` from memoryjs. |

### Key Patterns

- **ESM module**: `"type": "module"` in package.json. All local imports use `.js` extensions (e.g., `'./server/MCPServer.js'`).
- **Handler dispatch**: `handleToolCall(name, args, ctx)` looks up handler in `toolHandlers` registry, calls it with `(ctx, args)`.
- **Validation**: Handlers use `validateWithSchema(value, zodSchema, errorMsg)` imported from memoryjs. Ad-hoc validation uses `z` from zod directly.
- **Response formatting**: Three helpers from memoryjs — `formatToolResponse(data)` (JSON-stringified), `formatTextResponse(msg)` (plain text), `formatRawResponse(text)` (raw string).
- **Compression wrapper**: `withCompression(async () => handler())` wraps tools that return large payloads (read_graph, search_nodes, get_subtree, open_nodes). Responses >256KB get brotli-compressed.
- **Lazy managers**: `ManagerContext` instantiates managers on first access. Available accessors: `ctx.entityManager`, `ctx.relationManager`, `ctx.observationManager`, `ctx.searchManager`, `ctx.tagManager`, `ctx.hierarchyManager`, `ctx.analyticsManager`, `ctx.compressionManager`, `ctx.archiveManager`, `ctx.ioManager`, `ctx.graphTraversal`, `ctx.semanticSearch`, `ctx.rankedSearch`, `ctx.storage` (direct GraphStorage). memoryjs v3 additions: `ctx.hybridSearchManager`, `ctx.governanceManager` (with public `.auditLog`), `ctx.graphRankPrior`, `ctx.eventManager`, `ctx.reflectionManager`, `ctx.reconstructiveMemory()` (method — cached facade), and `ctx.close()` for releasing storage handles on shutdown.
- **Backward compat**: `index.ts` re-exports `ManagerContext` as `KnowledgeGraphManager` alias, plus core types.

### Tool Categories (241 tools across 65 categories)

| Category | Count | Key Purpose |
|----------|-------|-------------|
| Entity | 4 | Core CRUD for graph nodes |
| Relation | 2 | Directed edges between entities |
| Observation | 3 | Facts attached to entities, with normalization |
| Search | 7 | Basic, ranked (TF-IDF), boolean, fuzzy, auto-select |
| Intelligent Search | 3 | Hybrid multi-layer, query analysis, reflection-based |
| Semantic Search | 3 | Embedding similarity via OpenAI or local models |
| Saved Searches | 5 | Store and re-execute frequent queries |
| Tag Management | 6 | Tags, bulk ops, importance scores |
| Tag Aliases | 5 | Tag synonym/alias management |
| Hierarchy | 9 | Parent-child trees, subtree traversal |
| Graph Algorithms | 4 | BFS/DFS path finding, centrality, connected components |
| Analytics | 2 | Graph stats and integrity validation |
| Compression | 4 | Duplicate detection, merge, auto-compress, archive |
| Import/Export | 2 | 7 export formats + 3 import formats with merge strategies |
| Ref Index | 4 | Cross-session symbolic reference registration/resolution |
| Artifacts | 3 | Named versioned content blobs attached to entities |
| Temporal Search | 1 | Time-window filtered search across the graph |
| Distillation | 1 | Configure automated observation distillation pipelines |
| Freshness | 5 | Staleness tracking, expiry detection, freshness reporting |
| LLM Query | 1 | Natural-language Q&A over the knowledge graph |
| Governance | 4 | Audited transactions, audit log query/history, rollback |
| Role Profiles | 2 | Per-agent role assignment and profile listing |
| Entropy | 2 | Entropy-based noise filtering and information density scoring |
| Consolidation | 3 | Background memory consolidation scheduling and control |
| Formatter | 1 | Salience-budget-aware context formatting |
| Collaborative | 1 | Multi-agent context synthesis |
| Failure Handling | 2 | Session failure distillation and graceful session end |
| Cognitive Load | 2 | Working-memory load analysis and adaptive reduction |
| Dream Engine | 3 | Background memory maintenance: 8-phase sleep-cycle consolidation |
| **Project Scoping** | **1** | List and filter entities by project (v1.8.0) |
| **Active Project Scope** | **2** | Set/get the server's active project-scope filter — mutable per-session state (`set_project_scope`, `get_project_scope`; v12.3.2 backport) |
| **Memory Versioning** | **2** | Entity version chains and per-entity version history (v1.8.0) |
| **Semantic Forget** | **1** | Two-tier deletion: exact match → semantic similarity fallback (v1.8.0) |
| **Profiles** | **2** | User/agent profile get and update (v1.8.0) |
| **Temporal KG** | **3** | Temporal relation invalidation, time-travel queries, relation timeline (v1.9.0) |
| **Ingestion** | **1** | Format-agnostic conversation/document ingestion pipeline (v1.9.0) |
| **Agent Diary** | **2** | Per-agent persistent journal write and read (v1.9.0) |
| **Session & Working Memory** | **9** | Session lifecycle, working memory CRUD, TTL, promotion, context wake-up (Phase 14) |
| **Auto-Enhancement** | **3** | Auto-link entity mentions, fact extraction, contradiction detection (Phase 14) |
| **Context Compression** | **1** | N-gram text abbreviation with legend for token savings (Phase 14) |
| **Consolidation Pipeline** | **3** | Session consolidation, pattern detection, entity summarization (Phase 14) |
| **Decay & Salience** | **5** | Time-based decay, importance scoring, weak memory cleanup, reinforcement (Phase 14) |
| **Multi-Agent** | **5** | Agent registration, cross-agent search, visibility, conflict resolution (Phase 14) |
| **Observability** | **4** | D3.js graph visualization, transcript splitting, query cost estimation (Phase 14) |
| **Dedup** | **1** | Priority-based smart deduplication (Phase 14) |
| **Entity Bitemporal** | **5** | Time-travel queries: invalidate entities/observations, entity_as_of, observations_as_of, entity_timeline (Phase 15 / memoryjs η.4.4) |
| **Optimistic Concurrency** | **1** | `update_entity` with `expectedVersion` → `VersionConflictError` on stale (Phase 15 / memoryjs η.5.5.c) |
| **RBAC** | **4** | Role-based access control: assign/revoke/check/list reader/writer/admin/owner permissions (Phase 15 / memoryjs η.6.1) |
| **Procedural Memory** | **5** | Executable how-to sequences with EWMA-refined success rate (Phase 15 / memoryjs 3B.4) |
| **Active Retrieval** | **1** | Iterative query rewriting until coverage threshold met (Phase 15 / memoryjs 3B.5) |
| **Causal Reasoning** | **4** | Chain discovery, counterfactual queries, cycle detection (Phase 15 / memoryjs 3B.6) |
| **World Model** | **3** | Graph snapshots, fact validation, outcome prediction (Phase 15 / memoryjs 3B.7) |
| **Tool Affordance** | **11** | Per-tool outcome recording, affordance stats, suggestion, and the `ToolCallObserver` lifecycle (start/complete/error/partial/cancel/in-flight-count) (Phase 16 / memoryjs v2.1.0) |
| **Heuristic Guidelines** | **10** | Add/get/list/match/reinforce heuristics, contradiction detection and resolution (Phase 16 / memoryjs v2.1.0) |
| **Project Context** | **12** | Structured per-project facts, conventions, commands, and glossary — upsert/append/remove/clear/format-for-LLM (Phase 16 / memoryjs v2.1.0) |
| **Decision Rationale** | **10** | Propose/accept/reject/supersede decisions, decision chains, and ADR markdown export/parse (Phase 16 / memoryjs v2.1.0) |
| **Exclusion (`do_not_remember`)** | **5** | Rule-based memory exclusion: add/list/remove rules, check and find matches (Phase 16 / memoryjs v2.1.0) |
| **Observation Dedup** | **2** | Exact and Jaccard-similarity duplicate observation detection (Phase 16 / memoryjs v2.1.0) |
| **Spell Correction** | **3** | Query spell suggestion, vocabulary rebuild, and vocabulary size reporting (Phase 16 / memoryjs v2.1.0) |
| **Engineering / Diagnostics** | **10** | `diag`, `health`, `check_graph`, `reindex`, cache stats/clear, `graph_size`, `inspect_entity`, `hierarchy_tree`, `entity_neighbors` (v12.5.0) |
| **Event Memory** | **5** | N-ary event reification: `record_event`, `get_event`, `query_events`, `get_event_flow`, `who_did_what` — actions become event hub entities with role-typed relations (v12.7.0 / memoryjs v3.0.0) |
| **Reconstructive Memory** | **5** | MRAgent-style Cue–Tag–Content associative memory: `ingest_dialogue`, `reconstruct_memory`, `reconstructive_memory_stats`, plus `save_reconstructive_memory` / `load_reconstructive_memory` sidecar snapshot persistence (v12.7.0 / memoryjs v3.0.0) |
| **Relation Consolidation** | **2** | Three-tier relation janitor: `analyze_relation_duplicates` (dry-run), `consolidate_relations` — merges relationType spelling variants, inverse duplicates, and (with embeddings) semantic duplicates (v12.7.0 / memoryjs v3.0.0) |
| **Agent Reflection** | **4** | Generalized lessons distilled from experience, evidence-backed and scoped session/project/global: `create_reflection`, `list_reflections`, `get_relevant_reflections`, `archive_reflection` (v12.7.0 / memoryjs v3.0.0) |

New categories (v1.8.0/v1.9.0/Phase 14/Phase 15/Phase 16/v12.3.2/v12.5.0, bold above) are implemented in `toolDefinitions.ts` and `toolHandlers.ts` in the same pattern as existing categories. Phase 15 surfaces also include W3C Linked Data export formats (`turtle`, `rdf-xml`, `json-ld` — memoryjs η.5.4) and PII redaction on export (`redactPii: true` — memoryjs η.6.3) wired into the existing `export_graph` tool rather than as new tools.

### Adding a New Tool

1. Add schema to `toolDefinitions.ts` (in the appropriate category section)
2. Add handler to `toolHandlers` registry in `toolHandlers.ts`
3. Handler pattern: validate args → call manager method → return formatted response
4. If response can be large, wrap with `withCompression()`
5. Add e2e test in `tests/e2e/tools/`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMORY_FILE_PATH` | Path to storage file | `memory.jsonl` (cwd) |
| `MEMORY_STORAGE_TYPE` | `jsonl` or `sqlite` | `jsonl` |
| `MEMORY_EMBEDDING_PROVIDER` | `openai`, `local`, or `none` | `none` |
| `MEMORY_OPENAI_API_KEY` | Required if provider is `openai` | — |
| `MEMORY_EMBEDDING_MODEL` | Embedding model name | `text-embedding-3-small` / `Xenova/all-MiniLM-L6-v2` |
| `MEMORY_AUTO_INDEX_EMBEDDINGS` | Auto-index on entity creation | `false` |

## Test Structure

36 test files, 791 tests, ~85% statement coverage (verified via `coverage/coverage-summary.json`: statements 84.8%, lines 86.1%, functions 84.8%, branches 69.8%). Core graph tests — and the bulk of coverage — live in the memoryjs package.

Tests are organized in three tiers:
- **Unit** (`tests/unit/`): Isolated module tests (e.g., response compressor)
- **Integration** (`tests/integration/`): MCP server lifecycle tests
- **E2E** (`tests/e2e/tools/`): Per-category tool tests — one file per tool group (entity, relation, observation, governance, freshness, dream, entropy, etc.) plus `handler-smoke.test.ts` for broad handler coverage
- **Root** (`tests/`): Core graph operations (`knowledge-graph.test.ts`) and storage path handling (`file-path.test.ts`)

Vitest config: `vitest.config.ts`. Coverage targets `src/**/*.ts` (excludes index barrel files). Custom reporter at `tests/test-results/per-file-reporter.js`.

## Storage

Data files live in the **project root** (not `dist/`):
- **JSONL**: `memory.jsonl`, `memory-saved-searches.jsonl`, `memory-tag-aliases.jsonl`
- **SQLite**: `memory.db` (set `MEMORY_STORAGE_TYPE=sqlite`)

## Entry Points

- **Build output**: `dist/index.js`
- **CLI binary**: `mcp-server-memory` (defined in package.json `bin`)
- **Source entry**: `src/index.ts`

## Standalone Tools

The `tools/` directory has standalone utilities (each with own `package.json`, buildable to Windows exes via pkg):

| Tool | Purpose |
|------|---------|
| `chunking-for-files` | Split/merge large files for context-limited editing |
| `compress-for-context` | CTON compression for LLM context windows |
| `create-dependency-graph` | Generate TypeScript project dependency graphs |
| `migrate-from-jsonl-to-sqlite` | Convert between JSONL and SQLite formats |

## Publishing to npm

```bash
# Token with "bypass 2FA" required — classic tokens are revoked
npm config set //registry.npmjs.org/:_authToken=$(cat c:\mcp-servers\npm_key.txt)
npm publish --access public
# `prepare` script auto-builds, so separate `npm run build` is not needed before publish
# Verify tarball contents before publishing:
# npm pack --dry-run 2>&1 | grep -E "jsonl|\.db|total files|package size"
# Always bump version in package.json before publishing (npm won't re-publish an existing version)
```

## Gotchas

- **memoryjs is a published dep** (v12.2.3+): `@danielsimonjr/memoryjs` resolves from npm at `^3.0.0`. For active dual-repo dev (editing memoryjs alongside memory-mcp), temporarily switch to `file:C:/Users/danie/Dropbox/Github/memoryjs` in package.json so changes are picked up on `npm install` without a publish — but **bump back to a registry version before `npm publish`**. The `release: bump @danielsimonjr/memoryjs file: → ^x.y.z (publishable)` commits in `git log` exist for exactly this swap. While in `file:` mode, `npm install` will fail on any machine without that local path.
- **Data files are gitignored**: `*.jsonl` and `memory.db` are in `.gitignore` — test runs create/modify these in the project root but they won't appear in `git status`.
- **Error handling in dispatch**: `handleToolCall` catches exceptions from handlers and returns them as MCP-formatted error responses (not thrown). Check MCP response `isError` field when debugging.
- **TypeScript target**: ES2022 with Node16 module resolution. The `prepare` script runs `npm run build` on install, so `dist/` is rebuilt automatically.
- **Data files in `dist/` are excluded from the tarball**: The `files` field is `["dist"]`, but `.npmignore` excludes `dist/*.jsonl` and `dist/*.db`, so data files copied into `dist/` by local runs are not published. Verify with `npm pack --dry-run` before publishing.
