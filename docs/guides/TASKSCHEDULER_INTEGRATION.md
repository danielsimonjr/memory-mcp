# TaskScheduler Integration Guide

**Phase 9B**: This guide documents how to integrate the TaskScheduler's progress tracking and cancellation support with long-running operations in the Memory MCP server.

## Overview

Phase 9B introduces unified progress tracking and cancellation support across all long-running operations in the Memory MCP server. This enables:

- **Progress Reporting**: Real-time feedback on operation progress (0-100%)
- **Cancellation**: Ability to abort long-running operations via `AbortSignal`
- **Consistent API**: All operations use the same `LongRunningOperationOptions` interface

## Core Types

### LongRunningOperationOptions

The standard interface for all long-running operations:

```typescript
interface LongRunningOperationOptions {
  /** Progress callback for tracking operation progress */
  onProgress?: ProgressCallback;

  /** AbortSignal for cancellation support */
  signal?: AbortSignal;

  /** Priority for queued operations (optional) */
  priority?: TaskPriority;
}
```

### ProgressCallback

The callback signature for progress updates:

```typescript
type ProgressCallback = (progress: {
  completed: number;
  total: number;
  percentage: number;
  currentTaskId?: string;
}) => void;
```

### OperationCancelledError

Thrown when an operation is cancelled:

```typescript
class OperationCancelledError extends KnowledgeGraphError {
  constructor(operation?: string);
}
```

## Supported Operations

### EntityManager

```typescript
// Create entities with progress tracking
const entities = await entityManager.createEntities(entityArray, {
  onProgress: (p) => console.log(`${p.percentage}% complete`),
  signal: controller.signal,
});
```

### CompressionManager

```typescript
// Find duplicates with progress tracking
const duplicates = await compressionManager.findDuplicates(0.8, {
  onProgress: (p) => console.log(`${p.percentage}% complete`),
  signal: controller.signal,
});

// Compress graph with progress tracking
const result = await compressionManager.compressGraph(0.8, false, {
  onProgress: (p) => console.log(`${p.percentage}% complete`),
  signal: controller.signal,
});
```

### IOManager

```typescript
// Import graph with progress tracking
const result = await ioManager.importGraph('json', data, 'merge', false, {
  onProgress: (p) => console.log(`${p.percentage}% complete`),
  signal: controller.signal,
});
```

### ArchiveManager

```typescript
// Archive entities with progress tracking
const result = await archiveManager.archiveEntities(criteria, {
  dryRun: false,
  saveToFile: true,
  onProgress: (p) => console.log(`${p.percentage}% complete`),
  signal: controller.signal,
});
```

### SemanticSearch

```typescript
// Index all entities with cancellation support
const result = await semanticSearch.indexAll(graph, {
  forceReindex: false,
  onProgress: (current, total) => console.log(`${current}/${total}`),
  signal: controller.signal,
});
```

### TransactionManager

```typescript
// Commit transaction with progress tracking
txManager.begin();
txManager.createEntity({ name: 'Alice', entityType: 'person', observations: [] });
const result = await txManager.commit({
  onProgress: (p) => console.log(`${p.percentage}% complete`),
  signal: controller.signal,
});
```

### GraphTraversal

```typescript
// Find all paths with cancellation support
const paths = await graphTraversal.findAllPaths('source', 'target', 5, {
  direction: 'both',
  signal: controller.signal,
});
```

### StreamingExporter

```typescript
// Stream export with progress tracking
const exporter = new StreamingExporter('/path/to/output.jsonl');
const result = await exporter.streamJSONL(graph, {
  onProgress: (p) => console.log(`${p.percentage}% complete`),
  signal: controller.signal,
});
```

## Utility Functions

### checkCancellation

Checks if an operation has been cancelled and throws `OperationCancelledError`:

```typescript
import { checkCancellation } from '../utils/index.js';

async function myLongRunningOperation(options?: LongRunningOperationOptions) {
  // Check at start
  checkCancellation(options?.signal, 'myOperation');

  for (const item of items) {
    // Check periodically during processing
    checkCancellation(options?.signal, 'myOperation');
    await processItem(item);
  }
}
```

