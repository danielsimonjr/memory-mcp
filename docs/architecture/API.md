# Memory MCP - API Reference

**Version**: 12.7.0
**Last Updated**: 2026-07-26

Complete reference for all 241 MCP tools provided by the Memory MCP server. The reference is in two parts: the original hand-written sections below (through Phase 15), then generated sections covering everything added since — Phase 12/14 surfaces that were previously undocumented here, Phase 16 (memoryjs v2.1.0), v12.3.2/v12.5.0, and v12.7.0 (memoryjs v3.0.0). Phase 15 extends three existing tools (`export_graph`, `create_entities`, `set_memory_visibility`) and v12.7.0 extends `hybrid_search` (graph channel, neighbor expansion, evidence-path explain, lookFor) — those updates are noted inline in their respective sections.

---

## Table of Contents

1. [Entity Operations](#entity-operations) (4 tools)
2. [Relation Operations](#relation-operations) (2 tools)
3. [Observation Management](#observation-management) (3 tools)
4. [Search Operations](#search-operations) (7 tools)
5. [Intelligent Search](#intelligent-search) (3 tools)
6. [Semantic Search](#semantic-search) (3 tools)
7. [Saved Searches](#saved-searches) (5 tools)
8. [Tag Management](#tag-management) (6 tools)
9. [Tag Aliases](#tag-aliases) (5 tools)
10. [Hierarchy Operations](#hierarchy-operations) (9 tools)
11. [Graph Algorithms](#graph-algorithms) (4 tools)
12. [Analytics](#analytics) (2 tools)
13. [Compression & Deduplication](#compression--deduplication) (4 tools)
14. [Import/Export Operations](#importexport-operations) (2 tools)
15. [Project Scoping](#project-scoping) (1 tool) — v1.8.0
16. [Memory Versioning](#memory-versioning) (2 tools) — v1.8.0
17. [Semantic Forget](#semantic-forget) (1 tool) — v1.8.0
18. [Profiles](#profiles) (2 tools) — v1.8.0
19. [Temporal KG](#temporal-kg) (3 tools) — v1.9.0
20. [Ingestion](#ingestion) (1 tool) — v1.9.0
21. [Agent Diary](#agent-diary) (2 tools) — v1.9.0
22. [Entity Bitemporal Validity](#entity-bitemporal-validity-phase-15--memoryjs-η44) (5 tools) — Phase 15 / memoryjs η.4.4
23. [Optimistic Concurrency Control](#optimistic-concurrency-control-phase-15--memoryjs-η55c) (1 tool) — Phase 15 / memoryjs η.5.5.c
24. [RBAC](#rbac-phase-15--memoryjs-η61) (4 tools) — Phase 15 / memoryjs η.6.1
25. [Procedural Memory](#procedural-memory-phase-15--memoryjs-3b4) (5 tools) — Phase 15 / memoryjs 3B.4
26. [Active Retrieval](#active-retrieval-phase-15--memoryjs-3b5) (1 tool) — Phase 15 / memoryjs 3B.5
27. [Causal Reasoning](#causal-reasoning-phase-15--memoryjs-3b6) (4 tools) — Phase 15 / memoryjs 3B.6
28. [World Model](#world-model-phase-15--memoryjs-3b7) (3 tools) — Phase 15 / memoryjs 3B.7
29. [Phase 15 enhancements to existing tools](#phase-15-enhancements-to-existing-tools) — `export_graph`, `create_entities`, `set_memory_visibility`

Additional categories (Phase 12 → v12.7.0), documented after the sections above:

- [Ref Index (Phase 12)](#ref-index-phase-12) (4 tools)
- [Artifacts (Phase 12)](#artifacts-phase-12) (3 tools)
- [Temporal Search (Phase 12)](#temporal-search-phase-12) (1 tool)
- [Distillation (Phase 12)](#distillation-phase-12) (1 tool)
- [Freshness (Phase 12)](#freshness-phase-12) (5 tools)
- [LLM Query (Phase 12)](#llm-query-phase-12) (1 tool)
- [Governance (Phase 12)](#governance-phase-12) (4 tools)
- [Role Profiles (Phase 12)](#role-profiles-phase-12) (2 tools)
- [Entropy (Phase 12)](#entropy-phase-12) (2 tools)
- [Consolidation (Phase 12)](#consolidation-phase-12) (3 tools)
- [Formatter (Phase 12)](#formatter-phase-12) (1 tool)
- [Collaborative Synthesis (Phase 12)](#collaborative-synthesis-phase-12) (1 tool)
- [Failure Handling (Phase 12)](#failure-handling-phase-12) (2 tools)
- [Cognitive Load (Phase 12)](#cognitive-load-phase-12) (2 tools)
- [Dream Engine (v12.0.0)](#dream-engine-v1200) (3 tools)
- [Active Project Scope (v12.3.2)](#active-project-scope-v1232) (2 tools)
- [Session & Working Memory (Phase 14)](#session-working-memory-phase-14) (9 tools)
- [Auto-Enhancement (Phase 14)](#auto-enhancement-phase-14) (7 tools)
- [Context Compression (Phase 14)](#context-compression-phase-14) (1 tool)
- [Decay & Salience (Phase 14)](#decay-salience-phase-14) (5 tools)
- [Multi-Agent (Phase 14)](#multi-agent-phase-14) (4 tools)
- [Observability (Phase 14)](#observability-phase-14) (4 tools)
- [Tool Affordance (Phase 16 / memoryjs v2.1.0)](#tool-affordance-phase-16-memoryjs-v210) (11 tools)
- [Heuristic Guidelines (Phase 16 / memoryjs v2.1.0)](#heuristic-guidelines-phase-16-memoryjs-v210) (10 tools)
- [Project Context (Phase 16 / memoryjs v2.1.0)](#project-context-phase-16-memoryjs-v210) (12 tools)
- [Decision Rationale (Phase 16 / memoryjs v2.1.0)](#decision-rationale-phase-16-memoryjs-v210) (10 tools)
- [Exclusion / do_not_remember (Phase 16 / memoryjs v2.1.0)](#exclusion-donotremember-phase-16-memoryjs-v210) (5 tools)
- [Observation Dedup (Phase 16 / memoryjs v2.1.0)](#observation-dedup-phase-16-memoryjs-v210) (2 tools)
- [Spell Correction (Phase 16 / memoryjs v2.1.0)](#spell-correction-phase-16-memoryjs-v210) (3 tools)
- [Engineering / Diagnostics (v12.5.0)](#engineering-diagnostics-v1250) (10 tools)
- [Event Memory (v12.7.0 / memoryjs v3.0.0)](#event-memory-v1270-memoryjs-v300) (5 tools)
- [Reconstructive Memory (v12.7.0 / memoryjs v3.0.0)](#reconstructive-memory-v1270-memoryjs-v300) (3 tools)
- [Relation Consolidation (v12.7.0 / memoryjs v3.0.0)](#relation-consolidation-v1270-memoryjs-v300) (2 tools)
- [Agent Reflection (v12.7.0 / memoryjs v3.0.0)](#agent-reflection-v1270-memoryjs-v300) (4 tools)
- [Reconstructive Memory Persistence (v12.7.0 / memoryjs v3.0.0)](#reconstructive-memory-persistence-v1270-memoryjs-v300) (2 tools)

---

## Entity Operations

### create_entities

Create one or more entities in the knowledge graph.

**Parameters:**
```typescript
{
  entities: Array<{
    name: string;              // Unique identifier (1-500 chars)
    entityType: string;        // Category (1-100 chars)
    observations: string[];    // Descriptions (1-5000 chars each)
    tags?: string[];           // Optional tags (normalized to lowercase)
    importance?: number;       // Optional priority (0-10, integer)
    parentId?: string;         // Optional parent entity name
  }>
}
```

**Returns:**
```typescript
{
  entities: Entity[];  // Array of created entities with timestamps
}
```

**Example:**
```json
{
  "entities": [
    {
      "name": "Alice",
      "entityType": "person",
      "observations": ["Software engineer", "Works on AI projects"],
      "tags": ["team", "engineering"],
      "importance": 8
    }
  ]
}
```

**Validation:**
- Maximum 1000 entities per batch
- Entity names must be unique
- Duplicate entities are filtered out
- Tags normalized to lowercase
- Automatic timestamp generation

---

### delete_entities

Delete one or more entities from the knowledge graph.

**Parameters:**
```typescript
{
  entityNames: string[];  // Array of entity names to delete
}
```

**Returns:**
```typescript
{
  deletedCount: number;  // Number of entities deleted
}
```

**Notes:**
- Maximum 1000 entities per batch
- Relations involving deleted entities are also removed
- Child entities remain but lose their parent reference

**Example:**
```json
{
  "entityNames": ["Alice", "Bob"]
}
```

---

### read_graph

Read the entire knowledge graph.

**Parameters:** None

**Returns:**
```typescript
{
  entities: Entity[];
  relations: Relation[];
}
```

**Notes:**
- Returns complete graph data
- Use with caution on large graphs
- Consider using search operations for filtered access

---

### open_nodes

Retrieve specific entities by name with their relations.

**Parameters:**
```typescript
{
  names: string[];  // Entity names to retrieve
}
```

**Returns:**
```typescript
{
  entities: Entity[];
  relations: Relation[];  // Relations between opened entities
}
```

**Notes:**
- Only returns relations where BOTH from and to are in the list
- Useful for graph visualization
- Guaranteed to return results for existing entities

**Example:**
```json
{
  "names": ["Alice", "Bob", "Project_X"]
}
```

---

## Relation Operations

### create_relations

Create one or more relations between entities.

**Parameters:**
```typescript
{
  relations: Array<{
    from: string;           // Source entity name
    to: string;             // Target entity name
    relationType: string;   // Relation type (1-100 chars)
  }>
}
```

**Returns:**
```typescript
{
  relations: Relation[];  // Created relations with timestamps
}
```

**Notes:**
- Maximum 1000 relations per batch
- Duplicate relations filtered out
- Deferred integrity: entities don't need to exist
- Automatic timestamp generation

**Example:**
```json
{
  "relations": [
    { "from": "Alice", "to": "Project_X", "relationType": "works_on" },
    { "from": "Alice", "to": "Bob", "relationType": "mentors" }
  ]
}
```

---

### delete_relations

Delete one or more relations from the knowledge graph.

**Parameters:**
```typescript
{
  relations: Array<{
    from: string;
    to: string;
    relationType: string;
  }>
}
```

**Returns:**
```typescript
{
  deletedCount: number;
}
```

**Notes:**
- Maximum 1000 relations per batch
- Non-existent relations silently ignored

**Example:**
```json
{
  "relations": [
    { "from": "Alice", "to": "Project_X", "relationType": "works_on" }
  ]
}
```

---

## Observation Management

### add_observations

Add observations to existing entities.

**Parameters:**
```typescript
{
  observations: Array<{
    entityName: string;
    contents: string[];  // New observations to add
  }>
}
```

**Returns:**
```typescript
{
  results: Array<{
    entityName: string;
    addedObservations: string[];
  }>
}
```

**Notes:**
- Observations are appended, not replaced
- Duplicate observations within the same request are filtered
- `lastModified` automatically updated

**Example:**
```json
{
  "observations": [
    {
      "entityName": "Alice",
      "contents": ["Led project Alpha", "Promoted to senior engineer"]
    }
  ]
}
```

---

### delete_observations

Remove specific observations from entities.

**Parameters:**
```typescript
{
  deletions: Array<{
    entityName: string;
    observations: string[];  // Observations to remove (exact match)
  }>
}
```

**Returns:**
```typescript
{
  results: Array<{
    entityName: string;
    deletedObservations: string[];
  }>
}
```

**Example:**
```json
{
  "deletions": [
    {
      "entityName": "Alice",
      "observations": ["Old observation to remove"]
    }
  ]
}
```

---

### normalize_observations

Normalize observations for an entity by resolving coreferences and anchoring temporal references.

**Parameters:**
```typescript
{
  entityName: string;            // Entity to normalize
  options?: {
    resolveCoreferences?: boolean;   // Replace pronouns with entity name (default: true)
    anchorDates?: boolean;           // Convert relative dates to absolute (default: true)
    extractKeywords?: boolean;       // Extract and score keywords (default: false)
    referenceDate?: string;          // ISO 8601 date for temporal anchoring (default: now)
  }
}
```

**Returns:**
```typescript
{
  entityName: string;
  originalCount: number;
  normalizedCount: number;
  observations: Array<{
    original: string;
    normalized: string;
    keywords?: Array<{
      keyword: string;
      score: number;
    }>;
  }>;
}
```

**Features:**
- **Coreference Resolution**: Replaces pronouns (he, she, they, it, etc.) with the entity name
- **Temporal Anchoring**: Converts relative dates ("yesterday", "last week", "3 days ago") to absolute ISO dates
- **Keyword Extraction**: Extracts significant keywords with TF-IDF-like scoring

**Example:**
```json
{
  "entityName": "Alice",
  "options": {
    "resolveCoreferences": true,
    "anchorDates": true,
    "extractKeywords": true
  }
}
```

**Example Response:**
```json
{
  "entityName": "Alice",
  "originalCount": 2,
  "normalizedCount": 2,
  "observations": [
    {
      "original": "She joined the team yesterday",
      "normalized": "Alice joined the team on 2026-01-08",
      "keywords": [{ "keyword": "joined", "score": 0.85 }, { "keyword": "team", "score": 0.72 }]
    }
  ]
}
```

---

## Search Operations

### search_nodes

Basic text search with optional filters.

**Parameters:**
```typescript
{
  query: string;              // Search query
  tags?: string[];            // Filter by tags
  minImportance?: number;     // Minimum importance
  maxImportance?: number;     // Maximum importance
}
```

**Returns:**
```typescript
{
  entities: Entity[];
  relations: Relation[];
}
```

**Search Scope:**
- Entity names
- Entity types
- Observations

**Performance:** <100ms for 500 entities

**Example:**
```json
{
  "query": "engineering",
  "tags": ["team"],
  "minImportance": 5
}
```

---

### search_by_date_range

Search entities by creation/modification date.

**Parameters:**
```typescript
{
  startDate?: string;         // ISO 8601 format
  endDate?: string;           // ISO 8601 format
  entityType?: string;
  tags?: string[];
}
```

**Returns:**
```typescript
{
  entities: Entity[];
  relations: Relation[];
}
```

**Notes:**
- Uses `createdAt` if available, otherwise `lastModified`
- Both dates optional (omit for open-ended ranges)

**Example:**
```json
{
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "entityType": "person"
}
```

---

### search_nodes_ranked

TF-IDF ranked search with relevance scoring.

**Parameters:**
```typescript
{
  query: string;
  tags?: string[];
  minImportance?: number;
  maxImportance?: number;
  limit?: number;              // Max results (default: 50, max: 200)
}
```

**Returns:**
```typescript
{
  results: Array<{
    entity: Entity;
    score: number;             // TF-IDF relevance score
    matchedFields: string[];   // Fields that matched
  }>
}
```

**Features:**
- TF-IDF scoring for relevance
- Results sorted by score (descending)
- Shows which fields matched

**Performance:** <600ms for 500 entities

**Example:**
```json
{
  "query": "senior software engineer",
  "tags": ["engineering"],
  "limit": 10
}
```

---

### boolean_search

Boolean query search with AND/OR/NOT operators.

**Parameters:**
```typescript
{
  query: string;              // Boolean expression
  tags?: string[];
  minImportance?: number;
  maxImportance?: number;
}
```

**Returns:**
```typescript
{
  entities: Entity[];
  relations: Relation[];
}
```

**Query Syntax:**
- `AND`: Both terms must match
- `OR`: Either term must match
- `NOT`: Term must not match
- `()`: Grouping
- `field:value`: Field-specific search (name, type, obs)

**Performance:** <150ms for 500 entities

**Examples:**
```json
{
  "query": "engineer AND (python OR javascript)"
}
```
```json
{
  "query": "type:person AND NOT contractor"
}
```

---

### fuzzy_search

Typo-tolerant search using Levenshtein distance.

**Parameters:**
```typescript
{
  query: string;
  threshold?: number;         // 0.0-1.0 (default: 0.7)
  tags?: string[];
  minImportance?: number;
  maxImportance?: number;
}
```

**Returns:**
```typescript
{
  entities: Entity[];
  relations: Relation[];
}
```

**Threshold Guide:**
- 0.9-1.0: Very strict (minor typos)
- 0.7-0.9: Moderate (recommended)
- 0.5-0.7: Lenient (major differences)

**Performance:** <200ms for 500 entities

**Example:**
```json
{
  "query": "enginer",
  "threshold": 0.8
}
```

---

### get_search_suggestions

Get search query suggestions based on existing content.

**Parameters:**
```typescript
{
  query: string;              // Partial query
  maxSuggestions?: number;    // Max suggestions (default: 10)
}
```

**Returns:**
```typescript
{
  suggestions: string[];
}
```

**Example:**
```json
{
  "query": "eng",
  "maxSuggestions": 5
}
```

---

### search_auto

Automatically select the best search strategy based on query analysis.

**Parameters:**
```typescript
{
  query: string;              // Search query
  tags?: string[];            // Filter by tags
  minImportance?: number;     // Minimum importance
  maxImportance?: number;     // Maximum importance
}
```

**Returns:**
```typescript
{
  entities: Entity[];
  relations: Relation[];
  searchMethod: string;       // Method that was used (basic, ranked, boolean, fuzzy)
  cost: number;               // Estimated query cost
}
```

**Strategy Selection:**
- Boolean operators detected → `boolean_search`
- Short query with typos likely → `fuzzy_search`
- Multi-word query → `search_nodes_ranked`
- Simple query → `search_nodes`

**Example:**
```json
{
  "query": "engineer AND python",
  "minImportance": 5
}
```

---

## Intelligent Search

Three-layer hybrid search architecture combining semantic, lexical, and symbolic signals for advanced query understanding and result refinement.

### hybrid_search

Multi-layer search combining semantic (vector similarity), lexical (TF-IDF/BM25), and symbolic (metadata filtering) signals.

**Parameters:**
```typescript
{
  query: string;                    // Natural language query
  weights?: {
    semantic?: number;              // Weight for semantic similarity (default: 0.4)
    lexical?: number;               // Weight for lexical matching (default: 0.4)
    symbolic?: number;              // Weight for metadata filtering (default: 0.2)
  };
  filters?: {
    entityTypes?: string[];         // Filter by entity types
    tags?: string[];                // Filter by tags
    minImportance?: number;         // Minimum importance
    maxImportance?: number;         // Maximum importance
    dateRange?: {
      start?: string;               // ISO 8601 start date
      end?: string;                 // ISO 8601 end date
    };
  };
  limit?: number;                   // Max results (default: 20)
  minScore?: number;                // Minimum combined score (0.0-1.0)
}
```

**Returns:**
```typescript
{
  results: Array<{
    entity: Entity;
    scores: {
      semantic: number;             // Vector similarity score
      lexical: number;              // TF-IDF/BM25 score
      symbolic: number;             // Metadata match score
      combined: number;             // Weighted combined score
    };
    matchedFields: string[];        // Fields that matched
  }>;
  queryAnalysis: {
    extractedEntities: string[];    // Entities mentioned in query
    temporalReferences: string[];   // Time expressions found
    questionType: string;           // Type of question (who, what, when, etc.)
  };
}
```

**Example:**
```json
{
  "query": "engineers who worked on AI projects last year",
  "weights": { "semantic": 0.5, "lexical": 0.3, "symbolic": 0.2 },
  "filters": { "entityTypes": ["person"], "minImportance": 5 },
  "limit": 10
}
```

---

### analyze_query

Analyze a natural language query to extract entities, temporal references, and question characteristics.

**Parameters:**
```typescript
{
  query: string;                    // Natural language query to analyze
}
```

**Returns:**
```typescript
{
  query: string;                    // Original query
  analysis: {
    extractedEntities: Array<{
      text: string;                 // Entity mention
      type: string;                 // Inferred entity type
      confidence: number;           // Confidence score
    }>;
    temporalReferences: Array<{
      text: string;                 // Time expression (e.g., "last week")
      resolved: string;             // ISO 8601 date or range
      type: string;                 // absolute, relative, range
    }>;
    questionType: string;           // who, what, when, where, why, how, boolean, list
    complexity: string;             // simple, moderate, complex
    suggestedSearchMethods: string[]; // Recommended search approaches
  };
}
```

**Example:**
```json
{
  "query": "Who are the senior engineers who joined after January 2025?"
}
```

**Example Response:**
```json
{
  "query": "Who are the senior engineers who joined after January 2025?",
  "analysis": {
    "extractedEntities": [
      { "text": "senior engineers", "type": "person", "confidence": 0.9 }
    ],
    "temporalReferences": [
      { "text": "after January 2025", "resolved": "2025-01-01T00:00:00Z", "type": "relative" }
    ],
    "questionType": "who",
    "complexity": "moderate",
    "suggestedSearchMethods": ["hybrid_search", "search_by_date_range"]
  }
}
```

---

### smart_search

Orchestrates query analysis, planning, and reflection-based iterative refinement until results meet adequacy threshold.

**Parameters:**
```typescript
{
  query: string;                    // Natural language query
  maxIterations?: number;           // Max refinement iterations (default: 3)
  targetAdequacy?: number;          // Target adequacy score 0.0-1.0 (default: 0.7)
  filters?: {
    entityTypes?: string[];
    tags?: string[];
    minImportance?: number;
    maxImportance?: number;
  };
}
```

**Returns:**
```typescript
{
  results: Array<{
    entity: Entity;
    score: number;
    relevanceExplanation: string;   // Why this result is relevant
  }>;
  searchProcess: {
    iterations: number;             // Number of refinement iterations
    finalAdequacy: number;          // Final adequacy score achieved
    queryRefinements: string[];     // How the query was refined
    searchMethodsUsed: string[];    // Methods used during search
  };
  analysis: {
    questionType: string;
    complexity: string;
    extractedEntities: string[];
  };
}
```

**Example:**
```json
{
  "query": "Find all people related to the machine learning initiative",
  "maxIterations": 3,
  "targetAdequacy": 0.8
}
```

**Example Response:**
```json
{
  "results": [...],
  "searchProcess": {
    "iterations": 2,
    "finalAdequacy": 0.85,
    "queryRefinements": [
      "Added entity type filter: person",
      "Expanded query to include 'AI' and 'ML' synonyms"
    ],
    "searchMethodsUsed": ["analyze_query", "hybrid_search", "fuzzy_search"]
  },
  "analysis": {
    "questionType": "list",
    "complexity": "moderate",
    "extractedEntities": ["machine learning initiative"]
  }
}
```

---

## Semantic Search

### semantic_search

Search using semantic similarity with embeddings.

**Parameters:**
```typescript
{
  query: string;              // Natural language query
  limit?: number;             // Max results (default: 10, max: 100)
  minSimilarity?: number;     // Min similarity threshold (0.0-1.0)
}
```

**Returns:**
```typescript
{
  results: Array<{
    entity: Entity;
    similarity: number;
  }>
}
```

**Notes:**
- Requires embedding provider configuration via `MEMORY_EMBEDDING_PROVIDER`
- Supported providers: `openai`, `local`, `none`
- Call `index_embeddings` first to build the vector index

**Example:**
```json
{
  "query": "people who work on machine learning projects",
  "limit": 10,
  "minSimilarity": 0.7
}
```

---

### find_similar_entities

Find entities similar to a given entity.

**Parameters:**
```typescript
{
  entityName: string;         // Reference entity
  limit?: number;             // Max results (default: 10, max: 100)
  minSimilarity?: number;     // Min similarity threshold (0.0-1.0)
}
```

**Returns:**
```typescript
{
  results: Array<{
    entity: Entity;
    similarity: number;
  }>
}
```

**Example:**
```json
{
  "entityName": "Alice",
  "limit": 5
}
```

---

### index_embeddings

Index all entities for semantic search.

**Parameters:**
```typescript
{
  forceReindex?: boolean;     // Re-index even if already indexed (default: false)
}
```

**Returns:**
```typescript
{
  indexed: number;            // Number of entities indexed
  skipped: number;            // Number already indexed (if not forcing)
}
```

**Notes:**
- Call after adding entities to enable semantic search
- Requires embedding provider configuration
- Can be slow for large graphs (batches API calls)

---

## Saved Searches

### save_search

Save a search query for later reuse.

**Parameters:**
```typescript
{
  name: string;               // Unique search name
  query: string;              // Search query
  searchType: 'basic' | 'ranked' | 'boolean' | 'fuzzy';
  filters?: {
    tags?: string[];
    minImportance?: number;
    maxImportance?: number;
  };
  description?: string;
}
```

**Returns:**
```typescript
{
  savedSearch: SavedSearch;
}
```

**Example:**
```json
{
  "name": "active-engineers",
  "query": "engineer",
  "searchType": "basic",
  "filters": { "tags": ["active"], "minImportance": 5 }
}
```

---

### execute_saved_search

Execute a previously saved search.

**Parameters:**
```typescript
{
  name: string;  // Saved search name
}
```

**Returns:**
```typescript
{
  entities: Entity[];
  relations: Relation[];
}
```

**Example:**
```json
{
  "name": "active-engineers"
}
```

---

### list_saved_searches

List all saved searches.

**Parameters:** None

**Returns:**
```typescript
{
  savedSearches: SavedSearch[];
}
```

---

### delete_saved_search

Delete a saved search.

**Parameters:**
```typescript
{
  name: string;  // Saved search name to delete
}
```

**Returns:**
```typescript
{
  deleted: boolean;
}
```

---

### update_saved_search

Update an existing saved search.

**Parameters:**
```typescript
{
  name: string;               // Existing search name
  query?: string;             // New query
  searchType?: 'basic' | 'ranked' | 'boolean' | 'fuzzy';
  filters?: {
    tags?: string[];
    minImportance?: number;
    maxImportance?: number;
  };
  description?: string;
}
```

**Returns:**
```typescript
{
  savedSearch: SavedSearch;
}
```

---

## Tag Management

### add_tags

Add tags to a single entity.

**Parameters:**
```typescript
{
  entityName: string;
  tags: string[];  // Tags to add (normalized to lowercase)
}
```

**Returns:**
```typescript
{
  entity: Entity;
}
```

**Example:**
```json
{
  "entityName": "Alice",
  "tags": ["senior", "lead"]
}
```

---

### remove_tags

Remove tags from a single entity.

**Parameters:**
```typescript
{
  entityName: string;
  tags: string[];
}
```

**Returns:**
```typescript
{
  entity: Entity;
}
```

---

### set_importance

Set the importance score for an entity.

**Parameters:**
```typescript
{
  entityName: string;
  importance: number;  // 0-10
}
```

**Returns:**
```typescript
{
  entity: Entity;
}
```

**Example:**
```json
{
  "entityName": "Alice",
  "importance": 9
}
```

---

### add_tags_to_multiple_entities

Add tags to multiple entities at once.

**Parameters:**
```typescript
{
  entityNames: string[];
  tags: string[];
}
```

**Returns:**
```typescript
{
  entities: Entity[];
}
```

**Example:**
```json
{
  "entityNames": ["Alice", "Bob", "Charlie"],
  "tags": ["team-alpha"]
}
```

---

### replace_tag

Replace a tag across all entities.

**Parameters:**
```typescript
{
  oldTag: string;
  newTag: string;
}
```

**Returns:**
```typescript
{
  entitiesUpdated: number;
}
```

**Example:**
```json
{
  "oldTag": "dev",
  "newTag": "developer"
}
```

---

### merge_tags

Merge two tags into one target tag.

**Parameters:**
```typescript
{
  sourceTags: string[];  // Tags to merge
  targetTag: string;     // Resulting tag
}
```

**Returns:**
```typescript
{
  entitiesUpdated: number;
}
```

**Example:**
```json
{
  "sourceTags": ["dev", "developer"],
  "targetTag": "engineering"
}
```

---

## Tag Aliases

### add_tag_alias

Create a tag alias for normalization.

**Parameters:**
```typescript
{
  alias: string;        // Alternate form
  canonical: string;    // Canonical tag
  description?: string;
}
```

**Returns:**
```typescript
{
  tagAlias: TagAlias;
}
```

**Example:**
```json
{
  "alias": "js",
  "canonical": "javascript",
  "description": "JavaScript abbreviation"
}
```

---

### list_tag_aliases

List all tag aliases.

**Parameters:** None

**Returns:**
```typescript
{
  aliases: TagAlias[];
}
```

---

### remove_tag_alias

Remove a tag alias.

**Parameters:**
```typescript
{
  alias: string;
}
```

**Returns:**
```typescript
{
  removed: boolean;
}
```

---

### get_aliases_for_tag

Get all aliases that map to a canonical tag.

**Parameters:**
```typescript
{
  canonicalTag: string;
}
```

**Returns:**
```typescript
{
  aliases: string[];
}
```

---

### resolve_tag

Resolve a tag alias to its canonical form.

**Parameters:**
```typescript
{
  tag: string;
}
```

**Returns:**
```typescript
{
  resolvedTag: string;
  wasAlias: boolean;
}
```

**Example:**
```json
{
  "tag": "js"
}
// Returns: { "resolvedTag": "javascript", "wasAlias": true }
```

---

## Hierarchy Operations

### set_entity_parent

Set the parent entity for hierarchical organization.

**Parameters:**
```typescript
{
  entityName: string;
  parentName: string | null;  // null to remove parent
}
```

**Returns:**
```typescript
{
  entity: Entity;
}
```

**Notes:**
- Cycle detection prevents invalid parent assignments
- Setting null removes the parent relationship

**Example:**
```json
{
  "entityName": "Engineering_Team",
  "parentName": "Company"
}
```

---

### get_children

Get all direct children of an entity.

**Parameters:**
```typescript
{
  entityName: string;
}
```

**Returns:**
```typescript
{
  children: Entity[];
}
```

---

### get_parent

Get the parent of an entity.

**Parameters:**
```typescript
{
  entityName: string;
}
```

**Returns:**
```typescript
{
  parent: Entity | null;
}
```

---

### get_ancestors

Get all ancestors of an entity (parent, grandparent, etc.).

**Parameters:**
```typescript
{
  entityName: string;
}
```

**Returns:**
```typescript
{
  ancestors: Entity[];  // Ordered from immediate parent to root
}
```

---

### get_descendants

Get all descendants of an entity (children, grandchildren, etc.).

**Parameters:**
```typescript
{
  entityName: string;
}
```

**Returns:**
```typescript
{
  descendants: Entity[];
}
```

---

### get_subtree

Get an entity and all its descendants as a subgraph.

**Parameters:**
```typescript
{
  entityName: string;
}
```

**Returns:**
```typescript
{
  entities: Entity[];
  relations: Relation[];
}
```

---

### get_root_entities

Get all entities with no parent (root level).

**Parameters:** None

**Returns:**
```typescript
{
  roots: Entity[];
}
```

---

### get_entity_depth

Get the depth of an entity in the hierarchy.

**Parameters:**
```typescript
{
  entityName: string;
}
```

**Returns:**
```typescript
{
  depth: number;  // 0 for root entities
}
```

---

### move_entity

Move an entity to a new parent.

**Parameters:**
```typescript
{
  entityName: string;
  newParentName: string | null;
}
```

**Returns:**
```typescript
{
  entity: Entity;
}
```

**Notes:**
- Validates that the move doesn't create a cycle
- Updates lastModified timestamp

---

## Graph Algorithms

### find_shortest_path

Find the shortest path between two entities.

**Parameters:**
```typescript
{
  source: string;             // Starting entity name
  target: string;             // Target entity name
  relationTypes?: string[];   // Filter by relation types
  direction?: 'outgoing' | 'incoming' | 'both';  // Traversal direction (default: both)
}
```

**Returns:**
```typescript
{
  path: string[];             // Entity names in order
  relations: Relation[];      // Relations along the path
  length: number;             // Number of hops
}
```

**Example:**
```json
{
  "source": "Alice",
  "target": "Project_Z",
  "direction": "outgoing"
}
```

---

### find_all_paths

Find all paths between two entities up to a maximum depth.

**Parameters:**
```typescript
{
  source: string;
  target: string;
  maxDepth?: number;          // Max path length (default: 5)
  relationTypes?: string[];
  direction?: 'outgoing' | 'incoming' | 'both';
}
```

**Returns:**
```typescript
{
  paths: Array<{
    path: string[];
    relations: Relation[];
    length: number;
  }>
}
```

**Example:**
```json
{
  "source": "Alice",
  "target": "Charlie",
  "maxDepth": 3
}
```

---

### get_connected_components

Find all connected components in the graph.

**Parameters:** None

**Returns:**
```typescript
{
  components: Array<{
    entities: string[];
    size: number;
  }>;
  componentCount: number;
  largestComponentSize: number;
}
```

**Notes:**
- Useful for identifying isolated subgraphs
- Treats relations as undirected for connectivity

---

### get_centrality

Calculate centrality metrics for entities.

**Parameters:**
```typescript
{
  algorithm?: 'degree' | 'betweenness' | 'pagerank';  // default: degree
  topN?: number;              // Return top N entities (default: 10)
  direction?: 'in' | 'out' | 'both';  // For degree centrality
  dampingFactor?: number;     // For PageRank (default: 0.85)
  approximate?: boolean;      // Use approximation for betweenness (default: false)
  sampleRate?: number;        // Sample rate for approximation (0.0-1.0, default: 0.2)
}
```

**Returns:**
```typescript
{
  centrality: Array<{
    entityName: string;
    score: number;
  }>;
  algorithm: string;
}
```

**Algorithm Notes:**
- `degree`: Count of connections (fastest)
- `betweenness`: How often entity appears on shortest paths (slow for large graphs)
- `pagerank`: Importance based on incoming connections

**Example:**
```json
{
  "algorithm": "pagerank",
  "topN": 5,
  "dampingFactor": 0.85
}
```

---

## Analytics

### get_graph_stats

Get comprehensive knowledge graph statistics.

**Parameters:** None

**Returns:**
```typescript
{
  entityCount: number;
  relationCount: number;
  entityTypes: { [type: string]: number };
  relationTypes: { [type: string]: number };
  tagCounts: { [tag: string]: number };
  avgObservationsPerEntity: number;
  importanceDistribution: { [importance: number]: number };
}
```

**Example Response:**
```json
{
  "entityCount": 150,
  "relationCount": 320,
  "entityTypes": { "person": 50, "project": 30, "document": 70 },
  "avgObservationsPerEntity": 3.2
}
```

---

### validate_graph

Validate graph integrity and return issues.

**Parameters:** None

**Returns:**
```typescript
{
  valid: boolean;
  errors: Array<{
    type: string;
    message: string;
    entities?: string[];
  }>;
  warnings: Array<{
    type: string;
    message: string;
    entities?: string[];
  }>;
}
```

**Checks:**
- Dangling relations (references non-existent entities)
- Missing parents (parentId references don't exist)
- Circular hierarchies (entity is its own ancestor)
- Duplicate entity names
- Invalid importance values

---

## Compression & Deduplication

### find_duplicates

Find potential duplicate entities using similarity scoring.

**Parameters:**
```typescript
{
  threshold?: number;  // 0.0-1.0 (default: 0.8)
}
```

**Returns:**
```typescript
{
  duplicateGroups: string[][];  // Arrays of similar entity names
}
```

**Similarity Algorithm:**
- Weighted scoring: name (40%), type (30%), observations (20%), tags (10%)
- Two-level bucketing by entityType for performance
- Levenshtein distance for string comparison

**Performance:** <1500ms for 500 entities

**Example Response:**
```json
{
  "duplicateGroups": [
    ["Alice Smith", "Alice_Smith", "A. Smith"],
    ["Project Alpha", "Project_Alpha"]
  ]
}
```

---

### merge_entities

Merge multiple entities into one, combining observations and relations.

**Parameters:**
```typescript
{
  entityNames: string[];       // Entities to merge (min 2)
  targetName?: string;         // Name for merged entity (default: first name)
}
```

**Returns:**
```typescript
{
  mergedEntity: Entity;
  entitiesMerged: number;
  observationsMerged: number;
}
```

**Merge Logic:**
- Observations: Combined (duplicates removed)
- Tags: Combined (duplicates removed)
- Importance: Maximum value
- Relations: Transferred to merged entity
- Original entities: Deleted

**Example:**
```json
{
  "entityNames": ["Alice Smith", "Alice_Smith"],
  "targetName": "Alice Smith"
}
```

---

### compress_graph

Find and merge all duplicates in one operation.

**Parameters:**
```typescript
{
  threshold?: number;  // 0.0-1.0 (default: 0.8)
  dryRun?: boolean;    // Preview without changes (default: false)
}
```

**Returns:**
```typescript
{
  entitiesMerged: number;
  observationsMerged: number;
  relationsUpdated: number;
  duplicateGroupsFound: number;
}
```

**Performance:** <400ms for 100 entities

**Example:**
```json
{
  "threshold": 0.85,
  "dryRun": true
}
```

---

### archive_entities

Archive old or low-importance entities.

**Parameters:**
```typescript
{
  criteria: {
    olderThan?: string;           // ISO date - archive entities older than this
    importanceLessThan?: number;  // Archive entities below this importance
    tags?: string[];              // Archive entities with these tags
  };
  dryRun?: boolean;               // Preview without changes (default: false)
}
```

**Returns:**
```typescript
{
  archivedCount: number;
  archivedEntities: string[];
}
```

**Example:**
```json
{
  "criteria": {
    "olderThan": "2024-01-01T00:00:00Z",
    "importanceLessThan": 3
  },
  "dryRun": true
}
```

---

## Import/Export Operations

### export_graph

Export the knowledge graph in specified format.

**Parameters:**
```typescript
{
  format: 'json' | 'csv' | 'graphml' | 'gexf' | 'dot' | 'markdown' | 'mermaid';
  filter?: {
    entityType?: string;
    tags?: string[];
    minImportance?: number;
  };
}
```

**Returns:**
```typescript
{
  data: string;  // Formatted export data
  format: string;
  entityCount: number;
  relationCount: number;
}
```

**Supported Formats:**
| Format | Description |
|--------|-------------|
| json | Complete graph with all metadata |
| csv | Entities and relations in CSV format |
| graphml | XML-based graph format |
| gexf | Gephi exchange format |
| dot | Graphviz DOT language |
| markdown | Human-readable markdown |
| mermaid | Mermaid diagram syntax |

**Example:**
```json
{
  "format": "json",
  "filter": { "entityType": "person" }
}
```

---

### import_graph

Import entities and relations from external data.

**Parameters:**
```typescript
{
  format: 'json' | 'csv' | 'graphml';
  data: string;
  mergeStrategy?: 'replace' | 'skip' | 'merge' | 'fail';
  dryRun?: boolean;
}
```

**Returns:**
```typescript
{
  entitiesCreated: number;
  entitiesUpdated: number;
  entitiesSkipped: number;
  relationsCreated: number;
  relationsSkipped: number;
  errors: string[];
}
```

**Merge Strategies:**
- `replace`: Overwrite existing entities
- `skip`: Skip entities that exist (default)
- `merge`: Combine observations and tags
- `fail`: Error if any conflicts

**Example:**
```json
{
  "format": "json",
  "data": "{\"entities\":[...],\"relations\":[...]}",
  "mergeStrategy": "merge",
  "dryRun": true
}
```

---

## Project Scoping

### list_projects

List all project IDs present in the graph, or filter entities by a specific project.

**Parameters:**
```typescript
{
  projectId?: string;  // Optional: filter entities belonging to this project
}
```

**Returns:**
```typescript
{
  projects: string[];      // All distinct projectId values (when no filter)
  entities?: Entity[];     // Entities matching projectId (when filter provided)
}
```

---

## Memory Versioning

### get_entity_versions

Retrieve all versions of a versioned entity by its root name.

**Parameters:**
```typescript
{
  entityName: string;  // Name of the entity (any version)
}
```

**Returns:**
```typescript
{
  versions: Entity[];  // All versions ordered by version number
}
```

---

### get_version_chain

Get the full version chain from root to latest for an entity.

**Parameters:**
```typescript
{
  entityName: string;  // Name of the entity (any version in chain)
}
```

**Returns:**
```typescript
{
  chain: Entity[];   // Version chain from root to latest
  latest: Entity;    // The current latest version
}
```

---

## Semantic Forget

### forget_memory

Delete an entity by exact name. If no exact match is found, falls back to semantic similarity search (0.85 threshold) to locate and delete the closest matching entity.

**Parameters:**
```typescript
{
  entityName: string;      // Name or description of entity to forget
  auditReason?: string;    // Optional reason for audit log
}
```

**Returns:**
```typescript
{
  deleted: boolean;
  method: 'exact' | 'semantic';
  entityName: string;      // Actual name of deleted entity
}
```

---

## Profiles

### get_profile

Retrieve a user or agent profile entity.

**Parameters:**
```typescript
{
  profileName: string;  // Name of the profile entity
}
```

**Returns:**
```typescript
{
  profile: Entity;  // Profile entity with observations and metadata
}
```

---

### update_profile

Update observations and metadata on a profile entity.

**Parameters:**
```typescript
{
  profileName: string;
  observations?: string[];    // New observations to add
  importance?: number;        // Update importance (0-10)
  tags?: string[];            // Update tags
}
```

**Returns:**
```typescript
{
  profile: Entity;  // Updated profile entity
}
```

---

## Temporal KG

### invalidate_relation

Mark a relation as ended by setting its temporal validity end date.

**Parameters:**
```typescript
{
  from: string;
  to: string;
  relationType: string;
  endDate?: string;  // ISO 8601 date; defaults to now
}
```

**Returns:**
```typescript
{
  relation: Relation;  // Updated relation with validity end date
}
```

---

### query_as_of

Retrieve all relations for an entity that were valid at a given point in time.

**Parameters:**
```typescript
{
  entityName: string;
  asOf: string;  // ISO 8601 date for the time-travel query
}
```

**Returns:**
```typescript
{
  relations: Relation[];  // Relations valid at the specified date
}
```

---

### timeline

Return a chronological list of relation events (created/invalidated) for an entity.

**Parameters:**
```typescript
{
  entityName: string;
}
```

**Returns:**
```typescript
{
  events: Array<{
    date: string;
    event: 'created' | 'invalidated';
    relation: Relation;
  }>;
}
```

---

## Ingestion

### ingest

Ingest a conversation, document, or free-form text into the knowledge graph using the format-agnostic `IOManager.ingest()` pipeline.

**Parameters:**
```typescript
{
  input: string;           // Raw text, conversation, or document content
  format?: string;         // Hint: 'conversation' | 'document' | 'auto'
  projectId?: string;      // Assign ingested entities to a project
  tags?: string[];         // Tags to apply to ingested entities
}
```

**Returns:**
```typescript
{
  entitiesCreated: number;
  relationsCreated: number;
  observationsAdded: number;
}
```

---

## Agent Diary

### diary_write

Append an entry to the agent's persistent diary.

**Parameters:**
```typescript
{
  agentId: string;     // Agent identifier
  entry: string;       // Diary entry text
  tags?: string[];     // Optional tags for the entry
}
```

**Returns:**
```typescript
{
  entryId: string;
  timestamp: string;
}
```

---

### diary_read

Read diary entries for an agent, optionally filtered by date range.

**Parameters:**
```typescript
{
  agentId: string;
  startDate?: string;   // ISO 8601 date (inclusive)
  endDate?: string;     // ISO 8601 date (inclusive)
  limit?: number;       // Max entries to return (default: 50)
}
```

**Returns:**
```typescript
{
  entries: Array<{
    entryId: string;
    timestamp: string;
    entry: string;
    tags?: string[];
  }>;
}
```

---

## Entity Bitemporal Validity (Phase 15 / memoryjs η.4.4)

5 tools for time-travel queries over entities and observations. Distinct from v1.8 supersession (which models content edits over time): bitemporal validity models when a fact was true in the world. Entities and observations remain queryable for past timestamps after invalidation; only future-asOf queries return null.

### invalidate_entity

Mark an entity as no longer valid by setting `validUntil`. Idempotent. Does not delete — `entity_as_of` still returns it for past `asOf` timestamps.

```typescript
{
  name: 'invalidate_entity',
  arguments: {
    name: string;
    ended?: string;  // ISO 8601; defaults to current time
  }
}
```

### entity_as_of

Time-travel query: returns the entity at a given point in time. An entity is valid at `asOf` when `validFrom <= asOf AND (validUntil is undefined OR validUntil >= asOf)`.

```typescript
{
  name: 'entity_as_of',
  arguments: {
    name: string;
    asOf: string;  // ISO 8601
  }
}

// Returns: { entity: Entity | null, valid: boolean, asOf: string }
```

### entity_timeline

All temporal versions of an entity in chronological order (by `validFrom` ascending; unbounded entities last). Integrates the v1.8 supersession chain when one exists.

```typescript
{
  name: 'entity_timeline',
  arguments: { name: string }
}

// Returns: { name: string, versions: Entity[], count: number }
```

### invalidate_observation

Mark a specific observation on an entity as no longer valid. Creates a parallel `observationMeta[]` entry if absent. Throws if observation not found on entity.

```typescript
{
  name: 'invalidate_observation',
  arguments: {
    entityName: string;
    content: string;  // exact observation text to invalidate
    ended?: string;   // ISO 8601
  }
}
```

### observations_as_of

Get observations valid at a given point in time. Observations with no `observationMeta` entry are treated as unbounded.

```typescript
{
  name: 'observations_as_of',
  arguments: {
    entityName: string;
    asOf: string;
  }
}

// Returns: { entityName: string, asOf: string, observations: string[], count: number }
```

---

## Optimistic Concurrency Control (Phase 15 / memoryjs η.5.5.c)

### update_entity

Update an entity with optional optimistic concurrency control. Pass `expectedVersion` to assert the live entity is at that version; throws `VersionConflictError` on mismatch. Omit for legacy last-write-wins semantics. OCC-guarded writes auto-increment `version`.

```typescript
{
  name: 'update_entity',
  arguments: {
    name: string;
    updates: Partial<Entity>;
    expectedVersion?: number;
  }
}

// On success: returns updated Entity with bumped version
// On stale expectedVersion: error "Version conflict on entity 'X': expected vN, found vM"
```

---

## RBAC (Phase 15 / memoryjs η.6.1)

4 tools for role-based access control. Roles: `reader` (read-only), `writer` (read+write), `admin` (read+write+delete), `owner` (all four). Optional `resourceType` narrows to one type; optional `scope` narrows to a name prefix; optional `validUntil` expires the grant.

### rbac_assign_role

```typescript
{
  name: 'rbac_assign_role',
  arguments: {
    agentId: string;
    role: string;  // 'reader' | 'writer' | 'admin' | 'owner' | custom
    resourceType?: 'entity' | 'relation' | 'observation' | 'session' | 'artifact';
    scope?: string;       // e.g. 'project-x:'
    validFrom?: string;   // ISO 8601
    validUntil?: string;
    notes?: string;
  }
}
```

### rbac_revoke_role

Match by `agentId + role + resourceType` (exact, including `undefined`).

```typescript
{
  name: 'rbac_revoke_role',
  arguments: {
    agentId: string;
    role: string;
    resourceType?: 'entity' | 'relation' | 'observation' | 'session' | 'artifact';
  }
}
```

### rbac_check_permission

Falls back to `defaultRole=reader` for agents with no assignments.

```typescript
{
  name: 'rbac_check_permission',
  arguments: {
    agentId: string;
    action: 'read' | 'write' | 'delete' | 'manage';
    resourceType: 'entity' | 'relation' | 'observation' | 'session' | 'artifact';
    resourceName?: string;  // for scope-prefix matching
    now?: string;           // hypothetical-time queries
  }
}

// Returns: { agentId, action, resourceType, allowed: boolean }
```

### rbac_list_assignments

```typescript
{
  name: 'rbac_list_assignments',
  arguments: {
    agentId: string;
    activeOnly?: boolean;  // default false
    now?: string;
  }
}
```

---

## Procedural Memory (Phase 15 / memoryjs 3B.4)

5 tools for executable how-to sequences distinct from semantic facts and episodic events. Steps are 1-indexed with optional fallback chains. Auto-generates id when omitted.

### add_procedure

```typescript
{
  name: 'add_procedure',
  arguments: {
    id?: string;            // auto-generated if omitted
    name?: string;
    description?: string;
    steps: Array<{
      order: number;        // 1-indexed
      action: string;
      parameters: Record<string, string>;
      timeout?: number;     // ms
      fallback?: object;
    }>;
    triggers?: string[];    // free-form match phrases
  }
}
```

### get_procedure

```typescript
{ name: 'get_procedure', arguments: { id: string } }
```

### match_procedure

Token-overlap match a context description against stored procedures. Returns ranked Jaccard-like scores.

```typescript
{
  name: 'match_procedure',
  arguments: {
    context: string;
    candidateIds?: string[];  // default: all procedures
    threshold?: number;       // default 0
  }
}

// Returns: { context, threshold, matches: [{procedure, score}], count }
```

### refine_procedure

Apply caller feedback after execution. Increments `executionCount` and updates `successRate` via EWMA (α=0.2).

```typescript
{
  name: 'refine_procedure',
  arguments: {
    id: string;
    succeeded: boolean;
    notes?: string;
    recordedAt?: string;
  }
}
```

### get_procedure_step

Load by 1-indexed `order`, OR get the step after `order` when `next: true`.

```typescript
{
  name: 'get_procedure_step',
  arguments: {
    id: string;
    order: number;
    next?: boolean;
  }
}
```

---

## Active Retrieval (Phase 15 / memoryjs 3B.5)

### adaptive_retrieve

Iterative query rewriting: up to `maxRounds` of (search → score coverage → rewrite). Stops early when `coverage ≥ minCoverage` or no expansion tokens remain. Pure symbolic — no LLM provider required.

```typescript
{
  name: 'adaptive_retrieve',
  arguments: {
    query: string;
    maxRounds?: number;       // default 3
    minCoverage?: number;     // default 0.6
    resultsPerRound?: number; // default 10
    budgetTokens?: number;    // optional cost cap
  }
}

// Returns: {
//   bestResults: SearchResult[],
//   bestCoverage: number,
//   rounds: [{query, results, coverage, expansionTokens}]
// }
```

---

## Causal Reasoning (Phase 15 / memoryjs 3B.6)

4 tools that walk causal relation types: `causes`, `enables`, `prevents`, `precedes`, `correlates`. Chains are scored by product of per-edge `causalStrength`.

> **CAVEAT**: `detect_causal_cycles` treats `prevents` as a directed edge, not as logical negation — `prevents` + `enables` triangles ARE flagged as cycles.

### find_causes

Causal chains ending at the named effect.

```typescript
{
  name: 'find_causes',
  arguments: {
    effect: string;
    candidates: string[];
    maxDepth?: number;  // default 6
  }
}

// Returns: { effect, candidates, chains: Chain[], count }
```

### find_effects

Symmetric counterpart starting at the named cause.

```typescript
{
  name: 'find_effects',
  arguments: {
    cause: string;
    candidates: string[];
    maxDepth?: number;
  }
}
```

### counterfactual_query

"What if we remove edge (`removeFrom` → `removeTo`)? Is `predict` still reachable from `seed`?" Returns chains from seed to predict that DO NOT use the removed edge. Pure: does not mutate the graph.

```typescript
{
  name: 'counterfactual_query',
  arguments: {
    seed: string;
    removeFrom: string;
    removeTo: string;
    predict: string;
    maxDepth?: number;
  }
}
```

### detect_causal_cycles

```typescript
{
  name: 'detect_causal_cycles',
  arguments: {
    seed: string;
    maxDepth?: number;
  }
}
```

---

## World Model (Phase 15 / memoryjs 3B.7)

3 tools: snapshot the live graph, validate proposed observations against it, predict downstream effects of actions.

### get_world_state

Capture a fresh snapshot: `entitiesByName + takenAt timestamp + size`. Capped at `maxSnapshotSize` (default 1000); over-cap prefers high-importance entities.

```typescript
{ name: 'get_world_state', arguments: {} }

// Returns: { takenAt: string, entities: Array<{name, entityType, observationCount, ...}> }
```

### validate_fact_against_world

Validate a candidate observation against a target entity. Delegates to `MemoryValidator.validateConsistency`.

When the local embedding provider is selected but `@xenova/transformers` isn't installed, the handler returns a structured graceful response instead of leaking the raw Node module-resolution error:
```json
{
  "observation": "...",
  "entityName": "...",
  "result": null,
  "reason": "embedding_provider_unavailable",
  "detail": "Failed to initialize local embedding service: ..."
}
```

```typescript
{
  name: 'validate_fact_against_world',
  arguments: {
    observation: string;
    entityName: string;
  }
}
```

### predict_outcome

Predict downstream effects of an action by walking the causal subgraph. Delegates to `CausalReasoner.findEffects`.

```typescript
{
  name: 'predict_outcome',
  arguments: {
    action: string;
    candidates: string[];
  }
}
```

---

## Phase 15 enhancements to existing tools

### export_graph (extended)

Phase 15 (memoryjs η.5.4 / η.6.3) added three W3C Linked Data export formats and PII redaction:

| Field | Type | Notes |
|---|---|---|
| `format: 'turtle'` | RDF 1.1 Turtle | `@prefix rdf:`, `@prefix rdfs:`, `@prefix dcterms:` headers |
| `format: 'rdf-xml'` | RDF 1.1 XML | Statement reification for non-NCName predicates |
| `format: 'json-ld'` | JSON-LD 1.1 | `@context` mapping to RDFS + DCTerms |
| `redactPii?: boolean` | Default `false` | Scrubs email / SSN / credit-card / phone / IPv4 from observations using the η.6.3 `PiiRedactor` default pattern bank |

### create_entities (extended)

Phase 15 (memoryjs v1.6 freshness, v1.8 project scoping, η.4.4 bitemporal) added per-entity fields:

| Field | Type | Notes |
|---|---|---|
| `ttl?: number` | seconds | v1.6 freshness — seconds until entity is considered stale |
| `confidence?: number` | 0–1 | v1.6 freshness — belief strength |
| `projectId?: string` | string | v1.8 project scope identifier |
| `validFrom?: string` | ISO 8601 | η.4.4 — entity is valid from this instant |
| `validUntil?: string` | ISO 8601 | η.4.4 — entity is valid until this instant |
| `observationMeta?: Array<{...}>` | array | η.4.4 — per-observation temporal metadata indexed by content match |

### set_memory_visibility (extended)

Phase 15 (memoryjs η.5.5.b) added time-window and role gates, plus auto-promotion of plain entities to `AgentEntity` (was previously a silent `null` failure):

| Field | Type | Notes |
|---|---|---|
| `allowedRoles?: string[]` | array | Role gate AND-combined with the visibility level check |
| `visibleFrom?: string` | ISO 8601 | Memory becomes visible at this instant |
| `visibleUntil?: string` | ISO 8601 | Memory stops being visible at this instant |

When called on a plain `Entity` (not yet an `AgentEntity`), the handler now stamps `agentId`, `memoryType: 'semantic'`, `confidence: 0.8`, `confirmationCount: 0`, and `accessCount: 0` before applying visibility — and returns `{promoted: true, memoryName, agentId, visibility, ...}` so callers can detect the promotion.

---

## Ref Index (Phase 12)

### register_ref

Register a stable alias (ref) pointing to an entity name in the RefIndex for O(1) lookups

**Parameters:**
```typescript
{
  ref: string;
  entityName: string;
  description?: string;
}
```

### resolve_ref

Resolve a stable alias (ref) to its entity name via the RefIndex

**Parameters:**
```typescript
{
  ref: string;
}
```

### deregister_ref

Remove a stable alias (ref) from the RefIndex

**Parameters:**
```typescript
{
  ref: string;
}
```

### list_refs

List all registered refs in the RefIndex, optionally filtered by entity name

**Parameters:**
```typescript
{
  entityName?: string;
}
```

---

## Artifacts (Phase 12)

### create_artifact

Create an artifact entity (tool output, code snippet, API response, etc.) with a stable auto-generated ref

**Parameters:**
```typescript
{
  content: string;
  toolName: string;
  artifactType: "tool_output" | "code_snippet" | "api_response" | "search_result" | "file_content" | "user_input";
  description?: string;
  sessionId?: string;
}
```

### get_artifact

Retrieve an artifact entity by its stable ref or entity name

**Parameters:**
```typescript
{
  ref: string;
}
```

### list_artifacts

List all artifact entities, with optional filtering by tool name, type, or date

**Parameters:**
```typescript
{
  toolName?: string;
  artifactType?: "tool_output" | "code_snippet" | "api_response" | "search_result" | "file_content" | "user_input";
  since?: string;
}
```

---

## Temporal Search (Phase 12)

### search_by_time

Search entities using a natural language time expression (e.g. "last week", "yesterday", "in January")

**Parameters:**
```typescript
{
  query: string;
  field?: "createdAt" | "lastModified" | "any";
  includeUndated?: boolean;
}
```

---

## Distillation (Phase 12)

### configure_distillation

Configure the distillation pipeline policy (default, noop, or none) that filters memories before context formatting

**Parameters:**
```typescript
{
  policy: "default" | "noop" | "none";
}
```

---

## Freshness (Phase 12)

### check_freshness

Calculate the freshness score (0–1) for a specific entity based on its TTL and confidence

**Parameters:**
```typescript
{
  entityName: string;
}
```

### get_stale_entities

Return all entities whose freshness score is below a threshold

**Parameters:**
```typescript
{
  threshold?: number;
}
```

### get_expired_entities

Return all entities that have passed their TTL expiry

**Parameters:** none

### refresh_entity

Reset freshness for an entity by updating its creation timestamp to now and resetting confidence to 1.0

**Parameters:**
```typescript
{
  entityName: string;
}
```

### freshness_report

Generate a freshness report across all entities showing fresh, stale, and expired counts

**Parameters:**
```typescript
{
  threshold?: number;
}
```

---

## LLM Query (Phase 12)

### query_natural_language

Decompose a natural language query into a structured search plan and return matching entities

**Parameters:**
```typescript
{
  query: string;
}
```

---

## Governance (Phase 12)

### set_governance_policy

Set the active governance policy controlling which write operations (create, update, delete) are permitted for future requests

**Parameters:**
```typescript
{
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}
```

### audit_query

Query the audit log for operations matching filter criteria (operation type, agent ID, entity name, date range)

**Parameters:**
```typescript
{
  operation?: "create" | "update" | "delete" | "merge" | "archive";
  agentId?: string;
  entityName?: string;
  since?: string;
  until?: string;
  limit?: number;
}
```

### audit_history

Get the full audit history for a specific entity in chronological order

**Parameters:**
```typescript
{
  entityName: string;
}
```

### rollback_operation

Reverse a specific committed operation using its audit entry ID (restores entity to before-snapshot)

**Parameters:**
```typescript
{
  auditEntryId: string;
}
```

---

## Role Profiles (Phase 12)

### set_agent_role

Apply a built-in role profile (researcher, planner, executor, reviewer, coordinator) to adjust salience weights and context budgets

**Parameters:**
```typescript
{
  role: "researcher" | "planner" | "executor" | "reviewer" | "default";
}
```

### list_role_profiles

List all built-in role profiles with their salience weight and context budget configurations

**Parameters:** none

---

## Entropy (Phase 12)

### enable_entropy_filter

Enable or disable the Shannon entropy gate that drops low-information memories during consolidation

**Parameters:**
```typescript
{
  enabled: boolean;
  minEntropy?: number;
  minLength?: number;
}
```

### compute_entropy

Compute the Shannon entropy of a text string (in bits per character)

**Parameters:**
```typescript
{
  text: string;
  minEntropy?: number;
}
```

---

## Consolidation (Phase 12)

### start_consolidation

Start the background consolidation scheduler that periodically deduplicates and merges memories

**Parameters:**
```typescript
{
  intervalMs?: number;
  autoMergeDuplicates?: boolean;
}
```

### stop_consolidation

Stop the background consolidation scheduler

**Parameters:** none

### run_consolidation_now

Run a consolidation cycle on demand, independently of the scheduled interval

**Parameters:** none

---

## Formatter (Phase 12)

### format_with_salience_budget

Format memories for LLM prompt consumption with proportional token allocation based on salience scores

**Parameters:**
```typescript
{
  entityNames: Array<string>;
  salienceScores: {};
  totalTokenBudget: number;
  header?: string;
  separator?: string;
}
```

---

## Collaborative Synthesis (Phase 12)

### synthesize_collaborative_context

Synthesize context by traversing the graph neighbourhood from a seed entity and merging high-salience neighbors across agents

**Parameters:**
```typescript
{
  seedEntityName: string;
  maxDepth?: number;
  minNeighborSalience?: number;
  maxNeighbors?: number;
  queryText?: string;
  currentTask?: string;
}
```

---

## Failure Handling (Phase 12)

### distill_failure

Distill lessons from a failed session by tracing the causal chain and extracting actionable insights

**Parameters:**
```typescript
{
  sessionId: string;
  minLessonConfidence?: number;
  maxCauseChainLength?: number;
}
```

### end_session

End a session and trigger failure distillation if the session outcome was a failure

**Parameters:**
```typescript
{
  sessionId: string;
  outcome: "success" | "failure" | "partial";
  distillFailures?: boolean;
}
```

---

## Cognitive Load (Phase 12)

### analyze_cognitive_load

Analyze the cognitive load of a set of entities: token density, redundancy ratio, diversity score, and composite load score

**Parameters:**
```typescript
{
  entityNames: Array<string>;
  loadThreshold?: number;
}
```

### adaptive_reduce_memories

Adaptively reduce a set of memories until their cognitive load falls below the configured threshold by removing low-salience redundant memories

**Parameters:**
```typescript
{
  entityNames: Array<string>;
  salienceScores: {};
  loadThreshold?: number;
}
```

---

## Dream Engine (v12.0.0)

### dream_start

Start the DreamEngine background memory maintenance. Runs 8 phases (temporal anchoring, freshness sweep, entropy pruning, consolidation, compression, entity enrichment, pattern promotion, graph hygiene) on a configurable interval.

**Parameters:**
```typescript
{
  intervalMs?: number;
  runOnSessionEnd?: boolean;
  maxDurationMs?: number;
  phases?: {
    temporalAnchoring?: boolean;
    freshnessSweep?: boolean;
    entropyPruning?: boolean;
    consolidation?: boolean;
    compression?: boolean;
    entityEnrichment?: boolean;
    patternPromotion?: boolean;
    graphHygiene?: boolean;
  };
}
```

### dream_stop

Stop the DreamEngine background process.

**Parameters:** none

### dream_run_now

Run a single dream cycle immediately. Returns detailed per-phase results.

**Parameters:**
```typescript
{
  phases?: {
    temporalAnchoring?: boolean;
    freshnessSweep?: boolean;
    entropyPruning?: boolean;
    consolidation?: boolean;
    compression?: boolean;
    entityEnrichment?: boolean;
    patternPromotion?: boolean;
    graphHygiene?: boolean;
  };
}
```

---

## Active Project Scope (v12.3.2)

### set_project_scope

Set the active project scope for this server session. New entities passed without an explicit projectId may be auto-stamped with this value by scope-aware handlers; pass an empty string to clear the scope. Returns { projectId } where projectId is the new active scope (null when cleared).

**Parameters:**
```typescript
{
  projectId: string;
}
```

### get_project_scope

Returns the active project scope for this server session (set via set_project_scope). Returns { projectId } where projectId is null when no scope is active.

**Parameters:** none

---

## Session & Working Memory (Phase 14)

### session_start

Start a new agent session via AgentMemoryManager. Tracks session lifecycle, enables working memory, and supports session chaining. Returns a SessionEntity with id and timestamps.

**Parameters:**
```typescript
{
  taskDescription?: string;
  parentSessionId?: string;
  metadata?: {};
}
```

### session_end

End an agent session via AgentMemoryManager with summary generation and working memory promotion. Unlike end_session (which handles failure distillation on graph entities), this manages the full agent session lifecycle.

**Parameters:**
```typescript
{
  sessionId: string;
  status?: "completed" | "abandoned";
}
```

### session_checkpoint

Create a checkpoint snapshot of the current session state for later restore

**Parameters:**
```typescript
{
  sessionId: string;
  name?: string;
}
```

### session_restore

Restore a session from a previously created checkpoint

**Parameters:**
```typescript
{
  checkpointId: string;
}
```

### add_working_memory

Create a TTL-based short-term working memory entry scoped to a session. Working memories auto-expire and can be promoted to long-term storage.

**Parameters:**
```typescript
{
  sessionId: string;
  content: string;
  taskId?: string;
  importance?: number;
  ttlHours?: number;
}
```

### promote_working_memory

Promote a working memory entry to long-term episodic or semantic storage

**Parameters:**
```typescript
{
  memoryName: string;
  targetType?: "episodic" | "semantic";
}
```

### confirm_memory

Boost a memory's confidence score without resetting its timestamp. Unlike refresh_entity (which resets to 1.0), this incrementally increases confidence.

**Parameters:**
```typescript
{
  memoryName: string;
  confidenceBoost?: number;
}
```

### clear_expired_memories

Remove all working memories that have exceeded their TTL. Complements get_expired_entities (which lists but does not delete).

**Parameters:** none

### wake_up

Initialize a 4-layer memory stack context (~600 tokens). L0 loads profile identity, L1 loads top entities by importance. Returns a compact boot context for LLM consumption.

**Parameters:**
```typescript
{
  compress?: boolean;
}
```

---

## Auto-Enhancement (Phase 14)

### auto_link_observations

Detect entity mentions in observation text and suggest cross-reference relations. Unlike normalize_observations (which resolves pronouns/dates), this finds entity name mentions.

**Parameters:**
```typescript
{
  text: string;
}
```

### extract_facts

Extract structured facts from observation text using rule-based extraction

**Parameters:**
```typescript
{
  text: string;
}
```

### detect_contradictions

Find conflicting observations within an entity using semantic similarity

**Parameters:**
```typescript
{
  entityName: string;
  threshold?: number;
}
```

### consolidate_session

Run the full ConsolidationPipeline on a session: promote working memory, merge duplicates, summarize, and extract patterns. Unlike run_consolidation_now (which runs the dedup scheduler), this is a comprehensive session-scoped pipeline.

**Parameters:**
```typescript
{
  sessionId: string;
}
```

### detect_patterns

Detect recurring token-based patterns across observations of a given entity type

**Parameters:**
```typescript
{
  entityType: string;
  minOccurrences?: number;
}
```

### summarize_entity

Auto-summarize redundant observations within a single entity. Unlike compress_graph (which merges similar entities), this condenses observations within one entity.

**Parameters:**
```typescript
{
  entityName: string;
  threshold?: number;
}
```

### priority_dedup

Smart priority-based deduplication that keeps the highest-scored entity per duplicate group (importance > recency > observation count > tags)

**Parameters:**
```typescript
{
  dryRun?: boolean;
}
```

---

## Context Compression (Phase 14)

### compress_context

Compress text using n-gram abbreviation with a legend for token-efficient context loading. Unlike format_with_salience_budget (which allocates token budget), this does text-level compression.

**Parameters:**
```typescript
{
  text: string;
  level?: "light" | "medium" | "aggressive";
}
```

---

## Decay & Salience (Phase 14)

### run_decay_cycle

Run a single pass of time-based importance decay across all agent memories. Returns count of decayed and forgotten memories.

**Parameters:** none

### get_decayed_memories

List memories whose importance has fallen below a threshold due to time-based decay. Unlike get_stale_entities (which uses freshness timestamps), this uses decay engine importance calculations.

**Parameters:**
```typescript
{
  threshold?: number;
}
```

### forget_weak_memories

Bulk-delete memories that fell below a decay threshold. Unlike forget_memory (content match) or archive_entities (criteria-based move), this uses decay-based importance scoring.

**Parameters:**
```typescript
{
  threshold?: number;
  maxCount?: number;
  dryRun?: boolean;
}
```

### reinforce_memory

Boost a memory's decay resistance by increasing confirmation count and/or confidence. Unlike refresh_entity (timestamp reset) or set_importance (static score), this modulates the decay model.

**Parameters:**
```typescript
{
  memoryName: string;
  confirmationBoost?: number;
  confidenceBoost?: number;
}
```

### score_salience

Calculate 5-component relevance score for an entity: baseImportance, recencyBoost, frequencyBoost, contextRelevance, noveltyBoost. Use with format_with_salience_budget to score then format.

**Parameters:**
```typescript
{
  entityName: string;
  queryText?: string;
  taskDescription?: string;
  sessionId?: string;
}
```

---

## Multi-Agent (Phase 14)

### register_agent

Register an agent for multi-agent operations with identity metadata. Unlike set_agent_role (which applies a role profile), this registers agent identity with type, trust level, and capabilities.

**Parameters:**
```typescript
{
  agentId: string;
  type?: string;
  trustLevel?: number;
  capabilities?: Array<string>;
}
```

### search_cross_agent

Search across agent memories with trust-weighted scoring and visibility filtering

**Parameters:**
```typescript
{
  requestingAgentId: string;
  query: string;
  agentIds?: Array<string>;
}
```

### get_visible_memories

Get all memories visible to a specific agent based on visibility rules and trust levels

**Parameters:**
```typescript
{
  agentId: string;
}
```

### resolve_agent_conflict

Resolve a conflict between two agent memories using a specified strategy

**Parameters:**
```typescript
{
  primaryMemory: string;
  conflictingMemory: string;
  strategy?: "most_recent" | "highest_confidence" | "most_confirmations" | "trusted_agent";
}
```

---

## Observability (Phase 14)

### visualize_graph

Generate a self-contained interactive HTML page with a D3.js force-directed graph visualization. Nodes are colored by type and sized by importance.

**Parameters:**
```typescript
{
  maxEntities?: number;
  title?: string;
}
```

### split_transcript

Split concatenated multi-session transcripts into per-session chunks via delimiter detection. Preprocessing step before ingest.

**Parameters:**
```typescript
{
  text: string;
}
```

### estimate_query_cost

Estimate execution cost (time, tokens) for all available search methods on a given query. Unlike analyze_query (which extracts entities/complexity), this predicts per-method performance.

**Parameters:**
```typescript
{
  query: string;
}
```

### get_context_profile

Get a ContextWindowManager profile configuration (salience weights, retrieval strategy). Unlike get_profile (user profile facts), this returns context-aware retrieval settings.

**Parameters:**
```typescript
{
  name: string;
}
```

---

## Tool Affordance (Phase 16 / memoryjs v2.1.0)

### record_tool_outcome

v2.1.0 — Record a single tool-call outcome directly via ToolAffordanceManager (bypasses ToolCallObserver). Creates the record on first call; appends to rolling window on subsequent. Throws "conflict" on concurrent writer mismatch.

**Parameters:**
```typescript
{
  toolName: string;
  outcome: "success" | "failure" | "partial";
  errorMessage?: string;
  durationMs?: number;
}
```

### get_tool_affordance_stats

v2.1.0 — Flat rolling stats for a tool: success_rate, total_calls, common_failure_modes, avg_duration_ms.

**Parameters:**
```typescript
{
  toolName: string;
}
```

### suggest_tool

v2.1.0 — Suggest tools matching a task hint, ranked by successRate × recency factor (1.0 at ≤1d, linearly decays to 0.1 at ≥30d).

**Parameters:**
```typescript
{
  taskHint: string;
  limit?: number;
  minScore?: number;
}
```

### list_tool_affordances

v2.1.0 — All recorded ToolAffordanceRecords.

**Parameters:** none

### remove_tool_affordance

v2.1.0 — Drop a tool-affordance record by toolName.

**Parameters:**
```typescript
{
  toolName: string;
}
```

### observe_tool_start

v2.1.0 — Begin observing a tool call. Returns a callId the caller threads through observe_tool_complete / observe_tool_error / observe_tool_partial / observe_tool_cancel. Emits toolCall:start on the observer EventEmitter.

**Parameters:**
```typescript
{
  toolName: string;
  args?: {};
}
```

### observe_tool_complete

v2.1.0 — Record successful completion. Computes durationMs from observe_tool_start. No-op on unknown callId.

**Parameters:**
```typescript
{
  callId: string;
  result?: string;
}
```

### observe_tool_error

v2.1.0 — Record failure with an error message. No-op on unknown callId.

**Parameters:**
```typescript
{
  callId: string;
  errorMessage: string;
}
```

### observe_tool_partial

v2.1.0 — Record a partial result (tool returned a usable but incomplete result). No-op on unknown callId.

**Parameters:**
```typescript
{
  callId: string;
  reason: string;
}
```

### observe_tool_cancel

v2.1.0 — Drop an in-flight observation without recording (e.g. user cancelled). No-op on unknown callId.

**Parameters:**
```typescript
{
  callId: string;
}
```

### tool_observer_in_flight_count

v2.1.0 — Diagnostic: number of in-flight (started but not yet completed) tool-call observations.

**Parameters:** none

---

## Heuristic Guidelines (Phase 16 / memoryjs v2.1.0)

### add_heuristic

v2.1.0 — Register a new condition→action heuristic. Storage-backed; default confidence 0.5. Pass an explicit content-addressed id (e.g. h_<sha256(condition|action)>) for caller-managed idempotency.

**Parameters:**
```typescript
{
  condition: string;
  action: string;
  priority?: number;
  initialConfidence?: number;
  importance?: number;
  agentId?: string;
  id?: string;
}
```

### get_heuristic

v2.1.0 — Sync lookup by HeuristicId.

**Parameters:**
```typescript
{
  id: string;
}
```

### list_heuristics

v2.1.0 — All registered heuristics.

**Parameters:** none

### heuristic_count

v2.1.0 — Count of stored heuristics.

**Parameters:** none

### match_heuristics

v2.1.0 — Find heuristics whose condition matches input via Jaccard token-overlap × confidence; sorted descending, then by priority.

**Parameters:**
```typescript
{
  input: string;
  limit?: number;
  minScore?: number;
}
```

### reinforce_heuristic

v2.1.0 — Record a successful application: bumps support; raises confidence asymptotically (new = old + (1-old)*0.1). OCC-protected — surfaces "conflict" when concurrent writer collides.

**Parameters:**
```typescript
{
  id: string;
}
```

### record_heuristic_contradiction

v2.1.0 — Record a counter-example: bumps contradictions; lowers confidence (new = old - old*0.2). OCC-protected.

**Parameters:**
```typescript
{
  id: string;
}
```

### detect_heuristic_conflicts

v2.1.0 — Pair-wise overlap/contradiction detection across stored heuristics. Surfaces overlap (same condition tokens, different actions) and contradiction (opposing actions on overlapping conditions; negation prefixes such as "do not" / "never" / "avoid").

**Parameters:** none

### remove_heuristic

v2.1.0 — Drop a heuristic by id.

**Parameters:**
```typescript
{
  id: string;
}
```

### clear_heuristics

v2.1.0 — Drop every heuristic (across all entities of type "heuristic").

**Parameters:** none

---

## Project Context (Phase 16 / memoryjs v2.1.0)

### upsert_project_context

v2.1.0 — Merge structured project knowledge into the ProjectContextRecord for `projectId`. Array fields (facts/conventions/commands/glossary) append + dedup; scalars overwrite. One record per projectId.

**Parameters:**
```typescript
{
  projectId: string;
  facts?: Array<string>;
  conventions?: Array<string>;
  commands?: Array<{
    name: string;
    command: string;
    purpose: string;
  }>;
  glossary?: Array<{
    term: string;
    definition: string;
  }>;
}
```

### get_project_context

v2.1.0 — Sync lookup of the ProjectContextRecord for projectId.

**Parameters:**
```typescript
{
  projectId: string;
}
```

### append_project_fact

v2.1.0 — Append one fact to a project context (auto-creates the record on first call; dedups).

**Parameters:**
```typescript
{
  projectId: string;
  fact: string;
}
```

### append_project_convention

v2.1.0 — Append one convention to a project context (auto-creates; dedups).

**Parameters:**
```typescript
{
  projectId: string;
  convention: string;
}
```

### append_project_command

v2.1.0 — Append a documented project command (dedup by name).

**Parameters:**
```typescript
{
  projectId: string;
  name: string;
  command: string;
  purpose: string;
}
```

### append_project_glossary_term

v2.1.0 — Append a glossary term (dedup by term).

**Parameters:**
```typescript
{
  projectId: string;
  term: string;
  definition: string;
}
```

### remove_project_fact

v2.1.0 — Remove a single fact. Returns true if found.

**Parameters:**
```typescript
{
  projectId: string;
  fact: string;
}
```

### remove_project_convention

v2.1.0 — Remove a single convention. Returns true if found.

**Parameters:**
```typescript
{
  projectId: string;
  convention: string;
}
```

### remove_project_command

v2.1.0 — Remove a command by name. Returns true if found.

**Parameters:**
```typescript
{
  projectId: string;
  commandName: string;
}
```

### remove_project_glossary_term

v2.1.0 — Remove a glossary entry by term. Returns true if found.

**Parameters:**
```typescript
{
  projectId: string;
  term: string;
}
```

### clear_project_context

v2.1.0 — Wipe the four arrays (facts/conventions/commands/glossary) for projectId; keeps the entity.

**Parameters:**
```typescript
{
  projectId: string;
}
```

### format_project_context_for_llm

v2.1.0 — Render the ProjectContextRecord as a prose summary suitable for the wakeUp L0 layer or a system prompt. Honors budgetChars with ellipsis truncation.

**Parameters:**
```typescript
{
  projectId: string;
  budgetChars?: number;
}
```

---

## Decision Rationale (Phase 16 / memoryjs v2.1.0)

### propose_decision

v2.1.0 — Propose a new architecture-decision-record (ADR-equivalent). Creates a "proposed" DecisionRecord. Default importance 8.

**Parameters:**
```typescript
{
  context: string;
  decision: string;
  alternatives?: Array<string>;
  consequences?: Array<string>;
  relatedFiles?: Array<string>;
  supersedes?: string;
  sourceSessionId?: string;
  sourceProjectId?: string;
  importance?: number;
  agentId?: string;
}
```

### accept_decision

v2.1.0 — Transition a proposed decision to accepted. Returns one of: accepted | already-accepted | not-found | illegal-transition | conflict | vanished-mid-update.

**Parameters:**
```typescript
{
  id: string;
}
```

### reject_decision

v2.1.0 — Transition a proposed decision to rejected with a reason. Returns rejected | already-rejected | not-found | illegal-transition | conflict | vanished-mid-update.

**Parameters:**
```typescript
{
  id: string;
  reason: string;
}
```

### supersede_decision

v2.1.0 — Mark an accepted decision as superseded by another. illegal-transition when target is not accepted. not-found when target or replacement is missing.

**Parameters:**
```typescript
{
  id: string;
  by: string;
}
```

### find_decisions_by_context

v2.1.0 — Substring search across context, decision, and consequences fields.

**Parameters:**
```typescript
{
  query: string;
}
```

### get_decision_chain

v2.1.0 — Walk the supersedes link backward from the supplied id to the original proposal. Returns chain oldest-first; cycle-protected.

**Parameters:**
```typescript
{
  id: string;
}
```

### list_decisions

v2.1.0 — List decisions, optionally filtered by status / sourceSessionId / sourceProjectId.

**Parameters:**
```typescript
{
  status?: "proposed" | "accepted" | "superseded" | "rejected";
  sourceSessionId?: string;
  sourceProjectId?: string;
  limit?: number;
}
```

### get_decision

v2.1.0 — Sync lookup by DecisionId.

**Parameters:**
```typescript
{
  id: string;
}
```

### export_decision_as_adr_markdown

v2.1.0 — Render a stored decision as ADR-format markdown (# title, Status, Context, Decision, Consequences bullet list, Alternatives bullet list, optional Supersedes link).

**Parameters:**
```typescript
{
  id: string;
}
```

### parse_adr_markdown

v2.1.0 — Parse a hand-written or previously-exported ADR markdown into a DecisionInput shape (static; no persistence). Returns null when required Context or Decision sections are missing.

**Parameters:**
```typescript
{
  text: string;
}
```

---

## Exclusion / do_not_remember (Phase 16 / memoryjs v2.1.0)

### add_exclusion_rule

v2.1.0 — Add a content-pattern exclusion rule (do_not_remember). Hard-deletes existing matches (per `scope`) and write-blocks future ones when consulted by upstream callers. v1 substring-only.

**Parameters:**
```typescript
{
  pattern: string;
  scope?: "future-only" | "past-only" | "both";
  entityType?: string;
  reason?: string;
}
```

### list_exclusion_rules

v2.1.0 — Return every registered ExclusionRule.

**Parameters:** none

### remove_exclusion_rule

v2.1.0 — Drop an exclusion rule by id. Does NOT restore previously deleted memories — the contract is "user said forget".

**Parameters:**
```typescript
{
  id: string;
}
```

### check_exclusion

v2.1.0 — Check whether content would be blocked by any active forward-blocking rule. Returns {blocked, ruleId?, reason?}. Past-only rules are skipped.

**Parameters:**
```typescript
{
  content: string;
  entityType?: string;
}
```

### find_matching_memories_for_rule

v2.1.0 — Dry-run preview: return entities whose observations would match the candidate exclusion pattern. Does NOT persist the rule.

**Parameters:**
```typescript
{
  pattern: string;
  entityType?: string;
}
```

---

## Observation Dedup (Phase 16 / memoryjs v2.1.0)

### find_duplicate_observations

v2.1.0 — Find verbatim duplicate observation strings across distinct entities (SHA-256 exact tier). Complementary to MemoryEngine.checkDuplicate (turn-level) and CompressionManager.findDuplicates (whole-entity). Report-only.

**Parameters:**
```typescript
{
  entityType?: unknown;
  projectId?: string;
  sessionId?: string;
  minOccurrences?: number;
  maxGroups?: number;
}
```

### find_jaccard_duplicate_observations

v2.1.0 — Find near-duplicate observation strings across distinct entities via token-Jaccard similarity with union-find grouping. More expensive than the exact tier (O(o²)); opt-in for higher recall.

**Parameters:**
```typescript
{
  entityType?: unknown;
  projectId?: string;
  sessionId?: string;
  minOccurrences?: number;
  maxGroups?: number;
}
```

---

## Spell Correction (Phase 16 / memoryjs v2.1.0)

### spell_suggest

v2.1.0 — Suggest close matches for a (potentially misspelled) query over the vocabulary of entity names + tag values. Two-stage: bigram-Jaccard pre-filter (NGramIndex) + Levenshtein re-rank.

**Parameters:**
```typescript
{
  query: string;
  limit?: number;
  minScore?: number;
  maxDistance?: number;
}
```

### spell_rebuild_vocabulary

v2.1.0 — Force a rebuild of the SpellChecker vocabulary + n-gram index. Call after bulk entity churn; the lazy cache is otherwise correct for low-churn graphs.

**Parameters:** none

### spell_vocabulary_size

v2.1.0 — Return the count of unique terms in the SpellChecker vocabulary (entity names + tag values by default). Mostly diagnostic.

**Parameters:** none

---

## Engineering / Diagnostics (v12.5.0)

### diag

v12.5.0 — Runtime + storage diagnostic snapshot: node version, platform, storage path/type/size, entity + relation counts, ISO timestamp. Good first call when something feels off.

**Parameters:** none

### health

v12.5.0 — Fast integrity checks: storage:loadGraph, entities:distinct-names, relations:no-orphans, hierarchy:no-cycles-no-missing-parents. Returns per-check duration; ok=false when any check fails.

**Parameters:** none

### check_graph

v12.5.0 — Detect orphan relations (from/to references a missing entity), missing parents (entity.parentId references a missing entity), and hierarchy cycles. Reports findings. With apply=true, deletes orphan relations and clears missing parentIds; cycles are always reported but never auto-repaired (no safe default for which edge to break).

**Parameters:**
```typescript
{
  apply?: boolean;
}
```

### reindex

v12.5.0 — Rebuild search-side indexes that may have drifted (TF-IDF/BM25 ranked + spell-checker vocabulary). Pass ranked=false or spell=false to scope. Returns per-target ok flag + durationMs.

**Parameters:**
```typescript
{
  ranked?: boolean;
  spell?: boolean;
}
```

### cache_stats

v12.5.0 — Per-tier snapshot of the global search caches (basic / ranked / boolean / fuzzy) showing hits / misses / size / hitRate. Process-local — every fresh server process starts at zero.

**Parameters:** none

### cache_clear

v12.5.0 — Bust all four global search caches. Idempotent; safe after manual graph edits to drop stale results.

**Parameters:** none

### graph_size

v12.5.0 — Graph + storage footprint: entity / relation / observation counts, distinct tag count, avg observations per entity, on-disk byte size + JSONL line count.

**Parameters:** none

### inspect_entity

v12.5.0 — Verbose snapshot of one entity: observations (resolved via ObservationManager so the column-store sidecar is consulted), outgoing + incoming relations, tags, importance, timestamps, parentId, immediate children, full ancestors. Errors when entity not found.

**Parameters:**
```typescript
{
  name: string;
}
```

### hierarchy_tree

v12.5.0 — Hierarchy tree as nested JSON. With an explicit root, returns just that subtree; without, returns all root entities. Useful for visualising parent/child structure.

**Parameters:**
```typescript
{
  root?: string;
}
```

### entity_neighbors

v12.5.0 — Incoming + outgoing relations for one entity, plus in/out degree counts. Lighter than inspect_entity when you only need the graph-topology view.

**Parameters:**
```typescript
{
  name: string;
}
```

---

## Event Memory (v12.7.0 / memoryjs v3.0.0)

### record_event

Record an n-ary event: the action becomes a first-class event hub entity with role-typed relations (actor_of/targeted/occurred_in/participant_in). Missing endpoints auto-create as concept stubs. Optional flowKey groups events into a named flow.

**Parameters:**
```typescript
{
  action: string;
  actor: string;
  target?: string;
  context?: string;
  participants?: Array<string>;
  occurredAt?: string;
  flowKey?: string;
  detail?: Array<string>;
  importance?: number;
}
```

### get_event

Load one recorded event by its entity name, joining the event hub with its role-typed relation endpoints (actor, target, context, participants).

**Parameters:**
```typescript
{
  name: string;
}
```

### query_events

Query recorded events by any combination of actor, target, action, flowKey, and inclusive time range. Results are chronologically ordered (occurredAt, falling back to createdAt). Uses relation/type indexes — never a full-graph scan.

**Parameters:**
```typescript
{
  actor?: string;
  target?: string;
  action?: string;
  flowKey?: string;
  timeRange?: {
    start?: string;
    end?: string;
  };
  limit?: number;
}
```

### get_event_flow

All events sharing a flow key (flow:<key> tag), chronologically ordered — the full timeline of a named flow (e.g. a release, an incident).

**Parameters:**
```typescript
{
  flowKey: string;
}
```

### who_did_what

Convenience join answering "who did what (to target / in context / within time range)?" over recorded events. Returns actor + action + event tuples; events without a resolvable actor are omitted.

**Parameters:**
```typescript
{
  target?: string;
  context?: string;
  timeRange?: {
    start?: string;
    end?: string;
  };
  limit?: number;
}
```

---

## Reconstructive Memory (v12.7.0 / memoryjs v3.0.0)

### ingest_dialogue

Distill raw dialogue turns into the Cue–Tag–Content associative memory graph (MRAgent-style "memory is reconstructed, not retrieved"). Episodic/semantic/topic layers are also persisted into the live knowledge graph. Multiple calls accumulate.

**Parameters:**
```typescript
{
  turns: Array<{
    id: string;
    speaker?: string;
    text: string;
    timestamp?: string;
  }>;
}
```

### reconstruct_memory

Answer a query via active multi-step traversal of the reconstructive (Cue–Tag–Content) memory graph. Returns accumulated evidence, the step-by-step trajectory, and whether the loop stopped early on a satisfied condition vs. budget.

**Parameters:**
```typescript
{
  query: string;
  maxSteps?: number;
  perStepBudget?: number;
  evidenceTarget?: number;
}
```

### reconstructive_memory_stats

Size statistics of the reconstructive (Cue–Tag–Content) memory graph: cue / tag / content node counts and edge counts.

**Parameters:** none

---

## Relation Consolidation (v12.7.0 / memoryjs v3.0.0)

### analyze_relation_duplicates

Dry-run the three-tier relation janitor: tier 1 finds trivial relationType spelling variants (WorksAt/works-at/works_at) and redundant bidirectional mirrors; tier 2 (when an embedding provider is configured) finds semantically equivalent same-pair relations. Report-only — never mutates the graph.

**Parameters:** none

### consolidate_relations

Run relation-duplicate analysis and — when apply=true — merge tier 1+2 duplicate groups (delete variants, create the canonical survivor with summed confirmationCount). apply=false (default) is identical to analyze_relation_duplicates.

**Parameters:**
```typescript
{
  apply?: boolean;
}
```

---

## Agent Reflection (v12.7.0 / memoryjs v3.0.0)

### create_reflection

Persist an agent reflection — a generalized lesson distilled from experience, backed by evidence entities. Deduplicated by evidence hash; scoped to session, project, or global.

**Parameters:**
```typescript
{
  scope: "session" | "project" | "global";
  summary: string;
  evidence: Array<string>;
  generalizationConfidence: number;
  keyInsights?: Array<string>;
  experienceType?: string;
  sourceSessionId?: string;
  sourceProjectId?: string;
  importance?: number;
  agentId?: string;
}
```

### list_reflections

List stored agent reflections, filterable by scope, source session/project, and minimum generalization confidence. Archived reflections are excluded unless includeArchived is set.

**Parameters:**
```typescript
{
  scope?: "session" | "project" | "global";
  sourceSessionId?: string;
  sourceProjectId?: string;
  minConfidence?: number;
  includeArchived?: boolean;
  limit?: number;
}
```

### get_relevant_reflections

Reflections relevant to a session: matches by sourceSessionId, plus evidence overlap with the supplied session entity names. Use at session start to surface applicable past lessons.

**Parameters:**
```typescript
{
  sessionId: string;
  sessionEntityNames?: Array<string>;
  minConfidence?: number;
  limit?: number;
}
```

### archive_reflection

Archive a reflection by id so it no longer appears in default listings or relevance matches (soft delete — the record is retained).

**Parameters:**
```typescript
{
  id: string;
}
```

---

## Reconstructive Memory Persistence (v12.7.0 / memoryjs v3.0.0)

### save_reconstructive_memory

Serialize the in-memory Cue–Tag–Content reconstructive graph to a JSON sidecar next to the storage file (<basename>-reconstructive.json). The CTC graph is process-local; save before shutdown to survive restarts.

**Parameters:** none

### load_reconstructive_memory

Restore the Cue–Tag–Content reconstructive graph from the <basename>-reconstructive.json sidecar written by save_reconstructive_memory, replacing the current in-memory graph. Errors if no sidecar exists.

**Parameters:** none

---

## Common Patterns

### Pattern 1: Create and Connect

```json
// 1. Create entities
{
  "tool": "create_entities",
  "arguments": {
    "entities": [
      { "name": "Alice", "entityType": "person", "observations": ["Engineer"] },
      { "name": "Project_X", "entityType": "project", "observations": ["AI project"] }
    ]
  }
}

// 2. Create relation
{
  "tool": "create_relations",
  "arguments": {
    "relations": [
      { "from": "Alice", "to": "Project_X", "relationType": "works_on" }
    ]
  }
}
```

### Pattern 2: Search and Tag

```json
// 1. Search for entities
{
  "tool": "search_nodes",
  "arguments": {
    "query": "engineer",
    "minImportance": 5
  }
}

// 2. Add tags to results
{
  "tool": "add_tags_to_multiple_entities",
  "arguments": {
    "entityNames": ["Alice", "Bob"],
    "tags": ["senior"]
  }
}
```

### Pattern 3: Find and Merge Duplicates

```json
// 1. Find duplicates
{
  "tool": "find_duplicates",
  "arguments": {
    "threshold": 0.85
  }
}

// 2. Review and merge
{
  "tool": "merge_entities",
  "arguments": {
    "entityNames": ["Alice Smith", "Alice_Smith"],
    "targetName": "Alice Smith"
  }
}
```

---

## Error Handling

All tools return errors in this format:

```typescript
{
  "content": [{
    "type": "text",
    "text": "Error: <message>"
  }],
  "isError": true
}
```

**Common Error Types:**
- `ValidationError`: Invalid input parameters
- `EntityNotFoundError`: Entity doesn't exist
- `DuplicateError`: Entity already exists
- `CycleDetectedError`: Hierarchy would create a cycle
- `SecurityError`: Path traversal or injection attempt

---

## Performance Guidelines

| Operation | Scale | Expected Time |
|-----------|-------|---------------|
| create_entities | 100 | <200ms |
| create_entities | 1000 | <1500ms |
| search_nodes | 500 entities | <100ms |
| search_nodes_ranked | 500 entities | <600ms |
| boolean_search | 500 entities | <150ms |
| fuzzy_search | 500 entities | <200ms |
| find_duplicates | 100 | <300ms |
| find_duplicates | 500 | <1500ms |
| compress_graph | 100 | <400ms |
| export_graph | 1000 entities | <1000ms |

---

## Best Practices

1. **Use Batch Operations**: Always prefer `create_entities` over multiple single entity calls
2. **Filter Early**: Use tags and importance filters to reduce result sets
3. **Choose Right Search**: Basic for simple queries, ranked for relevance, boolean for complex logic
4. **Regular Compression**: Run `find_duplicates` periodically to maintain quality
5. **Validate Imports**: Use `validate_graph` after importing data
6. **Tag Consistently**: Use `add_tag_alias` for normalization
7. **Export Before Major Changes**: Always backup before `compress_graph` or large merges

---

**Document Version**: 6.0
**Last Updated**: 2026-07-26
**Total Tools**: 241
**Maintained By**: Daniel Simon Jr.
