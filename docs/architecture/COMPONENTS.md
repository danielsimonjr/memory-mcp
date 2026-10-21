# Memory MCP - Component Reference

This repository holds the server layer of Memory MCP. The layer has five source files, in `src/`. All graph logic lives in the
[`@danielsimonjr/memoryjs`](https://github.com/danielsimonjr/memoryjs) library. `package.json` holds the version range of that library.

This document describes the five files and the contract between them and memoryjs. For the components of memoryjs, read the
[memoryjs architecture documents](https://github.com/danielsimonjr/memoryjs/tree/master/docs/architecture).

---

## Table of Contents

1. [Overview](#overview)
2. [Server Components](#server-components)
3. [The memoryjs Contract](#the-memoryjs-contract)
4. [Component Dependencies](#component-dependencies)
5. [Verification](#verification)

---

## Overview

```
 MCP client
     │  stdio
     ▼
 src/index.ts ──────────► creates ManagerContext, starts MCPServer, and exits at the end of stdin
     │
     ▼
 src/server/MCPServer.ts ─► answers tools/list and tools/call
     │                 │
     ▼                 ▼
 toolDefinitions.ts   toolHandlers.ts ──► responseCompressor.ts
 (the tool schemas)   (one handler per tool)

 Every file except toolDefinitions.ts imports from
 @danielsimonjr/memoryjs  (ManagerContext, the managers and helper functions)
```

| File | Role |
|---|---|
| `src/index.ts` | Entry point. Starts the server. Re-exports names for older importers. |
| `src/server/MCPServer.ts` | Builds the MCP server for the stdio transport. Routes the two tool requests. |
| `src/server/toolDefinitions.ts` | The array of tool schemas: name, description and input schema. |
| `src/server/toolHandlers.ts` | The registry of tool handlers and the function that dispatches a call. |
| `src/server/responseCompressor.ts` | Compresses a large text response with Brotli. |

---

## Server Components

### Entry point (`src/index.ts`)

**Purpose**: Start the server and release the storage handles when the connection closes.

**Start sequence**:
1. `ensureMemoryFilePath()` returns the storage path. The environment variable `MEMORY_FILE_PATH` sets it.
2. The variable `MEMORY_STORAGE_TYPE` selects the backend. The value `sqlite` selects SQLite. Any other value selects JSONL.
3. The code creates one `ManagerContext` with `storagePath` and `storageType`.
4. The code creates `MCPServer` with that context and calls `start()`.

**End sequence**: The `end` and `close` events of `process.stdin` call `shutdown()`. The function starts `MCPServer.close()` and does not wait for it, calls `ManagerContext.close()`, and then exits with code 0.
Without this step, file watchers and timers can keep the process alive after the client closes the pipe.

**Exports**: `defaultMemoryPath`, `ensureMemoryFilePath`, `ManagerContext`, and `KnowledgeGraphManager` (an alias of `ManagerContext`). The file also re-exports the types in the group "Types that `src/index.ts` re-exports" below.

---

### MCPServer (`src/server/MCPServer.ts`)

**Purpose**: Protocol handling and request routing.

```typescript
export class MCPServer {
  constructor(ctx: ManagerContext)
  async start(): Promise<void>
  async close(): Promise<void>
}
```

**Responsibilities**:
- `start()` calls `serveStdio` with a factory function. The SDK calls the factory to get a `Server`. The SDK decides when to call it, and how often.
- Each `Server` has the name `memory-server` and the capability `tools`.
- The handler of `tools/list` returns `toolDefinitions`.
- The handler of `tools/call` calls `handleToolCall(name, args ?? {}, ctx)`.
- All `Server` instances of one process share one `ManagerContext`. The process exits when stdin ends, so a new client connection starts a new process and a new `ManagerContext`. The graph persists in storage.
- The server version comes from `package.json`. The plugin bundle gets it from the constant `__PKG_VERSION__`, which `scripts/build-bundle.mjs` injects.

**Dependencies**: `toolDefinitions`, `toolHandlers`, `ManagerContext`, `logger`, and the MCP SDK package `@modelcontextprotocol/server` (its root export and its `/stdio` export).

---

### toolDefinitions (`src/server/toolDefinitions.ts`)

**Purpose**: The schema of every tool.

```typescript
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export const toolDefinitions: ToolDefinition[]
```

The file has no imports. Each array entry is one tool. The array is grouped by category with comment headers.
[API.md](API.md) is the tool reference.

---

### toolHandlers (`src/server/toolHandlers.ts`)

**Purpose**: The handler of every tool, and the dispatch function.

```typescript
export type ToolResponse = ReturnType<typeof formatToolResponse> & { isError?: boolean };

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

export function getActiveProjectScope(ctx: ManagerContext): string | undefined
```

**Pattern**: `toolHandlers` is a registry. The key is the tool name. A handler that takes arguments checks them with `validateWithSchema` and a schema. The handler reaches a manager, or the storage, through the context, and returns `formatToolResponse(...)`, `formatTextResponse(...)` or `formatRawResponse(...)`.

**Dispatch**: `handleToolCall` looks up the handler. A name with no handler returns a response with `isError: true` and the text `Error: Unknown tool: <name>`.
An exception from a handler returns a response with `isError: true` and the text `Error: <message>`. The function does not rethrow.

**Compression**: The wrapper `withCompression` passes the text of a response to `maybeCompressResponse`. When the text is over the size limit, the wrapper replaces it with the JSON text of a `CompressedResponse`.
Seven handlers use the wrapper: `read_graph`, `open_nodes`, `search_nodes`, `get_subtree`, `synthesize_collaborative_context`, `search_cross_agent` and `get_visible_memories`.

**Cached helper objects**: The file keeps eight kinds of helper object. Each kind has its own `WeakMap`, keyed on the context.
The kinds are `RefIndex`, `FreshnessManager`, `ArtifactManager`, `DistillationPipeline`, `FailureDistillation`, `ConsolidationScheduler`, `DreamEngine` and `QueryCostEstimator`.
A handler creates a helper on first use and reuses it. Two handlers, `run_consolidation_now` and `dream_run_now`, create a one-off instance when they find none, and do not store it.

**Active project scope**: The tool `set_project_scope` stores a project id in a `WeakMap` that is keyed on the context. An empty `projectId` removes the scope. The tool `get_project_scope` and `getActiveProjectScope(ctx)` read it.
The handler of `create_entities` adds the scope to each entity that has no `projectId`.
The scope is state of one running server. The graph does not store the active scope. An entity keeps the `projectId` that `create_entities` sets from it.

---

### responseCompressor (`src/server/responseCompressor.ts`)

**Purpose**: Compress a large text response so that a client can transport it.

```typescript
export interface CompressedResponse {
  compressed: boolean;
  compressionFormat: 'brotli' | 'none';
  encoding: 'utf-8' | 'base64';
  originalSize?: number;
  compressedSize?: number;
  data: string;
}

export interface ResponseCompressionOptions {
  forceCompress?: boolean;
  threshold?: number;   // bytes
  quality?: number;     // Brotli quality, 0 to 11
}

export async function maybeCompressResponse(content: string, options?: ResponseCompressionOptions): Promise<CompressedResponse>
export async function decompressResponse(response: CompressedResponse): Promise<string>
export function isCompressedResponse(obj: unknown): obj is CompressedResponse
export function estimateCompressionRatio(content: string): number
```

`maybeCompressResponse` compresses when `forceCompress` is set, or when the byte size of `content` is more than `threshold`. Otherwise it returns the text unchanged, with `compressed: false`.
The default of `threshold` is `COMPRESSION_CONFIG.AUTO_COMPRESS_RESPONSE_SIZE`. The default of `quality` is `COMPRESSION_CONFIG.BROTLI_QUALITY_BATCH`.
A compressed response holds Brotli data in Base64 text. `decompressResponse` reverses it, and returns `data` unchanged when `compressed` is `false`.
`estimateCompressionRatio` returns a rough value from 0 to 1 and does not compress. A lower value means better compression.

The functions `compress` and `decompress` and the constant `COMPRESSION_CONFIG` come from memoryjs.

---

## The memoryjs Contract

The server layer imports 100 names from `@danielsimonjr/memoryjs`: 25 classes, 39 interfaces, 5 type aliases, 17 constants and 14 functions.
A search of `src/` for imports from the package gives the list. Each name is declared in the installed package types, and `bun run typecheck` fails when memoryjs removes or renames one of them.

This document states no memoryjs version. The range is in `package.json`, and `bun.lock` holds the installed version.

### Context, paths and logging

| Name | Kind | Used in |
|---|---|---|
| `ManagerContext` | class | `index.ts`, `MCPServer.ts`, `toolHandlers.ts` |
| `logger` | const | `index.ts`, `MCPServer.ts` |
| `defaultMemoryPath` | const | `index.ts` |
| `ensureMemoryFilePath` | function | `index.ts` |
| `validateFilePath` | function | `toolHandlers.ts` |

### Storage and indexes that handlers use directly

| Name | Kind | Used in |
|---|---|---|
| `GraphStorage` | class | `toolHandlers.ts` |
| `RefIndex` | class | `toolHandlers.ts` |

### Response formatting and compression

| Name | Kind | Used in |
|---|---|---|
| `formatToolResponse` | function | `toolHandlers.ts` |
| `formatTextResponse` | function | `toolHandlers.ts` |
| `formatRawResponse` | function | `toolHandlers.ts` |
| `compress` | function | `responseCompressor.ts` |
| `decompress` | function | `responseCompressor.ts` |
| `COMPRESSION_CONFIG` | const | `responseCompressor.ts` |

### Input validation

| Name | Kind | Used in |
|---|---|---|
| `validateWithSchema` | function | `toolHandlers.ts` |
| `AddObservationsInputSchema` | const | `toolHandlers.ts` |
| `ArchiveCriteriaSchema` | const | `toolHandlers.ts` |
| `BatchCreateEntitiesSchema` | const | `toolHandlers.ts` |
| `BatchCreateRelationsSchema` | const | `toolHandlers.ts` |
| `DeleteObservationsInputSchema` | const | `toolHandlers.ts` |
| `DeleteRelationsSchema` | const | `toolHandlers.ts` |
| `EntityNamesSchema` | const | `toolHandlers.ts` |
| `ExportFilterSchema` | const | `toolHandlers.ts` |
| `ExtendedExportFormatSchema` | const | `toolHandlers.ts` |
| `ImportFormatSchema` | const | `toolHandlers.ts` |
| `MergeStrategySchema` | const | `toolHandlers.ts` |
| `SavedSearchInputSchema` | const | `toolHandlers.ts` |
| `SavedSearchUpdateSchema` | const | `toolHandlers.ts` |
| `SearchQuerySchema` | const | `toolHandlers.ts` |

### Classes that handlers create or call directly

| Name | Used in |
|---|---|
| `ArtifactManager` | `toolHandlers.ts` |
| `CognitiveLoadAnalyzer` | `toolHandlers.ts` |
| `CollaborativeSynthesis` | `toolHandlers.ts` |
| `ConsolidationScheduler` | `toolHandlers.ts` |
| `ContradictionDetector` | `toolHandlers.ts` |
| `DecisionManager` | `toolHandlers.ts` |
| `DefaultDistillationPolicy` | `toolHandlers.ts` |
| `DistillationPipeline` | `toolHandlers.ts` |
| `DreamEngine` | `toolHandlers.ts` |
| `EntropyFilterStage` | `toolHandlers.ts` |
| `FailureDistillation` | `toolHandlers.ts` |
| `FreshnessManager` | `toolHandlers.ts` |
| `HybridSearchManager` | `toolHandlers.ts` |
| `NoOpDistillationPolicy` | `toolHandlers.ts` |
| `ObservationNormalizer` | `toolHandlers.ts` |
| `PiiRedactor` | `toolHandlers.ts` |
| `QueryAnalyzer` | `toolHandlers.ts` |
| `QueryCostEstimator` | `toolHandlers.ts` |
| `QueryPlanner` | `toolHandlers.ts` |
| `RankedSearch` | `toolHandlers.ts` |
| `ReflectionManager` | `toolHandlers.ts` |
| `RelationConsolidator` | `toolHandlers.ts` |

### Functions

| Name | Used in |
|---|---|
| `clearAllSearchCaches` | `toolHandlers.ts` |
| `computeEntropy` | `toolHandlers.ts` |
| `getAllCacheStats` | `toolHandlers.ts` |
| `getRoleProfile` | `toolHandlers.ts` |
| `listRoleProfiles` | `toolHandlers.ts` |
| `passesEntropyFilter` | `toolHandlers.ts` |

### Types for handler arguments

| Name | Kind | Used in |
|---|---|---|
| `AgentEntity` | interface | `toolHandlers.ts` |
| `AuditFilter` | interface | `toolHandlers.ts` |
| `CTCGraphSnapshot` | interface | `toolHandlers.ts` |
| `CollaborativeSynthesisConfig` | interface | `toolHandlers.ts` |
| `ConflictInfo` | interface | `toolHandlers.ts` |
| `ConflictStrategy` | type | `toolHandlers.ts` |
| `DialogueTurn` | interface | `toolHandlers.ts` |
| `DreamEngineConfig` | interface | `toolHandlers.ts` |
| `DreamPhaseConfig` | interface | `toolHandlers.ts` |
| `EventQueryFilter` | interface | `toolHandlers.ts` |
| `EventTimeRange` | interface | `toolHandlers.ts` |
| `FailureDistillationConfig` | interface | `toolHandlers.ts` |
| `ForgetOptions` | interface | `toolHandlers.ts` |
| `RecordEventInput` | interface | `toolHandlers.ts` |
| `SalienceContext` | interface | `toolHandlers.ts` |
| `WhoDidWhatFilter` | interface | `toolHandlers.ts` |

### Types that `src/index.ts` re-exports

| Name | Kind | Used in |
|---|---|---|
| `AdaptiveReductionResult` | interface | `index.ts` |
| `AgentRole` | type | `index.ts`, `toolHandlers.ts` |
| `ArtifactEntity` | interface | `index.ts` |
| `ArtifactFilter` | interface | `index.ts`, `toolHandlers.ts` |
| `ArtifactType` | type | `index.ts` |
| `AuditEntry` | interface | `index.ts` |
| `AuditOperation` | type | `index.ts` |
| `BooleanQueryNode` | type | `index.ts` |
| `CognitiveLoadMetrics` | interface | `index.ts` |
| `CompressionResult` | interface | `index.ts` |
| `DistilledLesson` | interface | `index.ts` |
| `Entity` | interface | `index.ts` |
| `FailureDistillationResult` | interface | `index.ts` |
| `FreshnessReport` | interface | `index.ts` |
| `GraphStats` | interface | `index.ts` |
| `ImportResult` | interface | `index.ts` |
| `KnowledgeGraph` | interface | `index.ts` |
| `RefEntry` | interface | `index.ts` |
| `RefIndexStats` | interface | `index.ts` |
| `Relation` | interface | `index.ts` |
| `RoleProfile` | interface | `index.ts` |
| `SavedSearch` | interface | `index.ts` |
| `SearchResult` | interface | `index.ts` |
| `SynthesisResult` | interface | `index.ts` |
| `TagAlias` | interface | `index.ts` |
| `ValidationIssue` | interface | `index.ts` |
| `ValidationReport` | interface | `index.ts` |
| `ValidationWarning` | interface | `index.ts` |

---

## Component Dependencies

```
 index.ts ──► MCPServer.ts ──► toolDefinitions.ts
                  │
                  └──────────► toolHandlers.ts ──► responseCompressor.ts
```

Every file also imports from `@danielsimonjr/memoryjs`, except `toolDefinitions.ts`, which has no imports.
The command `npm run docs:deps` writes the full import graph to [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md). Its generator is `tools/create-dependency-graph`.

---

## Verification

Generated 2026-10-16 by `repo-tools map`.
Regenerate the generated reports: `npm run docs:deps` · Check: `repo-tools check . --docs=docs/architecture`

The claims below come from `repo-tools map .`, which reads the whole repository. The generated reports in this directory
come from `tools/create-dependency-graph`, which reads `src/` and the tests. Their counts differ for that reason.

| Claim | Value | Source |
|---|---|---|
| totalSourceFiles | 63 | repo-tools map (whole repository) |
| totalExports | 57 | repo-tools map (whole repository) |
| reachableFiles | 5 | repo-tools map (whole repository) |
| orphanedFiles | 0 | repo-tools map (whole repository) |
| noImporterFileCount | 0 | repo-tools map (whole repository) |

**`reachableFiles` is 5, far below `totalSourceFiles`. The low value is expected.** The two entry roots reach the server layer.
The other files are the test suite and the tooling. Nothing imports them, because a runner starts them.
`orphanedFiles` and `noImporterFileCount` are both 0, so the graph has no unexplained file.