### createProgressReporter

Creates a throttled progress reporter to avoid excessive callbacks:

```typescript
import { createProgressReporter, createProgress } from '../utils/index.js';

async function myOperation(options?: LongRunningOperationOptions) {
  const reportProgress = createProgressReporter(options?.onProgress);
  const total = items.length;

  reportProgress?.(createProgress(0, total, 'myOperation'));

  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);
    reportProgress?.(createProgress(i + 1, total, 'myOperation'));
  }
}
```

### executeWithPhases

Executes an operation with multiple distinct phases:

```typescript
import { executeWithPhases } from '../utils/index.js';

const results = await executeWithPhases([
  { name: 'parsing', weight: 20, execute: async () => parseData() },
  { name: 'processing', weight: 60, execute: async () => processEntities() },
  { name: 'saving', weight: 20, execute: async () => saveResults() },
], options?.onProgress, options?.signal);
```

### processBatchesWithProgress

Processes items in batches with automatic progress tracking:

```typescript
import { processBatchesWithProgress } from '../utils/index.js';

const results = await processBatchesWithProgress(
  items,
  100, // batch size
  async (batch) => {
    for (const item of batch) {
      await saveItem(item);
    }
    return batch.length;
  },
  options?.onProgress,
  options?.signal,
  'batchOperation'
);
```

## Implementation Pattern

When implementing progress tracking in a new operation:

1. **Import utilities**:
```typescript
import type { LongRunningOperationOptions } from '../types/index.js';
import { checkCancellation, createProgressReporter, createProgress } from '../utils/index.js';
```

2. **Add options parameter**:
```typescript
async myMethod(data: MyData, options?: LongRunningOperationOptions): Promise<Result> {
```

3. **Check for early cancellation**:
```typescript
checkCancellation(options?.signal, 'myMethod');
```

4. **Setup progress reporter**:
```typescript
const reportProgress = createProgressReporter(options?.onProgress);
reportProgress?.(createProgress(0, total, 'myMethod'));
```

5. **Report progress during processing**:
```typescript
for (let i = 0; i < items.length; i++) {
  checkCancellation(options?.signal, 'myMethod');
  await processItem(items[i]);
  reportProgress?.(createProgress(i + 1, total, 'myMethod'));
}
```

6. **Report completion**:
```typescript
reportProgress?.(createProgress(total, total, 'myMethod'));
return result;
```

## Handling Cancellation

Operations should handle cancellation gracefully:

```typescript
try {
  await longRunningOperation({ signal: controller.signal });
} catch (error) {
  if (error instanceof OperationCancelledError) {
    console.log('Operation was cancelled');
    // Perform cleanup if needed
  } else {
    throw error;
  }
}
```

## Best Practices

1. **Check cancellation at natural breakpoints** - Don't check on every iteration if the loop body is fast
2. **Report progress at meaningful intervals** - Use throttling to avoid overwhelming the callback
3. **Use phase-based progress for multi-step operations** - Helps users understand which step is running
4. **Clean up resources on cancellation** - Close files, rollback transactions, etc.
5. **Document cancellation behavior** - Specify what state the system is in after cancellation
6. **Test cancellation paths** - Ensure cancellation at various points works correctly

## Error Handling

All operations that support cancellation will throw `OperationCancelledError` when cancelled:

```typescript
import { OperationCancelledError } from '../utils/errors.js';

try {
  await myOperation({ signal: controller.signal });
} catch (error) {
  if (error instanceof OperationCancelledError) {
    // Handle cancellation
    console.log(`Operation '${error.message}' was cancelled`);
  }
}
```

## Related Documentation

- [TaskScheduler API](https://github.com/danielsimonjr/MemoryJS/blob/master/docs/architecture/COMPONENTS.md) (section `taskScheduler`, in the MemoryJS repository)
- [Types Reference](https://github.com/danielsimonjr/MemoryJS/blob/master/src/types/types.ts) (in the MemoryJS repository)
- [Operation Utilities](https://github.com/danielsimonjr/MemoryJS/blob/master/src/utils/operationUtils.ts) (in the MemoryJS repository)
