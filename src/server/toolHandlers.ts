/**
 * MCP Tool Handlers
 *
 * Contains handler functions for all 137 Knowledge Graph tools.
 * Handlers call managers directly via ManagerContext.
 * All core functionality is imported from @danielsimonjr/memoryjs.
 *
 * @module server/toolHandlers
 */

import path from 'node:path';
import {
  formatToolResponse,
  formatTextResponse,
  formatRawResponse,
  validateWithSchema,
  validateFilePath,
  BatchCreateEntitiesSchema,
  BatchCreateRelationsSchema,
  EntityNamesSchema,
  DeleteRelationsSchema,
  AddObservationsInputSchema,
  DeleteObservationsInputSchema,
  ArchiveCriteriaSchema,
  SavedSearchInputSchema,
  SavedSearchUpdateSchema,
  ImportFormatSchema,
  ExtendedExportFormatSchema,
  MergeStrategySchema,
  ExportFilterSchema,
  SearchQuerySchema,
  HybridSearchManager,
  QueryAnalyzer,
  QueryPlanner,
  ReflectionManager,
  ObservationNormalizer,
  RefIndex,
  FreshnessManager,
  ArtifactManager,
  CollaborativeSynthesis,
  FailureDistillation,
  CognitiveLoadAnalyzer,
  ConsolidationScheduler,
  DreamEngine,
  DistillationPipeline,
  DefaultDistillationPolicy,
  NoOpDistillationPolicy,
  computeEntropy,
  passesEntropyFilter,
  EntropyFilterStage,
  getRoleProfile,
  listRoleProfiles,
  QueryCostEstimator,
  ContradictionDetector,
  PiiRedactor,
  type ManagerContext,
  type AgentRole,
  type ArtifactFilter,
  type CollaborativeSynthesisConfig,
  type FailureDistillationConfig,
  type AuditFilter,
  type SalienceContext,
  type AgentEntity,
  type DreamEngineConfig,
  type DreamPhaseConfig,
  type ForgetOptions,
  type ConflictInfo,
  type ConflictStrategy,
  DecisionManager,
  RankedSearch,
  RelationConsolidator,
  clearAllSearchCaches,
  getAllCacheStats,
  type GraphStorage,
  type RecordEventInput,
  type EventQueryFilter,
  type EventTimeRange,
  type WhoDidWhatFilter,
  type DialogueTurn,
  type CTCGraphSnapshot,
} from '@danielsimonjr/memoryjs';
import { promises as fs } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { maybeCompressResponse } from './responseCompressor.js';

// ==================== SINGLETON INFRASTRUCTURE ====================
// WeakMap-based singletons keyed on ManagerContext to avoid re-instantiation per request.
// These managers are not on ManagerContext directly, so we wire them up once per ctx.

const refIndexMap = new WeakMap<ManagerContext, RefIndex>();
const freshnessMap = new WeakMap<ManagerContext, FreshnessManager>();
const artifactManagerMap = new WeakMap<ManagerContext, ArtifactManager>();
const distillationPipelineMap = new WeakMap<ManagerContext, DistillationPipeline>();
const failureDistillationMap = new WeakMap<ManagerContext, FailureDistillation>();
const consolidationSchedulerMap = new WeakMap<ManagerContext, ConsolidationScheduler>();
const dreamEngineMap = new WeakMap<ManagerContext, DreamEngine>();
const queryCostEstimatorMap = new WeakMap<ManagerContext, QueryCostEstimator>();

// Active project scope (Phase 13 deferred item; ctx.defaultProjectId is readonly,
// so we keep mutable scope state in a WeakMap keyed on the context. Set via the
// `set_project_scope` tool; handlers may consult `getActiveProjectScope(ctx)`
// when they want to auto-apply the scope.
const projectScopeMap = new WeakMap<ManagerContext, string>();

export function getActiveProjectScope(ctx: ManagerContext): string | undefined {
  return projectScopeMap.get(ctx);
}

function getStorageFilePath(ctx: ManagerContext): string {
  // GraphStorage stores the path on `memoryFilePath` (private but reachable via
  // type-cast). Older versions of this helper looked for `filePath` and
  // silently fell back to 'memory.jsonl' — which made diag / size / reindex
  // reports point at the wrong file. Try both field names defensively.
  const storage = ctx.storage as unknown as { memoryFilePath?: string; filePath?: string };
  return storage.memoryFilePath ?? storage.filePath ?? 'memory.jsonl';
}

// Sidecar path for the serialized Cue–Tag–Content graph, following the
// library's `<basename>-<suffix>` convention (memory.jsonl → memory-reconstructive.json).
function reconstructiveSidecarPath(ctx: ManagerContext): string {
  const storagePath = getStorageFilePath(ctx);
  const ext = path.extname(storagePath);
  const base = ext ? storagePath.slice(0, -ext.length) : storagePath;
  return `${base}-reconstructive.json`;
}

function getRefIndex(ctx: ManagerContext): RefIndex {
  if (!refIndexMap.has(ctx)) {
    const storagePath = getStorageFilePath(ctx);
    const dir = path.dirname(storagePath);
    refIndexMap.set(ctx, new RefIndex(path.join(dir, 'memory-ref-index.jsonl')));
  }
  return refIndexMap.get(ctx)!;
}

function getFreshnessManager(ctx: ManagerContext): FreshnessManager {
  if (!freshnessMap.has(ctx)) {
    freshnessMap.set(ctx, new FreshnessManager(ctx.storage));
  }
  return freshnessMap.get(ctx)!;
}

function getArtifactManager(ctx: ManagerContext): ArtifactManager {
  if (!artifactManagerMap.has(ctx)) {
    const refIndex = getRefIndex(ctx);
    // EntityManager.registerRef() requires setRefIndex to be called first.
    ctx.entityManager.setRefIndex(refIndex);
    artifactManagerMap.set(ctx, new ArtifactManager(ctx.storage, ctx.entityManager, refIndex));
  }
  return artifactManagerMap.get(ctx)!;
}

function getDistillationPipeline(ctx: ManagerContext): DistillationPipeline {
  if (!distillationPipelineMap.has(ctx)) {
    distillationPipelineMap.set(ctx, new DistillationPipeline());
  }
  return distillationPipelineMap.get(ctx)!;
}

function getFailureDistillation(ctx: ManagerContext): FailureDistillation {
  if (!failureDistillationMap.has(ctx)) {
    failureDistillationMap.set(ctx, new FailureDistillation(ctx.storage));
  }
  return failureDistillationMap.get(ctx)!;
}

/** Simple token estimator: ~4 chars per token */
function estimateTokens(entity: AgentEntity): number {
  const text = [entity.name, entity.entityType, ...entity.observations].join(' ');
  return Math.ceil(text.length / 4);
}

/**
 * Tool response type for MCP SDK compatibility.
 * Extends base response with optional isError flag for error framing.
 */
export type ToolResponse = ReturnType<typeof formatToolResponse> & { isError?: boolean };

/**
 * Tool handler function signature.
 */
export type ToolHandler = (
  ctx: ManagerContext,
  args: Record<string, unknown>
) => Promise<ToolResponse>;

/**
 * Wrapper to apply automatic response compression for large tool responses.
 *
 * Responses exceeding 256KB are automatically compressed with brotli
 * and base64-encoded for transport. The compressed response includes
 * metadata about the compression (original size, compressed size, ratio).
 *
 * @param handler - The original handler function
 * @returns A wrapped handler that may compress the response
 */
async function withCompression(
  handler: () => Promise<ToolResponse>
): Promise<ToolResponse> {
  const result = await handler();

  // Only compress text responses
  const textContent = result.content[0];
  if (textContent?.type !== 'text') {
    return result;
  }

  const compressed = await maybeCompressResponse(textContent.text);

  // If compression was applied, wrap the response
  if (compressed.compressed) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(compressed),
        },
      ],
    };
  }

  // Return original if no compression needed
  return result;
}

/**
 * Registry of all tool handlers keyed by tool name.
 * Handlers call managers directly for reduced abstraction layers.
 *
 * Note: Tools that can return unbounded result sets (read_graph, search_nodes,
 * get_subtree, open_nodes) are wrapped with withCompression() for payloads >256KB.
 * Filtered/limited search tools (search_nodes_ranked, fuzzy_search, etc.) are not
 * wrapped because their results are bounded by query specificity or limit params.
 */

/**
 * v2.1.0 — Parse `find_duplicate_observations` / `find_jaccard_duplicate_observations`
 * filter args into the manager's `ObservationDedupFilter` shape. Validates each
 * field independently so a stray garbage value falls back to the manager default
 * rather than throwing — REST-like leniency since these are diagnostic tools.
 */
function parseObservationDedupFilter(args: Record<string, unknown>): {
  entityType?: string | string[];
  projectId?: string;
  sessionId?: string;
  minOccurrences?: number;
  maxGroups?: number;
} {
  const out: ReturnType<typeof parseObservationDedupFilter> = {};
  if (typeof args.entityType === 'string') {
    out.entityType = args.entityType;
  } else if (Array.isArray(args.entityType) && args.entityType.every((s) => typeof s === 'string')) {
    out.entityType = args.entityType as string[];
  }
  if (typeof args.projectId === 'string') out.projectId = args.projectId;
  if (typeof args.sessionId === 'string') out.sessionId = args.sessionId;
  if (typeof args.minOccurrences === 'number' && Number.isFinite(args.minOccurrences) && args.minOccurrences >= 2) {
    out.minOccurrences = args.minOccurrences;
  }
  if (typeof args.maxGroups === 'number' && Number.isFinite(args.maxGroups) && args.maxGroups >= 1) {
    out.maxGroups = args.maxGroups;
  }
  return out;
}

