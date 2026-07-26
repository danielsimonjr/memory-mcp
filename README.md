# Memory MCP Server

[![Version](https://img.shields.io/badge/version-12.7.0-blue.svg)](https://github.com/danielsimonjr/memory-mcp)
[![NPM](https://img.shields.io/npm/v/@danielsimonjr/memory-mcp.svg)](https://www.npmjs.com/package/@danielsimonjr/memory-mcp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.0-purple.svg)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Coverage](https://img.shields.io/badge/coverage-84.8%25-yellowgreen.svg)](docs/architecture/TEST_COVERAGE.md)

An **enhanced fork** of the official [Model Context Protocol](https://modelcontextprotocol.io) memory server with advanced features for **hierarchical nesting**, **intelligent compression**, **semantic search**, **graph algorithms**, **archiving**, **advanced search**, and **multi-format import/export**.

> **Enterprise-grade knowledge graph** with **241 tools** including hierarchical organization, semantic search with embeddings, graph traversal algorithms, duplicate detection, smart archiving, project scoping, temporal knowledge graph, semantic forget, agent diary, **entity bitemporal validity (η.4.4)**, **optimistic concurrency control (η.5.5.c)**, **role-based access control (η.6.1)**, **W3C Linked Data exports** (Turtle / JSON-LD / RDF/XML — η.5.4), **PII redaction on export** (η.6.3), **procedural memory (3B.4)**, **active retrieval (3B.5)**, **causal reasoning (3B.6)**, **world model (3B.7)**, **`do_not_remember` exclusions**, **decision rationale** (ADR memory + markdown dual-write), **structured project context** (facts / conventions / commands / glossary), **heuristic guidelines**, **tool affordance + ToolCallObserver pipeline** (with MCP shim), **observation dedup**, **spell correction** (memoryjs v2.1.0 — Phase 16), **n-ary event memory**, **reconstructive (Cue–Tag–Content) memory with snapshot persistence**, **relation consolidation**, **agent reflections**, and a **graph-connectivity hybrid-search channel with evidence-path explanations** (memoryjs v3.0.0 — v12.7.0) for long-term memory management.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Development](#development)
- [Documentation](#documentation)
- [Companion Skill](#companion-skill)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

## Features

### Core Memory Capabilities

- **Knowledge Graph Storage**: Entity-Relation-Observation model for structured memory
- **Persistent Memory**: Information persists across chat sessions with JSONL or SQLite storage
- **Dual Storage Backends**: JSONL (human-readable) or SQLite with better-sqlite3 (3-10x faster, FTS5 search)
- **Full CRUD Operations**: Create, read, update, delete entities and relations
- **Flexible Search**: Text-based, fuzzy, boolean, semantic, and TF-IDF ranked search

### Advanced Features

| Category | Tools | Description |
|----------|-------|-------------|
| **Hierarchical Nesting** | 9 | Parent-child relationships for organizing tree structures |
| **Graph Algorithms** | 4 | Path finding, connected components, centrality metrics |
| **Intelligent Search** | 3 | Hybrid multi-layer search with query analysis and reflection |
| **Semantic Search** | 3 | Embedding-based similarity search with OpenAI or local models |
| **Memory Compression** | 4 | Intelligent duplicate detection and merging with similarity scoring |
| **Advanced Search** | 7 | TF-IDF ranking, boolean queries, fuzzy matching, auto-select |
| **Observation Normalization** | 1 | Coreference resolution and temporal anchoring |
| **Tag Management** | 6 | Tags, bulk operations, importance scores |
| **Tag Aliases** | 5 | Tag synonym/alias management |
| **Saved Searches** | 5 | Store and execute frequent queries |
| **Import/Export** | 2 | 7 export formats (incl. W3C Linked Data: Turtle / JSON-LD / RDF/XML) with brotli + PII redaction; 3 import formats |
| **Graph Analytics** | 2 | Statistics, validation, integrity checks |
| **Ref Index** | 4 | Cross-session symbolic reference registration and resolution |
| **Artifacts** | 3 | Named versioned content blobs attached to entities |
| **Temporal Search** | 1 | Time-window filtered search across the knowledge graph |
| **Distillation** | 1 | Configure automated observation distillation pipelines |
| **Freshness** | 5 | Staleness tracking, expiry detection, and freshness reporting |
| **LLM Query** | 1 | Natural-language question answering over the graph |
| **Governance** | 4 | Transactional audit trail, history, and rollback |
| **Role Profiles** | 2 | Per-agent role assignment and profile listing |
| **Entropy** | 2 | Entropy-based noise filtering and information density scoring |
| **Consolidation** | 3 | Background memory consolidation scheduling and control |
| **Formatter** | 1 | Salience-budget-aware context formatting |
| **Collaborative** | 1 | Multi-agent context synthesis |
| **Failure Handling** | 2 | Session failure distillation and graceful session end |
| **Cognitive Load** | 2 | Working-memory load analysis and adaptive reduction |
| **Dream Engine** | 3 | Background memory maintenance: 8-phase sleep-cycle consolidation |
| **Project Scoping** | 1 | List and filter entities by project |
| **Memory Versioning** | 2 | Entity version chains and per-entity version history |
| **Semantic Forget** | 1 | Two-tier deletion: exact match → semantic similarity fallback |
| **Profiles** | 2 | User/agent profile get and update |
| **Temporal KG** | 3 | Temporal relation invalidation, time-travel queries, relation timeline |
| **Ingestion** | 1 | Format-agnostic conversation/document ingestion pipeline |
| **Agent Diary** | 2 | Per-agent persistent journal write and read |
| **Session & Working Memory** | 9 | Session lifecycle, working memory CRUD, TTL, promotion, context wake-up *(Phase 14)* |
| **Auto-Enhancement** | 3 | Auto-link entity mentions, fact extraction, contradiction detection *(Phase 14)* |
| **Context Compression** | 1 | N-gram text abbreviation with legend for token savings *(Phase 14)* |
| **Consolidation Pipeline** | 3 | Session consolidation, pattern detection, entity summarization *(Phase 14)* |
| **Decay & Salience** | 5 | Time-based decay, importance scoring, weak memory cleanup, reinforcement *(Phase 14)* |
| **Multi-Agent** | 5 | Agent registration, cross-agent search, visibility, conflict resolution *(Phase 14)* |
| **Observability** | 4 | D3.js graph visualization, transcript splitting, query cost estimation *(Phase 14)* |
| **Dedup** | 1 | Priority-based smart deduplication *(Phase 14)* |
| **Entity Bitemporal** | 5 | Time-travel queries: invalidate entities/observations, entity_as_of, timelines *(Phase 15 / η.4.4)* |
| **Optimistic Concurrency** | 1 | `update_entity` with `expectedVersion` → `VersionConflictError` on stale *(Phase 15 / η.5.5.c)* |
| **RBAC** | 4 | Role-based access control: assign/revoke/check/list reader/writer/admin/owner permissions *(Phase 15 / η.6.1)* |
| **Procedural Memory** | 5 | Executable how-to sequences with EWMA-refined success rate *(Phase 15 / 3B.4)* |
| **Active Retrieval** | 1 | Iterative query rewriting until coverage threshold met *(Phase 15 / 3B.5)* |
| **Causal Reasoning** | 4 | Chain discovery, counterfactual queries, cycle detection *(Phase 15 / 3B.6)* |
| **World Model** | 3 | Graph snapshots, fact validation, outcome prediction *(Phase 15 / 3B.7)* |

### Comparison with Official Memory Server

| Feature | Official | Enhanced (This Fork) |
|---------|----------|----------------------|
| Entity/Relation/Observation Management | ✅ | ✅ |
| Basic Search | ✅ | ✅ |
| **Hierarchical Nesting** | ❌ | ✅ Parent-child trees |
| **Graph Algorithms** | ❌ | ✅ Path finding, centrality |
| **Semantic Search** | ❌ | ✅ Embedding-based similarity |
| **Memory Compression** | ❌ | ✅ Duplicate detection |
| **Brotli Compression** | ❌ | ✅ Backups, exports, responses |
| **Smart Archiving** | ❌ | ✅ Criteria-based |
| **Advanced Search** | ❌ | ✅ TF-IDF + Boolean + Fuzzy |
| **SQLite Backend** | ❌ | ✅ better-sqlite3 (3-10x faster) |
| **Full-Text Search** | ❌ | ✅ FTS5 with BM25 ranking |
| **Timestamps** | ❌ | ✅ createdAt + lastModified |
| **Import/Export Formats** | ❌ | ✅ 7 export / 3 import |
| **Input Validation** | ❌ | ✅ Zod schemas |
| **Backup & Restore** | ❌ | ✅ Compressed snapshots |
| **Intelligent Search** | ❌ | ✅ Hybrid + Query Analysis + Reflection |
| **Observation Normalization** | ❌ | ✅ Coreference resolution + temporal anchoring |
| **Total Tools** | 11 | **160** |
| **Code Structure** | Monolithic | **Modular** (5 src files in this repo; core graph in [`@danielsimonjr/memoryjs`](https://www.npmjs.com/package/@danielsimonjr/memoryjs)) |

## Quick Start

### 1. Install from NPM

```bash
npm install -g @danielsimonjr/memory-mcp
```

Or use with npx (no installation required):

```bash
npx @danielsimonjr/memory-mcp
```

### 2. Configure Claude Desktop

Add to `claude_desktop_config.json`:

**Using NPM Global Install:**
```json
{
  "mcpServers": {
    "memory": {
      "command": "mcp-server-memory"
    }
  }
}
```

**Using NPX:**
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@danielsimonjr/memory-mcp"]
    }
  }
}
```

### 3. Restart Claude Desktop

Restart Claude Desktop to load the enhanced memory server.

### 4. Start Using

Tell Claude:
```
Please remember that I prefer TypeScript over JavaScript.
Tag this as "preferences" with importance 8.
Create a parent entity called "Development Preferences" and nest this under it.
```

## Installation

### Local Build

```bash
# Clone repository
git clone https://github.com/danielsimonjr/memory-mcp.git
cd memory-mcp

# Install and build
npm install
npm run build

# Run tests (791 tests, ~85% statement coverage)
npm test

# Type check
npm run typecheck
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["<PATH_TO>/memory-mcp/dist/index.js"],
      "env": {
        "MEMORY_FILE_PATH": "<PATH_TO>/memory.jsonl"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/memory-mcp/dist/index.js"]
    }
  }
}
```

## Core Concepts

### Entities

Primary nodes in the knowledge graph.

```typescript
interface Entity {
  name: string;           // Unique identifier
  entityType: string;     // Classification
  observations: string[]; // Facts about the entity
  parentId?: string;      // Parent entity name for hierarchical nesting
  tags?: string[];        // Lowercase tags for categorization
  importance?: number;    // 0-10 scale for prioritization
  createdAt?: string;     // ISO 8601 timestamp
  lastModified?: string;  // ISO 8601 timestamp
}
```

### Relations

Directed connections between entities.

```typescript
interface Relation {
  from: string;           // Source entity name
  to: string;             // Target entity name
  relationType: string;   // Relationship type (active voice)
  createdAt?: string;     // ISO 8601 timestamp
  lastModified?: string;  // ISO 8601 timestamp
}
```

### Observations

Discrete facts about entities. Each observation should be atomic and independently manageable.

## API Reference

### Complete Tool List (241 Tools)

> Tool count: 241 tools across 65 categories. The newest tools are documented at the end under the **Phase 15**, **Phase 16 (memoryjs v2.1.0)**, **v12.3.2 / v12.5.0**, and **v12.7.0 (memoryjs v3.0.0)** sections. For full per-tool schemas see [docs/architecture/API.md](docs/architecture/API.md) or `src/server/toolDefinitions.ts`.

#### Entity Operations (4 tools)
| Tool | Description |
|------|-------------|
| `create_entities` | Create multiple new entities |
| `delete_entities` | Remove entities and their relations |
| `read_graph` | Read entire knowledge graph |
| `open_nodes` | Retrieve specific nodes by name |

#### Relation Operations (2 tools)
| Tool | Description |
|------|-------------|
| `create_relations` | Create relations between entities |
| `delete_relations` | Remove specific relations |

#### Observation Management (3 tools)
| Tool | Description |
|------|-------------|
| `add_observations` | Add observations to entities |
| `delete_observations` | Remove specific observations |
| `normalize_observations` | Normalize observations (resolve pronouns, anchor dates) |

#### Search (7 tools)
| Tool | Description |
|------|-------------|
| `search_nodes` | Search with filters (tags, importance) |
| `search_by_date_range` | Filter by date range |
| `search_nodes_ranked` | TF-IDF relevance ranking |
| `boolean_search` | Boolean queries (AND/OR/NOT) |
| `fuzzy_search` | Typo-tolerant search |
| `get_search_suggestions` | "Did you mean?" suggestions |
| `search_auto` | Auto-select best search method |

#### Intelligent Search (3 tools)
| Tool | Description |
|------|-------------|
| `hybrid_search` | Multi-layer search combining semantic, lexical, and symbolic signals |
| `analyze_query` | Extract entities, temporal references, and classify query complexity |
| `smart_search` | Reflection-based iterative search until results meet adequacy threshold |

#### Semantic Search (3 tools)
| Tool | Description |
|------|-------------|
| `semantic_search` | Search by semantic similarity using embeddings |
| `find_similar_entities` | Find entities similar to a reference entity |
| `index_embeddings` | Build or rebuild the semantic search index |

#### Saved Searches (5 tools)
| Tool | Description |
|------|-------------|
| `save_search` | Save search query for reuse |
| `execute_saved_search` | Execute a saved search |
| `list_saved_searches` | List all saved searches |
| `delete_saved_search` | Delete a saved search |
| `update_saved_search` | Update saved search parameters |

#### Tag Management (6 tools)
| Tool | Description |
|------|-------------|
| `add_tags` | Add tags to an entity |
| `remove_tags` | Remove tags from an entity |
| `set_importance` | Set entity importance (0-10) |
| `add_tags_to_multiple_entities` | Bulk tag operation |
| `replace_tag` | Replace tag globally |
| `merge_tags` | Merge two tags into one |

#### Tag Aliases (5 tools)
| Tool | Description |
|------|-------------|
| `add_tag_alias` | Create tag synonym |
| `list_tag_aliases` | List all aliases |
| `remove_tag_alias` | Remove an alias |
| `get_aliases_for_tag` | Get aliases for canonical tag |
| `resolve_tag` | Resolve alias to canonical form |

#### Hierarchical Nesting (9 tools)
| Tool | Description |
|------|-------------|
| `set_entity_parent` | Set/remove parent relationship |
| `get_children` | Get immediate children |
| `get_parent` | Get parent entity |
| `get_ancestors` | Get all ancestors (parent chain) |
| `get_descendants` | Get all descendants (recursive) |
| `get_subtree` | Get entity + descendants with relations |
| `get_root_entities` | Get entities with no parent |
| `get_entity_depth` | Get depth in hierarchy |
| `move_entity` | Move entity to new parent |

#### Graph Algorithms (4 tools)
| Tool | Description |
|------|-------------|
| `find_shortest_path` | Shortest path between entities (BFS) |
| `find_all_paths` | All paths with max depth limit |
| `get_connected_components` | Detect isolated subgraphs |
| `get_centrality` | Calculate centrality metrics (degree, betweenness, PageRank) |

#### Graph Analytics (2 tools)
| Tool | Description |
|------|-------------|
| `get_graph_stats` | Comprehensive graph statistics |
| `validate_graph` | Validate graph integrity |

#### Compression & Archiving (4 tools)
| Tool | Description |
|------|-------------|
| `find_duplicates` | Find similar entities by threshold |
| `merge_entities` | Merge multiple entities into one |
| `compress_graph` | Auto compression with dry-run |
| `archive_entities` | Archive by age, importance, or tags |

#### Import & Export (2 tools)
| Tool | Description |
|------|-------------|
| `export_graph` | Export in 7 formats (JSON, CSV, GraphML, GEXF, DOT, Markdown, Mermaid) with compression |
| `import_graph` | Import from JSON/CSV/GraphML with merge strategies |

#### Ref Index (4 tools)
| Tool | Description |
|------|-------------|
| `register_ref` | Register a symbolic reference pointing to an entity |
| `resolve_ref` | Resolve a symbolic reference to its target entity |
| `deregister_ref` | Remove a registered symbolic reference |
| `list_refs` | List all registered symbolic references |

#### Artifacts (3 tools)
| Tool | Description |
|------|-------------|
| `create_artifact` | Create a named versioned content blob attached to an entity |
| `get_artifact` | Retrieve an artifact by name and optional version |
| `list_artifacts` | List all artifacts, optionally filtered by entity |

#### Temporal Search (1 tool)
| Tool | Description |
|------|-------------|
| `search_by_time` | Search entities and observations within a time window |

#### Distillation (1 tool)
| Tool | Description |
|------|-------------|
| `configure_distillation` | Configure automated observation distillation pipelines |

#### Freshness (5 tools)
| Tool | Description |
|------|-------------|
| `check_freshness` | Check freshness status of a specific entity |
| `get_stale_entities` | List entities that have exceeded their staleness threshold |
| `get_expired_entities` | List entities past their explicit expiry date |
| `refresh_entity` | Reset the freshness timestamp on an entity |
| `freshness_report` | Generate a full freshness report across the graph |

#### LLM Query (1 tool)
| Tool | Description |
|------|-------------|
| `query_natural_language` | Answer natural-language questions over the knowledge graph |

#### Governance (4 tools)
| Tool | Description |
|------|-------------|
| `governance_transaction` | Execute a governed, audited graph transaction |
| `audit_query` | Query the audit log with filters |
| `audit_history` | Retrieve full audit history for an entity |
| `rollback_operation` | Roll back a previously recorded operation |

#### Role Profiles (2 tools)
| Tool | Description |
|------|-------------|
| `set_agent_role` | Assign a role profile to the current agent context |
| `list_role_profiles` | List all available agent role profiles |

#### Entropy (2 tools)
| Tool | Description |
|------|-------------|
| `enable_entropy_filter` | Enable entropy-based noise filtering for search results |
| `compute_entropy` | Compute information-density entropy score for an entity |

#### Consolidation (3 tools)
| Tool | Description |
|------|-------------|
| `start_consolidation` | Start the background memory consolidation service |
| `stop_consolidation` | Stop the background memory consolidation service |
| `run_consolidation_now` | Trigger an immediate consolidation pass |

#### Formatter (1 tool)
| Tool | Description |
|------|-------------|
| `format_with_salience_budget` | Format context output respecting a token salience budget |

#### Collaborative (1 tool)
| Tool | Description |
|------|-------------|
| `synthesize_collaborative_context` | Synthesize a unified context view from multiple agent memory spaces |

#### Failure Handling (2 tools)
| Tool | Description |
|------|-------------|
| `distill_failure` | Distill and store key observations from a failed session |
| `end_session` | Gracefully end a session and persist in-flight state |

#### Cognitive Load (2 tools)
| Tool | Description |
|------|-------------|
| `analyze_cognitive_load` | Analyze working-memory load in the current context |
| `adaptive_reduce_memories` | Adaptively reduce memory set to fit cognitive load target |

#### Project Scoping (1 tool)
| Tool | Description |
|------|-------------|
| `list_projects` | List all project IDs present in the graph and filter entities by project |

#### Memory Versioning (2 tools)
| Tool | Description |
|------|-------------|
| `get_entity_versions` | Retrieve all versions of a versioned entity by name |
| `get_version_chain` | Get the full version chain from root to latest for an entity |

#### Semantic Forget (1 tool)
| Tool | Description |
|------|-------------|
| `forget_memory` | Delete an entity by exact name, falling back to semantic similarity if no exact match found |

#### Profiles (2 tools)
| Tool | Description |
|------|-------------|
| `get_profile` | Retrieve a user or agent profile entity |
| `update_profile` | Update observations and metadata on a profile entity |

#### Temporal KG (3 tools)
| Tool | Description |
|------|-------------|
| `invalidate_relation` | Mark a relation as ended by setting its temporal validity end date |
| `query_as_of` | Retrieve all relations for an entity that were valid at a given point in time |
| `timeline` | Return a chronological list of relation events for an entity |

#### Ingestion (1 tool)
| Tool | Description |
|------|-------------|
| `ingest` | Ingest a conversation, document, or free-form text into the knowledge graph |

#### Agent Diary (2 tools)
| Tool | Description |
|------|-------------|
| `diary_write` | Append an entry to the agent's persistent diary |
| `diary_read` | Read diary entries for an agent, optionally filtered by date range |

#### Entity Bitemporal Validity (5 tools) — Phase 15 / memoryjs η.4.4
| Tool | Description |
|------|-------------|
| `invalidate_entity` | Stamp `validUntil` on an entity (idempotent; entity remains queryable for past timestamps via `entity_as_of`) |
| `entity_as_of` | Time-travel query: returns entity state at a given ISO 8601 timestamp, or `null` if invalidated then |
| `entity_timeline` | All temporal versions of an entity in chronological order; integrates the v1.8 supersession chain |
| `invalidate_observation` | Per-observation invalidation via parallel `observationMeta[]` entry on the entity |
| `observations_as_of` | Filter observations valid at a given timestamp; observations without meta are treated as unbounded |

#### Optimistic Concurrency Control (1 tool) — Phase 15 / memoryjs η.5.5.c
| Tool | Description |
|------|-------------|
| `update_entity` | Update an entity with optional `expectedVersion`; throws `VersionConflictError` on stale version. OCC-guarded writes auto-increment `version`. Omit `expectedVersion` for legacy last-write-wins. |

#### RBAC (4 tools) — Phase 15 / memoryjs η.6.1
| Tool | Description |
|------|-------------|
| `rbac_assign_role` | Grant `reader` / `writer` / `admin` / `owner` (or custom) role to an agent; optional `resourceType`, `scope` prefix, `validFrom` / `validUntil` window |
| `rbac_revoke_role` | Remove a specific role assignment matched by `agentId + role + resourceType` |
| `rbac_check_permission` | Check whether an agent can perform `read` / `write` / `delete` / `manage` on a resource type; falls back to `defaultRole=reader` for unassigned agents |
| `rbac_list_assignments` | List all role assignments for an agent; optional `activeOnly` filter |

#### Procedural Memory (5 tools) — Phase 15 / memoryjs 3B.4
| Tool | Description |
|------|-------------|
| `add_procedure` | Persist an executable how-to sequence: 1-indexed steps with optional fallback chains and free-form trigger phrases |
| `get_procedure` | Load a procedure by id |
| `match_procedure` | Token-overlap match a context description against stored procedures; returns ranked Jaccard-like scores |
| `refine_procedure` | Apply caller feedback after execution; updates `successRate` via EWMA (α=0.2) |
| `get_procedure_step` | Load step by 1-indexed `order`, or get the next step relative to `currentOrder` |

#### Active Retrieval (1 tool) — Phase 15 / memoryjs 3B.5
| Tool | Description |
|------|-------------|
| `adaptive_retrieve` | Iterative query-rewriting retrieval (search → score coverage → rewrite); stops early when `coverage ≥ minCoverage`. Pure symbolic — no LLM provider required. |

#### Causal Reasoning (4 tools) — Phase 15 / memoryjs 3B.6
| Tool | Description |
|------|-------------|
| `find_causes` | Causal chains ending at the named effect; sorted by product-of-edge causalStrength |
| `find_effects` | Symmetric counterpart starting at the named cause |
| `counterfactual_query` | "If we remove edge (removeFrom → removeTo), is `predict` still reachable from `seed`?" Returns surviving chains. Pure: does not mutate the graph. |
| `detect_causal_cycles` | Detect cycles in the causal subgraph rooted at `seed` |

#### World Model (3 tools) — Phase 15 / memoryjs 3B.7
| Tool | Description |
|------|-------------|
| `get_world_state` | Capture a fresh snapshot of the live graph (capped at 1000 entities; over-cap prefers high-importance) |
| `validate_fact_against_world` | Validate a candidate observation against a target entity via `MemoryValidator.validateConsistency`. Returns `{result: null, reason: 'embedding_provider_unavailable'}` when the local embedding provider is selected without `@xenova/transformers` installed. |
| `predict_outcome` | Predict downstream effects of an action by walking the causal subgraph (delegates to `find_effects`) |

#### Phase 15 enhancements to existing tools
- **`export_graph`** — Now accepts `format: 'turtle' | 'rdf-xml' | 'json-ld'` for W3C Linked Data exports (memoryjs η.5.4) and `redactPii: true` to scrub PII (email / SSN / credit-card / phone / IPv4) from observations using the η.6.3 `PiiRedactor`.
- **`create_entities`** — Now accepts v1.6 freshness fields (`ttl`, `confidence`), v1.8 project scope (`projectId`), and η.4.4 bitemporal fields (`validFrom`, `validUntil`, `observationMeta`) per entity.
- **`set_memory_visibility`** — Auto-promotes plain entities to `AgentEntity` (stamps `agentId` / `memoryType` / `confidence`) instead of silently returning `null`. Supports η.5.5.b extensions (`allowedRoles`, `visibleFrom`, `visibleUntil`).

#### Tool Affordance (11 tools) — Phase 16 / memoryjs v2.1.0
| Tool | Description |
|------|-------------|
| `record_tool_outcome` | Record a tool call outcome (success/failure) into affordance stats |
| `get_tool_affordance_stats` | Per-tool success-rate and usage statistics |
| `suggest_tool` | Suggest the best tool for a task based on recorded affordances |
| `list_tool_affordances` | List all recorded tool affordances |
| `remove_tool_affordance` | Remove one tool's affordance record |
| `observe_tool_start` | `ToolCallObserver` lifecycle: mark a tool call started |
| `observe_tool_complete` | Mark an observed tool call completed successfully |
| `observe_tool_error` | Mark an observed tool call failed |
| `observe_tool_partial` | Mark an observed tool call partially successful |
| `observe_tool_cancel` | Cancel an in-flight tool observation |
| `tool_observer_in_flight_count` | Count of currently in-flight observed tool calls |

#### Heuristic Guidelines (10 tools) — Phase 16 / memoryjs v2.1.0
| Tool | Description |
|------|-------------|
| `add_heuristic` | Store a heuristic guideline ("when X, prefer Y") |
| `get_heuristic` | Fetch one heuristic by id |
| `list_heuristics` | List stored heuristics |
| `heuristic_count` | Count of stored heuristics |
| `match_heuristics` | Heuristics matching a context string |
| `reinforce_heuristic` | Strengthen a heuristic after successful application |
| `record_heuristic_contradiction` | Record evidence contradicting a heuristic |
| `detect_heuristic_conflicts` | Detect mutually contradictory heuristics |
| `remove_heuristic` | Remove one heuristic |
| `clear_heuristics` | Remove all heuristics |

#### Project Context (12 tools) — Phase 16 / memoryjs v2.1.0
| Tool | Description |
|------|-------------|
| `upsert_project_context` | Create/replace a project's structured context record |
| `get_project_context` | Fetch a project's context record |
| `append_project_fact` | Append a fact to a project context |
| `append_project_convention` | Append a coding/workflow convention |
| `append_project_command` | Append a named command (e.g. build/test invocations) |
| `append_project_glossary_term` | Append a glossary term + definition |
| `remove_project_fact` | Remove a fact by index/value |
| `remove_project_convention` | Remove a convention |
| `remove_project_command` | Remove a command |
| `remove_project_glossary_term` | Remove a glossary term |
| `clear_project_context` | Delete a project's context record |
| `format_project_context_for_llm` | Render the context as LLM-ready markdown |

#### Decision Rationale (10 tools) — Phase 16 / memoryjs v2.1.0
| Tool | Description |
|------|-------------|
| `propose_decision` | Record a proposed decision with rationale |
| `accept_decision` | Mark a decision accepted |
| `reject_decision` | Mark a decision rejected |
| `supersede_decision` | Supersede a decision with a newer one |
| `find_decisions_by_context` | Decisions matching a context string |
| `get_decision_chain` | Follow a decision's supersession chain |
| `list_decisions` | List decisions (filterable by status) |
| `get_decision` | Fetch one decision by id |
| `export_decision_as_adr_markdown` | Render a decision as ADR markdown |
| `parse_adr_markdown` | Parse ADR markdown back into a decision record |

#### Exclusion / `do_not_remember` (5 tools) — Phase 16 / memoryjs v2.1.0
| Tool | Description |
|------|-------------|
| `add_exclusion_rule` | Add a rule for content that must not be remembered |
| `list_exclusion_rules` | List exclusion rules |
| `remove_exclusion_rule` | Remove one exclusion rule |
| `check_exclusion` | Check whether a text would be excluded |
| `find_matching_memories_for_rule` | Existing memories matching an exclusion rule |

#### Observation Dedup (2 tools) — Phase 16 / memoryjs v2.1.0
| Tool | Description |
|------|-------------|
| `find_duplicate_observations` | Exact duplicate observations across entities |
| `find_jaccard_duplicate_observations` | Near-duplicates via Jaccard token similarity |

#### Spell Correction (3 tools) — Phase 16 / memoryjs v2.1.0
| Tool | Description |
|------|-------------|
| `spell_suggest` | "Did you mean?" suggestions for a query term |
| `spell_rebuild_vocabulary` | Rebuild the spell-check vocabulary from the graph |
| `spell_vocabulary_size` | Current vocabulary size |

#### Active Project Scope (2 tools) — v12.3.2
| Tool | Description |
|------|-------------|
| `set_project_scope` | Set the server's active project-scope filter (per-session mutable state) |
| `get_project_scope` | Get the active project scope (`{ projectId }`, null when unscoped) |

#### Engineering / Diagnostics (10 tools) — v12.5.0
| Tool | Description |
|------|-------------|
| `diag` | Server + storage diagnostic snapshot |
| `health` | Quick health check |
| `check_graph` | Graph integrity check |
| `reindex` | Rebuild search indexes |
| `cache_stats` | Stats for the global search caches |
| `cache_clear` | Bust all global search caches |
| `graph_size` | Entity/relation/observation counts + on-disk footprint |
| `inspect_entity` | Verbose single-entity snapshot (observations, relations, hierarchy) |
| `hierarchy_tree` | Hierarchy as nested JSON |
| `entity_neighbors` | Incoming/outgoing relations + degree counts for one entity |

#### Event Memory (5 tools) — v12.7.0 / memoryjs v3.0.0
| Tool | Description |
|------|-------------|
| `record_event` | Reify an action as an event hub entity with role-typed relations (`actor_of` / `targeted` / `occurred_in` / `participant_in`) and optional `flow:<key>` grouping |
| `get_event` | Load one event with its resolved role endpoints |
| `query_events` | Query by actor / target / action / flowKey / time range, chronologically ordered |
| `get_event_flow` | Full timeline of a named flow (e.g. a release or incident) |
| `who_did_what` | "Who did what (to target / in context / within range)?" join over events |

#### Reconstructive Memory (5 tools) — v12.7.0 / memoryjs v3.0.0
| Tool | Description |
|------|-------------|
| `ingest_dialogue` | Distill dialogue turns into the Cue–Tag–Content associative graph (also persisted into the live knowledge graph) |
| `reconstruct_memory` | Answer a query via active multi-step traversal; returns evidence + trajectory |
| `reconstructive_memory_stats` | CTC graph size statistics |
| `save_reconstructive_memory` | Serialize the CTC graph to a `<basename>-reconstructive.json` sidecar |
| `load_reconstructive_memory` | Restore the CTC graph from the sidecar (survives restarts) |

#### Relation Consolidation (2 tools) — v12.7.0 / memoryjs v3.0.0
| Tool | Description |
|------|-------------|
| `analyze_relation_duplicates` | Dry-run the three-tier relation janitor: spelling variants, inverse duplicates, semantic duplicates (with embeddings) |
| `consolidate_relations` | Apply tier 1+2 merges (`apply: true`) or dry-run (default) |

#### Agent Reflection (4 tools) — v12.7.0 / memoryjs v3.0.0
| Tool | Description |
|------|-------------|
| `create_reflection` | Persist an evidence-backed generalized lesson (scope: session / project / global) |
| `list_reflections` | List reflections, filterable by scope / source / confidence |
| `get_relevant_reflections` | Reflections relevant to a session (sourceSessionId + evidence overlap) |
| `archive_reflection` | Soft-delete a reflection out of default listings |

#### v12.7.0 enhancements to existing tools
- **`hybrid_search`** — Now accepts memoryjs v3's additive options: `graphWeight` (graph-connectivity channel via normalized PageRank), `expandNeighbors` (one-hop expansion of top results with damped scores), `explain` (annotate results with evidence paths from query anchors), and `lookFor` (rank expansion neighbors by a free-text connection description).

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMORY_FILE_PATH` | Path to storage file | `memory.jsonl` (current directory) |
| `MEMORY_STORAGE_TYPE` | Storage backend: `jsonl` or `sqlite` | `jsonl` |
| `MEMORY_EMBEDDING_PROVIDER` | Embedding provider: `openai`, `local`, or `none` | `none` |
| `MEMORY_OPENAI_API_KEY` | OpenAI API key (required if provider is `openai`) | - |
| `MEMORY_EMBEDDING_MODEL` | Embedding model to use | `text-embedding-3-small` (OpenAI) / `Xenova/all-MiniLM-L6-v2` (local) |
| `MEMORY_AUTO_INDEX_EMBEDDINGS` | Auto-index entities on creation | `false` |

### Storage Backends

| Feature | JSONL (Default) | SQLite (better-sqlite3) |
|---------|-----------------|-------------------------|
| Format | Human-readable text | Native binary database |
| Transactions | Basic | Full ACID with WAL mode |
| Full-Text Search | Basic | FTS5 with BM25 ranking |
| Performance | Good | 3-10x faster |
| Concurrency | Single-threaded | Thread-safe with async-mutex |
| Best For | Small graphs, debugging | Large graphs (10k+ entities) |

**Using SQLite:**

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/memory-mcp/dist/index.js"],
      "env": {
        "MEMORY_STORAGE_TYPE": "sqlite",
        "MEMORY_FILE_PATH": "/path/to/data/memory.db"
      }
    }
  }
}
```

### Storage Files

When you set `MEMORY_FILE_PATH`, the server automatically creates related files:

```
/your/data/directory/
├── memory.jsonl                    # Main knowledge graph
├── memory-saved-searches.jsonl     # Saved search queries
├── memory-tag-aliases.jsonl        # Tag synonym mappings
└── .backups/                       # Timestamped backups
    ├── backup_2026-01-08_10-30-00-123.jsonl
    └── backup_2026-01-08_10-30-00-123.jsonl.meta.json
```

### Migration Tool

Convert between JSONL and SQLite formats:

```bash
cd tools/migrate-from-jsonl-to-sqlite
npm install && npm run build

# JSONL to SQLite
node dist/migrate-from-jsonl-to-sqlite.js --from memory.jsonl --to memory.db

# SQLite to JSONL
node dist/migrate-from-jsonl-to-sqlite.js --from memory.db --to memory.jsonl
```

## Development

### Prerequisites

- Node.js 18+
- npm 9+
- TypeScript 5.6+

### Build Commands

```bash
npm install           # Install dependencies
npm run build         # Build TypeScript
npm test              # Run tests (791 tests across 36 files; ~85% coverage)
npm run typecheck     # Strict type checking
npm run watch         # Development watch mode
npm run clean         # Remove dist/ directory
npm run docs:deps     # Generate dependency graph
```

### Architecture

After the **Phase 13 extraction**, this repo is a thin MCP wrapper. All graph logic, managers, and storage live in [`@danielsimonjr/memoryjs`](https://www.npmjs.com/package/@danielsimonjr/memoryjs) (currently `^3.0.0`).

```
memory-mcp (this repo)              @danielsimonjr/memoryjs (npm dep)
┌──────────────────────────┐        ┌──────────────────────────────────┐
│  src/index.ts            │        │  ManagerContext (lazy init)      │
│  src/server/MCPServer.ts │───────▶│  EntityManager, RelationManager  │
│  src/server/toolDefs.ts  │imports │  SearchManager, IOManager, etc.  │
│  src/server/toolHandlers │        │  GraphStorage / SQLiteStorage    │
│  src/server/responseComp.│        │  StorageFactory + 100+ modules   │
└──────────────────────────┘        └──────────────────────────────────┘
       5 source files                  77+ source files (extracted)
       MCP protocol + dispatch         All graph + search + storage
```

| Layer | Lives in | Files |
|-------|----------|-------|
| MCP protocol (stdio transport, tool registration, dispatch) | `memory-mcp` | 5 |
| Tool schemas (241 tools across 65 categories) | `memory-mcp` (`toolDefinitions.ts`) | 1 |
| Handler registry + Zod validation + response compression | `memory-mcp` (`toolHandlers.ts` + `responseCompressor.ts`) | 2 |
| Managers (Entity / Relation / Search / IO / Tag / Hierarchy / Analytics / Compression / Archive / GraphTraversal / SemanticSearch / RankedSearch / etc.) | `memoryjs` | 100+ |
| Storage (JSONL + SQLite with FTS5 + StorageFactory + TransactionManager) | `memoryjs` | — |
| Embedding providers (OpenAI / local / none) + VectorStore | `memoryjs` | — |

### Project Structure

```
memory-mcp/
├── src/                                    # Source (5 TypeScript files)
│   ├── index.ts                            # Entry point: ManagerContext + start MCPServer; re-exports memoryjs types
│   └── server/
│       ├── MCPServer.ts                    # MCP Server setup, stdio transport, request handlers
│       ├── toolDefinitions.ts              # 241 tool schemas (name, description, inputSchema)
│       ├── toolHandlers.ts                 # Handler registry: validate args → call manager → format response
│       └── responseCompressor.ts           # Brotli + base64 wrapper for >256KB payloads
├── tests/                                  # Test suite (36 files, 791 tests, ~85% statement coverage)
│   ├── unit/                               # Unit tests (response compressor, tool defs, validate-fact handler)
│   ├── integration/                        # MCP server lifecycle
│   ├── e2e/tools/                          # Per-category tool tests + handler-smoke broad coverage
│   ├── knowledge-graph.test.ts             # Core graph operations (smoke against memoryjs)
│   └── file-path.test.ts                   # Storage path resolution
├── dist/                                   # Compiled output (rebuilt on `npm install` via `prepare`)
├── docs/                                   # Documentation
│   ├── architecture/                       # API.md, ARCHITECTURE.md, COMPONENTS.md, OVERVIEW.md, TEST_COVERAGE.md
│   ├── guides/                             # HIERARCHY.md, COMPRESSION.md, ARCHIVING.md, QUERY_LANGUAGE.md
│   ├── development/                        # WORKFLOW.md
│   ├── roadmap/                            # FUTURE_FEATURES.md, PERFORMANCE_AND_CAPABILITIES.md
│   └── reports/                            # Historical sprint reports
├── tools/                                  # Standalone utilities (each builds independently)
│   ├── chunking-for-files/                 # File splitting
│   ├── compress-for-context/               # CTON compression
│   ├── create-dependency-graph/            # Dependency analyzer
│   └── migrate-from-jsonl-to-sqlite/       # Storage backend converter
├── CHANGELOG.md                            # Version history
└── README.md                               # This file
```

### Dependencies

**Production** (3 direct deps — everything else is transitive via memoryjs):
- `@danielsimonjr/memoryjs`: ^1.15.0 — knowledge graph engine (storage, managers, search, embeddings, RBAC, OCC, bitemporal, causal, etc.)
- `@modelcontextprotocol/sdk`: ^1.21.1 — MCP protocol implementation
- `zod`: ^3.24.1 — runtime input validation (schemas re-exported from memoryjs)

**Development:**
- `typescript`: ^5.6.2
- `vitest`: ^4.0.13
- `@vitest/coverage-v8`: ^4.0.13
- `shx`: ^0.4.0 — cross-platform shell commands for `clean` script
- `@types/node`: ^22

> Note: `better-sqlite3`, `async-mutex`, `@danielsimonjr/workerpool`, and the embedding providers (OpenAI / `@xenova/transformers`) are **transitive deps via `@danielsimonjr/memoryjs`** since the Phase 13 extraction. They are not listed in this repo's `package.json`.

## Documentation

Comprehensive documentation in `docs/`:

**Architecture**
- [API.md](docs/architecture/API.md) - Complete API documentation for all 241 tools
- [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) - Technical architecture and system design
- [COMPONENTS.md](docs/architecture/COMPONENTS.md) - Component breakdown and responsibilities
- [OVERVIEW.md](docs/architecture/OVERVIEW.md) - High-level project overview
- [DEPENDENCY_GRAPH.md](docs/architecture/DEPENDENCY_GRAPH.md) - Module dependencies

**User Guides**
- [HIERARCHY.md](docs/guides/HIERARCHY.md) - Parent-child relationships (9 tools)
- [COMPRESSION.md](docs/guides/COMPRESSION.md) - Duplicate detection and merging
- [ARCHIVING.md](docs/guides/ARCHIVING.md) - Memory lifecycle and archiving
- [QUERY_LANGUAGE.md](docs/guides/QUERY_LANGUAGE.md) - Boolean search syntax

**Development**
- [WORKFLOW.md](docs/development/WORKFLOW.md) - Development procedures
- [MIGRATION.md](docs/guides/MIGRATION.md) - Version upgrade guide

## Companion skill

This plugin ships a `memory` skill (`memory-mcp:memory`, `/memory`) — a playbook over the knowledge-graph tools covering graph CRUD/search/maintenance, project indexing, and storage migration. See [skills/memory/SKILL.md](skills/memory/SKILL.md).

## Contributing

We welcome contributions!

**See:**
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Community standards

**Ways to Help:**
- Report bugs
- Request features
- Submit pull requests
- Improve documentation
- Add tests

## Changelog

All notable changes are documented in **[CHANGELOG.md](CHANGELOG.md)**.

**Current version**: v12.7.0 - [View full changelog](CHANGELOG.md)

Recent highlights:
- **v12.7.0** (241 tools): Upgraded `@danielsimonjr/memoryjs` `^2.8.1` → `^3.0.0` and surfaced its new features as 16 tools — event memory (5), reconstructive Cue–Tag–Content memory + snapshot persistence (5), relation consolidation (2), agent reflection (4) — plus v3 graph-channel / evidence-path options on `hybrid_search`. Refactored handlers onto the new `ManagerContext` accessors (`hybridSearchManager`, `governanceManager`, `eventManager`, `reflectionManager`, `reconstructiveMemory()`, `close()`).
- **v12.5.0** (225 tools): 10 engineering / diagnostic tools mirroring the memoryjs CLI surface (`diag`, `health`, `check_graph`, `reindex`, cache stats/clear, `graph_size`, `inspect_entity`, `hierarchy_tree`, `entity_neighbors`).
- **v12.3.2** (215 tools): Backport of the deferred `set_project_scope` / `get_project_scope` pair.
- **v12.3.0** (213 tools): **Phase 16** — 53 new tools surfacing memoryjs v2.1.0 across seven new manager surfaces: `do_not_remember` exclusion rules (5), decision rationale + ADR markdown dual-write (10), structured project context (12), heuristic guidelines (10), tool affordance + `ToolCallObserver` producer pipeline (11), observation dedup (2), spell correction (3). Bumped `@danielsimonjr/memoryjs` dep `^1.15.0` → `^2.1.0`.
- **v12.2.3**: Publishability — switched `@danielsimonjr/memoryjs` dep from local `file:` link to published `^1.15.0` (npm rejects `file:` deps for published packages).
- **v12.2.2**: Doc-only — roadmap completion audit grading Phase 6-15 status against current code.
- **v12.2.1**: Doc-only — comprehensive consistency pass across 68 markdown documents to align with v12.2.0's 160-tool surface.
- **v12.2.0** (160 tools): 23 new tools — entity bitemporal validity (η.4.4), OCC update (η.5.5.c), RBAC (η.6.1), procedural memory (3B.4), active retrieval (3B.5), causal reasoning (3B.6), world model (3B.7), plus W3C Linked Data exports (η.5.4) and PII redaction (η.6.3) wired into existing `export_graph`. Plus four pre-publish fixes from end-to-end MCP smoke testing (memoryjs v1.14+).
- **v12.1.0** (106 tools): 12 new tools — Project Scoping, Memory Versioning, Semantic Forget, Profiles, Temporal KG, Ingestion, Agent Diary (memoryjs v1.8.0/v1.9.0)
- **v12.0.0** (94 tools): 32 new tools — Ref Index, Artifacts, Temporal Search, Distillation, Freshness, LLM Query, Governance, Role Profiles, Entropy, Consolidation, Formatter, Collaborative, Failure Handling, Cognitive Load
- **v11.1.1**: npm tarball cleanup, excluded data files from published package
- **v11.1.0**: MCP error framing, dynamic server version, handler smoke tests, response compressor tests

## License

**MIT License** - see [LICENSE](LICENSE)

## Acknowledgments

### Original Project

Enhanced fork of [Model Context Protocol memory server](https://github.com/modelcontextprotocol/servers) by [Anthropic](https://www.anthropic.com/).

### Developer

**[Daniel Simon Jr.](https://github.com/danielsimonjr)**

### Major Enhancements

- Hierarchical nesting with parent-child relationships
- Graph algorithms: path finding, centrality, connected components
- Semantic search with embedding-based similarity
- Brotli compression for backups, exports, and responses
- Memory compression with intelligent duplicate detection
- Smart archiving with criteria-based filtering
- Advanced search: TF-IDF, boolean, and fuzzy matching
- Multi-format import/export with merge strategies
- SQLite backend with better-sqlite3 (3-10x faster)
- Transaction support with ACID guarantees
- Comprehensive test suite (791 tests, 36 test files in this wrapper repo; full-coverage core graph tests live in `@danielsimonjr/memoryjs`)

---

**Repository:** https://github.com/danielsimonjr/memory-mcp
**NPM:** https://www.npmjs.com/package/@danielsimonjr/memory-mcp
**Issues:** https://github.com/danielsimonjr/memory-mcp/issues
