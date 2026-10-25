# Memory MCP Server - Project Overview

## What Is This?

Memory MCP is an **enhanced Model Context Protocol (MCP) server** that provides persistent knowledge graph storage for AI assistants. It extends the official MCP memory server with advanced features for organizing, searching, and maintaining structured knowledge.

## Key Capabilities

| Feature | Description |
|---------|-------------|
| **Knowledge Graph** | Store entities and relations in a flexible graph structure |
| **Persistent Memory** | Data persists across sessions in JSONL files |
| **241 Tools** | Comprehensive API for graph operations |
| **Hierarchical Nesting** | Parent-child relationships for tree organization |
| **Advanced Search** | Basic, TF-IDF ranked, boolean, fuzzy, intelligent hybrid, semantic, active retrieval (3B.5) |
| **Duplicate Detection** | Intelligent compression with similarity scoring |
| **Multi-format Export** | JSON, CSV, GraphML, GEXF, DOT, Markdown, Mermaid + W3C Linked Data (Turtle / RDF/XML / JSON-LD) |
| **PII Redaction** | On-export scrubbing of email / SSN / credit-card / phone / IPv4 (η.6.3) |
| **Tag Management** | Aliases, bulk operations, and validation |
| **Bitemporal Validity** | Time-travel queries: invalidate entities/observations, query as of past timestamps (η.4.4) |
| **Optimistic Concurrency** | `expectedVersion` parameter on `update_entity` → `VersionConflictError` on stale (η.5.5.c) |
| **RBAC** | Role-based access control: reader / writer / admin / owner with optional resource-type and scope-prefix narrows (η.6.1) |
| **Procedural Memory** | Executable how-to sequences with EWMA-refined success rate (3B.4) |
| **Causal Reasoning** | Chain discovery, counterfactual queries, cycle detection (3B.6) |
| **World Model** | Graph snapshots, fact validation, outcome prediction (3B.7) |

## Quick Architecture Overview

```
┌────────────────────────────────────────────────────┐
│            MCP Client (Claude, etc.)               │
└───────────────────────┬────────────────────────────┘
                        │ MCP Protocol (JSON-RPC)
┌───────────────────────┴────────────────────────────┐
│  Layer 1: MCP Server                               │
│  ┌──────────────────────────────────────────────┐  │
│  │ MCPServer.ts → toolDefinitions + toolHandlers│  │
│  └──────────────────────────────────────────────┘  │
└───────────────────────┬────────────────────────────┘
                        │ (direct manager access)
┌───────────────────────┴────────────────────────────┐
│  Layer 2: Managers + Context (Lazy Initialization) │
│  ManagerContext (aliased as KnowledgeGraphManager) │
│  • EntityManager   (CRUD + hierarchy + archive)    │
│  • RelationManager (relation CRUD)                 │
│  • SearchManager   (search + compression + stats)  │
│  • IOManager       (import + export + backup)      │
│  • TagManager      (tag aliases)                   │
└───────────────────────┬────────────────────────────┘
                        │
┌───────────────────────┴────────────────────────────┐
│  Layer 3: Storage Layer                            │
│  GraphStorage (JSONL files, in-memory caching)     │
└────────────────────────────────────────────────────┘
```

## Data Model

### Entity (Graph Node)
```typescript
interface Entity {
  name: string;           // Unique identifier
  entityType: string;     // Classification (person, project, concept)
  observations: string[]; // Facts/notes about the entity
  parentId?: string;      // Hierarchical parent (optional)
  tags?: string[];        // Categories (lowercase, optional)
  importance?: number;    // Priority 0-10 (optional)
  createdAt?: string;     // ISO 8601 timestamp
  lastModified?: string;  // ISO 8601 timestamp
}
```

### Relation (Graph Edge)
```typescript
interface Relation {
  from: string;         // Source entity name
  to: string;           // Target entity name
  relationType: string; // Relationship type (works_at, knows, etc.)
}
```

## Directory Structure

This repository holds the MCP layer. The graph engine is the package `@danielsimonjr/memoryjs`, which `src/` imports. The managers, the search code and the storage backends are in that package. They are not in this tree.

```
src/ (5 TypeScript files)
├── index.ts                  # Entry point, main() function
└── server/ (4 files)         # MCP protocol layer
    ├── MCPServer.ts              # Server initialization
    ├── toolDefinitions.ts        # Tool schemas
    ├── toolHandlers.ts           # Tool handler registry
    └── responseCompressor.ts     # Brotli compression for large responses
```

The file count of `src/` comes from `git ls-files src`. No `repo-tools map` metric gives this count.

The other top-level folders hold no engine code:

