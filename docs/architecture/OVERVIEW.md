# Memory MCP Server - Project Overview

**Version**: 12.7.0
**Last Updated**: 2026-07-26

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

```
src/ (77 TypeScript files, ~31,000 lines of code)
├── index.ts              # Entry point, main() function
│
├── core/ (12 files)      # Core managers and storage
│   ├── ManagerContext.ts         # Context holder (lazy init, 7 managers)
│   ├── EntityManager.ts          # Entity CRUD operations
│   ├── RelationManager.ts        # Relation CRUD
│   ├── ObservationManager.ts     # Observation add/delete
│   ├── HierarchyManager.ts       # Parent-child relationships
│   ├── GraphStorage.ts           # JSONL file I/O, caching
│   ├── SQLiteStorage.ts          # SQLite backend (better-sqlite3)
│   ├── StorageFactory.ts         # Storage backend factory
│   ├── TransactionManager.ts     # Batch operations
│   ├── GraphTraversal.ts         # Graph algorithms (BFS, shortest path, centrality)
│   ├── GraphEventEmitter.ts      # Event-driven TF-IDF sync
│   └── index.ts                  # Barrel export (+ KnowledgeGraphManager alias)
│
├── server/ (4 files)     # MCP protocol layer
│   ├── MCPServer.ts              # Server initialization
│   ├── toolDefinitions.ts        # 241 tool schemas
│   ├── toolHandlers.ts           # Tool implementation registry
│   └── responseCompressor.ts     # Brotli compression for large responses
│
├── search/ (29 files)    # Search implementations (31 classes)
│   ├── SearchManager.ts          # Search orchestrator + compression + analytics
│   ├── BasicSearch.ts            # Text matching
│   ├── RankedSearch.ts           # TF-IDF scoring
│   ├── BooleanSearch.ts          # AND/OR/NOT logic
│   ├── FuzzySearch.ts            # Levenshtein matching (uses workerpool)
│   ├── SearchFilterChain.ts      # Unified filter logic
│   ├── SavedSearchManager.ts     # Saved search persistence
│   ├── TFIDFIndexManager.ts      # TF-IDF index management
│   ├── SearchSuggestions.ts      # "Did you mean?" suggestions
│   ├── QueryCostEstimator.ts     # Query complexity for search_auto
│   ├── SemanticSearch.ts         # Vector similarity search
│   ├── EmbeddingService.ts       # OpenAI/Local/Mock embedding providers
│   ├── VectorStore.ts            # In-memory/SQLite vector storage
│   ├── TFIDFEventSync.ts         # Event-driven TF-IDF updates
│   ├── HybridSearchManager.ts    # Three-layer hybrid search (semantic+lexical+symbolic)
│   ├── QueryAnalyzer.ts          # Query understanding + entity extraction
│   ├── QueryPlanner.ts           # Query decomposition + planning
│   ├── SymbolicSearch.ts         # Metadata-based symbolic filtering
│   ├── ReflectionManager.ts      # Iterative result refinement
│   └── index.ts
│
├── features/ (9 files)   # Advanced capabilities
│   ├── TagManager.ts             # Tag aliases
│   ├── IOManager.ts              # Import + export + backup
│   ├── StreamingExporter.ts      # Memory-efficient large exports
│   ├── AnalyticsManager.ts       # Graph stats and validation
│   ├── ArchiveManager.ts         # Entity archival
│   ├── CompressionManager.ts     # Duplicate detection and merging
│   ├── ObservationNormalizer.ts  # Coreference resolution + temporal anchoring
│   ├── KeywordExtractor.ts       # Scored keyword extraction
│   └── index.ts
│
├── types/ (2 files)      # TypeScript definitions (consolidated)
│   ├── types.ts                  # All type definitions (89 interfaces)
│   └── index.ts                  # Barrel export
│
├── utils/ (18 files)     # Shared utilities (23 classes, 50+ functions)
│   ├── schemas.ts                # Zod validation schemas (26 validators)
│   ├── constants.ts              # Shared constants (16+ exports)
│   ├── formatters.ts             # Response + pagination formatting
│   ├── entityUtils.ts            # Entity helper functions (28 functions)
│   ├── searchAlgorithms.ts       # Levenshtein + TF-IDF algorithms
│   ├── compressionUtil.ts        # Brotli compression utilities
│   ├── compressedCache.ts        # LRU cache with compression
│   ├── operationUtils.ts         # Long-running operation utilities
│   ├── taskScheduler.ts          # Task queue with workerpool
│   ├── searchCache.ts            # TTL-based search caching
│   ├── indexes.ts                # O(1) lookup indexes (5 classes)
│   ├── errors.ts                 # Custom error classes (12 errors)
│   ├── logger.ts                 # Logging utility
│   └── index.ts
│
└── workers/ (2 files)    # Worker pool utilities
    ├── levenshteinWorker.ts      # Parallel fuzzy search worker
    └── index.ts
```

