# Memory MCP - System Architecture

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [System Context](#system-context)
4. [Component Architecture](#component-architecture)
5. [Data Model](#data-model)
6. [Key Design Decisions](#key-design-decisions)
7. [Data Flow Patterns](#data-flow-patterns)
8. [Performance Considerations](#performance-considerations)
9. [Security Architecture](#security-architecture)
10. [Testing Strategy](#testing-strategy)

---

## System Overview

Memory MCP is an enhanced Model Context Protocol (MCP) server that provides persistent knowledge graph storage with advanced features including:

- **Entity-Relation Knowledge Graph**: Store and query interconnected knowledge
- **Hierarchical Organization**: Parent-child entity relationships
- **Advanced Search**: Basic, ranked (TF-IDF), boolean, and fuzzy search
- **Compression**: Automatic duplicate detection and merging
- **Tagging & Importance**: Flexible categorization and prioritization
- **Timestamps**: Automatic tracking of creation and modification times
- **Batch Operations**: Efficient bulk updates

### Key Statistics

- **Tests**: Vitest runs unit, integration and end-to-end tests of the server layer. The tests of the core graph logic live in `@danielsimonjr/memoryjs`.
- **Source Files**: 5 TypeScript files in `src/`. All core graph logic lives in the `@danielsimonjr/memoryjs` library. `package.json` holds the version range of that library.
- **241 Tools**: The tools cover many categories. The categories include:
  - entity, search variants, semantic, graph algorithms, governance, freshness, sessions, decay/salience, multi-agent, dream engine, project scoping, memory versioning, temporal KG, ingestion, agent diary
  - **bitemporal validity** η.4.4, **OCC** η.5.5.c, **RBAC** η.6.1, **procedural memory** 3B.4, **active retrieval** 3B.5, **causal reasoning** 3B.6, **world model** 3B.7
  - **tool affordance**, **heuristic guidelines**, **project context**, **decision rationale**, **exclusions**, **observation dedup**
  - **spell correction**, **engineering/diagnostics**, **event memory**, **reconstructive memory + snapshot persistence**, **relation consolidation**, **agent reflection**
- **Lazy Initialization**: Managers in `ManagerContext` are created on first access. The accessors include `hybridSearchManager`, `governanceManager`, `graphRankPrior`, `eventManager`, `reflectionManager` and `reconstructiveMemory()`. The method `close()` releases the storage handles.
- **Search performance** (in memoryjs): BM25 search, parallel execution, query plan caching, embedding cache, incremental indexing.
- **Export**: The `export_graph` tool writes W3C Linked Data formats (Turtle / RDF/XML / JSON-LD — η.5.4) and redacts PII on request (η.6.3).
- **Hybrid search**: The `hybrid_search` tool has a graph-connectivity channel, one-hop neighbor expansion, and evidence-path explanations.

---

## Architecture Principles

### 1. Modularity
- **Single Responsibility**: Each module has one clear purpose
- **Loose Coupling**: Modules interact through well-defined interfaces
- **High Cohesion**: Related functionality grouped together

### 2. Testability
- **Dependency Injection**: Storage injected into managers
- **Pure Functions**: Utils are stateless and predictable
- **Test Layers**: Unit, integration and end-to-end tests cover the server layer (see Testing Strategy)

### 3. Performance
- **Single I/O Operations**: Batch operations use one read/write cycle
- **In-Memory Processing**: Load once, process in memory, save once
- **Efficient Algorithms**: TF-IDF for ranking, Levenshtein for fuzzy matching

### 4. Maintainability
- **TypeScript Strict Mode**: Full type safety
- **JSDoc Coverage**: 100% documentation on public APIs
- **Consistent Patterns**: Similar structure across managers

### 5. Security
- **Path Traversal Protection**: Validated storage paths
- **Input Validation**: Zod schemas for all inputs
- **No Code Injection**: Safe string handling, no eval

---

## System Context

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Client (Claude)                      │
└───────────────────────────┬──────────────────────────────────┘
                            │ MCP Protocol (JSON-RPC)
┌───────────────────────────┴──────────────────────────────────┐
│                   Memory MCP Server                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Layer 1: MCP Protocol Layer (server/)                 │ │
│  │  ┌──────────────┬─────────────────┬─────────────────┐  │ │
│  │  │ MCPServer.ts │ toolDefinitions │  toolHandlers   │  │ │
│  │  │   (67 LOC)   │   (55 schemas)  │ (301 lines)     │  │ │
│  │  └──────────────┴─────────────────┴─────────────────┘  │ │
│  └────────────────────────────┬───────────────────────────┘ │
│                               │ (direct manager access)     │
│  ┌────────────────────────────┴───────────────────────────┐ │
│  │  Layer 2: Manager Layer (Context + Lazy Init)          │ │
│  │  ManagerContext (aliased as KnowledgeGraphManager)     │ │
│  │  ┌──────────────┬────────────────┬──────────────────┐  │ │
│  │  │ core/        │ search/        │ features/        │  │ │
│  │  │ EntityMgr    │ SearchMgr      │ IOManager        │  │ │
│  │  │ (+hierarchy  │ (+compression  │ (import/export/  │  │ │
│  │  │  +archive)   │  +analytics)   │  backup)         │  │ │
│  │  │ RelationMgr  │ BasicSearch    │ TagMgr           │  │ │
│  │  │ TransactMgr  │ RankedSearch   │                  │  │ │
│  │  │ StorageFact. │ BooleanSearch  │                  │  │ │
│  │  │              │ FuzzySearch    │                  │  │ │
│  │  │              │ FilterChain    │                  │  │ │
│  │  └──────────────┴────────────────┴──────────────────┘  │ │
│  └────────────────────────────┬───────────────────────────┘ │
│                               │                              │
│  ┌────────────────────────────┴───────────────────────────┐ │
│  │  Layer 3: Storage Layer                                │ │
│  │  GraphStorage (JSONL, in-memory cache)                 │ │
│  └────────────────────────────┬───────────────────────────┘ │
└───────────────────────────────┼──────────────────────────────┘
                                │ File System I/O
                    ┌───────────┴───────────┐
                    │    JSONL Storage      │
                    │ ┌───────────────────┐ │
                    │ │ memory.jsonl      │ │
                    │ │ *-saved-searches  │ │
                    │ │ *-tag-aliases     │ │
                    │ └───────────────────┘ │
                    └───────────────────────┘
```

### External Actors

1. **MCP Client (Claude)**: AI assistant using MCP protocol to interact with memory
2. **File System**: Persistent storage for knowledge graph (JSONL format)
3. **Developer**: Maintains and extends the server

---

## Component Architecture

### Layer 1: MCP Protocol Layer (server/)

**Responsibility**: Request routing and MCP protocol handling

The MCP protocol layer is split into three focused modules:

#### MCPServer.ts (67 lines)
```typescript
export class MCPServer {
  private server: Server;
  private manager: KnowledgeGraphManager;

  constructor(manager: KnowledgeGraphManager) {
    this.manager = manager;
    this.server = new Server(
      { name: "memory-server", version: "0.8.0" },
      { capabilities: { tools: {} } }
    );
    this.registerToolHandlers();
  }

  private registerToolHandlers() {
    // Delegate to toolDefinitions and toolHandlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: toolDefinitions
    }));
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return handleToolCall(name, args || {}, this.manager);
    });
  }
}
```

#### toolDefinitions.ts (~400 lines)
Contains all 47 tool schemas organized by category:
- Entity Tools (4): create_entities, delete_entities, read_graph, open_nodes
- Relation Tools (2): create_relations, delete_relations
- Observation Tools (2): add_observations, delete_observations
- Search Tools (6): search_nodes, search_by_date_range, search_nodes_ranked, boolean_search, fuzzy_search, get_search_suggestions
- Saved Search Tools (5): save_search, execute_saved_search, list_saved_searches, delete_saved_search, update_saved_search
- Tag Tools (6): add_tags, remove_tags, set_importance, add_tags_to_multiple_entities, replace_tag, merge_tags
- Tag Alias Tools (5): add_tag_alias, list_tag_aliases, remove_tag_alias, get_aliases_for_tag, resolve_tag
- Hierarchy Tools (9): set_entity_parent, get_children, get_parent, get_ancestors, get_descendants, get_subtree, get_root_entities, get_entity_depth, move_entity
- Analytics Tools (2): get_graph_stats, validate_graph
- Compression Tools (4): find_duplicates, merge_entities, compress_graph, archive_entities
- Import/Export Tools (2): export_graph, import_graph

#### toolHandlers.ts (~200 lines)
```typescript
export const toolHandlers: Record<string, ToolHandler> = {
  create_entities: async (manager, args) =>
    formatToolResponse(await manager.createEntities(args.entities as any[])),
  // ... 47 handlers total
};

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  manager: KnowledgeGraphManager
): Promise<ToolResponse> {
  const handler = toolHandlers[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(manager, args);
}
```

**Design Patterns**:
- **Facade Pattern**: Simple interface to complex subsystems
- **Registry Pattern**: Handler lookup by tool name
- **Separation of Concerns**: Definitions, handlers, and server logic isolated

### Layer 2: Manager Layer

#### ManagerContext (core/ManagerContext.ts)

**Responsibility**: Central context holding all managers with lazy initialization

**Alias**: Exported as `KnowledgeGraphManager` for backward compatibility

```typescript
export class ManagerContext {
  private readonly storage: GraphStorage;

  // Lazy-initialized managers (instantiated on first access)
  private _entityManager?: EntityManager;
  private _relationManager?: RelationManager;
  private _searchManager?: SearchManager;
  private _ioManager?: IOManager;
  private _tagManager?: TagManager;

  constructor(memoryFilePath: string) {
    this.storage = new GraphStorage(memoryFilePath);
    // Managers initialized lazily via getters
  }

  // Lazy getter example
  get entityManager(): EntityManager {
    return (this._entityManager ??= new EntityManager(this.storage));
  }
}

// Backward compatibility alias
export { ManagerContext as KnowledgeGraphManager }
```

**Key Features**:
- **Context Pattern**: Single holder for all manager instances
- **Lazy Initialization**: Managers created on-demand using `??=` (nullish coalescing assignment)
- **Dependency Injection**: GraphStorage injected into all managers
- **5 Specialized Managers** (consolidated from 10):
  - EntityManager (CRUD + hierarchy + archive)
  - RelationManager (relation CRUD)
  - SearchManager (search + compression + analytics)
  - IOManager (import + export + backup)
  - TagManager (tag aliases)

**Lazy Initialization Benefits**:
- Faster startup (no upfront manager creation)
- Reduced memory for unused features
- Cleaner separation of concerns

#### EntityManager (core/EntityManager.ts)

**Responsibility**: Entity CRUD operations

```typescript
class EntityManager {
  constructor(private storage: GraphStorage)

  // Core Operations
  async createEntities(entities: Entity[]): Promise<Entity[]>
  async getEntity(name: string): Promise<Entity | null>
  async updateEntity(name: string, updates: Partial<Entity>): Promise<Entity>
  async deleteEntities(names: string[]): Promise<void>
  async batchUpdate(updates: Array<{name, updates}>): Promise<Entity[]>
}
```

**Key Features**:
- Automatic timestamp management (createdAt, lastModified)
- Duplicate entity prevention
- Batch update operations (single I/O)
- Tag normalization (lowercase)
- Validation using Zod schemas

#### RelationManager (core/RelationManager.ts)

**Responsibility**: Relation CRUD operations

```typescript
class RelationManager {
  constructor(private storage: GraphStorage)

  // Core Operations
  async createRelations(relations: Relation[]): Promise<Relation[]>
  async getRelations(entityName: string): Promise<{incoming, outgoing}>
  async deleteRelations(relations: Relation[]): Promise<void>
}
```

**Key Features**:
- Automatic timestamp management
- Duplicate relation prevention
- Deferred integrity (relations to non-existent entities allowed)
- Cascading updates on relation changes
- Bidirectional relation tracking

#### SearchManager (search/*)

**Responsibility**: Multiple search strategies

```typescript
// BasicSearch - Text matching with filters
class BasicSearch {
  async searchNodes(query, tags?, minImportance?, maxImportance?): Promise<KnowledgeGraph>
  async openNodes(names: string[]): Promise<KnowledgeGraph>
  async searchByDateRange(start?, end?, entityType?, tags?): Promise<KnowledgeGraph>
}

// RankedSearch - TF-IDF scoring
class RankedSearch {
  async searchNodesRanked(query, tags?, minImportance?, maxImportance?, limit?): Promise<SearchResult[]>
}

// BooleanSearch - AND/OR/NOT logic
class BooleanSearch {
  async booleanSearch(query: string): Promise<KnowledgeGraph>
}

// FuzzySearch - Typo tolerance
class FuzzySearch {
  async fuzzySearch(query, threshold?, tags?, minImportance?, maxImportance?): Promise<KnowledgeGraph>
}
```

**Key Features**:
- Multiple search strategies for different use cases
- TF-IDF scoring for relevance ranking
- Boolean query parsing (AND, OR, NOT, parentheses)
- Levenshtein distance for fuzzy matching
- Combined filtering (tags, importance, dates)

#### SearchFilterChain (search/SearchFilterChain.ts)

**Responsibility**: Unified filter logic for all search implementations

```typescript
export class SearchFilterChain {
  // Apply all filters (tags, importance, dates, entityType)
  static applyFilters(entities: Entity[], filters: SearchFilters): Entity[]

  // Check if entity passes all filters (short-circuits on first failure)
  static entityPassesFilters(entity: Entity, filters: SearchFilters): boolean

  // Validate and apply pagination
  static filterAndPaginate(entities: Entity[], filters: SearchFilters, offset?: number, limit?: number): Entity[]
}
```

**Benefits**:
- Eliminates ~65 lines of duplicate filter code across 4 search implementations
- Consistent filtering behavior across all search types
- Short-circuit evaluation for performance
- Pre-normalizes tags once for efficiency

#### CompressionManager (features/CompressionManager.ts)

**Responsibility**: Duplicate detection and merging

```typescript
class CompressionManager {
  async findDuplicates(threshold): Promise<string[][]>
  async mergeEntities(entityNames, targetName?): Promise<Entity>
  async compressGraph(threshold, dryRun): Promise<CompressionResult>
}
```

**Key Features**:
- Two-level similarity bucketing for performance
- Configurable similarity threshold (0.0 - 1.0)
- Smart observation and tag merging
- Relation transfer to merged entity
- Dry-run mode for preview

**Algorithm**:
1. Bucket entities by entityType (fast filter)
2. Calculate similarity within buckets (weighted scoring)
3. Merge entities above threshold
4. Transfer relations and delete originals

### Layer 3: Storage

#### GraphStorage (core/GraphStorage.ts)

**Responsibility**: File I/O and caching

```typescript
class GraphStorage {
  constructor(private filePath: string)

  async loadGraph(): Promise<KnowledgeGraph>
  async saveGraph(graph: KnowledgeGraph): Promise<void>
}
```

**Key Features**:
- JSONL format (line-delimited JSON)
- In-memory caching
- Atomic writes (write to temp, then rename)
- Path traversal protection
- Error recovery

### Layer 4: Utilities

#### Validation (utils/schemas.ts)

**Zod Schemas**:
- EntitySchema, CreateEntitySchema, UpdateEntitySchema
- RelationSchema, CreateRelationSchema
- SearchQuerySchema, DateRangeSchema
- Batch operation schemas (max 1000 items)

**Validation Rules**:
- Entity names: 1-500 characters (trimmed)
- Entity types: 1-100 characters (trimmed)
- Observations: 1-5000 characters each
- Tags: 1-100 characters each (normalized to lowercase)
- Importance: 0-10 (integer)
- Timestamps: ISO 8601 format

#### Text Processing (utils/*)

```typescript
// Levenshtein Distance
function levenshteinDistance(s1: string, s2: string): number

// TF-IDF Scoring
function calculateTF(term: string, document: string): number
function calculateIDF(term: string, documents: string[]): number
function calculateTFIDF(term: string, document: string, documents: string[]): number

// Date Utilities
function isWithinDateRange(date: string, start?: string, end?: string): boolean
```

---

## Data Model

### Entity

```typescript
interface Entity {
  name: string;              // Unique identifier (1-500 chars)
  entityType: string;        // Category (e.g., "person", "project")
  observations: string[];    // Free-form text descriptions
  createdAt: string;         // ISO 8601 timestamp
  lastModified: string;      // ISO 8601 timestamp
  tags?: string[];           // Optional categorization (lowercase)
  importance?: number;       // Optional 0-10 priority
  parentId?: string;         // Optional hierarchical parent
}
```

### Relation

```typescript
interface Relation {
  from: string;              // Source entity name
  to: string;                // Target entity name
  relationType: string;      // Relation type (e.g., "works_at")
  createdAt: string;         // ISO 8601 timestamp
  lastModified: string;      // ISO 8601 timestamp
}
```

### Knowledge Graph

```typescript
interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}
```

**Storage Format** (JSONL):
```jsonl
{"entities":[...],"relations":[...]}
```

---

## Key Design Decisions

### 1. Why JSONL Format?

**Decision**: Use line-delimited JSON (JSONL) for storage

**Rationale**:
- **Simplicity**: Human-readable, standard format
- **Debugging**: Easy to inspect and modify
- **Portability**: Works across all platforms
- **Single-File**: Entire graph in one file
- **Atomic Writes**: Easier to ensure consistency

**Alternatives Considered**:
- **SQLite**: More complex, overhead for small graphs
- **JSON**: Same benefits, JSONL is more future-proof for streaming
- **Binary**: Faster but not human-readable

**Trade-offs**:
- ✅ Simplicity, portability, debuggability
- ❌ Not optimal for very large graphs (>100k entities)

### 2. Why In-Memory Processing?

**Decision**: Load entire graph into memory, process, then save

**Rationale**:
- **Performance**: Orders of magnitude faster than iterative I/O
- **Simplicity**: No need for complex streaming logic
- **Consistency**: Atomic operations on full graph
- **Small Graphs**: Typical use case is <10k entities

**Performance Impact**:
- 1000 entities: ~20MB memory, <500ms load time
- 5000 entities: ~100MB memory, <2s load time

**Alternatives Considered**:
- **Streaming**: Complex, slower for typical use cases
- **Database**: Overhead, external dependency

### 3. Why Modular Architecture?

**Decision**: Separate managers for entities, relations, search, compression

**Rationale**:
- **Single Responsibility**: Each manager has one clear purpose
- **Testability**: Easier to test in isolation
- **Maintainability**: Changes localized to specific managers
- **Extensibility**: Easy to add new managers

**Example Structure**:
```
core/
  EntityManager.ts      (entity CRUD)
  RelationManager.ts    (relation CRUD)
  GraphStorage.ts       (file I/O)
search/
  BasicSearch.ts        (text search)
  RankedSearch.ts       (TF-IDF)
  BooleanSearch.ts      (boolean logic)
  FuzzySearch.ts        (typo tolerance)
features/
  CompressionManager.ts (duplicate detection)
  TagManager.ts         (tag operations)
  ExportManager.ts      (export formats)
```

### 4. Why Two-Level Bucketing for Duplicates?

**Decision**: First bucket by entityType, then calculate similarity within buckets

**Rationale**:
- **Performance**: O(n²) → O(n²/k) where k is number of types
- **Accuracy**: Entities of different types rarely duplicates
- **Simplicity**: Easy to understand and maintain

**Algorithm**:
```typescript
1. Group entities by entityType
2. For each group:
   a. Calculate pairwise similarity
   b. Find pairs above threshold
3. Merge duplicate pairs
```

**Performance**:
- 1000 entities, 10 types: 100x speedup over naive approach
- 100 entities of same type: <300ms

### 5. Why Deferred Integrity?

**Decision**: Allow relations to non-existent entities

**Rationale**:
- **Flexibility**: Create relations before entities exist
- **Import/Export**: Easier to reconstruct graphs
- **Performance**: No need to validate existence on every operation

**Trade-off**:
- ✅ Flexibility, performance
- ❌ Potential for dangling relations

**Mitigation**:
- Documentation clearly states behavior
- Export/import tools handle cleanup
- The `check_graph` tool reports dangling relations on request. It repairs them when `apply` is true

---

## Data Flow Patterns

### Pattern 1: Create Entities

```
Client Request
    ↓
MCP Handler (index.ts)
    ↓
EntityManager.createEntities()
    ↓
1. Validate input (Zod schema)
2. Load graph from storage
3. Filter duplicates
4. Add timestamps
5. Normalize tags
6. Add entities to graph
7. Save graph to storage
    ↓
Return created entities
    ↓
MCP Response to Client
```

**I/O Operations**: 1 read + 1 write (total: 2)

### Pattern 2: Batch Update

```
Client Request
    ↓
MCP Handler (index.ts)
    ↓
EntityManager.batchUpdate()
    ↓
1. Validate all updates
2. Load graph (once)
3. For each update:
   a. Find entity
   b. Apply changes
   c. Update lastModified
4. Save graph (once)
    ↓
Return updated entities
    ↓
MCP Response to Client
```

**I/O Operations**: 1 read + 1 write (total: 2)
**Performance**: ~200ms for 100 updates

### Pattern 3: Search with Ranking

```
Client Request
    ↓
MCP Handler (index.ts)
    ↓
RankedSearch.searchNodesRanked()
    ↓
1. Load graph
2. Tokenize query
3. For each entity:
   a. Calculate TF-IDF score
   b. Apply filters (tags, importance)
4. Sort by score
5. Apply limit
6. Return results
    ↓
MCP Response to Client
```

**I/O Operations**: 1 read (total: 1)
**Performance**: ~600ms for 500 entities

### Pattern 4: Compress Duplicates

```
Client Request
    ↓
MCP Handler (index.ts)
    ↓
CompressionManager.compressGraph()
    ↓
1. Load graph
2. Bucket by entityType
3. For each bucket:
   a. Calculate pairwise similarity
   b. Find duplicates (threshold)
4. For each duplicate pair:
   a. Merge observations, tags
   b. Transfer relations
   c. Delete original
5. Save graph
    ↓
Return compression results
    ↓
MCP Response to Client
```

**I/O Operations**: 1 read + 1 write (total: 2)
**Performance**: ~400ms for 100 entities

---

## Performance Considerations

### Optimization Strategies

1. **Batch Operations**: Single I/O cycle for multiple operations
2. **In-Memory Caching**: Graph cached with write-through invalidation
3. **Efficient Algorithms**: TF-IDF, Levenshtein with early termination
4. **Bucketing**: Reduce O(n²) to O(n²/k) for similarity
5. **Lazy Manager Initialization**: Managers are created on demand using `??=`
6. **Unified Filter Logic**: SearchFilterChain eliminates duplicate code
7. **Modular Server**: `MCPServer` is separate from the tool definitions and the tool handlers

### Scalability Limits

**Current Design**:
- ✅ 0-2000 entities: Excellent performance
- ✅ 2000-5000 entities: Good performance
- ⚠️  5000-10000 entities: Acceptable performance
- ❌ 10000+ entities: Consider redesign (streaming, database)

---

## Security Architecture

### Input Validation

**All inputs validated using Zod schemas**:
```typescript
// Example: Entity creation
const entities = BatchCreateEntitiesSchema.parse(input);
// Throws ValidationError if invalid
```

**Validation Rules**:
- Max lengths: Prevent memory exhaustion
- Required fields: Ensure data integrity
- Type checking: Prevent injection attacks
- Trimming/normalization: Consistent data

### Path Traversal Protection

```typescript
// Validate storage path
const resolvedPath = path.resolve(filePath);
const baseDir = path.resolve('.');
if (!resolvedPath.startsWith(baseDir)) {
  throw new SecurityError('Path traversal attempt');
}
```

### No Code Injection

- No `eval()` or `Function()` calls
- No dynamic `require()` calls
- Safe string handling (no template injection)
- Boolean query parser uses safe tokenization

### Error Handling

```typescript
try {
  // Operation
} catch (error) {
  // Log error (DEBUG mode only)
  // Return sanitized error to client
  // No sensitive information exposed
}
```

---

## Testing Strategy

The tests in this package cover the server layer. They test the tool definitions, the tool handlers, the response compressor, the file-path logic and the MCP protocol. The tests of the graph logic live in `@danielsimonjr/memoryjs`. Vitest runs all tests from `tests/`.

### Test Layout

| Directory | Scope |
|-----------|-------|
| `tests/e2e/tools/` | One file for each group of tools, and a smoke test of the handlers. Each test calls the tool handlers and checks the responses. |
| `tests/integration/` | `server.test.ts` tests the `MCPServer` class. `mcp-2-protocol.test.ts` tests the MCP 2026-07-28 protocol revision. |
| `tests/unit/` | The response compressor, the read-only contract of `loadGraph()`, and the native-install probe of the migrate tool. |
| `tests/unit/server/` | The contract of the tool schemas, and the handler of `validate_fact_against_world`. |
| `tests/` | `ensureMemoryFilePath` and `KnowledgeGraphManager`. |

`TEST_COVERAGE.md` in this directory is a generated map from each source file to its test files.

### Coverage

The `test` script prints a V8 coverage table for `src/`. Read the figures from that table. This document does not copy the figures, because each test change moves them.

### Continuous Integration

```bash
# Run all tests with a coverage report
npm test

# Type checking
npm run typecheck

# Regenerate the dependency and test coverage reports
npm run docs:deps
```

---

## Conclusion

The Memory MCP architecture prioritizes:
- ✅ **Simplicity**: Easy to understand and maintain
- ✅ **Performance**: Efficient for typical use cases (<5000 entities)
- ✅ **Testability**: Unit, integration and end-to-end tests of the server layer
- ✅ **Security**: Input validation, path protection
- ✅ **Extensibility**: Modular design, clear interfaces
- ✅ **Context Efficiency**: Optimized for AI assistant token usage

---

## Verification

Generated 2026-10-16 by `repo-tools map`.
Regenerate the generated reports: `npm run docs:deps` · Check: `repo-tools check . --docs=docs/architecture`

The claims below come from `repo-tools map .`, which reads the whole repository. The generated reports in this directory
come from `tools/create-dependency-graph`, which reads `src/` and the tests. Their counts differ for that reason.

| Claim | Value | Source |
|---|---|---|
| totalSourceFiles | 63 | repo-tools map (whole repository) |
| runtimeCircularDeps | 0 | repo-tools map (whole repository) |
| typeOnlyCircularDeps | 0 | repo-tools map (whole repository) |

**Both circular-dependency counts are 0 and the search was not truncated**
(`circularDepsTruncated: false`). The counts are true zeros, not the result of an unfinished search.
