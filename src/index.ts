#!/usr/bin/env node

/**
 * MCP Memory Server Entry Point
 *
 * This is the main entry point for the MCP memory server.
 * All core functionality is imported from @danielsimonjr/memoryjs.
 *
 * @module index
 */

import {
  logger,
  defaultMemoryPath,
  ensureMemoryFilePath,
  ManagerContext,
  // Re-export types for backward compatibility
  type Entity,
  type Relation,
  type KnowledgeGraph,
  type GraphStats,
  type ValidationReport,
  type ValidationIssue,
  type ValidationWarning,
  type SavedSearch,
  type TagAlias,
  type SearchResult,
  type BooleanQueryNode,
  type ImportResult,
  type CompressionResult,
  // v1.7.0 new types
  type ArtifactEntity,
  type ArtifactType,
  type ArtifactFilter,
  type FreshnessReport,
  type AuditEntry,
  type AuditOperation,
  type RefEntry,
  type RefIndexStats,
  type AgentRole,
  type RoleProfile,
  type CognitiveLoadMetrics,
  type AdaptiveReductionResult,
  type SynthesisResult,
  type FailureDistillationResult,
  type DistilledLesson,
} from '@danielsimonjr/memoryjs';
import { MCPServer } from './server/MCPServer.js';

// Re-export path utilities for backward compatibility
export { defaultMemoryPath, ensureMemoryFilePath };

// Re-export types for backward compatibility
export type {
  Entity,
  Relation,
  KnowledgeGraph,
  GraphStats,
  ValidationReport,
  ValidationIssue,
  ValidationWarning,
  SavedSearch,
  TagAlias,
  SearchResult,
  BooleanQueryNode,
  ImportResult,
  CompressionResult,
  // v1.7.0 new types
  ArtifactEntity,
  ArtifactType,
  ArtifactFilter,
  FreshnessReport,
  AuditEntry,
  AuditOperation,
  RefEntry,
  RefIndexStats,
  AgentRole,
  RoleProfile,
  CognitiveLoadMetrics,
  AdaptiveReductionResult,
  SynthesisResult,
  FailureDistillationResult,
  DistilledLesson,
};

// Re-export ManagerContext (replaces KnowledgeGraphManager)
export { ManagerContext };

// Backward compatibility alias
export { ManagerContext as KnowledgeGraphManager };

let managerContext: ManagerContext;

// Exit cleanly when our stdio pipe closes (e.g., Claude Code's /reload-plugins
// tearing down the connection). Without this, other event-loop refs — file
// watchers, the embeddings pool, the consolidation timer — can keep the
// process alive as an orphan until manually killed.
// ctx.close() (memoryjs v3) releases storage handles before exit; it is a
// no-op for JSONL but closes the SQLite handle when MEMORY_STORAGE_TYPE=sqlite.
let mcpServer: MCPServer | undefined;

function shutdown(): never {
  void mcpServer?.close();
  managerContext?.close();
  process.exit(0);
}
process.stdin.on("end", shutdown);
process.stdin.on("close", shutdown);

async function main() {
  // Initialize memory file path with backward compatibility
  const memoryFilePath = await ensureMemoryFilePath();

  // Honour MEMORY_STORAGE_TYPE. Passing a bare string here selects memoryjs's default
  // (jsonl) backend unconditionally, so `MEMORY_STORAGE_TYPE=sqlite` was documented but
  // silently ignored — and `diag` reported it as sqlite while writes went to memory.jsonl.
  const storageType = process.env.MEMORY_STORAGE_TYPE === "sqlite" ? "sqlite" : "jsonl";
  managerContext = new ManagerContext({
    storagePath: memoryFilePath,
    storageType,
  });

  // Initialize and start MCP server
  mcpServer = new MCPServer(managerContext);
  await mcpServer.start();
}

main().catch((error) => {
  logger.error("Fatal error in main():", error);
  process.exit(1);
});
