# Memory MCP - Component Reference

**Version**: 12.7.0
**Last Updated**: 2026-07-26

> **⚠️ Partially historical** — The `core/`, `search/`, `features/`, `utils/`, `types/`, and `workers/` component sections below describe modules that moved into the [`@danielsimonjr/memoryjs`](https://github.com/danielsimonjr/memoryjs) library in the Phase 13 extraction. This repo now contains only the server layer (`src/index.ts` + `src/server/`, 5 files). The pre-extraction sections are preserved as a reference to the component design, which lives on in memoryjs.

---

## Table of Contents

1. [Overview](#overview)
2. [Server Components](#server-components)
3. [Core Components](#core-components)
4. [Search Components](#search-components)
5. [Feature Components](#feature-components)
6. [Utility Components](#utility-components)
7. [Type Definitions](#type-definitions)
8. [Component Dependencies](#component-dependencies)

---

## Overview

Memory MCP follows a layered architecture with specialized components:

```
┌─────────────────────────────────────────────────────────────┐
│  server/           │  MCP protocol handling (4 files)       │
├─────────────────────────────────────────────────────────────┤
│  core/             │  Central managers and storage (12 files)│
├─────────────────────────────────────────────────────────────┤
│  search/           │  Search implementations (29 files)     │
├─────────────────────────────────────────────────────────────┤
│  features/         │  Advanced capabilities (9 files)       │
├─────────────────────────────────────────────────────────────┤
│  utils/            │  Shared utilities (18 files)           │
├─────────────────────────────────────────────────────────────┤
│  types/            │  TypeScript definitions (2 files)      │
├─────────────────────────────────────────────────────────────┤
│  workers/          │  Worker pool utilities (2 files)       │
└─────────────────────────────────────────────────────────────┘
```

### Codebase Statistics (pre-Phase 13 extraction; current repo: 5 source files, ~7,700 lines, 241 tools)

| Metric | Count |
|--------|-------|
| Total TypeScript Files | 77 |
| Total Lines of Code | ~31,165 |
| Total Exports | 570 |
| Total Re-exports | 329 |
| Total Classes | 74 |
| Total Interfaces | 148 |
| Total Functions | 105 |
| Total Enums | 3 |
| Constants | 59 |

---

## Server Components

### MCPServer (`server/MCPServer.ts`)

**Purpose**: MCP protocol handling and request routing

**Lines**: 67 (reduced from 907 in v0.41.0)

```typescript
export class MCPServer {
  constructor(ctx: ManagerContext)
  async start(): Promise<void>
}
```

**Responsibilities**:
- Initialize MCP SDK server
- Register tool list handler (delegates to `toolDefinitions`)
- Register tool call handler (delegates to `toolHandlers`)
- Start stdio transport

**Dependencies**: `toolDefinitions`, `toolHandlers`, `ManagerContext`

---

### toolDefinitions (`server/toolDefinitions.ts`)

**Purpose**: Schema definitions for all 241 MCP tools

**Lines**: ~3695

```typescript
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const toolDefinitions: ToolDefinition[]
```

**Tool Categories**:

| Category | Count | Tools |
|----------|-------|-------|
| Entity | 4 | create_entities, delete_entities, read_graph, open_nodes |
| Relation | 2 | create_relations, delete_relations |
| Observation | 3 | add_observations, delete_observations, normalize_observations |
| Search | 7 | search_nodes, search_nodes_ranked, boolean_search, fuzzy_search, search_by_date_range, get_search_suggestions, search_auto |
| Intelligent Search | 3 | hybrid_search, analyze_query, smart_search |
| Semantic Search | 3 | semantic_search, find_similar_entities, index_embeddings |
| Saved Searches | 5 | save_search, execute_saved_search, list_saved_searches, delete_saved_search, update_saved_search |
| Tag Management | 6 | add_tags, remove_tags, set_importance, add_tags_to_multiple_entities, replace_tag, merge_tags |
| Tag Aliases | 5 | add_tag_alias, list_tag_aliases, remove_tag_alias, get_aliases_for_tag, resolve_tag |
| Hierarchy | 9 | set_entity_parent, get_children, get_parent, get_ancestors, get_descendants, get_subtree, get_root_entities, get_entity_depth, move_entity |
| Graph Algorithms | 4 | find_shortest_path, find_all_paths, get_connected_components, get_centrality |
| Analytics | 2 | get_graph_stats, validate_graph |
| Compression | 4 | find_duplicates, merge_entities, compress_graph, archive_entities |
| Import/Export | 2 | export_graph, import_graph |
| Ref Index | 4 | register_ref, resolve_ref, deregister_ref, list_refs |
| Artifacts | 3 | create_artifact, get_artifact, list_artifacts |
| Temporal Search | 1 | search_by_time |
| Distillation | 1 | configure_distillation |
| Freshness | 5 | check_freshness, get_stale_entities, get_expired_entities, refresh_entity, freshness_report |
| LLM Query | 1 | query_natural_language |
| Governance | 4 | governance_transaction, audit_query, audit_history, rollback_operation |
| Role Profiles | 2 | set_agent_role, list_role_profiles |
| Entropy | 2 | enable_entropy_filter, compute_entropy |
| Consolidation | 3 | start_consolidation, stop_consolidation, run_consolidation_now |
| Formatter | 1 | format_with_salience_budget |
| Collaborative | 1 | synthesize_collaborative_context |
| Failure Handling | 2 | distill_failure, end_session |
| Cognitive Load | 2 | analyze_cognitive_load, adaptive_reduce_memories |
| Project Scoping | 1 | list_projects |
| Memory Versioning | 2 | get_entity_versions, get_version_chain |
| Semantic Forget | 1 | forget_memory |
| Profiles | 2 | get_profile, update_profile |
| Temporal KG | 3 | invalidate_relation, query_as_of, timeline |
| Ingestion | 1 | ingest |
| Agent Diary | 2 | diary_write, diary_read |

---

### toolHandlers (`server/toolHandlers.ts`)

**Purpose**: Handler implementations for all 241 tools

**Lines**: ~3600

```typescript
export type ToolHandler = (
  ctx: ManagerContext,
  args: Record<string, unknown>
) => Promise<ToolResponse>;

export const toolHandlers: Record<string, ToolHandler>

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ManagerContext
): Promise<ToolResponse>
```

**Pattern**: Registry pattern - handlers registered by tool name

**Response Format**: All handlers use `formatToolResponse()` for consistent output

---

## Core Components

### ManagerContext (`core/ManagerContext.ts`)

**Purpose**: Central context holding all managers with lazy initialization

**Pattern**: Context Pattern with Lazy Initialization

**Alias**: Exported as `KnowledgeGraphManager` for backward compatibility

```typescript
export class ManagerContext {
  constructor(memoryFilePath: string)

  // Manager accessors (lazy-initialized via getters)
  get entityManager(): EntityManager
  get relationManager(): RelationManager
  get searchManager(): SearchManager
  get ioManager(): IOManager
  get tagManager(): TagManager

  // Direct storage access
  get storage(): GraphStorage
}

// Backward compatibility alias
export { ManagerContext as KnowledgeGraphManager }
```

**Lazy Initialization**:
```typescript
// Managers created on first access using ??= operator
private _entityManager?: EntityManager;
get entityManager(): EntityManager {
  return (this._entityManager ??= new EntityManager(this.storage));
}
```

**Managed Components** (7 lazy-initialized managers):
- **EntityManager**: Entity CRUD operations with validation
- **RelationManager**: Relation CRUD operations
- **ObservationManager**: Observation add/delete operations
- **HierarchyManager**: Parent-child entity relationships
- **SearchManager**: Search + compression + analytics
- **IOManager**: Import + export + backup functionality
- **TagManager**: Tag aliases and management

**Additional Core Classes:**
- **GraphStorage**: JSONL file I/O with caching
- **SQLiteStorage**: SQLite backend (better-sqlite3)
- **GraphTraversal**: Graph algorithms (BFS, DFS, shortest path, centrality)
- **TransactionManager**: Batch operations and transactions
- **GraphEventEmitter**: Event-driven updates for TF-IDF sync

---

### EntityManager (`core/EntityManager.ts`)

**Purpose**: Entity CRUD operations with validation, hierarchy, and archive functionality

**Note**: Consolidated from EntityManager + HierarchyManager + ArchiveManager in Sprint 11

```typescript
export class EntityManager {
  constructor(storage: GraphStorage)

  // Entity CRUD
  async createEntities(entities: Entity[]): Promise<Entity[]>
  async deleteEntities(entityNames: string[]): Promise<void>
  async addObservations(observations: {...}[]): Promise<{...}[]>
  async deleteObservations(deletions: {...}[]): Promise<void>

  // Tag operations
  async addTags(entityName, tags): Promise<{...}>
  async removeTags(entityName, tags): Promise<{...}>
  async setImportance(entityName, importance): Promise<{...}>
  async addTagsToMultipleEntities(entityNames, tags): Promise<{...}[]>
  async replaceTag(oldTag, newTag): Promise<{...}>
  async mergeTags(tag1, tag2, targetTag): Promise<{...}>

  // Hierarchy operations (merged from HierarchyManager)
  async setEntityParent(entityName, parentName): Promise<Entity>
  async getChildren(entityName): Promise<Entity[]>
  async getParent(entityName): Promise<Entity | null>
  async getAncestors(entityName): Promise<Entity[]>
  async getDescendants(entityName): Promise<Entity[]>
  async getSubtree(entityName): Promise<KnowledgeGraph>
  async getRootEntities(): Promise<Entity[]>
  async getEntityDepth(entityName): Promise<number>
  async moveEntity(entityName, newParentName): Promise<Entity>

  // Archive operations (merged from ArchiveManager)
  async archiveEntities(criteria: ArchiveCriteria, dryRun?): Promise<ArchiveResult>
}
```

**Key Features**:
- Automatic timestamp management (createdAt, lastModified)
- Tag normalization (lowercase)
- Importance validation (0-10 range)
- Batch operations (single I/O)
- Zod schema validation
- Cycle detection for hierarchy operations
- Cascading delete for children (optional)

**Constants** (internal, use `IMPORTANCE_RANGE` from `utils/constants.ts` externally):
- `MIN_IMPORTANCE = 0`
- `MAX_IMPORTANCE = 10`

---

### RelationManager (`core/RelationManager.ts`)

**Purpose**: Relation CRUD operations

```typescript
export class RelationManager {
  constructor(storage: GraphStorage)

  async createRelations(relations: Relation[]): Promise<Relation[]>
  async deleteRelations(relations: Relation[]): Promise<void>
}
```

**Key Features**:
- Automatic timestamp management
- Duplicate relation prevention
- Deferred integrity (relations to non-existent entities allowed)

---

### GraphStorage (`core/GraphStorage.ts`)

**Purpose**: File I/O with in-memory caching

```typescript
export class GraphStorage {
  constructor(memoryFilePath: string)

  async loadGraph(): Promise<KnowledgeGraph>
  async saveGraph(graph: KnowledgeGraph): Promise<void>
  invalidateCache(): void
}
```

**Key Features**:
- JSONL format (line-delimited JSON)
- In-memory cache with write-through invalidation
- Deep copy on cache reads (prevents mutation)
- Backward compatibility for missing timestamps

**Cache Behavior**:
- `loadGraph()`: Returns cached copy if available, else reads from disk
- `saveGraph()`: Writes to disk and invalidates cache
- Cache cleared on every write for consistency

---

## Search Components

### SearchManager (`search/SearchManager.ts`)

**Purpose**: Orchestrates all search types + compression + analytics

**Note**: Consolidated from SearchManager + CompressionManager + AnalyticsManager in Sprint 11

```typescript
export class SearchManager {
  constructor(storage: GraphStorage, savedSearchesFilePath: string)

  // Basic search
  async searchNodes(query, tags?, minImportance?, maxImportance?): Promise<KnowledgeGraph>
  async openNodes(names): Promise<KnowledgeGraph>
  async searchByDateRange(startDate?, endDate?, entityType?, tags?): Promise<KnowledgeGraph>

  // Advanced search
  async searchNodesRanked(query, tags?, min?, max?, limit?): Promise<SearchResult[]>
  async booleanSearch(query, tags?, min?, max?): Promise<KnowledgeGraph>
  async fuzzySearch(query, threshold?, tags?, min?, max?): Promise<KnowledgeGraph>

  // Suggestions
  async getSearchSuggestions(query, maxSuggestions?): Promise<string[]>

  // Saved searches
  async saveSearch(search): Promise<SavedSearch>
  async listSavedSearches(): Promise<SavedSearch[]>
  async executeSavedSearch(name): Promise<KnowledgeGraph>
  async deleteSavedSearch(name): Promise<boolean>
  async updateSavedSearch(name, updates): Promise<SavedSearch>

  // Compression operations (merged from CompressionManager)
  async findDuplicates(threshold?): Promise<string[][]>
  async mergeEntities(entityNames, targetName?): Promise<Entity>
  async compressGraph(threshold?, dryRun?): Promise<CompressionResult>

  // Analytics operations (merged from AnalyticsManager)
  async getGraphStats(): Promise<GraphStats>
  async validateGraph(): Promise<ValidationReport>
}
```

**Composed Components** (22 classes in search/):
- **BasicSearch**: Simple text matching with filters
- **RankedSearch**: TF-IDF relevance scoring
- **BooleanSearch**: AND/OR/NOT query parsing
- **FuzzySearch**: Levenshtein distance matching (uses workerpool)
- **SearchSuggestions**: "Did you mean?" suggestions
- **SavedSearchManager**: Saved search persistence
- **SearchFilterChain**: Unified filter logic for all search types
- **TFIDFIndexManager**: TF-IDF index persistence and updates
- **TFIDFEventSync**: Event-driven TF-IDF updates
- **QueryCostEstimator**: Query complexity estimation for search_auto
- **SemanticSearch**: Vector similarity search (optional embeddings)
- **OpenAIEmbeddingService**: OpenAI text-embedding-3-small provider
- **LocalEmbeddingService**: Local Xenova/all-MiniLM-L6-v2 provider
- **MockEmbeddingService**: Testing provider
- **InMemoryVectorStore**: In-memory vector storage
- **SQLiteVectorStore**: SQLite-backed vector storage
- **HybridSearchManager**: Three-layer hybrid search (semantic + lexical + symbolic)
- **QueryAnalyzer**: Query understanding + entity extraction + temporal parsing
- **QueryPlanner**: Query decomposition and execution planning
- **SymbolicSearch**: Metadata-based symbolic filtering
- **ReflectionManager**: Iterative result refinement for smart_search

---

### BasicSearch (`search/BasicSearch.ts`)

**Purpose**: Simple text matching with filters

**Algorithm**: Case-insensitive substring matching across name, entityType, observations

```typescript
export class BasicSearch {
  constructor(storage: GraphStorage)

  async searchNodes(query, tags?, minImportance?, maxImportance?): Promise<KnowledgeGraph>
  async openNodes(names): Promise<KnowledgeGraph>
  async searchByDateRange(startDate?, endDate?, entityType?, tags?): Promise<KnowledgeGraph>
}
```

---

### RankedSearch (`search/RankedSearch.ts`)

**Purpose**: TF-IDF relevance scoring

**Algorithm**: Term Frequency-Inverse Document Frequency

```typescript
export class RankedSearch {
  constructor(storage: GraphStorage)

  async searchNodesRanked(
    query: string,
    tags?: string[],
    minImportance?: number,
    maxImportance?: number,
    limit?: number
  ): Promise<SearchResult[]>
}
```

**Scoring**:
- Tokenizes query and entity content
- Calculates TF-IDF score per entity
- Returns sorted results with scores

---

### BooleanSearch (`search/BooleanSearch.ts`)

**Purpose**: Boolean query parsing and evaluation

**Syntax**: `AND`, `OR`, `NOT`, parentheses, field prefixes

```typescript
export class BooleanSearch {
  constructor(storage: GraphStorage)

  async booleanSearch(
    query: string,
    tags?: string[],
    minImportance?: number,
    maxImportance?: number
  ): Promise<KnowledgeGraph>
}
```

**Query Examples**:
- `Alice AND Bob`
- `name:Alice OR type:person`
- `NOT archived AND (project OR task)`

---

### FuzzySearch (`search/FuzzySearch.ts`)

**Purpose**: Typo-tolerant search using Levenshtein distance

```typescript
export class FuzzySearch {
  constructor(storage: GraphStorage)

  async fuzzySearch(
    query: string,
    threshold?: number,  // 0.0-1.0, default 0.7
    tags?: string[],
    minImportance?: number,
    maxImportance?: number
  ): Promise<KnowledgeGraph>
}
```

**Algorithm**: Levenshtein distance normalized to similarity score

---

### SearchFilterChain (`search/SearchFilterChain.ts`)

**Purpose**: Unified filter logic for all search implementations

```typescript
export interface SearchFilters {
  tags?: string[];
  minImportance?: number;
  maxImportance?: number;
  entityType?: string;
  createdAfter?: string;
  createdBefore?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
}

export class SearchFilterChain {
  static applyFilters(entities: Entity[], filters: SearchFilters): Entity[]
  static entityPassesFilters(entity: Entity, filters: SearchFilters): boolean
  static hasActiveFilters(filters: SearchFilters): boolean
  static filterAndPaginate(entities, filters, offset?, limit?): Entity[]
  static filterByTags(entities, tags?): Entity[]
  static filterByImportance(entities, min?, max?): Entity[]
}
```

**Benefits**:
- Eliminates ~65 lines of duplicate filter code per search implementation
- Consistent filtering behavior across all search types
- Short-circuit evaluation for performance
- Pre-normalizes tags once per filter operation

---

### HybridSearchManager (`search/HybridSearchManager.ts`)

**Purpose**: Three-layer hybrid search combining semantic, lexical, and symbolic signals (Phase 11)

```typescript
export class HybridSearchManager {
  constructor(
    storage: GraphStorage,
    semanticSearch?: SemanticSearch,
    tfidfManager?: TFIDFIndexManager
  )

  async search(
    query: string,
    options?: HybridSearchOptions
  ): Promise<HybridSearchResult>
}

export interface HybridSearchOptions {
  weights?: { semantic?: number; lexical?: number; symbolic?: number };
  filters?: SymbolicFilters;
  limit?: number;
  minScore?: number;
}
```

**Scoring Layers**:
- **Semantic**: Vector similarity via embeddings (default weight: 0.4)
- **Lexical**: TF-IDF/BM25 text matching (default weight: 0.4)
- **Symbolic**: Metadata filtering (default weight: 0.2)

---

### QueryAnalyzer (`search/QueryAnalyzer.ts`)

**Purpose**: Natural language query understanding and decomposition (Phase 11)

```typescript
export class QueryAnalyzer {
  analyze(query: string): QueryAnalysis
}

export interface QueryAnalysis {
  extractedEntities: ExtractedEntity[];
  temporalReferences: TemporalRange[];
  questionType: string;  // who, what, when, where, why, how, boolean, list
  complexity: string;    // simple, moderate, complex
  suggestedSearchMethods: string[];
}
```

**Capabilities**:
- Entity extraction from natural language
- Temporal expression parsing ("last week", "after January 2025")
- Question type classification
- Complexity estimation

---

### QueryPlanner (`search/QueryPlanner.ts`)

**Purpose**: Query decomposition and execution planning (Phase 11)

```typescript
export class QueryPlanner {
  constructor(analyzer: QueryAnalyzer)

  createPlan(query: string, analysis?: QueryAnalysis): QueryPlan
}

export interface QueryPlan {
  subQueries: SubQuery[];
  executionOrder: string[];
  estimatedComplexity: number;
}
```

---

### ReflectionManager (`search/ReflectionManager.ts`)

**Purpose**: Iterative result refinement for smart_search (Phase 11)

```typescript
export class ReflectionManager {
  constructor(
    hybridSearch: HybridSearchManager,
    analyzer: QueryAnalyzer
  )

  async search(
    query: string,
    options?: ReflectionOptions
  ): Promise<ReflectionResult>
}

export interface ReflectionOptions {
  maxIterations?: number;      // Default: 3
  targetAdequacy?: number;     // Default: 0.7
  filters?: SymbolicFilters;
}
```

**Algorithm**:
1. Analyze query with QueryAnalyzer
2. Execute initial hybrid search
3. Evaluate result adequacy
4. If below threshold, refine query and repeat
5. Return results with search process metadata

---

## Feature Components

### IOManager (`features/IOManager.ts`)

**Purpose**: Import, export, and backup functionality (consolidated)

**Note**: Consolidated from ExportManager + ImportManager + BackupManager in Sprint 11

```typescript
export class IOManager {
  constructor(storage: GraphStorage, backupDir?: string)

  // Export operations (from ExportManager)
  async exportGraph(format: ExportFormat, filter?): Promise<string>

  // Import operations (from ImportManager)
  async importGraph(
    format: 'json' | 'csv' | 'graphml',
    data: string,
    mergeStrategy?: 'replace' | 'skip' | 'merge' | 'fail',
    dryRun?: boolean
  ): Promise<ImportResult>

  // Backup operations (from BackupManager)
  async createBackup(): Promise<BackupInfo>
  async restoreBackup(backupId: string): Promise<void>
  async listBackups(): Promise<BackupInfo[]>
  async deleteBackup(backupId: string): Promise<void>
}

export type ExportFormat = 'json' | 'csv' | 'graphml' | 'gexf' | 'dot' | 'markdown' | 'mermaid';
```

**Supported Export Formats**:
| Format | Description |
|--------|-------------|
| json | Pretty-printed JSON |
| csv | Comma-separated values |
| graphml | XML-based graph format |
| gexf | Graph Exchange XML Format |
| dot | Graphviz DOT language |
| markdown | Human-readable markdown |
| mermaid | Mermaid diagram syntax |

**Merge Strategies** (for import):
- `replace`: Overwrite existing entities
- `skip`: Skip entities that exist
- `merge`: Combine observations and tags
- `fail`: Error if any conflicts

---

### TagManager (`features/TagManager.ts`)

**Purpose**: Tag aliases and synonyms

```typescript
export class TagManager {
  constructor(tagAliasesFilePath: string)

  async resolveTag(tag: string): Promise<string>
  async addTagAlias(alias, canonical, description?): Promise<TagAlias>
  async listTagAliases(): Promise<TagAlias[]>
  async removeTagAlias(alias): Promise<boolean>
  async getAliasesForTag(canonicalTag): Promise<string[]>
}
```

**Use Case**: Map synonyms to canonical tags (e.g., "js" → "javascript")

---

### ObservationNormalizer (`features/ObservationNormalizer.ts`)

**Purpose**: Observation normalization with coreference resolution and temporal anchoring (Phase 11)

```typescript
export class ObservationNormalizer {
  constructor(private keywordExtractor?: KeywordExtractor)

  normalize(
    entityName: string,
    observations: string[],
    options?: NormalizationOptions
  ): NormalizationResult
}

export interface NormalizationOptions {
  resolveCoreferences?: boolean;  // Default: true
  anchorDates?: boolean;          // Default: true
  extractKeywords?: boolean;      // Default: false
  referenceDate?: string;         // ISO 8601 date for temporal anchoring
}

export interface NormalizationResult {
  entityName: string;
  originalCount: number;
  normalizedCount: number;
  observations: Array<{
    original: string;
    normalized: string;
    keywords?: ScoredKeyword[];
  }>;
}
```

**Features**:
- **Coreference Resolution**: Replaces pronouns (he, she, they, it) with entity name
- **Temporal Anchoring**: Converts relative dates ("yesterday", "last week") to absolute ISO dates
- **Keyword Extraction**: Extracts significant keywords with TF-IDF-like scoring

---

### KeywordExtractor (`features/KeywordExtractor.ts`)

**Purpose**: Scored keyword extraction from text (Phase 11)

```typescript
export class KeywordExtractor {
  extract(text: string, topN?: number): ScoredKeyword[]
}

export interface ScoredKeyword {
  keyword: string;
  score: number;  // 0.0-1.0
}
```

**Algorithm**:
- Tokenizes text and filters stopwords
- Calculates term frequency scores
- Applies length and position bonuses
- Returns top N keywords by score

---

### Merged Managers (Historical Reference)

The following managers have been consolidated in Sprint 11:
- **HierarchyManager** → merged into EntityManager
- **ArchiveManager** → merged into EntityManager
- **CompressionManager** → merged into SearchManager
- **AnalyticsManager** → merged into SearchManager
- **ExportManager** → merged into IOManager
- **ImportManager** → merged into IOManager
- **BackupManager** → merged into IOManager

---

## Utility Components

The utils/ module contains 15 files with 20 classes and extensive utility functions.

### Key Utility Classes

| Class | File | Purpose |
|-------|------|---------|
| `CompressedCache` | compressedCache.ts | LRU cache with brotli compression |
| `NameIndex` | indexes.ts | O(1) entity lookup by name |
| `TypeIndex` | indexes.ts | O(1) entity grouping by type |
| `LowercaseCache` | indexes.ts | Cached lowercase entity data |
| `RelationIndex` | indexes.ts | Bidirectional relation lookup |
| `ObservationIndex` | indexes.ts | Inverted index for observation search |
| `SearchCache` | searchCache.ts | TTL-based search result caching |
| `TaskQueue` | taskScheduler.ts | Priority task queue with workerpool |

### Error Classes (12 total)

All errors extend `KnowledgeGraphError`:
- `EntityNotFoundError`, `RelationNotFoundError`
- `DuplicateEntityError`, `ValidationError`
- `CycleDetectedError`, `InvalidImportanceError`
- `FileOperationError`, `ImportError`, `ExportError`
- `InsufficientEntitiesError`, `OperationCancelledError`

### schemas (`utils/schemas.ts`)

**Purpose**: Zod validation schemas (26 schema constants)

**Key Schemas**:
- `EntitySchema`, `CreateEntitySchema`, `UpdateEntitySchema`
- `RelationSchema`, `CreateRelationSchema`
- `BatchCreateEntitiesSchema`, `BatchCreateRelationsSchema`
- `SearchQuerySchema`, `DateRangeSchema`
- `AddObservationsInputSchema`, `DeleteObservationsInputSchema`
- `ArchiveCriteriaSchema`, `SavedSearchInputSchema`
- `ImportFormatSchema`, `ExtendedExportFormatSchema`, `MergeStrategySchema`

### constants (`utils/constants.ts`)

**Purpose**: Centralized configuration values (16 constants + 1 function)

```typescript
export const SIMILARITY_WEIGHTS = { NAME: 0.4, TYPE: 0.3, OBSERVATIONS: 0.2, TAGS: 0.1 };
export const DEFAULT_DUPLICATE_THRESHOLD = 0.8;
export const SEARCH_LIMITS = { DEFAULT: 50, MAX: 1000 };
export const GRAPH_LIMITS = { MAX_ENTITIES: 10000, MAX_RELATIONS: 50000 };
export const COMPRESSION_CONFIG = { THRESHOLD: 262144, QUALITY: 6 };
export const STREAMING_CONFIG = { ENTITY_THRESHOLD: 5000, CHUNK_SIZE: 1000 };
export const EMBEDDING_DEFAULTS = { ... };
export const SEMANTIC_SEARCH_LIMITS = { ... };
export function getEmbeddingConfig(): EmbeddingConfig
```

### formatters (`utils/formatters.ts`)

**Purpose**: Response and pagination formatting (8 functions)

```typescript
export function formatToolResponse(data: unknown): ToolResponse
export function formatTextResponse(text: string): ToolResponse
export function formatRawResponse(content: unknown): ToolResponse
export function formatErrorResponse(error: string): ToolResponse
export function validatePagination(offset?, limit?): ValidatedPagination
export function applyPagination(array, pagination): T[]
export function paginateArray(array, offset?, limit?): T[]
export function getPaginationMeta(total, offset, limit): { ... }
```

### searchAlgorithms (`utils/searchAlgorithms.ts`)

**Purpose**: Text search algorithms (6 functions)

```typescript
export function levenshteinDistance(s1: string, s2: string): number
export function calculateTF(term: string, document: string): number
export function calculateIDF(term: string, documents: string[]): number
export function calculateIDFFromTokenSets(term: string, tokenSets: Set<string>[]): number
export function calculateTFIDF(term: string, doc: string, docs: string[]): number
export function tokenize(text: string): string[]
```

### entityUtils (`utils/entityUtils.ts`)

**Purpose**: Entity manipulation utilities (28 functions)

**Categories**:
- Entity lookup: `findEntityByName`, `findEntitiesByNames`, `entityExists`, `getEntityIndex`
- Tag utilities: `normalizeTag`, `normalizeTags`, `hasMatchingTag`, `filterByTags`
- Date utilities: `isWithinDateRange`, `parseDateRange`, `isValidISODate`, `getCurrentTimestamp`
- Filter utilities: `isWithinImportanceRange`, `filterByImportance`, `entityPassesFilters`
- Path utilities: `validateFilePath`, `ensureMemoryFilePath`, `defaultMemoryPath`

### compressionUtil (`utils/compressionUtil.ts`)

**Purpose**: Brotli compression utilities (10 functions)

```typescript
export function compress(data: Buffer, options?): Promise<Buffer>
export function decompress(data: Buffer): Promise<Buffer>
export function compressFile(inputPath, outputPath?, options?): Promise<string>
export function decompressFile(inputPath, outputPath?): Promise<string>
export function compressToBase64(data: string): Promise<string>
export function decompressFromBase64(data: string): Promise<string>
export function hasBrotliExtension(filename: string): boolean
export function getCompressionRatio(original: number, compressed: number): number
```

### taskScheduler (`utils/taskScheduler.ts`)

**Purpose**: Task scheduling and batch processing (6 functions + 1 class)

```typescript
export class TaskQueue { ... }
export function batchProcess(items, processor, options?): Promise<T[]>
export function rateLimitedProcess(items, processor, rateLimit): Promise<T[]>
export function withRetry(fn, maxRetries, delay?): Promise<T>
export function debounce(fn, delay): (...args) => void
export function throttle(fn, limit): (...args) => void
```

### operationUtils (`utils/operationUtils.ts`)

**Purpose**: Long-running operation utilities (5 functions)

```typescript
export function checkCancellation(signal?: AbortSignal): void
export function createProgressReporter(callback?, total?): (current, message?) => void
export function createProgress(current, total, phase?, message?): ProgressInfo
export function executeWithPhases(phases, options?): Promise<void>
export function processBatchesWithProgress(items, batchSize, processor, options?): Promise<T[]>
```

---

## Type Definitions

### Entity Types (`types/entity.types.ts`)

```typescript
interface Entity {
  name: string;
  entityType: string;
  observations: string[];
  parentId?: string;
  tags?: string[];
  importance?: number;
  createdAt?: string;
  lastModified?: string;
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
  createdAt?: string;
  lastModified?: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}
```

### Search Types (`types/search.types.ts`)

```typescript
interface SearchResult {
  entity: Entity;
  score: number;
  matchedFields: string[];
}

interface SavedSearch {
  name: string;
  query: string;
  searchType: 'basic' | 'ranked' | 'boolean' | 'fuzzy';
  filters?: SearchFilters;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}
```

### Analytics Types (`types/analytics.types.ts`)

```typescript
interface GraphStats {
  entityCount: number;
  relationCount: number;
  entityTypes: Record<string, number>;
  tagCounts: Record<string, number>;
  importanceDistribution: Record<number, number>;
}

interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

---

## Component Dependencies

```
┌──────────────────────────────────────────────────────────────┐
│  MCPServer                                                   │
│    └── ManagerContext (aliased as KnowledgeGraphManager)     │
│          ├── EntityManager ────────┐  (CRUD + hierarchy +    │
│          │                         │   archive)              │
│          ├── RelationManager ──────┤                         │
│          ├── SearchManager ────────┤  (search + compression  │
│          │     ├── BasicSearch ────┤   + analytics)          │
│          │     ├── RankedSearch ───┤                         │
│          │     ├── BooleanSearch ──┼──► GraphStorage         │
│          │     ├── FuzzySearch ────┤        │                │
│          │     ├── SavedSearchMgr ─┤        ▼                │
│          │     └── TFIDFIndexMgr ──┤   memory.jsonl          │
│          ├── IOManager ────────────┤  (import + export +     │
│          │                         │   backup)               │
│          └── TagManager ───────────► tag-aliases.jsonl       │
└──────────────────────────────────────────────────────────────┘
```

**Shared Dependencies**:
- All managers receive `GraphStorage` via dependency injection
- `SearchFilterChain` used by all search implementations
- `utils/schemas.ts` used for input validation across managers
- `utils/constants.ts` provides shared configuration (SIMILARITY_WEIGHTS)
- `utils/searchAlgorithms.ts` provides Levenshtein + TF-IDF algorithms

---

**Document Version**: 4.0
**Last Updated**: 2026-01-09
**Maintained By**: Daniel Simon Jr.
