# Test Coverage Analysis

**Generated**: 2026-01-09 (pre-Phase 13 extraction)
**Status**: Historical — see note below.

> **⚠️ Historical document** — This coverage analysis was generated **before** the Phase 13 extraction (commit `0269e609`+) that moved all core graph logic from memory-mcp into the `@danielsimonjr/memoryjs` library. The numbers below describe the pre-extraction repository.
>
> **Current memory-mcp (v12.7.0):**
> - **Source files**: 5 TypeScript files in `src/` (entry point + 4 server-layer files)
> - **Test files**: 36 (`SKIP_BENCHMARKS=true npm test`)
> - **Tests**: 791 passing
> - **Coverage**: ~85% statement coverage on the thin MCP wrapper (verified via `coverage/coverage-summary.json`)
>
> Core-library coverage now lives in [`@danielsimonjr/memoryjs`](https://github.com/danielsimonjr/memoryjs). This file is preserved as a snapshot of the pre-extraction codebase for historical reference.

---

## Summary (pre-Phase 13 extraction)

| Metric | Count |
|--------|-------|
| Total Source Files | 77 |
| Total Test Files | 97 |
| Source Files with Tests | 75 |
| Source Files without Tests | 2 |
| Coverage | 97.4% |

---

## Source Files Without Test Coverage

The following 2 source files are not directly imported by any test file:

### features/

- `src/features/index.ts` → Expected test: `tests/unit/features/index.test.ts`

### workers/

- `src/workers/index.ts` → Expected test: `tests/unit/workers/index.test.ts`

---

## Source Files With Test Coverage

| Source File | Test Files |
|-------------|------------|
| `core/EntityManager.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `operation-progress.test.ts`, `server.test.ts`, `workflows.test.ts`, `benchmarks.test.ts`, `optimization-benchmarks.test.ts`, `task-scheduler-benchmarks.test.ts`, `task-scheduler-config-benchmarks.test.ts`, `write-performance.test.ts`, `ConcurrencyControl.test.ts`, `EntityManager.test.ts`, `ManagerContext.test.ts`, `RelationManager.test.ts`, `CompressionManager.test.ts`, `BasicSearch.test.ts`, `BooleanSearch.test.ts`, `FuzzySearch.test.ts`, `RankedSearch.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/GraphEventEmitter.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `server.test.ts`, `GraphEventEmitter.test.ts`, `GraphEvents.test.ts`, `ManagerContext.test.ts`, `TFIDFEventSync.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/GraphStorage.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `backup-compression.test.ts`, `compression-optimization.test.ts`, `operation-progress.test.ts`, `server.test.ts`, `streaming-export.test.ts`, `worker-pool-integration.test.ts`, `workflows.test.ts`, `benchmarks.test.ts`, `compression-benchmarks.test.ts`, `optimization-benchmarks.test.ts`, `task-scheduler-benchmarks.test.ts`, `task-scheduler-config-benchmarks.test.ts`, `write-performance.test.ts`, `BatchTransaction.test.ts`, `ConcurrencyControl.test.ts`, `EntityManager.test.ts`, `GraphEventEmitter.test.ts`, `GraphEvents.test.ts`, `GraphStorage.test.ts`, `GraphTraversal.test.ts`, `HierarchyManager.test.ts`, `ManagerContext.test.ts`, `ObservationManager.test.ts`, `RelationManager.test.ts`, `StorageFactory.test.ts`, `TransactionBatching.test.ts`, `TransactionManager.test.ts`, `AnalyticsManager.test.ts`, `ArchiveManager.test.ts`, `CompressionManager.test.ts`, `IOManager.test.ts`, `BasicSearch.test.ts`, `BooleanSearch.test.ts`, `FuzzySearch.test.ts`, `IncrementalTFIDF.test.ts`, `RankedSearch.test.ts`, `SavedSearchManager.test.ts`, `SearchManager.test.ts`, `SearchSuggestions.test.ts`, `TFIDFEventSync.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/GraphTraversal.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `server.test.ts`, `GraphTraversal.test.ts`, `ManagerContext.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/HierarchyManager.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `server.test.ts`, `EntityManager.test.ts`, `HierarchyManager.test.ts`, `ManagerContext.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/ManagerContext.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `edge-cases.test.ts`, `server.test.ts`, `ManagerContext.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/ObservationManager.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `server.test.ts`, `write-performance.test.ts`, `ConcurrencyControl.test.ts`, `ManagerContext.test.ts`, `ObservationManager.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/RelationManager.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `server.test.ts`, `workflows.test.ts`, `benchmarks.test.ts`, `ManagerContext.test.ts`, `RelationManager.test.ts`, `CompressionManager.test.ts`, `BasicSearch.test.ts`, `BooleanSearch.test.ts`, `FuzzySearch.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/SQLiteStorage.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `server.test.ts`, `ConcurrencyControl.test.ts`, `ManagerContext.test.ts`, `SQLiteStorage.test.ts`, `StorageFactory.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/StorageFactory.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `server.test.ts`, `ManagerContext.test.ts`, `StorageFactory.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/TransactionManager.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `operation-progress.test.ts`, `server.test.ts`, `BatchTransaction.test.ts`, `ManagerContext.test.ts`, `TransactionBatching.test.ts`, `TransactionManager.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `core/index.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `server.test.ts`, `ManagerContext.test.ts`, `MCPServer.test.ts`, `toolHandlers.test.ts` |
| `features/AnalyticsManager.ts` | `ManagerContext.test.ts`, `AnalyticsManager.test.ts` |
| `features/ArchiveManager.ts` | `operation-progress.test.ts`, `compression-benchmarks.test.ts`, `ManagerContext.test.ts`, `ArchiveManager.test.ts` |
| `features/CompressionManager.ts` | `compression-optimization.test.ts`, `operation-progress.test.ts`, `workflows.test.ts`, `benchmarks.test.ts`, `optimization-benchmarks.test.ts`, `task-scheduler-benchmarks.test.ts`, `ManagerContext.test.ts`, `CompressionManager.test.ts` |
| `features/IOManager.ts` | `backup-compression.test.ts`, `operation-progress.test.ts`, `streaming-export.test.ts`, `task-scheduler-benchmarks.test.ts`, `ManagerContext.test.ts`, `IOManager.test.ts` |
| `features/StreamingExporter.ts` | `operation-progress.test.ts`, `task-scheduler-benchmarks.test.ts`, `StreamingExporter.test.ts` |
| `features/TagManager.ts` | `ManagerContext.test.ts`, `TagManager.test.ts` |
| `src/index.ts` | `file-path.test.ts`, `knowledge-graph.test.ts` |
| `search/BasicSearch.ts` | `workflows.test.ts`, `benchmarks.test.ts`, `BasicSearch.test.ts`, `SavedSearchManager.test.ts`, `SemanticSearch.test.ts` |
| `search/BooleanSearch.ts` | `workflows.test.ts`, `benchmarks.test.ts`, `BooleanSearch.test.ts`, `SemanticSearch.test.ts` |
| `search/EmbeddingService.ts` | `EmbeddingService.test.ts`, `SemanticSearch.test.ts` |
| `search/FuzzySearch.ts` | `worker-pool-integration.test.ts`, `workflows.test.ts`, `benchmarks.test.ts`, `FuzzySearch.test.ts`, `SemanticSearch.test.ts` |
| `search/QueryCostEstimator.ts` | `QueryCostEstimator.test.ts`, `SemanticSearch.test.ts` |
| `search/RankedSearch.ts` | `workflows.test.ts`, `benchmarks.test.ts`, `RankedSearch.test.ts`, `SemanticSearch.test.ts` |
| `search/SavedSearchManager.ts` | `SavedSearchManager.test.ts`, `SemanticSearch.test.ts` |
| `search/SearchFilterChain.ts` | `SearchFilterChain.test.ts`, `SemanticSearch.test.ts` |
| `search/SearchManager.ts` | `ManagerContext.test.ts`, `SearchManager.test.ts`, `SemanticSearch.test.ts` |
| `search/SearchSuggestions.ts` | `SearchSuggestions.test.ts`, `SemanticSearch.test.ts` |
| `search/SemanticSearch.ts` | `SemanticSearch.test.ts` |
| `search/TFIDFEventSync.ts` | `IncrementalTFIDF.test.ts`, `SemanticSearch.test.ts`, `TFIDFEventSync.test.ts` |
| `search/TFIDFIndexManager.ts` | `IncrementalTFIDF.test.ts`, `SemanticSearch.test.ts`, `TFIDFEventSync.test.ts`, `TFIDFIndexManager.test.ts` |
| `search/VectorStore.ts` | `SemanticSearch.test.ts`, `VectorStore.test.ts` |
| `search/index.ts` | `SemanticSearch.test.ts` |
| `server/MCPServer.ts` | `server.test.ts`, `MCPServer.test.ts` |
| `server/responseCompressor.ts` | `responseCompressor.test.ts` |
| `server/toolDefinitions.ts` | `server.test.ts`, `MCPServer.test.ts`, `toolDefinitions.test.ts` |
| `server/toolHandlers.ts` | `entity-tools.test.ts`, `observation-tools.test.ts`, `relation-tools.test.ts`, `server.test.ts`, `toolHandlers.test.ts` |
| `types/index.ts` | `backup-compression.test.ts`, `worker-pool-integration.test.ts`, `compression-benchmarks.test.ts`, `write-performance.test.ts`, `GraphEvents.test.ts`, `IOManager.test.ts`, `QueryCostEstimator.test.ts`, `SearchFilterChain.test.ts`, `SemanticSearch.test.ts`, `TFIDFEventSync.test.ts`, `TFIDFIndexManager.test.ts`, `compressedCache.test.ts`, `entityUtils.test.ts`, `indexes.test.ts` |
| `types/types.ts` | `operation-progress.test.ts`, `streaming-export.test.ts`, `task-scheduler-benchmarks.test.ts`, `task-scheduler-config-benchmarks.test.ts`, `BatchTransaction.test.ts`, `GraphEventEmitter.test.ts`, `StreamingExporter.test.ts`, `IncrementalTFIDF.test.ts` |
| `utils/compressedCache.ts` | `compression-benchmarks.test.ts`, `compressedCache.test.ts`, `entityUtils.test.ts`, `formatters.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/compressionUtil.ts` | `compression-benchmarks.test.ts`, `IOManager.test.ts`, `compressionUtil.test.ts`, `entityUtils.test.ts`, `formatters.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/constants.ts` | `compression-benchmarks.test.ts`, `IOManager.test.ts`, `EmbeddingService.test.ts`, `responseCompressor.test.ts`, `compressionUtil.test.ts`, `entityUtils.test.ts`, `formatters.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/entityUtils.ts` | `entityUtils.test.ts`, `formatters.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/errors.ts` | `operation-progress.test.ts`, `EntityManager.test.ts`, `HierarchyManager.test.ts`, `ObservationManager.test.ts`, `RelationManager.test.ts`, `TransactionManager.test.ts`, `CompressionManager.test.ts`, `entityUtils.test.ts`, `errors.test.ts`, `formatters.test.ts`, `operationUtils.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/formatters.ts` | `entityUtils.test.ts`, `formatters.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/index.ts` | `entityUtils.test.ts`, `formatters.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/indexes.ts` | `entityUtils.test.ts`, `formatters.test.ts`, `indexes.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/logger.ts` | `entityUtils.test.ts`, `formatters.test.ts`, `logger.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/operationUtils.ts` | `task-scheduler-config-benchmarks.test.ts`, `entityUtils.test.ts`, `formatters.test.ts`, `operationUtils.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/parallelUtils.ts` | `entityUtils.test.ts`, `formatters.test.ts`, `parallelUtils.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/schemas.ts` | `entityUtils.test.ts`, `formatters.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/searchAlgorithms.ts` | `entityUtils.test.ts`, `formatters.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts` |
| `utils/searchCache.ts` | `entityUtils.test.ts`, `formatters.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts`, `searchCache.test.ts` |
| `utils/taskScheduler.ts` | `task-scheduler-config-benchmarks.test.ts`, `entityUtils.test.ts`, `formatters.test.ts`, `schemas.test.ts`, `searchAlgorithms.test.ts`, `taskScheduler.test.ts` |
| `workers/levenshteinWorker.ts` | `levenshteinWorker.test.ts` |

---

## Test File Details

| Test File | Imports from Source |
|-----------|---------------------|
| `tools/entity-tools.test.ts` | 13 files |
| `tools/observation-tools.test.ts` | 13 files |
| `tools/relation-tools.test.ts` | 13 files |
| `edge-cases/edge-cases.test.ts` | 1 files |
| `tests/file-path.test.ts` | 1 files |
| `integration/backup-compression.test.ts` | 3 files |
| `integration/compression-optimization.test.ts` | 2 files |
| `integration/operation-progress.test.ts` | 9 files |
| `integration/server.test.ts` | 15 files |
| `integration/streaming-export.test.ts` | 3 files |
| `integration/worker-pool-integration.test.ts` | 3 files |
| `integration/workflows.test.ts` | 8 files |
| `tests/knowledge-graph.test.ts` | 1 files |
| `performance/benchmarks.test.ts` | 8 files |
| `performance/compression-benchmarks.test.ts` | 6 files |
| `performance/optimization-benchmarks.test.ts` | 3 files |
| `performance/task-scheduler-benchmarks.test.ts` | 6 files |
| `performance/task-scheduler-config-benchmarks.test.ts` | 5 files |
| `performance/write-performance.test.ts` | 4 files |
| `core/BatchTransaction.test.ts` | 3 files |
| `core/ConcurrencyControl.test.ts` | 4 files |
| `core/EntityManager.test.ts` | 4 files |
| `core/GraphEventEmitter.test.ts` | 3 files |
| `core/GraphEvents.test.ts` | 3 files |
| `core/GraphStorage.test.ts` | 1 files |
| `core/GraphTraversal.test.ts` | 2 files |
| `core/HierarchyManager.test.ts` | 3 files |
| `core/ManagerContext.test.ts` | 18 files |
| `core/ObservationManager.test.ts` | 3 files |
| `core/RelationManager.test.ts` | 4 files |
| `core/SQLiteStorage.test.ts` | 1 files |
| `core/StorageFactory.test.ts` | 3 files |
| `core/TransactionBatching.test.ts` | 2 files |
| `core/TransactionManager.test.ts` | 3 files |
| `features/AnalyticsManager.test.ts` | 2 files |
| `features/ArchiveManager.test.ts` | 2 files |
| `features/CompressionManager.test.ts` | 5 files |
| `features/IOManager.test.ts` | 5 files |
| `features/StreamingExporter.test.ts` | 2 files |
| `features/TagManager.test.ts` | 1 files |
| `search/BasicSearch.test.ts` | 4 files |
| `search/BooleanSearch.test.ts` | 4 files |
| `search/EmbeddingService.test.ts` | 2 files |
| `search/FuzzySearch.test.ts` | 4 files |
| `search/IncrementalTFIDF.test.ts` | 4 files |
| `search/QueryCostEstimator.test.ts` | 2 files |
| `search/RankedSearch.test.ts` | 3 files |
| `search/SavedSearchManager.test.ts` | 3 files |
| `search/SearchFilterChain.test.ts` | 2 files |
| `search/SearchManager.test.ts` | 2 files |
| `search/SearchSuggestions.test.ts` | 2 files |
| `search/SemanticSearch.test.ts` | 16 files |
| `search/TFIDFEventSync.test.ts` | 5 files |
| `search/TFIDFIndexManager.test.ts` | 2 files |
| `search/VectorStore.test.ts` | 1 files |
| `server/MCPServer.test.ts` | 14 files |
| `server/responseCompressor.test.ts` | 2 files |
| `server/toolDefinitions.test.ts` | 1 files |
| `server/toolHandlers.test.ts` | 13 files |
| `utils/compressedCache.test.ts` | 2 files |
| `utils/compressionUtil.test.ts` | 2 files |
| `utils/entityUtils.test.ts` | 16 files |
| `utils/errors.test.ts` | 1 files |
| `utils/formatters.test.ts` | 15 files |
| `utils/indexes.test.ts` | 2 files |
| `utils/logger.test.ts` | 1 files |
| `utils/operationUtils.test.ts` | 2 files |
| `utils/parallelUtils.test.ts` | 1 files |
| `utils/schemas.test.ts` | 15 files |
| `utils/searchAlgorithms.test.ts` | 15 files |
| `utils/searchCache.test.ts` | 1 files |
| `utils/taskScheduler.test.ts` | 1 files |
| `workers/levenshteinWorker.test.ts` | 1 files |
| `workers/WorkerPool.test.ts` | 0 files |