## Tool Categories (106 Total)

| Category | Tools | Description |
|----------|-------|-------------|
| **Entity** | 4 | create_entities, delete_entities, read_graph, open_nodes |
| **Relation** | 2 | create_relations, delete_relations |
| **Observation** | 3 | add_observations, delete_observations, normalize_observations |
| **Search** | 7 | search_nodes, search_by_date_range, search_nodes_ranked, boolean_search, fuzzy_search, get_search_suggestions, search_auto |
| **Intelligent Search** | 3 | hybrid_search, analyze_query, smart_search |
| **Semantic Search** | 3 | semantic_search, find_similar_entities, index_embeddings |
| **Saved Search** | 5 | save_search, execute_saved_search, list_saved_searches, delete_saved_search, update_saved_search |
| **Tag** | 6 | add_tags, remove_tags, set_importance, add_tags_to_multiple_entities, replace_tag, merge_tags |
| **Tag Alias** | 5 | add_tag_alias, list_tag_aliases, remove_tag_alias, get_aliases_for_tag, resolve_tag |
| **Hierarchy** | 9 | set_entity_parent, get_children, get_parent, get_ancestors, get_descendants, get_subtree, get_root_entities, get_entity_depth, move_entity |
| **Graph Algorithms** | 4 | find_shortest_path, find_all_paths, get_connected_components, get_centrality |
| **Analytics** | 2 | get_graph_stats, validate_graph |
| **Compression** | 4 | find_duplicates, merge_entities, compress_graph, archive_entities |
| **Import/Export** | 2 | export_graph (7 formats), import_graph (3 formats) |
| **Ref Index** | 4 | register_ref, resolve_ref, deregister_ref, list_refs |
| **Artifacts** | 3 | create_artifact, get_artifact, list_artifacts |
| **Temporal Search** | 1 | search_by_time |
| **Distillation** | 1 | configure_distillation |
| **Freshness** | 5 | check_freshness, get_stale_entities, get_expired_entities, refresh_entity, freshness_report |
| **LLM Query** | 1 | query_natural_language |
| **Governance** | 4 | governance_transaction, audit_query, audit_history, rollback_operation |
| **Role Profiles** | 2 | set_agent_role, list_role_profiles |
| **Entropy** | 2 | enable_entropy_filter, compute_entropy |
| **Consolidation** | 3 | start_consolidation, stop_consolidation, run_consolidation_now |
| **Formatter** | 1 | format_with_salience_budget |
| **Collaborative** | 1 | synthesize_collaborative_context |
| **Failure Handling** | 2 | distill_failure, end_session |
| **Cognitive Load** | 2 | analyze_cognitive_load, adaptive_reduce_memories |
| **Project Scoping** | 1 | list_projects |
| **Memory Versioning** | 2 | get_entity_versions, get_version_chain |
| **Semantic Forget** | 1 | forget_memory |
| **Profiles** | 2 | get_profile, update_profile |
| **Temporal KG** | 3 | invalidate_relation, query_as_of, timeline |
| **Ingestion** | 1 | ingest |
| **Agent Diary** | 2 | diary_write, diary_read |

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

# Run tests (2800+ tests)
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

**Maintained by**: Daniel Simon Jr.