export const toolHandlers: Record<string, ToolHandler> = {
  // ==================== ENTITY HANDLERS ====================
  create_entities: async (ctx, args) => {
    const entities = validateWithSchema(args.entities, BatchCreateEntitiesSchema, 'Invalid entities data');
    // Phase 13 (v12.4.0): auto-stamp active project scope on entities lacking
    // an explicit projectId. Set via set_project_scope; explicit projectId wins.
    const activeScope = getActiveProjectScope(ctx);
    const scoped = activeScope
      ? entities.map((e) => (e.projectId === undefined ? { ...e, projectId: activeScope } : e))
      : entities;
    return formatToolResponse(await ctx.entityManager.createEntities(scoped));
  },

  delete_entities: async (ctx, args) => {
    const entityNames = validateWithSchema(args.entityNames, EntityNamesSchema, 'Invalid entity names');
    await ctx.entityManager.deleteEntities(entityNames);
    return formatTextResponse(`Deleted ${entityNames.length} entities`);
  },

  read_graph: async (ctx) =>
    withCompression(async () => formatToolResponse(await ctx.storage.loadGraph())),

  open_nodes: async (ctx, args) => {
    const names = args.names !== undefined
      ? validateWithSchema(args.names, z.array(z.string()), 'Invalid entity names')
      : [];
    return withCompression(async () =>
      formatToolResponse(await ctx.searchManager.openNodes(names))
    );
  },

  // Phase 13: Project scoping + memory versioning
  list_projects: async (ctx, _args) => {
    const projects = await ctx.entityManager.listProjects();
    return formatToolResponse({ projects, count: projects.length });
  },

  set_project_scope: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string(), 'Invalid projectId');
    if (projectId === '') {
      projectScopeMap.delete(ctx);
      return formatToolResponse({ projectId: null });
    }
    projectScopeMap.set(ctx, projectId);
    return formatToolResponse({ projectId });
  },

  get_project_scope: async (ctx, _args) => {
    const projectId = projectScopeMap.get(ctx) ?? null;
    return formatToolResponse({ projectId });
  },

  get_entity_versions: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const latest = await ctx.entityManager.getLatestVersion(entityName);
    if (!latest) {
      return { content: [{ type: 'text', text: `Entity '${entityName}' not found` }], isError: true };
    }
    return formatToolResponse(latest);
  },

  get_version_chain: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const chain = await ctx.entityManager.getVersionChain(entityName);
    if (chain.length === 0) {
      return { content: [{ type: 'text', text: `Entity '${entityName}' not found` }], isError: true };
    }
    return formatToolResponse({
      rootEntity: chain[0]?.name ?? null,
      latestEntity: chain.find(e => e.isLatest !== false)?.name ?? null,
      versions: chain.map(e => ({
        name: e.name,
        version: e.version ?? 1,
        isLatest: e.isLatest !== false,
        observations: e.observations,
      })),
      count: chain.length,
    });
  },

  // ==================== RELATION HANDLERS ====================
  create_relations: async (ctx, args) => {
    const relations = validateWithSchema(args.relations, BatchCreateRelationsSchema, 'Invalid relations data');
    return formatToolResponse(await ctx.relationManager.createRelations(relations));
  },

  delete_relations: async (ctx, args) => {
    const relations = validateWithSchema(args.relations, DeleteRelationsSchema, 'Invalid relations data');
    await ctx.relationManager.deleteRelations(relations);
    return formatTextResponse(`Deleted ${relations.length} relations`);
  },

  // Phase 13: Temporal knowledge graph
  invalidate_relation: async (ctx, args) => {
    try {
      const from = validateWithSchema(args.from, z.string().min(1), 'Invalid from');
      const relationType = validateWithSchema(args.relationType, z.string().min(1), 'Invalid relationType');
      const to = validateWithSchema(args.to, z.string().min(1), 'Invalid to');
      const ended = args.ended !== undefined ? validateWithSchema(args.ended, z.string(), 'Invalid ended') : undefined;
      await ctx.relationManager.invalidateRelation(from, relationType, to, ended);
      return formatTextResponse(
        `Invalidated: ${from} -[${relationType}]-> ${to} (ended: ${ended ?? 'now'})`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: msg }], isError: true };
    }
  },

  query_as_of: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const asOf = validateWithSchema(args.asOf, z.string().min(1), 'Invalid asOf');
    const direction = args.direction !== undefined
      ? validateWithSchema(args.direction, z.enum(['outgoing', 'incoming', 'both']), 'Invalid direction')
      : undefined;
    const relations = await ctx.relationManager.queryAsOf(entityName, asOf, { direction });
    return formatToolResponse({ entity: entityName, asOf, relations, count: relations.length });
  },

  timeline: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const direction = args.direction !== undefined
      ? validateWithSchema(args.direction, z.enum(['outgoing', 'incoming', 'both']), 'Invalid direction')
      : undefined;
    const relations = await ctx.relationManager.timeline(entityName, { direction });
    return formatToolResponse({
      entity: entityName,
      timeline: relations.map(r => ({
        from: r.from,
        relationType: r.relationType,
        to: r.to,
        validFrom: r.properties?.validFrom ?? null,
        validUntil: r.properties?.validUntil ?? null,
        current: r.properties?.validUntil === undefined,
      })),
      count: relations.length,
    });
  },

  // ==================== OBSERVATION HANDLERS ====================
  add_observations: async (ctx, args) => {
    const observations = validateWithSchema(args.observations, AddObservationsInputSchema, 'Invalid observations data');
    return formatToolResponse(await ctx.observationManager.addObservations(observations));
  },

  delete_observations: async (ctx, args) => {
    const deletions = validateWithSchema(args.deletions, DeleteObservationsInputSchema, 'Invalid deletion data');
    await ctx.observationManager.deleteObservations(deletions);
    return formatTextResponse('Observations deleted successfully');
  },

  // Phase 11 Sprint 5: Observation Normalization
  normalize_observations: async (ctx, args) => {
    const entityName = args.entityName !== undefined
      ? validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name')
      : undefined;
    const options = args.options !== undefined
      ? validateWithSchema(
          args.options,
          z.object({
            resolveCoreferences: z.boolean().optional(),
            anchorTimestamps: z.boolean().optional(),
            extractKeywords: z.boolean().optional(),
          }).strict(),
          'Invalid options'
        )
      : {};
    const persist = args.persist === true;

    const normalizer = new ObservationNormalizer();
    // Use getGraphForMutation() to acquire the storage write lock — prevents
    // concurrent calls from overwriting each other's persisted normalizations.
    const graph = persist
      ? await ctx.storage.getGraphForMutation()
      : await ctx.storage.loadGraph();

    const entities = entityName
      ? graph.entities.filter(e => e.name === entityName)
      : graph.entities;

    if (entities.length === 0 && entityName) {
      return formatTextResponse(`Entity "${entityName}" not found`);
    }

    const results = entities.map(entity => {
      const { entity: normalized, results: changes } = normalizer.normalizeEntity(entity, options);
      return {
        entityName: entity.name,
        changes: changes.filter(r => r.changes.length > 0),
        normalized: normalized.observations,
      };
    });

    if (persist) {
      // TODO: This bypasses the manager layer and writes directly to storage.
      // May leave in-memory cache stale. Ideally, normalization logic should
      // be moved into a memoryjs manager method. See code review issue #3.
      const updatedEntities = graph.entities.map(entity => {
        const result = results.find(r => r.entityName === entity.name);
        if (result && result.changes.length > 0) {
          return {
            ...entity,
            observations: result.normalized,
            lastModified: new Date().toISOString(),
          };
        }
        return entity;
      });
      await ctx.storage.saveGraph({
        entities: updatedEntities,
        relations: [...graph.relations], // spread needed: graph.relations is readonly
      });
    }

    return formatToolResponse({
      entitiesProcessed: results.length,
      persisted: persist,
      results: results.filter(r => r.changes.length > 0),
    });
  },

  // ==================== SEARCH HANDLERS ====================
  search_nodes: async (ctx, args) => {
    const query = validateWithSchema(args.query, SearchQuerySchema, 'Invalid search query');
    const tags = args.tags !== undefined ? validateWithSchema(args.tags, z.array(z.string()), 'Invalid tags') : undefined;
    const minImportance = args.minImportance !== undefined ? validateWithSchema(args.minImportance, z.number().min(0).max(10), 'Invalid minImportance') : undefined;
    const maxImportance = args.maxImportance !== undefined ? validateWithSchema(args.maxImportance, z.number().min(0).max(10), 'Invalid maxImportance') : undefined;
    return withCompression(async () =>
      formatToolResponse(await ctx.searchManager.searchNodes(query, tags, minImportance, maxImportance))
    );
  },

  search_by_date_range: async (ctx, args) => {
    const startDate = args.startDate !== undefined ? validateWithSchema(args.startDate, z.string(), 'Invalid startDate') : undefined;
    const endDate = args.endDate !== undefined ? validateWithSchema(args.endDate, z.string(), 'Invalid endDate') : undefined;
    const entityType = args.entityType !== undefined ? validateWithSchema(args.entityType, z.string(), 'Invalid entityType') : undefined;
    const tags = args.tags !== undefined ? validateWithSchema(args.tags, z.array(z.string()), 'Invalid tags') : undefined;
    return formatToolResponse(await ctx.searchManager.searchByDateRange(startDate, endDate, entityType, tags));
  },

  search_nodes_ranked: async (ctx, args) => {
    const query = validateWithSchema(args.query, SearchQuerySchema, 'Invalid search query');
    const tags = args.tags !== undefined ? validateWithSchema(args.tags, z.array(z.string()), 'Invalid tags') : undefined;
    const minImportance = args.minImportance !== undefined ? validateWithSchema(args.minImportance, z.number().min(0).max(10), 'Invalid minImportance') : undefined;
    const maxImportance = args.maxImportance !== undefined ? validateWithSchema(args.maxImportance, z.number().min(0).max(10), 'Invalid maxImportance') : undefined;
    const limit = args.limit !== undefined ? validateWithSchema(args.limit, z.number().int().positive(), 'Invalid limit') : undefined;
    return formatToolResponse(await ctx.searchManager.searchNodesRanked(query, tags, minImportance, maxImportance, limit));
  },

  boolean_search: async (ctx, args) => {
    const query = validateWithSchema(args.query, SearchQuerySchema, 'Invalid search query');
    const tags = args.tags !== undefined ? validateWithSchema(args.tags, z.array(z.string()), 'Invalid tags') : undefined;
    const minImportance = args.minImportance !== undefined ? validateWithSchema(args.minImportance, z.number().min(0).max(10), 'Invalid minImportance') : undefined;
    const maxImportance = args.maxImportance !== undefined ? validateWithSchema(args.maxImportance, z.number().min(0).max(10), 'Invalid maxImportance') : undefined;
    return formatToolResponse(await ctx.searchManager.booleanSearch(query, tags, minImportance, maxImportance));
  },

  fuzzy_search: async (ctx, args) => {
    const query = validateWithSchema(args.query, SearchQuerySchema, 'Invalid search query');
    const threshold = args.threshold !== undefined ? validateWithSchema(args.threshold, z.number().min(0).max(1), 'Invalid threshold') : undefined;
    const tags = args.tags !== undefined ? validateWithSchema(args.tags, z.array(z.string()), 'Invalid tags') : undefined;
    const minImportance = args.minImportance !== undefined ? validateWithSchema(args.minImportance, z.number().min(0).max(10), 'Invalid minImportance') : undefined;
    const maxImportance = args.maxImportance !== undefined ? validateWithSchema(args.maxImportance, z.number().min(0).max(10), 'Invalid maxImportance') : undefined;
    return formatToolResponse(await ctx.searchManager.fuzzySearch(query, threshold, tags, minImportance, maxImportance));
  },

  get_search_suggestions: async (ctx, args) => {
    const query = validateWithSchema(args.query, SearchQuerySchema, 'Invalid search query');
    const maxSuggestions = args.maxSuggestions !== undefined ? validateWithSchema(args.maxSuggestions, z.number().int().positive(), 'Invalid maxSuggestions') : undefined;
    return formatToolResponse(await ctx.searchManager.getSearchSuggestions(query, maxSuggestions));
  },

  // Phase 10 Sprint 4: Automatic search method selection
  search_auto: async (ctx, args) => {
    const query = validateWithSchema(args.query, SearchQuerySchema, 'Invalid search query');
    const limit = args.limit !== undefined ? validateWithSchema(args.limit, z.number().int().positive().max(200), 'Invalid limit') : undefined;
    return formatToolResponse(await ctx.searchManager.autoSearch(query, limit));
  },

  // Phase 13: Semantic forget
  forget_memory: async (ctx, args) => {
    const content = validateWithSchema(args.content, z.string().min(1), 'Invalid content');
    const threshold = args.threshold !== undefined ? validateWithSchema(args.threshold, z.number().min(0).max(1), 'Invalid threshold') : undefined;
    const projectId = args.projectId !== undefined ? validateWithSchema(args.projectId, z.string(), 'Invalid projectId') : undefined;
    const dryRun = args.dryRun === true;
    const result = await ctx.semanticForget.forgetByContent(content, { threshold, projectId, dryRun });
    if (result.method === 'not_found') {
      return formatTextResponse(`No matching memory found for: "${content}". Try a different search term.`);
    }
    return formatToolResponse(result);
  },

  // Phase 11 Sprint 2: Hybrid search
  hybrid_search: async (ctx, args) => {
    const query = validateWithSchema(args.query, SearchQuerySchema, 'Invalid search query');
    const weights = args.weights !== undefined
      ? validateWithSchema(
          args.weights,
          z.object({
            semantic: z.number().optional(),
            lexical: z.number().optional(),
            symbolic: z.number().optional(),
          }).strict(),
          'Invalid weights'
        )
      : undefined;
    const filters = args.filters !== undefined
      ? validateWithSchema(
          args.filters,
          z.object({
            tags: z.array(z.string()).optional(),
            entityTypes: z.array(z.string()).optional(),
            dateRange: z.object({ start: z.string(), end: z.string() }).strict().optional(),
            minImportance: z.number().optional(),
            maxImportance: z.number().optional(),
          }).strict(),
          'Invalid filters'
        )
      : undefined;
    const limit = args.limit !== undefined
      ? validateWithSchema(args.limit, z.number().int().positive().max(200), 'Invalid limit')
      : 10;
    const graphWeight = args.graphWeight !== undefined
      ? validateWithSchema(args.graphWeight, z.number().min(0).max(1), 'Invalid graphWeight')
      : undefined;
    const expandNeighborsArgs = args.expandNeighbors !== undefined
      ? validateWithSchema(
          args.expandNeighbors,
          z.object({
            topK: z.number().int().positive().max(100).optional(),
            damping: z.number().min(0).max(1).optional(),
          }).strict(),
          'Invalid expandNeighbors'
        )
      : undefined;
    // Only 1-hop expansion is supported by memoryjs, so `hops` is fixed here
    // rather than exposed in the tool schema.
    const expandNeighbors = expandNeighborsArgs !== undefined
      ? { hops: 1 as const, ...expandNeighborsArgs }
      : undefined;
    const explain = args.explain !== undefined
      ? validateWithSchema(args.explain, z.boolean(), 'Invalid explain flag')
      : undefined;
    const lookFor = args.lookFor !== undefined
      ? validateWithSchema(args.lookFor, z.string().min(1), 'Invalid lookFor')
      : undefined;

    // ctx.hybridSearchManager only attaches the GraphRankPrior when
    // MEMORY_HYBRID_GRAPH_WEIGHT is set; per-call graph options need the prior
    // wired explicitly or they would be silently inert.
    const wantsGraphChannel = (graphWeight !== undefined && graphWeight > 0) || expandNeighbors !== undefined;
    const hybridSearch = wantsGraphChannel
      ? new HybridSearchManager(ctx.semanticSearch, ctx.rankedSearch, ctx.graphRankPrior)
      : ctx.hybridSearchManager;
    const graph = await ctx.storage.loadGraph();

    const results = await hybridSearch.searchWithEntities(graph, query, {
      semanticWeight: weights?.semantic ?? 0.5,
      lexicalWeight: weights?.lexical ?? 0.3,
      symbolicWeight: weights?.symbolic ?? 0.2,
      symbolic:
        filters?.tags || filters?.entityTypes || filters?.dateRange ||
        filters?.minImportance !== undefined || filters?.maxImportance !== undefined
          ? {
              tags: filters?.tags,
              entityTypes: filters?.entityTypes,
              dateRange: filters?.dateRange,
              importance:
                filters?.minImportance !== undefined || filters?.maxImportance !== undefined
                  ? { min: filters?.minImportance, max: filters?.maxImportance }
                  : undefined,
            }
          : undefined,
      limit,
      graphWeight,
      expandNeighbors,
      explain,
      lookFor,
    });

    return formatToolResponse({
      query,
      weights: {
        semantic: weights?.semantic ?? 0.5,
        lexical: weights?.lexical ?? 0.3,
        symbolic: weights?.symbolic ?? 0.2,
        ...(graphWeight !== undefined ? { graph: graphWeight } : {}),
      },
      resultCount: results.length,
      results: results.map((r) => ({
        name: r.entity.name,
        entityType: r.entity.entityType,
        scores: r.scores,
        matchedLayers: r.matchedLayers,
        observations: r.entity.observations.slice(0, 3),
        tags: r.entity.tags,
        ...(r.evidencePaths !== undefined ? { evidencePaths: r.evidencePaths } : {}),
        ...(r.evidenceTruncated !== undefined ? { evidenceTruncated: r.evidenceTruncated } : {}),
        ...(r.lookForScore !== undefined ? { lookForScore: r.lookForScore } : {}),
      })),
    });
  },

  // Phase 11 Sprint 3: Query Analysis
  analyze_query: async (_ctx, args) => {
    const query = validateWithSchema(args.query, z.string().min(1), 'Invalid query');
    const includePlan = args.includePlan === true;

    const analyzer = new QueryAnalyzer();
    const analysis = analyzer.analyze(query);

    let plan = undefined;
    if (includePlan) {
      const planner = new QueryPlanner();
      plan = planner.createPlan(query, analysis);
    }

    return formatToolResponse({
      query,
      analysis,
      plan,
    });
  },

  // Phase 11 Sprint 4: Smart Search
  smart_search: async (ctx, args) => {
    const query = validateWithSchema(args.query, z.string().min(1), 'Invalid query');
    const maxIterations = args.maxIterations !== undefined
      ? validateWithSchema(args.maxIterations, z.number().int().positive().max(10), 'Invalid maxIterations')
      : 3;
    const adequacyThreshold = args.adequacyThreshold !== undefined
      ? validateWithSchema(args.adequacyThreshold, z.number().min(0).max(1), 'Invalid adequacyThreshold')
      : 0.7;
    const includePlan = args.includePlan !== false;
    const limit = args.limit !== undefined
      ? validateWithSchema(args.limit, z.number().int().positive().max(200), 'Invalid limit')
      : 10;

    const analyzer = new QueryAnalyzer();
    const analysis = analyzer.analyze(query);

    let plan = undefined;
    if (includePlan) {
      const planner = new QueryPlanner();
      plan = planner.createPlan(query, analysis);
    }

    const hybridSearch = ctx.hybridSearchManager;
    const reflection = new ReflectionManager(hybridSearch, analyzer);
    const graph = await ctx.storage.loadGraph();

    const result = await reflection.retrieveWithReflection(graph, query, {
      maxIterations,
      adequacyThreshold,
      searchOptions: { limit },
    });

    return formatToolResponse({
      query,
      analysis: {
        questionType: analysis.questionType,
        complexity: analysis.complexity,
        persons: analysis.persons,
        temporalRange: analysis.temporalRange,
      },
      plan,
      reflection: {
        iterations: result.iterations,
        adequate: result.adequate,
        adequacyScore: result.adequacyScore,
        refinements: result.refinements,
      },
      resultCount: result.results.length,
      results: result.results.slice(0, limit).map(r => ({
        name: r.entity.name,
        entityType: r.entity.entityType,
        scores: r.scores,
        matchedLayers: r.matchedLayers,
        observations: r.entity.observations.slice(0, 3),
      })),
    });
  },

  // ==================== SAVED SEARCH HANDLERS ====================
  save_search: async (ctx, args) => {
    const searchInput = validateWithSchema(args, SavedSearchInputSchema, 'Invalid saved search data');
    return formatToolResponse(await ctx.searchManager.saveSearch(searchInput));
  },

  execute_saved_search: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid search name');
    return formatToolResponse(await ctx.searchManager.executeSavedSearch(name));
  },

  list_saved_searches: async (ctx) => formatToolResponse(await ctx.searchManager.listSavedSearches()),

  delete_saved_search: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid search name');
    const deleted = await ctx.searchManager.deleteSavedSearch(name);
    return formatTextResponse(
      deleted
        ? `Saved search "${name}" deleted successfully`
        : `Saved search "${name}" not found`
    );
  },

  update_saved_search: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid search name');
    const updates = validateWithSchema(args.updates, SavedSearchUpdateSchema, 'Invalid update data');
    return formatToolResponse(await ctx.searchManager.updateSavedSearch(name, updates));
  },

  // ==================== TAG HANDLERS ====================
  add_tags: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    const tags = validateWithSchema(args.tags, z.array(z.string().min(1)), 'Invalid tags');
    return formatToolResponse(await ctx.entityManager.addTags(entityName, tags));
  },

  remove_tags: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    const tags = validateWithSchema(args.tags, z.array(z.string().min(1)), 'Invalid tags');
    return formatToolResponse(await ctx.entityManager.removeTags(entityName, tags));
  },

  set_importance: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    const importance = validateWithSchema(args.importance, z.number().min(0).max(10), 'Invalid importance');
    return formatToolResponse(await ctx.entityManager.setImportance(entityName, importance));
  },

  add_tags_to_multiple_entities: async (ctx, args) => {
    const entityNames = validateWithSchema(args.entityNames, z.array(z.string().min(1)), 'Invalid entity names');
    const tags = validateWithSchema(args.tags, z.array(z.string().min(1)), 'Invalid tags');
    return formatToolResponse(await ctx.entityManager.addTagsToMultipleEntities(entityNames, tags));
  },

  replace_tag: async (ctx, args) => {
    const oldTag = validateWithSchema(args.oldTag, z.string().min(1), 'Invalid old tag');
    const newTag = validateWithSchema(args.newTag, z.string().min(1), 'Invalid new tag');
    return formatToolResponse(await ctx.entityManager.replaceTag(oldTag, newTag));
  },

  merge_tags: async (ctx, args) => {
    const tag1 = validateWithSchema(args.tag1, z.string().min(1), 'Invalid first tag');
    const tag2 = validateWithSchema(args.tag2, z.string().min(1), 'Invalid second tag');
    const targetTag = validateWithSchema(args.targetTag, z.string().min(1), 'Invalid target tag');
    return formatToolResponse(await ctx.entityManager.mergeTags(tag1, tag2, targetTag));
  },

  // ==================== TAG ALIAS HANDLERS ====================
  add_tag_alias: async (ctx, args) => {
    const alias = validateWithSchema(args.alias, z.string().min(1), 'Invalid alias');
    const canonical = validateWithSchema(args.canonical, z.string().min(1), 'Invalid canonical tag');
    const description = args.description !== undefined ? validateWithSchema(args.description, z.string(), 'Invalid description') : undefined;
    return formatToolResponse(await ctx.tagManager.addTagAlias(alias, canonical, description));
  },

  list_tag_aliases: async (ctx) => formatToolResponse(await ctx.tagManager.listTagAliases()),

  remove_tag_alias: async (ctx, args) => {
    const alias = validateWithSchema(args.alias, z.string().min(1), 'Invalid alias');
    const removed = await ctx.tagManager.removeTagAlias(alias);
    return formatTextResponse(
      removed
        ? `Tag alias "${alias}" removed successfully`
        : `Tag alias "${alias}" not found`
    );
  },

  get_aliases_for_tag: async (ctx, args) => {
    const canonicalTag = validateWithSchema(args.canonicalTag, z.string().min(1), 'Invalid canonical tag');
    return formatToolResponse(await ctx.tagManager.getAliasesForTag(canonicalTag));
  },

  resolve_tag: async (ctx, args) => {
    const tag = validateWithSchema(args.tag, z.string().min(1), 'Invalid tag');
    return formatToolResponse({
      tag,
      resolved: await ctx.tagManager.resolveTag(tag),
    });
  },

  // ==================== HIERARCHY HANDLERS ====================
  set_entity_parent: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    const parentName = args.parentName !== undefined ? validateWithSchema(args.parentName, z.string().min(1).nullable(), 'Invalid parent name') : null;
    return formatToolResponse(await ctx.hierarchyManager.setEntityParent(entityName, parentName));
  },

  get_children: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    return formatToolResponse(await ctx.hierarchyManager.getChildren(entityName));
  },

  get_parent: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    return formatToolResponse(await ctx.hierarchyManager.getParent(entityName));
  },

  get_ancestors: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    return formatToolResponse(await ctx.hierarchyManager.getAncestors(entityName));
  },

  get_descendants: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    return formatToolResponse(await ctx.hierarchyManager.getDescendants(entityName));
  },

  get_subtree: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    return withCompression(async () =>
      formatToolResponse(await ctx.hierarchyManager.getSubtree(entityName))
    );
  },

  get_root_entities: async (ctx) => formatToolResponse(await ctx.hierarchyManager.getRootEntities()),

  get_entity_depth: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    return formatToolResponse({
      entityName,
      depth: await ctx.hierarchyManager.getEntityDepth(entityName),
    });
  },

  move_entity: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    const newParentName = args.newParentName !== undefined ? validateWithSchema(args.newParentName, z.string().min(1).nullable(), 'Invalid new parent name') : null;
    return formatToolResponse(await ctx.hierarchyManager.moveEntity(entityName, newParentName));
  },

  // ==================== ANALYTICS HANDLERS ====================
  get_graph_stats: async (ctx) => formatToolResponse(await ctx.analyticsManager.getGraphStats()),

  validate_graph: async (ctx) => formatToolResponse(await ctx.analyticsManager.validateGraph()),

  // ==================== COMPRESSION HANDLERS ====================
  find_duplicates: async (ctx, args) => {
    const threshold = args.threshold !== undefined ? validateWithSchema(args.threshold, z.number().min(0).max(1), 'Invalid threshold') : undefined;
    return formatToolResponse(await ctx.compressionManager.findDuplicates(threshold));
  },

  merge_entities: async (ctx, args) => {
    const entityNames = validateWithSchema(args.entityNames, z.array(z.string().min(1)).min(2), 'Invalid entity names');
    const targetName = args.targetName !== undefined ? validateWithSchema(args.targetName, z.string().min(1), 'Invalid target name') : undefined;
    return formatToolResponse(await ctx.compressionManager.mergeEntities(entityNames, targetName));
  },

  compress_graph: async (ctx, args) => {
    const threshold = args.threshold !== undefined ? validateWithSchema(args.threshold, z.number().min(0).max(1), 'Invalid threshold') : undefined;
    const dryRun = args.dryRun !== undefined ? validateWithSchema(args.dryRun, z.boolean(), 'Invalid dryRun value') : undefined;
    return formatToolResponse(await ctx.compressionManager.compressGraph(threshold, dryRun));
  },

  archive_entities: async (ctx, args) => {
    const criteria = validateWithSchema(
      {
        olderThan: args.olderThan,
        importanceLessThan: args.importanceLessThan,
        tags: args.tags,
      },
      ArchiveCriteriaSchema,
      'Invalid archive criteria'
    );
    const dryRun = args.dryRun !== undefined ? validateWithSchema(args.dryRun, z.boolean(), 'Invalid dryRun value') : undefined;
    return formatToolResponse(await ctx.archiveManager.archiveEntities(criteria, dryRun));
  },

  // ==================== GRAPH ALGORITHM HANDLERS (Phase 4 Sprint 9) ====================
  find_shortest_path: async (ctx, args) => {
    const source = validateWithSchema(args.source, z.string().min(1), 'Invalid source entity');
    const target = validateWithSchema(args.target, z.string().min(1), 'Invalid target entity');
    const direction = args.direction !== undefined
      ? validateWithSchema(args.direction, z.enum(['outgoing', 'incoming', 'both']), 'Invalid direction')
      : undefined;
    const relationTypes = args.relationTypes !== undefined
      ? validateWithSchema(args.relationTypes, z.array(z.string()), 'Invalid relation types')
      : undefined;

    const result = await ctx.graphTraversal.findShortestPath(source, target, { direction, relationTypes });
    if (!result) {
      return formatTextResponse(`No path found between "${source}" and "${target}"`);
    }
    return formatToolResponse(result);
  },

  find_all_paths: async (ctx, args) => {
    const source = validateWithSchema(args.source, z.string().min(1), 'Invalid source entity');
    const target = validateWithSchema(args.target, z.string().min(1), 'Invalid target entity');
    const maxDepth = args.maxDepth !== undefined
      ? validateWithSchema(args.maxDepth, z.number().int().min(1).max(10), 'Invalid maxDepth (1-10)')
      : 5;
    const direction = args.direction !== undefined
      ? validateWithSchema(args.direction, z.enum(['outgoing', 'incoming', 'both']), 'Invalid direction')
      : undefined;
    const relationTypes = args.relationTypes !== undefined
      ? validateWithSchema(args.relationTypes, z.array(z.string()), 'Invalid relation types')
      : undefined;

    const results = await ctx.graphTraversal.findAllPaths(source, target, maxDepth, { direction, relationTypes });
    return formatToolResponse({ paths: results, count: results.length });
  },

  get_connected_components: async (ctx) => {
    const result = await ctx.graphTraversal.findConnectedComponents();
    return formatToolResponse(result);
  },

  get_centrality: async (ctx, args) => {
    const algorithm = args.algorithm !== undefined
      ? validateWithSchema(args.algorithm, z.enum(['degree', 'betweenness', 'pagerank']), 'Invalid algorithm')
      : 'degree';
    const topN = args.topN !== undefined
      ? validateWithSchema(args.topN, z.number().int().min(1).max(100), 'Invalid topN (1-100)')
      : 10;

    let result;
    if (algorithm === 'degree') {
      const direction = args.direction !== undefined
        ? validateWithSchema(args.direction, z.enum(['in', 'out', 'both']), 'Invalid direction')
        : 'both';
      result = await ctx.graphTraversal.calculateDegreeCentrality(direction, topN);
    } else if (algorithm === 'betweenness') {
      const approximate = args.approximate !== undefined
        ? validateWithSchema(args.approximate, z.boolean(), 'Invalid approximate value')
        : false;
      const sampleRate = args.sampleRate !== undefined
        ? validateWithSchema(args.sampleRate, z.number().min(0.01).max(1.0), 'Invalid sample rate (0.01-1.0)')
        : 0.2;
      result = await ctx.graphTraversal.calculateBetweennessCentrality({
        topN,
        approximate,
        sampleRate,
      });
    } else {
      const dampingFactor = args.dampingFactor !== undefined
        ? validateWithSchema(args.dampingFactor, z.number().min(0).max(1), 'Invalid damping factor (0-1)')
        : 0.85;
      result = await ctx.graphTraversal.calculatePageRank(dampingFactor, 100, 1e-6, topN);
    }

    // Convert Map to object for JSON serialization
    return formatToolResponse({
      algorithm: result.algorithm,
      topEntities: result.topEntities,
      totalEntities: result.scores.size,
      ...(algorithm === 'betweenness' && args.approximate ? { approximate: true } : {}),
    });
  },

  // ==================== IMPORT/EXPORT HANDLERS ====================
  import_graph: async (ctx, args) => {
    const format = validateWithSchema(args.format, ImportFormatSchema, 'Invalid import format');
    const data = validateWithSchema(args.data, z.string().min(1), 'Invalid import data');
    const mergeStrategy = args.mergeStrategy !== undefined ? validateWithSchema(args.mergeStrategy, MergeStrategySchema, 'Invalid merge strategy') : undefined;
    const dryRun = args.dryRun !== undefined ? validateWithSchema(args.dryRun, z.boolean(), 'Invalid dryRun value') : undefined;
    return formatToolResponse(await ctx.ioManager.importGraph(format, data, mergeStrategy, dryRun));
  },

  // Phase 13: Conversation ingestion
  ingest: async (ctx, args) => {
    if (!args.messages || (args.messages as unknown[]).length === 0) {
      return formatTextResponse('No messages provided. At least one message is required.');
    }
    const messages = validateWithSchema(
      args.messages,
      z.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string(), timestamp: z.string().optional() })),
      'Invalid messages'
    );
    const source = args.source !== undefined ? validateWithSchema(args.source, z.string(), 'Invalid source') : undefined;
    const projectId = args.projectId !== undefined ? validateWithSchema(args.projectId, z.string(), 'Invalid projectId') : undefined;
    const tags = args.tags !== undefined ? validateWithSchema(args.tags, z.array(z.string()), 'Invalid tags') : undefined;
    const chunkBy = args.chunkBy !== undefined
      ? validateWithSchema(args.chunkBy, z.enum(['exchange', 'paragraph', 'fixed']), 'Invalid chunkBy')
      : undefined;
    const dryRun = args.dryRun === true;
    const result = await ctx.ioManager.ingest(
      { messages, source },
      { projectId, tags, chunkBy, dryRun }
    );
    return formatToolResponse(result);
  },

  export_graph: async (ctx, args) => {
    const format = validateWithSchema(args.format, ExtendedExportFormatSchema, 'Invalid export format');
    const filter = args.filter !== undefined ? validateWithSchema(args.filter, ExportFilterSchema, 'Invalid export filter') : undefined;
    const compress = args.compress !== undefined ? validateWithSchema(args.compress, z.boolean(), 'Invalid compress value') : undefined;
    const compressionQuality = args.compressionQuality !== undefined
      ? validateWithSchema(args.compressionQuality, z.number().int().min(0).max(11), 'Invalid compression quality (must be 0-11)')
      : undefined;
    const streaming = args.streaming !== undefined ? validateWithSchema(args.streaming, z.boolean(), 'Invalid streaming value') : undefined;
    const redactPii = args.redactPii !== undefined ? validateWithSchema(args.redactPii, z.boolean(), 'Invalid redactPii value') : false;
    const rawOutputPath = args.outputPath !== undefined ? validateWithSchema(args.outputPath, z.string(), 'Invalid outputPath value') : undefined;
    // Validate outputPath to prevent path traversal attacks
    const outputPath = rawOutputPath !== undefined ? validateFilePath(rawOutputPath) : undefined;

    // Get filtered or full graph
    let graph;
    if (filter) {
      graph = await ctx.searchManager.searchByDateRange(
        filter.startDate,
        filter.endDate,
        filter.entityType,
        filter.tags
      );
    } else {
      graph = await ctx.storage.loadGraph();
    }

    // η.6.3 — apply PII redactor on export when requested
    if (redactPii) {
      graph = new PiiRedactor().redactGraph(graph);
    }

    // Export with optional compression and streaming
    const result = await ctx.ioManager.exportGraphWithCompression(graph, format, {
      filter,
      compress,
      compressionQuality,
      streaming,
      outputPath,
    });

    // Return streamed result with metadata
    if (result.streamed) {
      return formatToolResponse({
        format: result.format,
        entityCount: result.entityCount,
        relationCount: result.relationCount,
        compressed: result.compressed,
        encoding: result.encoding,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: `${(result.compressionRatio * 100).toFixed(1)}%`,
        streamed: true,
        outputPath: result.outputPath,
        message: result.content,
      });
    }

    // Return compressed result with metadata, or raw content for uncompressed
    if (result.compressed) {
      return formatToolResponse({
        format: result.format,
        entityCount: result.entityCount,
        relationCount: result.relationCount,
        compressed: true,
        encoding: result.encoding,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: `${(result.compressionRatio * 100).toFixed(1)}%`,
        data: result.content,
      });
    }

    // Uncompressed: return raw content for backward compatibility
    return formatRawResponse(result.content);
  },

  // ==================== SEMANTIC SEARCH HANDLERS (Phase 4 Sprint 12) ====================
  semantic_search: async (ctx, args) => {
    const semanticSearch = ctx.semanticSearch;
    if (!semanticSearch) {
      return formatTextResponse(
        'Semantic search is not available. Set MEMORY_EMBEDDING_PROVIDER environment variable to "openai" or "local".'
      );
    }

    const query = validateWithSchema(args.query, SearchQuerySchema, 'Invalid search query');
    const limit = args.limit !== undefined
      ? validateWithSchema(args.limit, z.number().int().min(1).max(100), 'Invalid limit (1-100)')
      : undefined;
    const minSimilarity = args.minSimilarity !== undefined
      ? validateWithSchema(args.minSimilarity, z.number().min(0).max(1), 'Invalid minSimilarity (0-1)')
      : undefined;

    const graph = await ctx.storage.loadGraph();
    const results = await semanticSearch.search(graph, query, limit, minSimilarity);

    return formatToolResponse({
      query,
      results: results.map(r => ({
        entity: r.entity,
        similarity: r.similarity,
      })),
      count: results.length,
    });
  },

  find_similar_entities: async (ctx, args) => {
    const semanticSearch = ctx.semanticSearch;
    if (!semanticSearch) {
      return formatTextResponse(
        'Semantic search is not available. Set MEMORY_EMBEDDING_PROVIDER environment variable to "openai" or "local".'
      );
    }

    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entity name');
    const limit = args.limit !== undefined
      ? validateWithSchema(args.limit, z.number().int().min(1).max(100), 'Invalid limit (1-100)')
      : undefined;
    const minSimilarity = args.minSimilarity !== undefined
      ? validateWithSchema(args.minSimilarity, z.number().min(0).max(1), 'Invalid minSimilarity (0-1)')
      : undefined;

    const graph = await ctx.storage.loadGraph();
    const results = await semanticSearch.findSimilar(graph, entityName, limit, minSimilarity);

    return formatToolResponse({
      entityName,
      similarEntities: results.map(r => ({
        entity: r.entity,
        similarity: r.similarity,
      })),
      count: results.length,
    });
  },

  index_embeddings: async (ctx, args) => {
    const semanticSearch = ctx.semanticSearch;
    if (!semanticSearch) {
      return formatTextResponse(
        'Semantic search is not available. Set MEMORY_EMBEDDING_PROVIDER environment variable to "openai" or "local".'
      );
    }

    const forceReindex = args.forceReindex !== undefined
      ? validateWithSchema(args.forceReindex, z.boolean(), 'Invalid forceReindex value')
      : false;

    const graph = await ctx.storage.loadGraph();
    const result = await semanticSearch.indexAll(graph, { forceReindex });

    return formatToolResponse({
      ...result,
      totalEntities: graph.entities.length,
      stats: semanticSearch.getStats(),
    });
  },

  // ==================== REF INDEX HANDLERS ====================
  register_ref: async (ctx, args) => {
    const ref = validateWithSchema(args.ref, z.string().min(1), 'Invalid ref');
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const description = args.description !== undefined
      ? validateWithSchema(args.description, z.string(), 'Invalid description')
      : undefined;
    const entry = await getRefIndex(ctx).register(ref, entityName, description);
    return formatToolResponse(entry);
  },

  resolve_ref: async (ctx, args) => {
    const ref = validateWithSchema(args.ref, z.string().min(1), 'Invalid ref');
    const entityName = await getRefIndex(ctx).resolve(ref);
    if (entityName === null) {
      return formatTextResponse(`Ref "${ref}" is not registered`);
    }
    return formatToolResponse({ ref, entityName });
  },

  deregister_ref: async (ctx, args) => {
    const ref = validateWithSchema(args.ref, z.string().min(1), 'Invalid ref');
    await getRefIndex(ctx).deregister(ref);
    return formatTextResponse(`Ref "${ref}" deregistered`);
  },

  list_refs: async (ctx, args) => {
    const entityName = args.entityName !== undefined
      ? validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName')
      : undefined;
    const refs = await getRefIndex(ctx).listRefs(entityName);
    return formatToolResponse({ refs, count: refs.length });
  },

  // ==================== ARTIFACT HANDLERS ====================
  create_artifact: async (ctx, args) => {
    const content = validateWithSchema(args.content, z.string().min(1), 'Invalid content');
    const toolName = validateWithSchema(args.toolName, z.string().min(1), 'Invalid toolName');
    const artifactType = validateWithSchema(
      args.artifactType,
      z.enum(['tool_output', 'code_snippet', 'api_response', 'search_result', 'file_content', 'user_input']),
      'Invalid artifactType'
    );
    const description = args.description !== undefined
      ? validateWithSchema(args.description, z.string(), 'Invalid description')
      : undefined;
    const sessionId = args.sessionId !== undefined
      ? validateWithSchema(args.sessionId, z.string(), 'Invalid sessionId')
      : undefined;
    const artifact = await getArtifactManager(ctx).createArtifact({
      content,
      toolName,
      artifactType,
      description,
      sessionId,
    });
    return formatToolResponse(artifact);
  },

  get_artifact: async (ctx, args) => {
    const ref = validateWithSchema(args.ref, z.string().min(1), 'Invalid ref');
    const artifact = await getArtifactManager(ctx).getArtifact(ref);
    if (!artifact) {
      return formatTextResponse(`Artifact "${ref}" not found`);
    }
    return formatToolResponse(artifact);
  },

  list_artifacts: async (ctx, args) => {
    const filter: ArtifactFilter = {};
    if (args.toolName !== undefined) {
      filter.toolName = validateWithSchema(args.toolName, z.string(), 'Invalid toolName');
    }
    if (args.artifactType !== undefined) {
      filter.artifactType = validateWithSchema(
        args.artifactType,
        z.enum(['tool_output', 'code_snippet', 'api_response', 'search_result', 'file_content', 'user_input']),
        'Invalid artifactType'
      );
    }
    if (args.since !== undefined) {
      const sinceStr = validateWithSchema(args.since, z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/, 'since must be an ISO 8601 date string'), 'Invalid since');
      const sinceDate = new Date(sinceStr);
      if (isNaN(sinceDate.getTime())) {
        throw new Error(`Invalid since date: "${sinceStr}" is not a valid date`);
      }
      filter.since = sinceDate;
    }
    const artifacts = await getArtifactManager(ctx).listArtifacts(Object.keys(filter).length > 0 ? filter : undefined);
    return formatToolResponse({ artifacts, count: artifacts.length });
  },

  // ==================== TEMPORAL SEARCH HANDLER ====================
  search_by_time: async (ctx, args) => {
    const query = validateWithSchema(args.query, z.string().min(1), 'Invalid query');
    const options: { field?: 'createdAt' | 'lastModified' | 'any'; includeUndated?: boolean } = {};
    if (args.field !== undefined) {
      options.field = validateWithSchema(
        args.field,
        z.enum(['createdAt', 'lastModified', 'any']),
        'Invalid field'
      );
    }
    if (args.includeUndated !== undefined) {
      options.includeUndated = validateWithSchema(args.includeUndated, z.boolean(), 'Invalid includeUndated');
    }
    const entities = await ctx.searchManager.searchByTime(query, options);
    return formatToolResponse({ query, entities, count: entities.length });
  },

  // ==================== DISTILLATION HANDLER ====================
  configure_distillation: async (ctx, args) => {
    const policy = validateWithSchema(
      args.policy,
      z.enum(['default', 'noop', 'none']),
      'Invalid policy'
    );
    const pipeline = getDistillationPipeline(ctx);
    pipeline.clearPolicies();
    if (policy === 'default') {
      pipeline.addPolicy(new DefaultDistillationPolicy(), 'default');
    } else if (policy === 'noop') {
      pipeline.addPolicy(new NoOpDistillationPolicy(), 'noop');
    }
    // 'none' clears all policies — passthrough behavior
    return formatTextResponse(`Distillation pipeline configured with policy: "${policy}" (${pipeline.policyCount} policies active)`);
  },

  // ==================== FRESHNESS HANDLERS ====================
  check_freshness: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const graph = await ctx.storage.loadGraph();
    const entity = graph.entities.find(e => e.name === entityName);
    if (!entity) {
      return formatTextResponse(`Entity "${entityName}" not found`);
    }
    const fm = getFreshnessManager(ctx);
    const annotated = fm.annotateEntity(entity);
    return formatToolResponse({
      entityName,
      freshnessScore: fm.calculateFreshness(entity),
      expiresAt: fm.computeExpiresAt(entity),
      isExpired: fm.isExpired(entity),
      annotated,
    });
  },

  get_stale_entities: async (ctx, args) => {
    const threshold = args.threshold !== undefined
      ? validateWithSchema(args.threshold, z.number().min(0).max(1), 'Invalid threshold (0-1)')
      : undefined;
    const fm = getFreshnessManager(ctx);
    const stale = await fm.getStaleEntities(ctx.storage, threshold);
    return formatToolResponse({ entities: stale, count: stale.length });
  },

  get_expired_entities: async (ctx) => {
    const fm = getFreshnessManager(ctx);
    const expired = await fm.getExpiredEntities(ctx.storage);
    return formatToolResponse({ entities: expired, count: expired.length });
  },

  refresh_entity: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const fm = getFreshnessManager(ctx);
    const updated = await fm.refreshEntity(entityName, ctx.storage);
    return formatToolResponse({ updated, freshnessScore: fm.calculateFreshness(updated) });
  },

  freshness_report: async (ctx, args) => {
    const threshold = args.threshold !== undefined
      ? validateWithSchema(args.threshold, z.number().min(0).max(1), 'Invalid threshold (0-1)')
      : undefined;
    const fm = getFreshnessManager(ctx);
    const report = await fm.generateReport(ctx.storage, threshold);
    return formatToolResponse(report);
  },

  // ==================== LLM QUERY PLANNER HANDLER ====================
  query_natural_language: async (ctx, args) => {
    const query = validateWithSchema(args.query, z.string().min(1), 'Invalid query');
    const entities = await ctx.queryNaturalLanguage(query);
    return formatToolResponse({ query, entities, count: entities.length });
  },

  // ==================== GOVERNANCE HANDLERS ====================
  set_governance_policy: async (ctx, args) => {
    const gm = ctx.governanceManager;
    // GovernancePolicy uses function callbacks; we translate boolean args into allow/deny functions
    const allowCreate = args.canCreate !== undefined
      ? validateWithSchema(args.canCreate, z.boolean(), 'Invalid canCreate')
      : true;
    const allowUpdate = args.canUpdate !== undefined
      ? validateWithSchema(args.canUpdate, z.boolean(), 'Invalid canUpdate')
      : true;
    const allowDelete = args.canDelete !== undefined
      ? validateWithSchema(args.canDelete, z.boolean(), 'Invalid canDelete')
      : true;
    gm.setPolicy({
      canCreate: allowCreate ? undefined : () => false,
      canUpdate: allowUpdate ? undefined : () => false,
      canDelete: allowDelete ? undefined : () => false,
    });
    return formatTextResponse(`Governance policy set: canCreate=${allowCreate}, canUpdate=${allowUpdate}, canDelete=${allowDelete}`);
  },

  audit_query: async (ctx, args) => {
    const filter: AuditFilter = {};
    if (args.operation !== undefined) {
      filter.operation = validateWithSchema(
        args.operation,
        z.enum(['create', 'update', 'delete', 'merge', 'archive']),
        'Invalid operation'
      ) as AuditFilter['operation'];
    }
    if (args.agentId !== undefined) {
      filter.agentId = validateWithSchema(args.agentId, z.string(), 'Invalid agentId');
    }
    if (args.entityName !== undefined) {
      filter.entityName = validateWithSchema(args.entityName, z.string(), 'Invalid entityName');
    }
    // AuditFilter uses fromTime/toTime (not since/until)
    if (args.since !== undefined) {
      filter.fromTime = validateWithSchema(args.since, z.string(), 'Invalid since');
    }
    if (args.until !== undefined) {
      filter.toTime = validateWithSchema(args.until, z.string(), 'Invalid until');
    }
    const limit = args.limit !== undefined
      ? validateWithSchema(args.limit, z.number().int().min(1).max(1000), 'Invalid limit')
      : 50;
    const al = ctx.governanceManager.auditLog;
    let entries = await al.query(filter);
    entries = entries.slice(0, limit);
    return formatToolResponse({ entries, count: entries.length });
  },

  audit_history: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const al = ctx.governanceManager.auditLog;
    const entries = await al.getHistory(entityName);
    return formatToolResponse({ entityName, entries, count: entries.length });
  },

  rollback_operation: async (ctx, args) => {
    const auditEntryId = validateWithSchema(args.auditEntryId, z.string().min(1), 'Invalid auditEntryId');
    const gm = ctx.governanceManager;
    await gm.rollback(auditEntryId);
    return formatTextResponse(`Operation "${auditEntryId}" rolled back successfully`);
  },

  // ==================== ROLE PROFILE HANDLERS ====================
  set_agent_role: async (_ctx, args) => {
    const role = validateWithSchema(
      args.role,
      z.enum(['researcher', 'planner', 'executor', 'reviewer', 'default']),
      'Invalid role'
    ) as AgentRole;
    const profile = getRoleProfile(role);
    return formatToolResponse({
      role,
      label: profile.label,
      salienceConfig: profile.salienceConfig,
      contextConfig: profile.contextConfig,
      message: `Role profile "${role}" retrieved. Apply salienceConfig and contextConfig to your agent memory system.`,
    });
  },

  list_role_profiles: async (_ctx) => {
    const profiles = listRoleProfiles();
    return formatToolResponse({ profiles, count: profiles.length });
  },

  // ==================== ENTROPY FILTER HANDLERS ====================
  enable_entropy_filter: async (ctx, args) => {
    const enabled = validateWithSchema(args.enabled, z.boolean(), 'Invalid enabled');
    const minEntropy = args.minEntropy !== undefined
      ? validateWithSchema(args.minEntropy, z.number().min(0), 'Invalid minEntropy')
      : 1.5;
    const minLength = args.minLength !== undefined
      ? validateWithSchema(args.minLength, z.number().int().min(0), 'Invalid minLength')
      : 10;
    // Register (or clear) the entropy filter stage on the agent memory facade's pipeline
    const agentMem = ctx.agentMemory();
    const pipeline = agentMem.consolidationPipeline;
    if (enabled) {
      const stage = new EntropyFilterStage({ minEntropy, minLength });
      pipeline.registerStage(stage);
      return formatTextResponse(`Entropy filter enabled (minEntropy=${minEntropy}, minLength=${minLength}). Stage registered on consolidation pipeline.`);
    } else {
      return formatTextResponse('Entropy filter disabled. No new entropy-filter stage will be registered on the consolidation pipeline.');
    }
  },

  compute_entropy: async (_ctx, args) => {
    const text = validateWithSchema(args.text, z.string(), 'Invalid text');
    const entropy = computeEntropy(text);
    const result: Record<string, unknown> = { text: text.length > 100 ? text.slice(0, 100) + '...' : text, entropy };
    if (args.minEntropy !== undefined) {
      const minEntropy = validateWithSchema(args.minEntropy, z.number().min(0), 'Invalid minEntropy');
      result.minEntropy = minEntropy;
      result.passes = passesEntropyFilter(text, minEntropy);
    }
    return formatToolResponse(result);
  },

  // ==================== CONSOLIDATION HANDLERS ====================
  start_consolidation: async (ctx, args) => {
    const intervalMs = args.intervalMs !== undefined
      ? validateWithSchema(args.intervalMs, z.number().int().min(1000), 'Invalid intervalMs')
      : undefined;
    const autoMergeDuplicates = args.autoMergeDuplicates !== undefined
      ? validateWithSchema(args.autoMergeDuplicates, z.boolean(), 'Invalid autoMergeDuplicates')
      : undefined;
    // Prefer ctx.consolidationScheduler (set via MEMORY_AUTO_CONSOLIDATION env var).
    // Otherwise use the per-ctx singleton so stop/run_now can retrieve the same instance.
    let scheduler = ctx.consolidationScheduler ?? consolidationSchedulerMap.get(ctx);
    if (!scheduler) {
      const agentMem = ctx.agentMemory();
      scheduler = new ConsolidationScheduler(
        agentMem.consolidationPipeline,
        ctx.compressionManager,
        {
          consolidationIntervalMs: intervalMs,
          autoMergeDuplicates: autoMergeDuplicates,
        }
      );
      consolidationSchedulerMap.set(ctx, scheduler);
    }
    scheduler.start();
    return formatTextResponse(`Consolidation scheduler started (interval: ${scheduler.getInterval()}ms, autoMerge: ${scheduler.getConfig().autoMergeDuplicates})`);
  },

  stop_consolidation: async (ctx) => {
    const scheduler = ctx.consolidationScheduler ?? consolidationSchedulerMap.get(ctx);
    if (!scheduler) {
      return formatTextResponse('No active consolidation scheduler found. Start one first with start_consolidation.');
    }
    scheduler.stop();
    return formatTextResponse('Consolidation scheduler stopped');
  },

  run_consolidation_now: async (ctx) => {
    // Use ctx.consolidationScheduler or the per-ctx singleton if available,
    // otherwise create a temporary scheduler just for this one run.
    let scheduler = ctx.consolidationScheduler ?? consolidationSchedulerMap.get(ctx);
    if (!scheduler) {
      const agentMem = ctx.agentMemory();
      scheduler = new ConsolidationScheduler(agentMem.consolidationPipeline, ctx.compressionManager);
    }
    const result = await scheduler.runNow();
    return formatToolResponse(result);
  },

  // ==================== DREAM ENGINE HANDLERS ====================

  dream_start: async (ctx, args) => {
    const intervalMs = args.intervalMs !== undefined
      ? validateWithSchema(args.intervalMs, z.number().int().min(1000), 'Invalid intervalMs')
      : undefined;
    const runOnSessionEnd = args.runOnSessionEnd !== undefined
      ? validateWithSchema(args.runOnSessionEnd, z.boolean(), 'Invalid runOnSessionEnd')
      : undefined;
    const maxDurationMs = args.maxDurationMs !== undefined
      ? validateWithSchema(args.maxDurationMs, z.number().int().min(1000), 'Invalid maxDurationMs')
      : undefined;
    const phases = args.phases !== undefined
      ? validateWithSchema(
          args.phases,
          z.object({
            temporalAnchoring: z.boolean().optional(),
            freshnessSweep: z.boolean().optional(),
            entropyPruning: z.boolean().optional(),
            consolidation: z.boolean().optional(),
            compression: z.boolean().optional(),
            entityEnrichment: z.boolean().optional(),
            patternPromotion: z.boolean().optional(),
            graphHygiene: z.boolean().optional(),
          }),
          'Invalid phases'
        ) as DreamPhaseConfig
      : undefined;

    let engine = dreamEngineMap.get(ctx);
    if (!engine) {
      const agentMem = ctx.agentMemory();
      const config: DreamEngineConfig = {
        ...(intervalMs !== undefined && { intervalMs }),
        ...(runOnSessionEnd !== undefined && { runOnSessionEnd }),
        ...(maxDurationMs !== undefined && { maxDurationMs }),
        ...(phases !== undefined && { phases }),
      };
      engine = new DreamEngine(ctx.storage, agentMem.consolidationPipeline, config);
      dreamEngineMap.set(ctx, engine);
    }
    engine.start();
    return formatTextResponse('DreamEngine started — background memory maintenance active');
  },

  dream_stop: async (ctx) => {
    const engine = dreamEngineMap.get(ctx);
    if (!engine) {
      return formatTextResponse('No active DreamEngine found. Start one first with dream_start.');
    }
    engine.stop();
    return formatTextResponse('DreamEngine stopped');
  },

  dream_run_now: async (ctx, args) => {
    const phases = args.phases !== undefined
      ? validateWithSchema(
          args.phases,
          z.object({
            temporalAnchoring: z.boolean().optional(),
            freshnessSweep: z.boolean().optional(),
            entropyPruning: z.boolean().optional(),
            consolidation: z.boolean().optional(),
            compression: z.boolean().optional(),
            entityEnrichment: z.boolean().optional(),
            patternPromotion: z.boolean().optional(),
            graphHygiene: z.boolean().optional(),
          }),
          'Invalid phases'
        ) as DreamPhaseConfig
      : undefined;

    // Use the per-ctx singleton if available, otherwise create a one-off engine.
    let engine = dreamEngineMap.get(ctx);
    if (!engine) {
      const agentMem = ctx.agentMemory();
      const config: DreamEngineConfig = {
        ...(phases !== undefined && { phases }),
      };
      engine = new DreamEngine(ctx.storage, agentMem.consolidationPipeline, config);
    }
    const result = await engine.runDreamCycle();
    return formatToolResponse(result);
  },

  // ==================== MEMORY FORMATTER HANDLER ====================
  format_with_salience_budget: async (ctx, args) => {
    const entityNames = validateWithSchema(args.entityNames, z.array(z.string().min(1)), 'Invalid entityNames');
    const salienceScoresRaw = validateWithSchema(
      args.salienceScores,
      z.record(z.string(), z.number()),
      'Invalid salienceScores'
    );
    const totalTokenBudget = validateWithSchema(args.totalTokenBudget, z.number().int().min(1), 'Invalid totalTokenBudget');
    const header = args.header !== undefined
      ? validateWithSchema(args.header, z.string(), 'Invalid header')
      : undefined;
    const separator = args.separator !== undefined
      ? validateWithSchema(args.separator, z.string(), 'Invalid separator')
      : undefined;

    const graph = await ctx.storage.loadGraph();
    const memories = graph.entities.filter(e => entityNames.includes(e.name)) as AgentEntity[];
    const salienceScores = new Map<string, number>(Object.entries(salienceScoresRaw));

    const formatted = ctx.memoryFormatter.formatWithSalienceBudget(
      memories,
      salienceScores,
      totalTokenBudget,
      { header, separator }
    );
    return formatTextResponse(formatted);
  },

  // ==================== COLLABORATIVE SYNTHESIS HANDLER ====================
  synthesize_collaborative_context: async (ctx, args) => {
    const seedEntityName = validateWithSchema(args.seedEntityName, z.string().min(1), 'Invalid seedEntityName');
    const config: CollaborativeSynthesisConfig = {};
    if (args.maxDepth !== undefined) {
      config.maxDepth = validateWithSchema(args.maxDepth, z.number().int().min(1).max(10), 'Invalid maxDepth');
    }
    if (args.minNeighborSalience !== undefined) {
      config.minNeighborSalience = validateWithSchema(args.minNeighborSalience, z.number().min(0).max(1), 'Invalid minNeighborSalience');
    }
    if (args.maxNeighbors !== undefined) {
      config.maxNeighbors = validateWithSchema(args.maxNeighbors, z.number().int().min(1).max(100), 'Invalid maxNeighbors');
    }

    const salienceContext: SalienceContext = {};
    if (args.queryText !== undefined) {
      salienceContext.queryText = validateWithSchema(args.queryText, z.string(), 'Invalid queryText');
    }
    if (args.currentTask !== undefined) {
      salienceContext.currentTask = validateWithSchema(args.currentTask, z.string(), 'Invalid currentTask');
    }

    const synthesis = new CollaborativeSynthesis(
      ctx.storage,
      ctx.graphTraversal,
      ctx.salienceEngine,
      config
    );
    return withCompression(async () => {
      const result = await synthesis.synthesize(
        seedEntityName,
        Object.keys(salienceContext).length > 0 ? salienceContext : undefined
      );
      return formatToolResponse(result);
    });
  },

  // ==================== FAILURE DISTILLATION HANDLERS ====================
  distill_failure: async (ctx, args) => {
    const sessionId = validateWithSchema(args.sessionId, z.string().min(1), 'Invalid sessionId');
    const config: FailureDistillationConfig = {};
    if (args.minLessonConfidence !== undefined) {
      config.minLessonConfidence = validateWithSchema(args.minLessonConfidence, z.number().min(0).max(1), 'Invalid minLessonConfidence');
    }
    if (args.maxCauseChainLength !== undefined) {
      config.maxCauseChainLength = validateWithSchema(args.maxCauseChainLength, z.number().int().min(1).max(20), 'Invalid maxCauseChainLength');
    }
    const fd = Object.keys(config).length > 0
      ? new FailureDistillation(ctx.storage, config)
      : getFailureDistillation(ctx);
    const result = await fd.distillFromSession(sessionId);
    return formatToolResponse(result);
  },

  end_session: async (ctx, args) => {
    const sessionId = validateWithSchema(args.sessionId, z.string().min(1), 'Invalid sessionId');
    const outcome = validateWithSchema(
      args.outcome,
      z.enum(['success', 'failure', 'partial']),
      'Invalid outcome'
    );
    const distillFailures = args.distillFailures !== undefined
      ? validateWithSchema(args.distillFailures, z.boolean(), 'Invalid distillFailures')
      : true;

    // Use getGraphForMutation() to acquire the storage write lock — prevents
    // concurrent end_session calls from clobbering each other's outcome writes.
    const graph = await ctx.storage.getGraphForMutation();
    const sessionEntity = graph.entities.find(e => e.name === sessionId);
    if (!sessionEntity) {
      return formatTextResponse(`Session "${sessionId}" not found`);
    }

    // Update session outcome
    const updatedEntities = graph.entities.map(e =>
      e.name === sessionId
        ? { ...e, observations: [...e.observations, `outcome: ${outcome}`], lastModified: new Date().toISOString() }
        : e
    );
    await ctx.storage.saveGraph({ entities: updatedEntities, relations: [...graph.relations] });

    let distillationResult = null;
    if (outcome === 'failure' && distillFailures) {
      const fd = getFailureDistillation(ctx);
      distillationResult = await fd.distillFromSession(sessionId);
    }

    return formatToolResponse({
      sessionId,
      outcome,
      distillationResult,
      message: `Session "${sessionId}" ended with outcome: ${outcome}`,
    });
  },

  // ==================== COGNITIVE LOAD HANDLERS ====================
  analyze_cognitive_load: async (ctx, args) => {
    const entityNames = validateWithSchema(args.entityNames, z.array(z.string().min(1)), 'Invalid entityNames');
    const loadThreshold = args.loadThreshold !== undefined
      ? validateWithSchema(args.loadThreshold, z.number().min(0).max(1), 'Invalid loadThreshold')
      : undefined;

    const graph = await ctx.storage.loadGraph();
    const memories = graph.entities.filter((e): e is AgentEntity => entityNames.includes(e.name));

    if (memories.length === 0) {
      return formatTextResponse('No entities found matching the provided names');
    }

    const analyzer = new CognitiveLoadAnalyzer(loadThreshold ? { loadThreshold } : undefined);
    const metrics = analyzer.computeMetrics(memories, estimateTokens);
    return formatToolResponse({ entityCount: memories.length, metrics });
  },

  adaptive_reduce_memories: async (ctx, args) => {
    const entityNames = validateWithSchema(args.entityNames, z.array(z.string().min(1)), 'Invalid entityNames');
    const salienceScoresRaw = validateWithSchema(
      args.salienceScores,
      z.record(z.string(), z.number()),
      'Invalid salienceScores'
    );
    const loadThreshold = args.loadThreshold !== undefined
      ? validateWithSchema(args.loadThreshold, z.number().min(0).max(1), 'Invalid loadThreshold')
      : undefined;

    const graph = await ctx.storage.loadGraph();
    const memories = graph.entities.filter((e): e is AgentEntity => entityNames.includes(e.name)) as AgentEntity[];

    if (memories.length === 0) {
      return formatTextResponse('No entities found matching the provided names');
    }

    const salienceScores = new Map<string, number>(Object.entries(salienceScoresRaw));
    const analyzer = new CognitiveLoadAnalyzer(loadThreshold ? { loadThreshold } : undefined);
    const result = analyzer.adaptiveReduce(memories, salienceScores, estimateTokens);
    return formatToolResponse({
      retained: result.retained.map(e => e.name),
      removed: result.removed.map(e => e.name),
      retainedCount: result.retained.length,
      removedCount: result.removed.length,
      beforeMetrics: result.beforeMetrics,
      afterMetrics: result.afterMetrics,
    });
  },

  // Phase 13: User profile + agent diary
  get_profile: async (ctx, args) => {
    const projectId = args.projectId !== undefined ? validateWithSchema(args.projectId, z.string(), 'Invalid projectId') : undefined;
    const amm = ctx.agentMemory();
    const profile = await amm.profileManager.getProfile({ projectId });
    return formatToolResponse(profile);
  },

  update_profile: async (ctx, args) => {
    const content = validateWithSchema(args.content, z.string().min(1), 'Invalid content');
    const type = validateWithSchema(args.type, z.enum(['static', 'dynamic']), 'Invalid type');
    const projectId = args.projectId !== undefined ? validateWithSchema(args.projectId, z.string(), 'Invalid projectId') : undefined;
    const amm = ctx.agentMemory();
    await amm.profileManager.addFact(content, type, { projectId });
    return formatTextResponse(`Added ${type} profile fact: "${content}"`);
  },

  diary_write: async (ctx, args) => {
    const agentId = validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    const entry = validateWithSchema(args.entry, z.string().min(1), 'Invalid entry');
    const topic = args.topic !== undefined ? validateWithSchema(args.topic, z.string(), 'Invalid topic') : undefined;
    const amm = ctx.agentMemory();
    await amm.writeDiary(agentId, entry, { topic });
    return formatTextResponse(`Diary entry written for agent '${agentId}'`);
  },

  diary_read: async (ctx, args) => {
    const agentId = validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    const lastN = args.lastN !== undefined ? validateWithSchema(args.lastN, z.number().int().positive(), 'Invalid lastN') : undefined;
    const topic = args.topic !== undefined ? validateWithSchema(args.topic, z.string(), 'Invalid topic') : undefined;
    const amm = ctx.agentMemory();
    const entries = await amm.readDiary(agentId, { lastN, topic });
    return formatToolResponse({ agentId, entries, count: entries.length });
  },

  // ==================== SESSION & WORKING MEMORY HANDLERS ====================

  session_start: async (ctx, args) => {
    const goalDescription = args.taskDescription !== undefined ? validateWithSchema(args.taskDescription, z.string(), 'Invalid taskDescription') : undefined;
    const previousSessionId = args.parentSessionId !== undefined ? validateWithSchema(args.parentSessionId, z.string(), 'Invalid parentSessionId') : undefined;
    const amm = ctx.agentMemory();
    const session = await amm.startSession({ goalDescription, previousSessionId });
    return formatToolResponse(session);
  },

  session_end: async (ctx, args) => {
    const sessionId = validateWithSchema(args.sessionId, z.string().min(1), 'Invalid sessionId');
    const status = args.status !== undefined
      ? validateWithSchema(args.status, z.enum(['completed', 'abandoned']), 'Invalid status') as 'completed' | 'abandoned'
      : undefined;
    const amm = ctx.agentMemory();
    const result = await amm.endSession(sessionId, status);
    return formatToolResponse(result);
  },

  session_checkpoint: async (ctx, args) => {
    const sessionId = validateWithSchema(args.sessionId, z.string().min(1), 'Invalid sessionId');
    const name = args.name !== undefined ? validateWithSchema(args.name, z.string(), 'Invalid name') : undefined;
    const amm = ctx.agentMemory();
    const checkpoint = await amm.checkpointSession(sessionId, name);
    return formatToolResponse(checkpoint);
  },

  session_restore: async (ctx, args) => {
    const checkpointId = validateWithSchema(args.checkpointId, z.string().min(1), 'Invalid checkpointId');
    const amm = ctx.agentMemory();
    await amm.restoreSession(checkpointId);
    return formatTextResponse(`Session restored from checkpoint '${checkpointId}'`);
  },

  add_working_memory: async (ctx, args) => {
    const sessionId = validateWithSchema(args.sessionId, z.string().min(1), 'Invalid sessionId');
    const content = validateWithSchema(args.content, z.string().min(1), 'Invalid content');
    const taskId = args.taskId !== undefined ? validateWithSchema(args.taskId, z.string(), 'Invalid taskId') : undefined;
    const importance = args.importance !== undefined ? validateWithSchema(args.importance, z.number().min(0).max(10), 'Invalid importance') : undefined;
    const ttlHours = args.ttlHours !== undefined ? validateWithSchema(args.ttlHours, z.number().positive(), 'Invalid ttlHours') : undefined;
    const amm = ctx.agentMemory();
    const memory = await amm.addWorkingMemory({ sessionId, content, taskId, importance, ttlHours });
    return formatToolResponse(memory);
  },

  promote_working_memory: async (ctx, args) => {
    const memoryName = validateWithSchema(args.memoryName, z.string().min(1), 'Invalid memoryName');
    const targetType = args.targetType !== undefined
      ? validateWithSchema(args.targetType, z.enum(['episodic', 'semantic']), 'Invalid targetType') as 'episodic' | 'semantic'
      : undefined;
    const amm = ctx.agentMemory();
    const result = await amm.promoteMemory(memoryName, targetType);
    return formatToolResponse(result);
  },

  confirm_memory: async (ctx, args) => {
    const memoryName = validateWithSchema(args.memoryName, z.string().min(1), 'Invalid memoryName');
    const confidenceBoost = args.confidenceBoost !== undefined ? validateWithSchema(args.confidenceBoost, z.number(), 'Invalid confidenceBoost') : undefined;
    const amm = ctx.agentMemory();
    const result = await amm.confirmMemory(memoryName, confidenceBoost);
    return formatToolResponse(result);
  },

  clear_expired_memories: async (ctx) => {
    const amm = ctx.agentMemory();
    const count = await amm.clearExpiredMemories();
    return formatTextResponse(`Cleared ${count} expired working memories`);
  },

  wake_up: async (ctx, args) => {
    const compress = args.compress !== undefined ? validateWithSchema(args.compress, z.boolean(), 'Invalid compress') : undefined;
    const result = await ctx.contextWindowManager.wakeUp({ compress });
    return formatToolResponse(result);
  },

  // ==================== AUTO-ENHANCEMENT HANDLERS ====================

  auto_link_observations: async (ctx, args) => {
    const text = validateWithSchema(args.text, z.string().min(1), 'Invalid text');
    const graph = await ctx.storage.loadGraph();
    const mentions = ctx.autoLinker.detectMentions(text, graph.entities);
    return formatToolResponse({ mentions, count: mentions.length });
  },

  extract_facts: async (ctx, args) => {
    const text = validateWithSchema(args.text, z.string().min(1), 'Invalid text');
    const facts = ctx.factExtractor.extract(text);
    return formatToolResponse({ facts, count: facts.length });
  },

  detect_contradictions: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const threshold = args.threshold !== undefined ? validateWithSchema(args.threshold, z.number().min(0).max(1), 'Invalid threshold') : undefined;
    const graph = await ctx.storage.loadGraph();
    const entity = graph.entities.find(e => e.name === entityName);
    if (!entity) {
      return { content: [{ type: 'text' as const, text: `Entity '${entityName}' not found` }], isError: true };
    }
    if (!ctx.semanticSearch) {
      return formatTextResponse('Contradiction detection requires semantic search (set MEMORY_EMBEDDING_PROVIDER)');
    }
    const detector = new ContradictionDetector(ctx.semanticSearch, threshold ?? 0.85);
    const contradictions = await detector.detect(entity, entity.observations);
    return formatToolResponse({ entityName, contradictions, count: contradictions.length });
  },

  consolidate_session: async (ctx, args) => {
    const sessionId = validateWithSchema(args.sessionId, z.string().min(1), 'Invalid sessionId');
    const amm = ctx.agentMemory();
    const result = await amm.consolidateSession(sessionId);
    return formatToolResponse(result);
  },

  detect_patterns: async (ctx, args) => {
    const entityType = validateWithSchema(args.entityType, z.string().min(1), 'Invalid entityType');
    const minOccurrences = args.minOccurrences !== undefined ? validateWithSchema(args.minOccurrences, z.number().int().min(2), 'Invalid minOccurrences') : undefined;
    const amm = ctx.agentMemory();
    const patterns = await amm.consolidationPipeline.extractPatterns(entityType, minOccurrences);
    return formatToolResponse({ patterns, count: patterns.length });
  },

  summarize_entity: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const threshold = args.threshold !== undefined ? validateWithSchema(args.threshold, z.number().min(0).max(1), 'Invalid threshold') : undefined;
    const amm = ctx.agentMemory();
    const result = await amm.consolidationPipeline.applySummarizationToEntity(entityName, threshold);
    return formatToolResponse(result);
  },

  priority_dedup: async (ctx) => {
    const result = await ctx.compressionManager.priorityDedup();
    return formatToolResponse(result);
  },

  // ==================== CONTEXT COMPRESSION HANDLERS ====================

  compress_context: async (ctx, args) => {
    const text = validateWithSchema(args.text, z.string().min(1), 'Invalid text');
    const level = args.level !== undefined
      ? validateWithSchema(args.level, z.enum(['light', 'medium', 'aggressive']), 'Invalid level') as 'light' | 'medium' | 'aggressive'
      : undefined;
    const result = ctx.contextWindowManager.compressForContext(text, { level });
    return formatToolResponse(result);
  },

  // ==================== DECAY & SALIENCE HANDLERS ====================

  run_decay_cycle: async (ctx) => {
    const amm = ctx.agentMemory();
    const result = await amm.runDecayCycle();
    return formatToolResponse(result);
  },

  get_decayed_memories: async (ctx, args) => {
    const threshold = args.threshold !== undefined ? validateWithSchema(args.threshold, z.number(), 'Invalid threshold') : undefined;
    const amm = ctx.agentMemory();
    const memories = await amm.getDecayedMemories(threshold);
    return formatToolResponse({ memories, count: memories.length });
  },

  forget_weak_memories: async (ctx, args) => {
    const effectiveImportanceThreshold = args.threshold !== undefined
      ? validateWithSchema(args.threshold, z.number(), 'Invalid threshold')
      : 0.1;
    const dryRun = args.dryRun !== undefined ? validateWithSchema(args.dryRun, z.boolean(), 'Invalid dryRun') : undefined;
    const olderThanHours = args.maxCount !== undefined ? validateWithSchema(args.maxCount, z.number().int().positive(), 'Invalid olderThanHours') : undefined;
    const options: ForgetOptions = { effectiveImportanceThreshold, dryRun, olderThanHours };
    const amm = ctx.agentMemory();
    const result = await amm.forgetWeakMemories(options);
    return formatToolResponse(result);
  },

  reinforce_memory: async (ctx, args) => {
    const memoryName = validateWithSchema(args.memoryName, z.string().min(1), 'Invalid memoryName');
    const confirmationBoost = args.confirmationBoost !== undefined ? validateWithSchema(args.confirmationBoost, z.number(), 'Invalid confirmationBoost') : undefined;
    const confidenceBoost = args.confidenceBoost !== undefined ? validateWithSchema(args.confidenceBoost, z.number(), 'Invalid confidenceBoost') : undefined;
    const amm = ctx.agentMemory();
    await amm.reinforceMemory(memoryName, { confirmationBoost, confidenceBoost });
    return formatTextResponse(`Memory '${memoryName}' reinforced`);
  },

  score_salience: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const queryText = args.queryText !== undefined ? validateWithSchema(args.queryText, z.string(), 'Invalid queryText') : undefined;
    const taskDescription = args.taskDescription !== undefined ? validateWithSchema(args.taskDescription, z.string(), 'Invalid taskDescription') : undefined;
    const sessionId = args.sessionId !== undefined ? validateWithSchema(args.sessionId, z.string(), 'Invalid sessionId') : undefined;
    const graph = await ctx.storage.loadGraph();
    const entity = graph.entities.find(e => e.name === entityName);
    if (!entity) {
      return { content: [{ type: 'text' as const, text: `Entity '${entityName}' not found` }], isError: true };
    }
    const context: SalienceContext = { queryText, currentTask: taskDescription, currentSession: sessionId };
    const scored = await ctx.salienceEngine.calculateSalience(entity as AgentEntity, context);
    return formatToolResponse(scored);
  },

  // ==================== MULTI-AGENT HANDLERS ====================

  register_agent: async (ctx, args) => {
    const agentId = validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    const type = args.type !== undefined ? validateWithSchema(args.type, z.string(), 'Invalid type') as 'llm' | 'tool' | 'human' | 'system' | 'default' : 'default' as const;
    const trustLevel = args.trustLevel !== undefined ? validateWithSchema(args.trustLevel, z.number().min(0).max(1), 'Invalid trustLevel') : 0.5;
    const capabilities = args.capabilities !== undefined ? validateWithSchema(args.capabilities, z.array(z.string()), 'Invalid capabilities') : [];
    const amm = ctx.agentMemory();
    amm.registerAgent(agentId, { name: agentId, type, trustLevel, capabilities });
    return formatTextResponse(`Agent '${agentId}' registered (type: ${type}, trust: ${trustLevel})`);
  },

  search_cross_agent: async (ctx, args) => {
    const requestingAgentId = validateWithSchema(args.requestingAgentId, z.string().min(1), 'Invalid requestingAgentId');
    const query = validateWithSchema(args.query, z.string().min(1), 'Invalid query');
    const agentIds = args.agentIds !== undefined ? validateWithSchema(args.agentIds, z.array(z.string()), 'Invalid agentIds') : undefined;
    const amm = ctx.agentMemory();
    const results = await amm.searchCrossAgent(requestingAgentId, query, { agentIds });
    return withCompression(async () => formatToolResponse({ results, count: results.length }));
  },

  set_memory_visibility: async (ctx, args) => {
    const memoryName = validateWithSchema(args.memoryName, z.string().min(1), 'Invalid memoryName');
    const agentId = validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    const visibility = validateWithSchema(args.visibility, z.enum(['private', 'team', 'org', 'shared', 'public']), 'Invalid visibility');
    // η.5.5.b extensions
    const allowedRoles = args.allowedRoles !== undefined
      ? validateWithSchema(args.allowedRoles, z.array(z.string()), 'Invalid allowedRoles')
      : undefined;
    const visibleFrom = args.visibleFrom !== undefined ? validateWithSchema(args.visibleFrom, z.string(), 'Invalid visibleFrom') : undefined;
    const visibleUntil = args.visibleUntil !== undefined ? validateWithSchema(args.visibleUntil, z.string(), 'Invalid visibleUntil') : undefined;

    const amm = ctx.agentMemory();
    const result = await amm.multiAgentManager.setMemoryVisibility(memoryName, agentId, visibility);

    // Bug 3 fix: previously returned null silently when entity wasn't an
    // AgentEntity. Auto-promote: stamp agentId + memoryType + role/window
    // fields so the visibility takes effect. Error if the entity doesn't
    // exist at all.
    if (result === null) {
      const graph = await ctx.storage.getGraphForMutation();
      const entity = graph.entities.find(e => e.name === memoryName) as Record<string, unknown> | undefined;
      if (!entity) {
        return {
          content: [{ type: 'text', text: `Entity '${memoryName}' not found — cannot set visibility` }],
          isError: true,
        };
      }
      // Promote plain Entity → AgentEntity by stamping multi-agent fields
      entity.agentId = agentId;
      entity.visibility = visibility;
      if (entity.memoryType === undefined) entity.memoryType = 'semantic';
      if (entity.confidence === undefined) entity.confidence = 0.8;
      if (entity.confirmationCount === undefined) entity.confirmationCount = 0;
      if (entity.accessCount === undefined) entity.accessCount = 0;
      // η.5.5.b extension fields
      if (allowedRoles !== undefined) entity.allowedRoles = allowedRoles;
      if (visibleFrom !== undefined) entity.visibleFrom = visibleFrom;
      if (visibleUntil !== undefined) entity.visibleUntil = visibleUntil;
      await ctx.storage.saveGraph(graph);
      return formatToolResponse({
        memoryName,
        agentId,
        visibility,
        allowedRoles,
        visibleFrom,
        visibleUntil,
        promoted: true,
        message: 'Plain entity auto-promoted to AgentEntity with visibility set',
      });
    }

    // Already an AgentEntity — apply η.5.5.b extension fields if provided
    if (allowedRoles !== undefined || visibleFrom !== undefined || visibleUntil !== undefined) {
      const graph = await ctx.storage.getGraphForMutation();
      const entity = graph.entities.find(e => e.name === memoryName) as Record<string, unknown> | undefined;
      if (entity) {
        if (allowedRoles !== undefined) entity.allowedRoles = allowedRoles;
        if (visibleFrom !== undefined) entity.visibleFrom = visibleFrom;
        if (visibleUntil !== undefined) entity.visibleUntil = visibleUntil;
        await ctx.storage.saveGraph(graph);
      }
    }

    return formatToolResponse(result);
  },

  get_visible_memories: async (ctx, args) => {
    const agentId = validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    const amm = ctx.agentMemory();
    const memories = await amm.multiAgentManager.getVisibleMemories(agentId);
    return withCompression(async () => formatToolResponse({ memories, count: memories.length }));
  },

  resolve_agent_conflict: async (ctx, args) => {
    const primaryMemory = validateWithSchema(args.primaryMemory, z.string().min(1), 'Invalid primaryMemory');
    const conflictingMemory = validateWithSchema(args.conflictingMemory, z.string().min(1), 'Invalid conflictingMemory');
    const strategy = args.strategy !== undefined
      ? validateWithSchema(args.strategy, z.enum(['most_recent', 'highest_confidence', 'most_confirmations', 'trusted_agent']), 'Invalid strategy') as ConflictStrategy
      : undefined;
    const amm = ctx.agentMemory();
    // Build a ConflictInfo structure for the two memories
    const conflictInfo: ConflictInfo = {
      primaryMemory,
      conflictingMemories: [conflictingMemory],
      detectionMethod: 'manual',
      suggestedStrategy: strategy ?? 'most_recent',
      detectedAt: new Date().toISOString(),
    };
    const result = await amm.resolveConflict(conflictInfo, strategy);
    return formatToolResponse(result);
  },

  // ==================== OBSERVABILITY HANDLERS ====================

  visualize_graph: async (ctx, args) => {
    const maxEntities = args.maxEntities !== undefined ? validateWithSchema(args.maxEntities, z.number().int().positive(), 'Invalid maxEntities') : undefined;
    const title = args.title !== undefined ? validateWithSchema(args.title, z.string(), 'Invalid title') : undefined;
    const html = await ctx.ioManager.visualizeGraph({ maxEntities, title });
    return formatRawResponse(html);
  },

  split_transcript: async (ctx, args) => {
    const text = validateWithSchema(args.text, z.string().min(1), 'Invalid text');
    const result = ctx.ioManager.splitTranscript(text);
    return formatToolResponse(result);
  },

  estimate_query_cost: async (ctx, args) => {
    const query = validateWithSchema(args.query, z.string().min(1), 'Invalid query');
    let estimator = queryCostEstimatorMap.get(ctx);
    if (!estimator) {
      estimator = new QueryCostEstimator();
      queryCostEstimatorMap.set(ctx, estimator);
    }
    const graph = await ctx.storage.loadGraph();
    const estimates = estimator.estimateAllMethods(query, graph.entities.length);
    return formatToolResponse({ query, entityCount: graph.entities.length, estimates });
  },

  get_context_profile: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid name');
    const profileManager = ctx.contextWindowManager.getContextProfileManager();
    const profile = profileManager.getProfile(name);
    return formatToolResponse(profile);
  },

  // ==================== η.4.4 BITEMPORAL ENTITY HANDLERS ====================
  invalidate_entity: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid name');
    const ended = args.ended !== undefined
      ? validateWithSchema(args.ended, z.string(), 'Invalid ended')
      : undefined;
    await ctx.entityManager.invalidateEntity(name, ended);
    return formatTextResponse(`Invalidated entity '${name}' (ended: ${ended ?? 'now'})`);
  },

  entity_as_of: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid name');
    const asOf = validateWithSchema(args.asOf, z.string().min(1), 'Invalid asOf');
    const entity = await ctx.entityManager.entityAsOf(name, asOf);
    if (!entity) return formatToolResponse({ entity: null, valid: false, asOf });
    return formatToolResponse({ entity, valid: true, asOf });
  },

  entity_timeline: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid name');
    const versions = await ctx.entityManager.entityTimeline(name);
    return formatToolResponse({ name, versions, count: versions.length });
  },

  invalidate_observation: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const content = validateWithSchema(args.content, z.string().min(1), 'Invalid content');
    const ended = args.ended !== undefined
      ? validateWithSchema(args.ended, z.string(), 'Invalid ended')
      : undefined;
    await ctx.observationManager.invalidateObservation(entityName, content, ended);
    return formatTextResponse(`Invalidated observation on '${entityName}' (ended: ${ended ?? 'now'})`);
  },

  observations_as_of: async (ctx, args) => {
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    const asOf = validateWithSchema(args.asOf, z.string().min(1), 'Invalid asOf');
    const observations = await ctx.observationManager.observationsAsOf(entityName, asOf);
    return formatToolResponse({ entityName, asOf, observations, count: observations.length });
  },

  // ==================== η.5.5.c OCC HANDLER ====================
  update_entity: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid name');
    const updates = validateWithSchema(
      args.updates,
      z.record(z.string(), z.unknown()),
      'Invalid updates',
    );
    const expectedVersion = args.expectedVersion !== undefined
      ? validateWithSchema(args.expectedVersion, z.number().int().positive(), 'Invalid expectedVersion')
      : undefined;
    const updated = await ctx.entityManager.updateEntity(
      name,
      updates as Parameters<typeof ctx.entityManager.updateEntity>[1],
      expectedVersion !== undefined ? { expectedVersion } : undefined,
    );
    return formatToolResponse(updated);
  },

  // ==================== η.6.1 RBAC HANDLERS ====================
  rbac_assign_role: async (ctx, args) => {
    const agentId = validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    const role = validateWithSchema(args.role, z.string().min(1), 'Invalid role');
    const resourceType = args.resourceType !== undefined
      ? validateWithSchema(
          args.resourceType,
          z.enum(['entity', 'relation', 'observation', 'session', 'artifact']),
          'Invalid resourceType',
        )
      : undefined;
    const scope = args.scope !== undefined ? validateWithSchema(args.scope, z.string(), 'Invalid scope') : undefined;
    const validFrom = args.validFrom !== undefined ? validateWithSchema(args.validFrom, z.string(), 'Invalid validFrom') : undefined;
    const validUntil = args.validUntil !== undefined ? validateWithSchema(args.validUntil, z.string(), 'Invalid validUntil') : undefined;
    const notes = args.notes !== undefined ? validateWithSchema(args.notes, z.string(), 'Invalid notes') : undefined;
    await ctx.roleAssignmentStore.assign({ agentId, role, resourceType, scope, validFrom, validUntil, notes });
    return formatTextResponse(`Assigned role '${role}' to agent '${agentId}'${resourceType ? ` (resourceType=${resourceType})` : ''}${scope ? ` (scope=${scope})` : ''}`);
  },

  rbac_revoke_role: async (ctx, args) => {
    const agentId = validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    const role = validateWithSchema(args.role, z.string().min(1), 'Invalid role');
    const resourceType = args.resourceType !== undefined
      ? validateWithSchema(
          args.resourceType,
          z.enum(['entity', 'relation', 'observation', 'session', 'artifact']),
          'Invalid resourceType',
        )
      : undefined;
    await ctx.roleAssignmentStore.revoke(agentId, role, resourceType);
    return formatTextResponse(`Revoked role '${role}' from agent '${agentId}'`);
  },

  rbac_check_permission: async (ctx, args) => {
    const agentId = validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    const action = validateWithSchema(
      args.action,
      z.enum(['read', 'write', 'delete', 'manage']),
      'Invalid action',
    );
    const resourceType = validateWithSchema(
      args.resourceType,
      z.enum(['entity', 'relation', 'observation', 'session', 'artifact']),
      'Invalid resourceType',
    );
    const resourceName = args.resourceName !== undefined ? validateWithSchema(args.resourceName, z.string(), 'Invalid resourceName') : undefined;
    const now = args.now !== undefined ? validateWithSchema(args.now, z.string(), 'Invalid now') : undefined;
    const allowed = ctx.rbacMiddleware.checkPermission(agentId, action, resourceType, resourceName, now);
    return formatToolResponse({ agentId, action, resourceType, resourceName, allowed });
  },

  rbac_list_assignments: async (ctx, args) => {
    const agentId = validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    const activeOnly = args.activeOnly !== undefined ? validateWithSchema(args.activeOnly, z.boolean(), 'Invalid activeOnly') : false;
    const now = args.now !== undefined ? validateWithSchema(args.now, z.string(), 'Invalid now') : undefined;
    const assignments = activeOnly
      ? ctx.roleAssignmentStore.listActive(agentId, now)
      : ctx.roleAssignmentStore.list(agentId);
    return formatToolResponse({ agentId, activeOnly, assignments, count: assignments.length });
  },

  // ==================== 3B.4 PROCEDURAL MEMORY HANDLERS ====================
  add_procedure: async (ctx, args) => {
    const procedure = await ctx.procedureManager.addProcedure(
      args as Parameters<typeof ctx.procedureManager.addProcedure>[0],
    );
    return formatToolResponse(procedure);
  },

  get_procedure: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const procedure = await ctx.procedureManager.getProcedure(id);
    if (!procedure) {
      return { content: [{ type: 'text', text: `Procedure '${id}' not found` }], isError: true };
    }
    return formatToolResponse(procedure);
  },

  match_procedure: async (ctx, args) => {
    const context = validateWithSchema(args.context, z.string().min(1), 'Invalid context');
    const threshold = args.threshold !== undefined ? validateWithSchema(args.threshold, z.number().min(0).max(1), 'Invalid threshold') : 0;
    const candidateIds = args.candidateIds !== undefined ? validateWithSchema(args.candidateIds, z.array(z.string()), 'Invalid candidateIds') : undefined;
    // If specific candidates passed, load each; otherwise scan all 'procedure' entities.
    const graph = await ctx.storage.loadGraph();
    const allProcedureEntities = graph.entities.filter(e => e.entityType === 'procedure');
    const candidates = await Promise.all(
      (candidateIds ?? allProcedureEntities.map(e => e.name)).map(id => ctx.procedureManager.getProcedure(id)),
    );
    const valid = candidates.filter((p): p is NonNullable<typeof p> => p !== null);
    const matches = await ctx.procedureManager.matchProcedure(context, valid, threshold);
    return formatToolResponse({ context, threshold, matches, count: matches.length });
  },

  refine_procedure: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const succeeded = validateWithSchema(args.succeeded, z.boolean(), 'Invalid succeeded');
    const notes = args.notes !== undefined ? validateWithSchema(args.notes, z.string(), 'Invalid notes') : undefined;
    const recordedAt = args.recordedAt !== undefined ? validateWithSchema(args.recordedAt, z.string(), 'Invalid recordedAt') : undefined;
    const updated = await ctx.procedureManager.refineProcedure(id, { succeeded, notes, recordedAt });
    return formatToolResponse(updated);
  },

  get_procedure_step: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const order = validateWithSchema(args.order, z.number().int().positive(), 'Invalid order');
    const next = args.next !== undefined ? validateWithSchema(args.next, z.boolean(), 'Invalid next') : false;
    const step = next
      ? await ctx.procedureManager.getNextStep(id, order)
      : await ctx.procedureManager.getStep(id, order);
    if (!step) {
      return { content: [{ type: 'text', text: `Step ${order} not found in procedure '${id}'` }], isError: true };
    }
    return formatToolResponse(step);
  },

  // ==================== 3B.5 ACTIVE RETRIEVAL HANDLER ====================
  adaptive_retrieve: async (ctx, args) => {
    const query = validateWithSchema(args.query, z.string().min(1), 'Invalid query');
    const budgetTokens = args.budgetTokens !== undefined ? validateWithSchema(args.budgetTokens, z.number().int().positive(), 'Invalid budgetTokens') : undefined;
    const result = await ctx.activeRetrieval.adaptiveRetrieve({ query, budgetTokens });
    return formatToolResponse(result);
  },

  // ==================== 3B.6 CAUSAL REASONING HANDLERS ====================
  find_causes: async (ctx, args) => {
    const effect = validateWithSchema(args.effect, z.string().min(1), 'Invalid effect');
    const candidates = validateWithSchema(args.candidates, z.array(z.string()).min(1), 'Invalid candidates');
    const maxDepth = args.maxDepth !== undefined ? validateWithSchema(args.maxDepth, z.number().int().positive(), 'Invalid maxDepth') : undefined;
    const chains = await ctx.causalReasoner.findCauses(effect, candidates, maxDepth);
    return formatToolResponse({ effect, candidates, chains, count: chains.length });
  },

  find_effects: async (ctx, args) => {
    const cause = validateWithSchema(args.cause, z.string().min(1), 'Invalid cause');
    const candidates = validateWithSchema(args.candidates, z.array(z.string()).min(1), 'Invalid candidates');
    const maxDepth = args.maxDepth !== undefined ? validateWithSchema(args.maxDepth, z.number().int().positive(), 'Invalid maxDepth') : undefined;
    const chains = await ctx.causalReasoner.findEffects(cause, candidates, maxDepth);
    return formatToolResponse({ cause, candidates, chains, count: chains.length });
  },

  counterfactual_query: async (ctx, args) => {
    const seed = validateWithSchema(args.seed, z.string().min(1), 'Invalid seed');
    const removeFrom = validateWithSchema(args.removeFrom, z.string().min(1), 'Invalid removeFrom');
    const removeTo = validateWithSchema(args.removeTo, z.string().min(1), 'Invalid removeTo');
    const predict = validateWithSchema(args.predict, z.string().min(1), 'Invalid predict');
    const maxDepth = args.maxDepth !== undefined ? validateWithSchema(args.maxDepth, z.number().int().positive(), 'Invalid maxDepth') : undefined;
    const chains = await ctx.causalReasoner.counterfactual({ seed, removeFrom, removeTo, predict, maxDepth });
    return formatToolResponse({ scenario: { seed, removeFrom, removeTo, predict }, chains, count: chains.length });
  },

  detect_causal_cycles: async (ctx, args) => {
    const seed = validateWithSchema(args.seed, z.string().min(1), 'Invalid seed');
    const maxDepth = args.maxDepth !== undefined ? validateWithSchema(args.maxDepth, z.number().int().positive(), 'Invalid maxDepth') : undefined;
    const cycles = ctx.causalReasoner.detectCycles(seed, maxDepth);
    return formatToolResponse({ seed, cycles, count: cycles.length });
  },

  // ==================== 3B.7 WORLD MODEL HANDLERS ====================
  get_world_state: async (ctx) => {
    const snapshot = await ctx.worldModelManager.getCurrentState();
    return formatToolResponse(snapshot.toJSON());
  },

  validate_fact_against_world: async (ctx, args) => {
    const observation = validateWithSchema(args.observation, z.string().min(1), 'Invalid observation');
    const entityName = validateWithSchema(args.entityName, z.string().min(1), 'Invalid entityName');
    try {
      const result = await ctx.worldModelManager.validateFact(observation, entityName);
      return formatToolResponse({ observation, entityName, result });
    } catch (err) {
      // Graceful path for the documented "Returns null if no validator
      // is wired" semantics: when memoryjs's local embedding provider is
      // selected but `@xenova/transformers` isn't installed, the
      // underlying EmbeddingService throws a raw Node module-resolution
      // error. Translating to a structured null result keeps the MCP
      // surface coherent and surfaces the configuration issue instead
      // of leaking Node internals.
      const msg = err instanceof Error ? err.message : String(err);
      // Anchored on memoryjs EmbeddingService.ts:368 prefix and the
      // package-name signal — narrow enough to avoid swallowing
      // legitimate "Failed to initialize world model — entity has no
      // embedding" or similar downstream errors.
      const isProviderUnavailable =
        /^Failed to initialize local embedding service:/.test(msg) ||
        /Cannot find package ['"]@xenova\/transformers['"]/.test(msg);
      if (isProviderUnavailable) {
        // Log to stderr (stdout is the MCP JSON-RPC stream — must not
        // be polluted). Operators piping stderr to a file see this once
        // per process; LLM clients see only the structured null result.
        console.warn(
          '[validate_fact_against_world] embedding_provider_unavailable: ' + msg
        );
        return formatToolResponse({
          observation,
          entityName,
          result: null,
          reason: 'embedding_provider_unavailable',
          detail: msg,
        });
      }
      throw err;
    }
  },

  predict_outcome: async (ctx, args) => {
    const action = validateWithSchema(args.action, z.string().min(1), 'Invalid action');
    const candidates = validateWithSchema(args.candidates, z.array(z.string()).min(1), 'Invalid candidates');
    const chains = await ctx.worldModelManager.predictOutcome(action, candidates);
    return formatToolResponse({ action, candidates, chains, count: chains.length });
  },

  // ==================== v2.1.0 TOOL AFFORDANCE ====================

  record_tool_outcome: async (ctx, args) => {
    const toolName = validateWithSchema(args.toolName, z.string().min(1), 'Invalid toolName');
    const outcome = validateWithSchema(
      args.outcome,
      z.enum(['success', 'failure', 'partial']),
      'Invalid outcome',
    );
    const errorMessage = args.errorMessage === undefined
      ? undefined
      : validateWithSchema(args.errorMessage, z.string(), 'Invalid errorMessage');
    const durationMs = args.durationMs === undefined
      ? undefined
      : validateWithSchema(args.durationMs, z.number().min(0), 'Invalid durationMs');
    const record = await ctx.toolAffordanceManager.recordOutcome(toolName, {
      outcome,
      errorMessage,
      durationMs,
    });
    return formatToolResponse({ record });
  },

  get_tool_affordance_stats: async (ctx, args) => {
    const toolName = validateWithSchema(args.toolName, z.string().min(1), 'Invalid toolName');
    const stats = ctx.toolAffordanceManager.rollingStats(toolName);
    return formatToolResponse({ toolName, stats: stats ?? null });
  },

  suggest_tool: async (ctx, args) => {
    const taskHint = validateWithSchema(args.taskHint, z.string().min(1), 'Invalid taskHint');
    const limit = args.limit === undefined
      ? undefined
      : validateWithSchema(args.limit, z.number().int().min(1), 'Invalid limit');
    const minScore = args.minScore === undefined
      ? undefined
      : validateWithSchema(args.minScore, z.number().min(0).max(1), 'Invalid minScore');
    const suggestions = await ctx.toolAffordanceManager.suggestTool(taskHint, { limit, minScore });
    return formatToolResponse({ taskHint, suggestions, count: suggestions.length });
  },

  list_tool_affordances: async (ctx) => {
    const records = await ctx.toolAffordanceManager.list();
    return formatToolResponse({ records, count: records.length });
  },

  remove_tool_affordance: async (ctx, args) => {
    const toolName = validateWithSchema(args.toolName, z.string().min(1), 'Invalid toolName');
    const removed = await ctx.toolAffordanceManager.remove(toolName);
    return formatToolResponse({ toolName, removed });
  },

  observe_tool_start: (ctx, args) => {
    const toolName = validateWithSchema(args.toolName, z.string().min(1), 'Invalid toolName');
    const argsField = args.args === undefined
      ? undefined
      : validateWithSchema(
          args.args,
          z.record(z.string(), z.unknown()),
          'Invalid args (must be an object)',
        );
    const callId = ctx.toolCallObserver.observeStart(toolName, argsField);
    return Promise.resolve(formatToolResponse({ callId, toolName }));
  },

  observe_tool_complete: async (ctx, args) => {
    const callId = validateWithSchema(args.callId, z.string().min(1), 'Invalid callId');
    const result = args.result === undefined
      ? undefined
      : validateWithSchema(args.result, z.string(), 'Invalid result');
    await ctx.toolCallObserver.observeComplete(callId, result === undefined ? undefined : { result });
    return formatToolResponse({ callId, recorded: 'success' });
  },

  observe_tool_error: async (ctx, args) => {
    const callId = validateWithSchema(args.callId, z.string().min(1), 'Invalid callId');
    const errorMessage = validateWithSchema(args.errorMessage, z.string().min(1), 'Invalid errorMessage');
    await ctx.toolCallObserver.observeError(callId, errorMessage);
    return formatToolResponse({ callId, recorded: 'failure', errorMessage });
  },

  observe_tool_partial: async (ctx, args) => {
    const callId = validateWithSchema(args.callId, z.string().min(1), 'Invalid callId');
    const reason = validateWithSchema(args.reason, z.string().min(1), 'Invalid reason');
    await ctx.toolCallObserver.observePartial(callId, reason);
    return formatToolResponse({ callId, recorded: 'partial', reason });
  },

  observe_tool_cancel: (ctx, args) => {
    const callId = validateWithSchema(args.callId, z.string().min(1), 'Invalid callId');
    ctx.toolCallObserver.cancel(callId);
    return Promise.resolve(formatToolResponse({ callId, cancelled: true }));
  },

  tool_observer_in_flight_count: (ctx) => {
    const count = ctx.toolCallObserver.inFlightCount();
    return Promise.resolve(formatToolResponse({ inFlightCount: count }));
  },

  // ==================== v2.1.0 HEURISTIC GUIDELINES ====================

  add_heuristic: async (ctx, args) => {
    const condition = validateWithSchema(args.condition, z.string().min(1), 'Invalid condition');
    const action = validateWithSchema(args.action, z.string().min(1), 'Invalid action');
    const priority = args.priority === undefined
      ? undefined
      : validateWithSchema(args.priority, z.number(), 'Invalid priority');
    const initialConfidence = args.initialConfidence === undefined
      ? undefined
      : validateWithSchema(args.initialConfidence, z.number().min(0).max(1), 'Invalid initialConfidence');
    const importance = args.importance === undefined
      ? undefined
      : validateWithSchema(args.importance, z.number().min(0).max(10), 'Invalid importance');
    const agentId = args.agentId === undefined
      ? undefined
      : validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    const id = args.id === undefined
      ? undefined
      : validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const heuristicId = await ctx.heuristicManager.add({
      condition,
      action,
      priority,
      initialConfidence,
      importance,
      agentId,
      id: id as unknown as Parameters<typeof ctx.heuristicManager.add>[0]['id'],
    });
    return formatToolResponse({ id: heuristicId });
  },

  get_heuristic: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const heuristic = ctx.heuristicManager.get(id);
    return formatToolResponse({ id, heuristic: heuristic ?? null });
  },

  list_heuristics: async (ctx) => {
    const heuristics = await ctx.heuristicManager.list();
    return formatToolResponse({ heuristics, count: heuristics.length });
  },

  heuristic_count: async (ctx) => {
    const size = await ctx.heuristicManager.size();
    return formatToolResponse({ count: size });
  },

  match_heuristics: async (ctx, args) => {
    const input = validateWithSchema(args.input, z.string().min(1), 'Invalid input');
    const limit = args.limit === undefined
      ? undefined
      : validateWithSchema(args.limit, z.number().int().min(1), 'Invalid limit');
    const minScore = args.minScore === undefined
      ? undefined
      : validateWithSchema(args.minScore, z.number().min(0).max(1), 'Invalid minScore');
    const matches = await ctx.heuristicManager.match(input, { limit, minScore });
    return formatToolResponse({ input, matches, count: matches.length });
  },

  reinforce_heuristic: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const result = await ctx.heuristicManager.reinforce(id);
    return formatToolResponse({ id, result });
  },

  record_heuristic_contradiction: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const result = await ctx.heuristicManager.recordContradiction(id);
    return formatToolResponse({ id, result });
  },

  detect_heuristic_conflicts: async (ctx) => {
    const conflicts = await ctx.heuristicManager.detectConflicts();
    return formatToolResponse({ conflicts, count: conflicts.length });
  },

  remove_heuristic: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const removed = await ctx.heuristicManager.remove(id);
    return formatToolResponse({ id, removed });
  },

  clear_heuristics: async (ctx) => {
    await ctx.heuristicManager.clear();
    return formatToolResponse({ cleared: true });
  },

  // ==================== v2.1.0 PROJECT CONTEXT ====================

  upsert_project_context: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const facts = args.facts === undefined
      ? undefined
      : validateWithSchema(args.facts, z.array(z.string()), 'Invalid facts');
    const conventions = args.conventions === undefined
      ? undefined
      : validateWithSchema(args.conventions, z.array(z.string()), 'Invalid conventions');
    const commands = args.commands === undefined
      ? undefined
      : validateWithSchema(
          args.commands,
          z.array(z.object({
            name: z.string().min(1),
            command: z.string().min(1),
            purpose: z.string().min(1),
          })),
          'Invalid commands',
        );
    const glossary = args.glossary === undefined
      ? undefined
      : validateWithSchema(
          args.glossary,
          z.array(z.object({
            term: z.string().min(1),
            definition: z.string().min(1),
          })),
          'Invalid glossary',
        );
    const record = await ctx.projectContextManager.upsert(projectId, {
      facts, conventions, commands, glossary,
    });
    return formatToolResponse({ record });
  },

  get_project_context: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const record = ctx.projectContextManager.get(projectId);
    return formatToolResponse({ projectId, record: record ?? null });
  },

  append_project_fact: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const fact = validateWithSchema(args.fact, z.string().min(1), 'Invalid fact');
    const record = await ctx.projectContextManager.appendFact(projectId, fact);
    return formatToolResponse({ record });
  },

  append_project_convention: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const convention = validateWithSchema(args.convention, z.string().min(1), 'Invalid convention');
    const record = await ctx.projectContextManager.appendConvention(projectId, convention);
    return formatToolResponse({ record });
  },

  append_project_command: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid name');
    const command = validateWithSchema(args.command, z.string().min(1), 'Invalid command');
    const purpose = validateWithSchema(args.purpose, z.string().min(1), 'Invalid purpose');
    const record = await ctx.projectContextManager.appendCommand(projectId, { name, command, purpose });
    return formatToolResponse({ record });
  },

  append_project_glossary_term: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const term = validateWithSchema(args.term, z.string().min(1), 'Invalid term');
    const definition = validateWithSchema(args.definition, z.string().min(1), 'Invalid definition');
    const record = await ctx.projectContextManager.appendGlossaryTerm(projectId, { term, definition });
    return formatToolResponse({ record });
  },

  remove_project_fact: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const fact = validateWithSchema(args.fact, z.string().min(1), 'Invalid fact');
    const removed = await ctx.projectContextManager.removeFact(projectId, fact);
    return formatToolResponse({ projectId, fact, removed });
  },

  remove_project_convention: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const convention = validateWithSchema(args.convention, z.string().min(1), 'Invalid convention');
    const removed = await ctx.projectContextManager.removeConvention(projectId, convention);
    return formatToolResponse({ projectId, convention, removed });
  },

  remove_project_command: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const commandName = validateWithSchema(args.commandName, z.string().min(1), 'Invalid commandName');
    const removed = await ctx.projectContextManager.removeCommand(projectId, commandName);
    return formatToolResponse({ projectId, commandName, removed });
  },

  remove_project_glossary_term: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const term = validateWithSchema(args.term, z.string().min(1), 'Invalid term');
    const removed = await ctx.projectContextManager.removeGlossaryTerm(projectId, term);
    return formatToolResponse({ projectId, term, removed });
  },

  clear_project_context: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const cleared = await ctx.projectContextManager.clear(projectId);
    return formatToolResponse({ projectId, cleared });
  },

  format_project_context_for_llm: async (ctx, args) => {
    const projectId = validateWithSchema(args.projectId, z.string().min(1), 'Invalid projectId');
    const budgetChars = args.budgetChars === undefined
      ? undefined
      : validateWithSchema(args.budgetChars, z.number().int().min(1), 'Invalid budgetChars');
    const prose = await ctx.projectContextManager.forContext(projectId, { budgetChars });
    return formatTextResponse(prose);
  },

  // ==================== v2.1.0 DECISION RATIONALE ====================

  propose_decision: async (ctx, args) => {
    const context = validateWithSchema(args.context, z.string().min(1), 'Invalid context');
    const decision = validateWithSchema(args.decision, z.string().min(1), 'Invalid decision');
    const alternatives = args.alternatives === undefined
      ? []
      : validateWithSchema(args.alternatives, z.array(z.string()), 'Invalid alternatives');
    const consequences = args.consequences === undefined
      ? []
      : validateWithSchema(args.consequences, z.array(z.string()), 'Invalid consequences');
    const relatedFiles = args.relatedFiles === undefined
      ? undefined
      : validateWithSchema(args.relatedFiles, z.array(z.string()), 'Invalid relatedFiles');
    const supersedes = args.supersedes === undefined
      ? undefined
      : validateWithSchema(args.supersedes, z.string().min(1), 'Invalid supersedes');
    const sourceSessionId = args.sourceSessionId === undefined
      ? undefined
      : validateWithSchema(args.sourceSessionId, z.string().min(1), 'Invalid sourceSessionId');
    const sourceProjectId = args.sourceProjectId === undefined
      ? undefined
      : validateWithSchema(args.sourceProjectId, z.string().min(1), 'Invalid sourceProjectId');
    const importance = args.importance === undefined
      ? undefined
      : validateWithSchema(args.importance, z.number().min(0).max(10), 'Invalid importance');
    const agentId = args.agentId === undefined
      ? undefined
      : validateWithSchema(args.agentId, z.string().min(1), 'Invalid agentId');
    // `supersedes` is a branded DecisionId at the type level; the
    // manager casts internally so a string is fine here.
    const record = await ctx.decisionManager.propose(
      {
        context,
        decision,
        alternatives,
        consequences,
        relatedFiles,
        supersedes: supersedes as unknown as Parameters<typeof ctx.decisionManager.propose>[0]['supersedes'],
        sourceSessionId,
        sourceProjectId,
      },
      { importance, agentId },
    );
    return formatToolResponse({ record });
  },

  accept_decision: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const result = await ctx.decisionManager.accept(id);
    return formatToolResponse({ id, result });
  },

  reject_decision: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const reason = validateWithSchema(args.reason, z.string().min(1), 'Invalid reason');
    const result = await ctx.decisionManager.reject(id, reason);
    return formatToolResponse({ id, reason, result });
  },

  supersede_decision: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const by = validateWithSchema(args.by, z.string().min(1), 'Invalid by');
    const result = await ctx.decisionManager.supersede(
      id,
      by as unknown as Parameters<typeof ctx.decisionManager.supersede>[1],
    );
    return formatToolResponse({ id, by, result });
  },

  find_decisions_by_context: async (ctx, args) => {
    const query = validateWithSchema(args.query, z.string().min(1), 'Invalid query');
    const records = await ctx.decisionManager.findByContext(query);
    return formatToolResponse({ query, records, count: records.length });
  },

  get_decision_chain: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const chain = await ctx.decisionManager.getChain(id);
    return formatToolResponse({ id, chain, length: chain.length });
  },

  list_decisions: async (ctx, args) => {
    const status = args.status === undefined
      ? undefined
      : validateWithSchema(
          args.status,
          z.enum(['proposed', 'accepted', 'superseded', 'rejected']),
          'Invalid status',
        );
    const sourceSessionId = args.sourceSessionId === undefined
      ? undefined
      : validateWithSchema(args.sourceSessionId, z.string().min(1), 'Invalid sourceSessionId');
    const sourceProjectId = args.sourceProjectId === undefined
      ? undefined
      : validateWithSchema(args.sourceProjectId, z.string().min(1), 'Invalid sourceProjectId');
    const limit = args.limit === undefined
      ? undefined
      : validateWithSchema(args.limit, z.number().int().min(1), 'Invalid limit');
    const records = await ctx.decisionManager.list({ status, sourceSessionId, sourceProjectId, limit });
    return formatToolResponse({ records, count: records.length });
  },

  get_decision: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const record = ctx.decisionManager.get(id);
    return formatToolResponse({ id, record: record ?? null });
  },

  export_decision_as_adr_markdown: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const markdown = ctx.decisionManager.exportAsAdrMarkdown(id);
    return formatTextResponse(markdown);
  },

  parse_adr_markdown: async (_ctx, args) => {
    const text = validateWithSchema(args.text, z.string().min(1), 'Invalid text');
    const parsed = DecisionManager.parseAdrMarkdown(text);
    return formatToolResponse({ parsed });
  },

  // ==================== v2.1.0 do_not_remember (Exclusion) ====================

  add_exclusion_rule: async (ctx, args) => {
    const pattern = validateWithSchema(args.pattern, z.string().min(1), 'Invalid pattern');
    const scope = args.scope === undefined
      ? undefined
      : validateWithSchema(args.scope, z.enum(['future-only', 'past-only', 'both']), 'Invalid scope');
    const entityType = args.entityType === undefined
      ? undefined
      : validateWithSchema(args.entityType, z.string().min(1), 'Invalid entityType');
    const reason = args.reason === undefined
      ? undefined
      : validateWithSchema(args.reason, z.string().min(1), 'Invalid reason');
    const rule = await ctx.exclusionManager.add({ pattern, scope, entityType, reason });
    return formatToolResponse({ rule });
  },

  list_exclusion_rules: async (ctx) => {
    const rules = await ctx.exclusionManager.list();
    return formatToolResponse({ rules, count: rules.length });
  },

  remove_exclusion_rule: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid id');
    const removed = await ctx.exclusionManager.remove(id);
    return formatToolResponse({ id, removed });
  },

  check_exclusion: async (ctx, args) => {
    const content = validateWithSchema(args.content, z.string(), 'Invalid content');
    const entityType = args.entityType === undefined
      ? undefined
      : validateWithSchema(args.entityType, z.string().min(1), 'Invalid entityType');
    const verdict = await ctx.exclusionManager.check(content, entityType);
    return formatToolResponse(verdict);
  },

  find_matching_memories_for_rule: async (ctx, args) => {
    const pattern = validateWithSchema(args.pattern, z.string().min(1), 'Invalid pattern');
    const entityType = args.entityType === undefined
      ? undefined
      : validateWithSchema(args.entityType, z.string().min(1), 'Invalid entityType');
    const matches = await ctx.exclusionManager.findMatchingMemories({ pattern, entityType });
    return formatToolResponse({
      pattern,
      entityType,
      matches: matches.map((m) => ({ name: m.name, entityType: m.entityType })),
      count: matches.length,
    });
  },

  // ==================== v2.1.0 OBSERVATION DEDUP ====================

  find_duplicate_observations: async (ctx, args) => {
    const filter = parseObservationDedupFilter(args);
    const groups = await ctx.observationDedupManager.findDuplicateObservations(filter);
    return formatToolResponse({ filter, groups, count: groups.length });
  },

  find_jaccard_duplicate_observations: async (ctx, args) => {
    const filter = parseObservationDedupFilter(args);
    const groups = await ctx.observationDedupManager.findJaccardDuplicates(filter);
    return formatToolResponse({ filter, groups, count: groups.length });
  },

  // ==================== v2.1.0 SPELL CORRECTION ====================

  spell_suggest: async (ctx, args) => {
    const query = validateWithSchema(args.query, z.string().min(1), 'Invalid query');
    const limit = args.limit === undefined
      ? undefined
      : validateWithSchema(args.limit, z.number().int().min(1), 'Invalid limit');
    const minScore = args.minScore === undefined
      ? undefined
      : validateWithSchema(args.minScore, z.number().min(0).max(1), 'Invalid minScore');
    const maxDistance = args.maxDistance === undefined
      ? undefined
      : validateWithSchema(args.maxDistance, z.number().min(0), 'Invalid maxDistance');
    const suggestions = await ctx.spellChecker.suggest(query, { limit, minScore, maxDistance });
    return formatToolResponse({ query, suggestions, count: suggestions.length });
  },

  spell_rebuild_vocabulary: async (ctx) => {
    await ctx.spellChecker.rebuild();
    return formatToolResponse({ rebuilt: true, vocabularySize: ctx.spellChecker.vocabularySize() });
  },

  spell_vocabulary_size: async (ctx) => {
    const size = ctx.spellChecker.vocabularySize();
    return formatToolResponse({ vocabularySize: size });
  },

  // ==================== ENGINEERING / DIAGNOSTIC TOOLS (v12.5.0) ====================
  // Parallel to the `memory diag` / `memory check` / etc. CLI surface in memoryjs v2.2+.
  // Useful when the MCP server is up but the graph state is suspect.

  diag: async (ctx) => {
    const storagePath = getStorageFilePath(ctx);
    let exists = false;
    let sizeBytes = 0;
    try {
      const stat = await fs.stat(storagePath);
      exists = true;
      sizeBytes = stat.size;
    } catch { /* file may not exist yet */ }
    const stats = await ctx.analyticsManager.getGraphStats();
    return formatToolResponse({
      runtime: { node: process.version, platform: process.platform, arch: process.arch, pid: process.pid },
      storage: {
        path: storagePath,
        type: process.env.MEMORY_STORAGE_TYPE ?? 'jsonl',
        exists,
        sizeBytes,
        entities: stats.totalEntities,
        relations: stats.totalRelations,
      },
      loadedAt: new Date().toISOString(),
    });
  },

  health: async (ctx) => {
    const checks: Array<{ name: string; ok: boolean; durationMs: number; detail?: string }> = [];

    const t1 = performance.now();
    let graph: Awaited<ReturnType<typeof ctx.storage.loadGraph>>;
    try {
      graph = await ctx.storage.loadGraph();
      checks.push({ name: 'storage:loadGraph', ok: true, durationMs: performance.now() - t1 });
    } catch (e) {
      checks.push({
        name: 'storage:loadGraph',
        ok: false,
        durationMs: performance.now() - t1,
        detail: e instanceof Error ? e.message : String(e),
      });
      return formatToolResponse({ ok: false, failed: 1, totalChecks: 1, totalMs: performance.now() - t1, checks });
    }

    const t2 = performance.now();
    const names = new Set<string>();
    const dupes: string[] = [];
    for (const e of graph.entities) {
      if (names.has(e.name)) dupes.push(e.name);
      else names.add(e.name);
    }
    checks.push({
      name: 'entities:distinct-names',
      ok: dupes.length === 0,
      durationMs: performance.now() - t2,
      detail: dupes.length === 0 ? undefined : `${dupes.length} duplicate(s)`,
    });

    const t3 = performance.now();
    const orphans: string[] = [];
    for (const r of graph.relations) {
      if (!names.has(r.from) || !names.has(r.to)) {
        orphans.push(`${r.from} → ${r.to}`);
      }
    }
    checks.push({
      name: 'relations:no-orphans',
      ok: orphans.length === 0,
      durationMs: performance.now() - t3,
      detail: orphans.length === 0 ? undefined : `${orphans.length} orphan(s)`,
    });

    const t4 = performance.now();
    const byName = new Map<string, AgentEntity>();
    for (const e of graph.entities) byName.set(e.name, e as AgentEntity);
    const cycleIssues: string[] = [];
    for (const e of graph.entities) {
      if (!e.parentId) continue;
      if (!byName.has(e.parentId)) { cycleIssues.push(`${e.name}.parentId='${e.parentId}' missing`); continue; }
      const visited = new Set<string>();
      let cur = byName.get(e.parentId);
      while (cur && cur.parentId) {
        if (visited.has(cur.name)) { cycleIssues.push(`cycle through ${cur.name}`); break; }
        visited.add(cur.name);
        cur = byName.get(cur.parentId);
      }
    }
    checks.push({
      name: 'hierarchy:no-cycles-no-missing-parents',
      ok: cycleIssues.length === 0,
      durationMs: performance.now() - t4,
      detail: cycleIssues.length === 0 ? undefined : cycleIssues.slice(0, 3).join('; '),
    });

    const failed = checks.filter((c) => !c.ok).length;
    return formatToolResponse({
      ok: failed === 0,
      failed,
      totalChecks: checks.length,
      totalMs: Number(checks.reduce((a, c) => a + c.durationMs, 0).toFixed(2)),
      checks,
    });
  },

  check_graph: async (ctx, args) => {
    const apply = args.apply === undefined
      ? false
      : validateWithSchema(args.apply, z.boolean(), 'Invalid apply');
    const graph = await ctx.storage.loadGraph();
    const names = new Set(graph.entities.map((e) => e.name));

    const orphans: Array<{ from: string; to: string; relationType: string; reason: string }> = [];
    for (const r of graph.relations) {
      const fromMissing = !names.has(r.from);
      const toMissing = !names.has(r.to);
      if (fromMissing || toMissing) {
        orphans.push({
          from: r.from, to: r.to, relationType: r.relationType,
          reason: fromMissing && toMissing ? 'both-missing' : fromMissing ? 'from-missing' : 'to-missing',
        });
      }
    }

    const byName = new Map<string, { name: string; parentId?: string }>();
    for (const e of graph.entities) byName.set(e.name, { name: e.name, parentId: e.parentId });
    const missing: Array<{ entity: string; parentId: string }> = [];
    const cycles: Array<{ entityInCycle: string; cycleThrough: string }> = [];
    for (const e of graph.entities) {
      if (!e.parentId) continue;
      if (!byName.has(e.parentId)) { missing.push({ entity: e.name, parentId: e.parentId }); continue; }
      const visited = new Set<string>([e.name]);
      let cur = byName.get(e.parentId);
      while (cur && cur.parentId) {
        if (visited.has(cur.name)) { cycles.push({ entityInCycle: e.name, cycleThrough: cur.name }); break; }
        visited.add(cur.name);
        cur = byName.get(cur.parentId);
      }
    }

    const ok = orphans.length === 0 && missing.length === 0 && cycles.length === 0;
    const result: Record<string, unknown> = {
      ok, applied: apply, orphanRelations: orphans, missingParents: missing, hierarchyCycles: cycles,
    };

    if (apply && (orphans.length > 0 || missing.length > 0)) {
      let deleted = 0;
      let cleared = 0;
      if (orphans.length > 0) {
        await ctx.relationManager.deleteRelations(
          orphans.map((o) => ({ from: o.from, to: o.to, relationType: o.relationType })),
        );
        deleted = orphans.length;
      }
      for (const m of missing) {
        try {
          await ctx.hierarchyManager.setEntityParent(m.entity, null);
          cleared += 1;
        } catch { /* skip; entity may have vanished */ }
      }
      result.actions = { orphanRelationsDeleted: deleted, missingParentsCleared: cleared };
    }

    return formatToolResponse(result);
  },

  reindex: async (ctx, args) => {
    const ranked = args.ranked === undefined
      ? true
      : validateWithSchema(args.ranked, z.boolean(), 'Invalid ranked');
    const spell = args.spell === undefined
      ? true
      : validateWithSchema(args.spell, z.boolean(), 'Invalid spell');
    if (!ranked && !spell) {
      return formatToolResponse({ ok: true, failed: 0, result: {} });
    }
    const result: Record<string, { ok: boolean; durationMs: number; detail?: string }> = {};

    if (ranked) {
      const t = performance.now();
      try {
        // Same workaround as the CLI: default ctx.rankedSearch is constructed
        // without a storageDir so buildIndex() refuses. Construct an ad-hoc one
        // alongside the JSONL.
        const storageDir = path.dirname(getStorageFilePath(ctx));
        const r = new RankedSearch(ctx.storage as GraphStorage, storageDir);
        await r.buildIndex();
        result.ranked = { ok: true, durationMs: performance.now() - t };
      } catch (e) {
        result.ranked = {
          ok: false,
          durationMs: performance.now() - t,
          detail: e instanceof Error ? e.message : String(e),
        };
      }
    }
    if (spell) {
      const t = performance.now();
      try {
        await ctx.spellChecker.rebuild();
        result.spell = { ok: true, durationMs: performance.now() - t };
      } catch (e) {
        result.spell = {
          ok: false,
          durationMs: performance.now() - t,
          detail: e instanceof Error ? e.message : String(e),
        };
      }
    }
    const failed = Object.values(result).filter((r) => !r.ok).length;
    return formatToolResponse({ ok: failed === 0, failed, result });
  },

  cache_stats: async (_ctx) => {
    return formatToolResponse({ stats: getAllCacheStats() });
  },

  cache_clear: async (_ctx) => {
    clearAllSearchCaches();
    return formatToolResponse({ cleared: true, caches: ['basic', 'ranked', 'boolean', 'fuzzy'] });
  },

  graph_size: async (ctx) => {
    const storagePath = getStorageFilePath(ctx);
    const graph = await ctx.storage.loadGraph();
    let observationCount = 0;
    const tagSet = new Set<string>();
    for (const e of graph.entities) {
      observationCount += e.observations.length;
      if (e.tags) for (const t of e.tags) tagSet.add(t);
    }
    let exists = false;
    let sizeBytes = 0;
    let lineCount = 0;
    try {
      const stat = await fs.stat(storagePath);
      exists = true;
      sizeBytes = stat.size;
      if (sizeBytes > 0) {
        const content = await fs.readFile(storagePath, 'utf8');
        lineCount = content.split('\n').filter((l) => l.length > 0).length;
      }
    } catch { /* file may not exist */ }
    return formatToolResponse({
      graph: {
        entities: graph.entities.length,
        relations: graph.relations.length,
        observations: observationCount,
        distinctTags: tagSet.size,
        avgObservationsPerEntity: graph.entities.length === 0
          ? 0
          : Number((observationCount / graph.entities.length).toFixed(2)),
      },
      storage: { path: storagePath, exists, sizeBytes, lineCount },
    });
  },

  inspect_entity: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid name');
    // getEntityByName reads an in-memory nameIndex hydrated by loadGraph.
    const graph = await ctx.storage.loadGraph();
    const entity = ctx.storage.getEntityByName(name);
    if (!entity) throw new Error(`entity not found: ${name}`);
    const observations = await ctx.observationManager.getObservationsFor(name);
    const outgoing = graph.relations
      .filter((r) => r.from === name)
      .map((r) => ({ to: r.to, type: r.relationType }));
    const incoming = graph.relations
      .filter((r) => r.to === name)
      .map((r) => ({ from: r.from, type: r.relationType }));
    const children = (await ctx.hierarchyManager.getChildren(name)).map((c) => c.name);
    const ancestors = (await ctx.hierarchyManager.getAncestors(name)).map((a) => a.name);
    return formatToolResponse({
      name: entity.name,
      entityType: entity.entityType,
      observations,
      tags: entity.tags,
      importance: entity.importance,
      createdAt: entity.createdAt,
      lastModified: entity.lastModified,
      parentId: entity.parentId,
      children,
      ancestors,
      relations: { outgoing, incoming },
    });
  },

  hierarchy_tree: async (ctx, args) => {
    const root = args.root === undefined
      ? undefined
      : validateWithSchema(args.root, z.string().min(1), 'Invalid root');
    await ctx.storage.loadGraph();

    interface TreeNode { name: string; entityType: string; children: TreeNode[] }
    async function walk(n: string): Promise<TreeNode> {
      const e = ctx.storage.getEntityByName(n);
      const kids = await ctx.hierarchyManager.getChildren(n);
      const childNodes: TreeNode[] = [];
      for (const c of kids) childNodes.push(await walk(c.name));
      return { name: n, entityType: e?.entityType ?? 'unknown', children: childNodes };
    }

    if (root) {
      const e = ctx.storage.getEntityByName(root);
      if (!e) throw new Error(`entity not found: ${root}`);
      return formatToolResponse({ trees: [await walk(root)] });
    }
    const roots = await ctx.hierarchyManager.getRootEntities();
    const trees = await Promise.all(roots.map((r) => walk(r.name)));
    return formatToolResponse({ trees });
  },

  entity_neighbors: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid name');
    const graph = await ctx.storage.loadGraph();
    const entity = ctx.storage.getEntityByName(name);
    if (!entity) throw new Error(`entity not found: ${name}`);
    const outgoing = graph.relations.filter((r) => r.from === name).map((r) => ({ to: r.to, type: r.relationType }));
    const incoming = graph.relations.filter((r) => r.to === name).map((r) => ({ from: r.from, type: r.relationType }));
    return formatToolResponse({
      entity: name,
      outgoing,
      incoming,
      outDegree: outgoing.length,
      inDegree: incoming.length,
    });
  },

  // ==================== EVENT MEMORY HANDLERS (memoryjs v3.0.0) ====================
  record_event: async (ctx, args) => {
    const input = validateWithSchema(
      args,
      z.object({
        action: z.string().min(1),
        actor: z.string().min(1),
        target: z.string().min(1).optional(),
        context: z.string().min(1).optional(),
        participants: z.array(z.string().min(1)).optional(),
        occurredAt: z.string().min(1).optional(),
        flowKey: z.string().min(1).optional(),
        detail: z.array(z.string()).optional(),
        importance: z.number().optional(),
      }).strict(),
      'Invalid event input'
    ) as RecordEventInput;
    const event = await ctx.eventManager.recordEvent(input);
    return formatToolResponse({ event });
  },

  get_event: async (ctx, args) => {
    const name = validateWithSchema(args.name, z.string().min(1), 'Invalid event name');
    const event = await ctx.eventManager.getEvent(name);
    if (!event) {
      return formatTextResponse(`Event "${name}" not found`);
    }
    return formatToolResponse({ event });
  },

  query_events: async (ctx, args) => {
    const filter = validateWithSchema(
      args,
      z.object({
        actor: z.string().min(1).optional(),
        target: z.string().min(1).optional(),
        action: z.string().min(1).optional(),
        flowKey: z.string().min(1).optional(),
        timeRange: z.object({
          start: z.string().min(1).optional(),
          end: z.string().min(1).optional(),
        }).strict().optional(),
        limit: z.number().int().positive().max(1000).optional(),
      }).strict(),
      'Invalid event filter'
    ) as EventQueryFilter;
    const events = await ctx.eventManager.queryEvents(filter);
    return formatToolResponse({ events, count: events.length });
  },

  get_event_flow: async (ctx, args) => {
    const flowKey = validateWithSchema(args.flowKey, z.string().min(1), 'Invalid flowKey');
    const events = await ctx.eventManager.getFlow(flowKey);
    return formatToolResponse({ flowKey, events, count: events.length });
  },

  who_did_what: async (ctx, args) => {
    const filter = validateWithSchema(
      args,
      z.object({
        target: z.string().min(1).optional(),
        context: z.string().min(1).optional(),
        timeRange: z.object({
          start: z.string().min(1).optional(),
          end: z.string().min(1).optional(),
        }).strict().optional(),
        limit: z.number().int().positive().max(1000).optional(),
      }).strict(),
      'Invalid filter'
    ) as WhoDidWhatFilter & { timeRange?: EventTimeRange };
    const entries = await ctx.eventManager.whoDidWhat(filter);
    return formatToolResponse({ entries, count: entries.length });
  },

  // ==================== RECONSTRUCTIVE MEMORY HANDLERS (memoryjs v3.0.0) ====================
  ingest_dialogue: async (ctx, args) => {
    const turns = validateWithSchema(
      args.turns,
      z.array(
        z.object({
          id: z.string().min(1),
          speaker: z.string().optional(),
          text: z.string().min(1),
          timestamp: z.string().optional(),
        }).strict()
      ).min(1),
      'Invalid dialogue turns'
    ) as DialogueTurn[];
    const rm = ctx.reconstructiveMemory();
    const result = await rm.ingest(turns);
    return formatToolResponse({
      distillation: result,
      persisted: rm.lastPersistResult,
      stats: rm.stats(),
    });
  },

  reconstruct_memory: async (ctx, args) => {
    const query = validateWithSchema(args.query, z.string().min(1), 'Invalid query');
    const options = validateWithSchema(
      {
        maxSteps: args.maxSteps,
        perStepBudget: args.perStepBudget,
        evidenceTarget: args.evidenceTarget,
      },
      z.object({
        maxSteps: z.number().int().positive().max(32).optional(),
        perStepBudget: z.number().int().positive().max(100).optional(),
        evidenceTarget: z.number().int().positive().max(100).optional(),
      }),
      'Invalid reconstruction options'
    );
    const result = await ctx.reconstructiveMemory().reconstruct(query, options);
    return formatToolResponse(result);
  },

  reconstructive_memory_stats: async (ctx) => {
    return formatToolResponse(ctx.reconstructiveMemory().stats());
  },

  // ==================== RELATION CONSOLIDATION HANDLERS (memoryjs v3.0.0) ====================
  analyze_relation_duplicates: async (ctx) => {
    const consolidator = new RelationConsolidator(ctx.relationManager, ctx.entityManager, {
      embedding: ctx.semanticSearch?.getEmbeddingService(),
    });
    const report = await consolidator.analyze();
    return formatToolResponse(report);
  },

  consolidate_relations: async (ctx, args) => {
    const apply = args.apply !== undefined
      ? validateWithSchema(args.apply, z.boolean(), 'Invalid apply flag')
      : false;
    const consolidator = new RelationConsolidator(ctx.relationManager, ctx.entityManager, {
      embedding: ctx.semanticSearch?.getEmbeddingService(),
    });
    const result = await consolidator.consolidate({ apply });
    return formatToolResponse(result);
  },

  // ==================== AGENT REFLECTION HANDLERS (memoryjs v3.0.0) ====================
  create_reflection: async (ctx, args) => {
    const parsed = validateWithSchema(
      args,
      z.object({
        scope: z.enum(['session', 'project', 'global']),
        summary: z.string().min(1),
        evidence: z.array(z.string().min(1)).min(1),
        generalizationConfidence: z.number().min(0).max(1),
        keyInsights: z.array(z.string().min(1)).max(5).optional(),
        experienceType: z.string().min(1).optional(),
        sourceSessionId: z.string().min(1).optional(),
        sourceProjectId: z.string().min(1).optional(),
        importance: z.number().optional(),
        agentId: z.string().min(1).optional(),
      }).strict(),
      'Invalid reflection input'
    );
    const reflection = await ctx.reflectionManager.create(
      {
        scope: parsed.scope,
        summary: parsed.summary,
        evidence: parsed.evidence,
        generalization_confidence: parsed.generalizationConfidence,
        keyInsights: parsed.keyInsights,
        experienceType: parsed.experienceType,
        sourceSessionId: parsed.sourceSessionId,
        sourceProjectId: parsed.sourceProjectId,
      },
      { importance: parsed.importance, agentId: parsed.agentId }
    );
    return formatToolResponse({ reflection });
  },

  list_reflections: async (ctx, args) => {
    const options = validateWithSchema(
      args,
      z.object({
        scope: z.enum(['session', 'project', 'global']).optional(),
        sourceSessionId: z.string().min(1).optional(),
        sourceProjectId: z.string().min(1).optional(),
        minConfidence: z.number().min(0).max(1).optional(),
        includeArchived: z.boolean().optional(),
        limit: z.number().int().positive().max(1000).optional(),
      }).strict(),
      'Invalid list options'
    );
    const reflections = await ctx.reflectionManager.list(options);
    return formatToolResponse({ reflections, count: reflections.length });
  },

  get_relevant_reflections: async (ctx, args) => {
    const sessionId = validateWithSchema(args.sessionId, z.string().min(1), 'Invalid sessionId');
    const options = validateWithSchema(
      {
        sessionEntityNames: args.sessionEntityNames,
        minConfidence: args.minConfidence,
        limit: args.limit,
      },
      z.object({
        sessionEntityNames: z.array(z.string().min(1)).optional(),
        minConfidence: z.number().min(0).max(1).optional(),
        limit: z.number().int().positive().max(1000).optional(),
      }),
      'Invalid relevance options'
    );
    const reflections = await ctx.reflectionManager.getRelevantForSession(sessionId, options);
    return formatToolResponse({ sessionId, reflections, count: reflections.length });
  },

  archive_reflection: async (ctx, args) => {
    const id = validateWithSchema(args.id, z.string().min(1), 'Invalid reflection id');
    const result = await ctx.reflectionManager.archive(id);
    return formatToolResponse(result);
  },

  // ==================== RECONSTRUCTIVE MEMORY PERSISTENCE HANDLERS (memoryjs v3.0.0) ====================
  save_reconstructive_memory: async (ctx) => {
    const rm = ctx.reconstructiveMemory();
    const snapshot = rm.toSnapshot();
    const sidecarPath = reconstructiveSidecarPath(ctx);
    await fs.writeFile(sidecarPath, JSON.stringify(snapshot), 'utf-8');
    return formatToolResponse({ path: sidecarPath, stats: rm.stats() });
  },

  load_reconstructive_memory: async (ctx) => {
    const sidecarPath = reconstructiveSidecarPath(ctx);
    let raw: string;
    try {
      raw = await fs.readFile(sidecarPath, 'utf-8');
    } catch {
      throw new Error(
        `No reconstructive memory snapshot at "${sidecarPath}" — run save_reconstructive_memory first`
      );
    }
    const snapshot = validateWithSchema(
      JSON.parse(raw),
      z.object({
        cues: z.array(z.unknown()),
        tags: z.array(z.unknown()),
        contents: z.array(z.unknown()),
        triples: z.array(z.unknown()),
      }),
      `Invalid reconstructive memory snapshot at "${sidecarPath}"`
    ) as CTCGraphSnapshot;
    const rm = ctx.reconstructiveMemory();
    rm.loadSnapshot(snapshot);
    return formatToolResponse({ path: sidecarPath, stats: rm.stats() });
  },
};

/**
 * Handle a tool call by dispatching to the appropriate handler.
 *
 * @param name - Tool name to call
 * @param args - Tool arguments
 * @param ctx - Manager context with all manager instances
 * @returns Tool response (includes isError: true on failure)
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ManagerContext
): Promise<ToolResponse> {
  const handler = toolHandlers[name];
  if (!handler) {
    return {
      content: [{ type: 'text' as const, text: `Error: Unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    return await handler(ctx, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text' as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
}