| Folder | Holds |
|---|---|
| `tests/` | The test suite |
| `tools/` | Four helper programs: chunking, context compression, the dependency graph, and the migration from JSONL to SQLite |
| `scripts/` | The bundle build, the bundle version check, the pack list check and the publish version guard |
| `bundle/` | The committed plugin bundle `index.mjs` |
| `skills/` | The `memory` skill |
| `.claude-plugin/` | The plugin manifest |
| `.claude/` | Slash commands and settings for Claude Code |
| `.github/` | The CI and release workflows, the Dependabot settings and the review policies |
| `docs/` | The architecture documents and the guides |

## Tool Categories

The server has 241 tools. [API.md](./API.md) groups the tools into categories. The Table of Contents of API.md gives the number of tools in each category. API.md has one section for each tool.

## Key Design Principles

1. **Context Pattern**: `ManagerContext` holds all managers with lazy-initialized getters
2. **Lazy Initialization**: 7 managers instantiated on-demand using `??=` operator
3. **Dual Storage Backends**: JSONL (default) or SQLite (via `MEMORY_STORAGE_TYPE=sqlite`)
4. **Dependency Injection**: `GraphStorage` injected into managers for testability
5. **Barrel Exports**: Each module exports through `index.ts` (includes `KnowledgeGraphManager` alias)
6. **Worker Parallelism**: Fuzzy search uses `@danielsimonjr/workerpool` for parallel processing
7. **Event-Driven Updates**: `GraphEventEmitter` triggers TF-IDF index updates on entity changes

## Performance Characteristics

- **Entities**: Handles 2,000+ efficiently; 5,000+ with acceptable performance
- **Batch Operations**: Single I/O cycle for bulk operations
- **Caching**: In-memory graph caching with write-through invalidation
- **Duplicate Detection**: O(n²/k) via entityType bucketing (50x faster than naive)
- **Search**: TF-IDF index for relevance ranking; Levenshtein for fuzzy matching

## Storage Files

| File | Purpose |
|------|---------|
| `memory.jsonl` | Main graph (entities + relations) |
| `memory-saved-searches.jsonl` | Saved search queries |
| `memory-tag-aliases.jsonl` | Tag synonym mappings |

## Getting Started

```bash
# Install
npm install

# Build
npm run build

# Run tests
npm test

# Run server
npx mcp-server-memory
```

Set `MEMORY_FILE_PATH` environment variable to customize storage location.

## Related Documentation

- **[API Reference](./API.md)** - Complete tool documentation
- **[Architecture Details](./ARCHITECTURE.md)** - In-depth technical architecture
- **[User Guides](./guides/)** - Feature-specific guides
- **[Changelog](../CHANGELOG.md)** - Version history

---


## Verification

Generated 2026-10-16 by `repo-tools map`.
Regenerate the generated reports: `npm run docs:deps` · Check: `repo-tools check . --docs=docs/architecture`

The claims below come from `repo-tools map .`, which reads the whole repository. The generated reports in this directory
come from `tools/create-dependency-graph`, which reads `src/` and the tests. Their counts differ for that reason.

| Claim | Value | Source |
|---|---|---|
| totalSourceFiles | 71 | repo-tools map (whole repository) |
| totalLinesOfCode | 25812 | repo-tools map (whole repository) |
| totalExports | 82 | repo-tools map (whole repository) |
| entryRoots | 10 | repo-tools map (whole repository) |
| reachableFiles | 5 | repo-tools map (whole repository) |
| orphanedFiles | 0 | repo-tools map (whole repository) |
| noImporterFileCount | 0 | repo-tools map (whole repository) |

**`reachableFiles` is 5, far below `totalSourceFiles`. The low value is expected.** The two package entry points reach the server layer.
`entryRoots` is 10. Two roots are the package entry points: `src/index.ts` and `src/server/MCPServer.ts`.
Three more roots are `src/server/responseCompressor.ts`, `src/server/toolDefinitions.ts` and `src/server/toolHandlers.ts`.
The last five roots are the helper files of the API.md Returns gate: `check.ts`, `conform.ts`, `derive.ts`, `doc.ts` and `shape.ts` in `tests/unit/api-docs/`.
The script `typecheck:tests` runs `tsc -p tsconfig.test.json`.
The tsconfig includes `src/**/*` and `tests/**/*`.
`repo-tools map` takes each file of those folders that is not a `.test.ts` file as a root.
Without the script, `entryRoots` is 2.
The other files are the test suite and the tooling. Nothing imports them, because a runner starts them.
`orphanedFiles` and `noImporterFileCount` are both 0, so the graph has no unexplained file.

**`unusedExportsCount` is not a deletion list.** The count covers exports that have no importer inside this repository.
This package is an MCP server. Protocol dispatch calls the tool handlers, so an import-graph analysis reads them as unused.
Confirm with a second method before you remove anything.
