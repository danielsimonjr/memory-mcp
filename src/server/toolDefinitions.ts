/**
 * MCP Tool Definitions
 *
 * Extracted from MCPServer.ts to reduce file size and improve maintainability.
 * Contains all 235 tool schemas for the Knowledge Graph MCP Server.
 *
 * @module server/toolDefinitions
 */

/**
 * Tool definition type matching MCP SDK expectations.
 */
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

/**
 * All tool definitions for the Knowledge Graph MCP Server.
 * Organized by category for easier maintenance.
 */
export const toolDefinitions: ToolDefinition[] = [
  // ==================== ENTITY TOOLS ====================
  {
    name: 'create_entities',
    description: 'Create multiple new entities in the knowledge graph. Supports v1.6 freshness (ttl/confidence), v1.8 project scoping, and η.4.4 bitemporal validity (validFrom/validUntil/observationMeta).',
    inputSchema: {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'The name of the entity' },
              entityType: { type: 'string', description: 'The type of the entity' },
              observations: {
                type: 'array',
                items: { type: 'string' },
                description: 'An array of observation contents associated with the entity',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional lowercase tags for categorization',
              },
              importance: {
                type: 'number',
                minimum: 0,
                maximum: 10,
                description: 'Optional importance score (0-10) for prioritization',
              },
              parentId: {
                type: 'string',
                description: 'Optional parent entity name for hierarchical nesting',
              },
              ttl: {
                type: 'number',
                description: 'v1.6 freshness — seconds until entity is considered stale',
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'v1.6 freshness — belief strength [0, 1]',
              },
              projectId: {
                type: 'string',
                description: 'v1.8 project scope identifier',
              },
              validFrom: {
                type: 'string',
                description: 'η.4.4 ISO 8601 — entity is valid from this instant. Absent ⇒ always valid since creation.',
              },
              validUntil: {
                type: 'string',
                description: 'η.4.4 ISO 8601 — entity is valid until this instant. Absent ⇒ still valid.',
              },
              observationMeta: {
                type: 'array',
                description: 'η.4.4 per-observation temporal metadata; indexed parallel to observations[] by content match',
                items: {
                  type: 'object',
                  properties: {
                    content: { type: 'string', description: 'Matches an entry in observations[] by exact content' },
                    validFrom: { type: 'string' },
                    validUntil: { type: 'string' },
                    recordedAt: { type: 'string', description: 'Bitemporal axis — when the fact was recorded' },
                  },
                  required: ['content'],
                  additionalProperties: false,
                },
              },
            },
            required: ['name', 'entityType', 'observations'],
            additionalProperties: false,
          },
        },
      },
      required: ['entities'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_entities',
    description: 'Delete multiple entities from the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        entityNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'An array of entity names to delete',
        },
      },
      required: ['entityNames'],
      additionalProperties: false,
    },
  },
  {
    name: 'read_graph',
    description: 'Read the entire knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'open_nodes',
    description: 'Open specific nodes by their names',
    inputSchema: {
      type: 'object',
      properties: {
        names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of entity names to retrieve',
        },
      },
      required: ['names'],
      additionalProperties: false,
    },
  },

  // Phase 13: Project scoping + memory versioning tools
  {
    name: 'list_projects',
    description: 'List all distinct project IDs in the knowledge graph. Returns sorted array of projectId values, excluding global/unscoped entities.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'get_entity_versions',
    description: 'Get the latest version of an entity. If the entity has been superseded by newer versions (via contradiction detection), returns the most recent one.',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Name of any entity in the version chain' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_version_chain',
    description: 'Get all versions of an entity in its version chain. Returns versions sorted by version number ascending. Works from any entity in the chain (resolves to root automatically).',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Name of any entity in the version chain' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },

  // ==================== RELATION TOOLS ====================
  {
    name: 'create_relations',
    description:
      'Create multiple new relations between entities in the knowledge graph. Relations should be in active voice',
    inputSchema: {
      type: 'object',
      properties: {
        relations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'The name of the entity where the relation starts' },
              to: { type: 'string', description: 'The name of the entity where the relation ends' },
              relationType: {
                type: 'string',
                description: "The type of the relation in active voice (e.g., 'works_at', 'knows')",
              },
            },
            required: ['from', 'to', 'relationType'],
            additionalProperties: false,
          },
        },
      },
      required: ['relations'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_relations',
    description: 'Delete multiple relations from the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        relations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              relationType: { type: 'string' },
            },
            required: ['from', 'to', 'relationType'],
            additionalProperties: false,
          },
        },
      },
      required: ['relations'],
      additionalProperties: false,
    },
  },

  // Phase 13: Temporal knowledge graph tools
  {
    name: 'invalidate_relation',
    description: 'Mark a relation as no longer valid. Sets the validUntil timestamp on the matching active relation. Use for temporal facts that have ended (e.g., "Kai no longer works on Orion").',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Source entity name' },
        relationType: { type: 'string', description: 'Relation type (e.g., works_on, assigned_to)' },
        to: { type: 'string', description: 'Target entity name' },
        ended: { type: 'string', description: 'ISO 8601 date when the relation ended. Defaults to now.' },
      },
      required: ['from', 'relationType', 'to'],
      additionalProperties: false,
    },
  },
  {
    name: 'query_as_of',
    description: 'Query relations valid at a specific point in time. Returns only relations where validFrom <= date AND (validUntil is undefined OR validUntil >= date). Time-travel query for temporal knowledge graphs.',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Entity to query relations for' },
        asOf: { type: 'string', description: 'ISO 8601 date to query at (e.g., "2026-01-15")' },
        direction: { type: 'string', enum: ['outgoing', 'incoming', 'both'], description: 'Relation direction filter. Default: both.' },
      },
      required: ['entityName', 'asOf'],
      additionalProperties: false,
    },
  },
  {
    name: 'timeline',
    description: 'Get chronological relation history for an entity. Returns ALL relations (current and expired) sorted by validFrom ascending. Shows the full story of an entity over time.',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Entity to get timeline for' },
        direction: { type: 'string', enum: ['outgoing', 'incoming', 'both'], description: 'Relation direction filter. Default: both.' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },

  // ==================== OBSERVATION TOOLS ====================
  {
    name: 'add_observations',
    description: 'Add new observations to existing entities in the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        observations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityName: { type: 'string', description: 'The name of the entity to add observations to' },
              contents: {
                type: 'array',
                items: { type: 'string' },
                description: 'An array of observation contents to add',
              },
            },
            required: ['entityName', 'contents'],
            additionalProperties: false,
          },
        },
      },
      required: ['observations'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_observations',
    description: 'Delete specific observations from entities',
    inputSchema: {
      type: 'object',
      properties: {
        deletions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityName: { type: 'string' },
              observations: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['entityName', 'observations'],
          },
        },
      },
      required: ['deletions'],
      additionalProperties: false,
    },
  },
  // Phase 11 Sprint 5: Observation Normalization
  {
    name: 'normalize_observations',
    description: 'Normalize entity observations by resolving pronouns and anchoring relative dates. Improves search matching quality.',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: {
          type: 'string',
          description: 'Entity name to normalize (omit for all entities)',
        },
        options: {
          type: 'object',
          properties: {
            resolveCoreferences: { type: 'boolean', default: true },
            anchorTimestamps: { type: 'boolean', default: true },
            extractKeywords: { type: 'boolean', default: false },
          },
          additionalProperties: false,
        },
        persist: {
          type: 'boolean',
          default: false,
          description: 'Save normalized observations to storage',
        },
      },
      additionalProperties: false,
    },
  },

  // ==================== SEARCH TOOLS ====================
  {
    name: 'search_nodes',
    description:
      'Search for nodes in the knowledge graph based on query string, with optional tag and importance filtering',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional array of tags to filter by',
        },
        minImportance: { type: 'number', description: 'Optional minimum importance score (0-10)' },
        maxImportance: { type: 'number', description: 'Optional maximum importance score (0-10)' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_by_date_range',
    description: 'Search entities within a date range, with optional filtering by entity type and tags. At least one of startDate or endDate should be provided.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in ISO 8601 format' },
        endDate: { type: 'string', description: 'End date in ISO 8601 format' },
        entityType: { type: 'string', description: 'Optional entity type to filter by' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional array of tags to filter by',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'search_nodes_ranked',
    description: 'Perform TF-IDF ranked search',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        tags: { type: 'array', items: { type: 'string' } },
        minImportance: { type: 'number' },
        maxImportance: { type: 'number' },
        limit: { type: 'number', description: 'Max results' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'boolean_search',
    description: 'Perform boolean search with AND, OR, NOT operators',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Boolean query (e.g., 'alice AND bob')" },
        tags: { type: 'array', items: { type: 'string' } },
        minImportance: { type: 'number' },
        maxImportance: { type: 'number' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'fuzzy_search',
    description: 'Perform fuzzy search with typo tolerance',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        threshold: { type: 'number', description: 'Similarity threshold (0.0-1.0)' },
        tags: { type: 'array', items: { type: 'string' } },
        minImportance: { type: 'number' },
        maxImportance: { type: 'number' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_search_suggestions',
    description: 'Get search suggestions for a query',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        maxSuggestions: { type: 'number', description: 'Max suggestions to return' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  // Phase 10 Sprint 4: Automatic search method selection
  {
    name: 'search_auto',
    description: 'Automatically select and execute the best search method based on query characteristics and graph size. Returns results along with the selected method and reasoning.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Maximum results to return (default: 10)' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  // Phase 13: Semantic forget
  {
    name: 'forget_memory',
    description: 'Forget (delete) observations matching the given content. Tries exact match first; falls back to semantic search at 0.85 similarity threshold if available. Supports dryRun to preview what would be deleted.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The content to forget (observation text)' },
        threshold: { type: 'number', description: 'Semantic similarity threshold for fallback (default: 0.85)' },
        projectId: { type: 'string', description: 'Optional project scope filter' },
        dryRun: { type: 'boolean', description: 'If true, return what would be deleted without actually deleting' },
      },
      required: ['content'],
      additionalProperties: false,
    },
  },
  // Phase 11 Sprint 2: Hybrid Search
  {
    name: 'hybrid_search',
    description:
      'Search using combined semantic, lexical, and metadata signals. Provides better recall than single-signal search by fusing multiple relevance signals. v3 additive options: graphWeight adds a graph-connectivity (PageRank) channel, expandNeighbors appends one-hop neighbors of top results, explain annotates results with evidence paths from query anchors, lookFor ranks expansion neighbors by a free-text connection description.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text',
        },
        weights: {
          type: 'object',
          description: 'Layer weights (automatically normalized to sum to 1.0)',
          properties: {
            semantic: {
              type: 'number',
              description: 'Weight for semantic/embedding similarity (default: 0.5)',
            },
            lexical: {
              type: 'number',
              description: 'Weight for keyword/TF-IDF matching (default: 0.3)',
            },
            symbolic: {
              type: 'number',
              description: 'Weight for metadata filtering (default: 0.2)',
            },
          },
          additionalProperties: false,
        },
        filters: {
          type: 'object',
          description: 'Symbolic/metadata filters',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags',
            },
            entityTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by entity types',
            },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', description: 'Start date (ISO 8601)' },
                end: { type: 'string', description: 'End date (ISO 8601)' },
              },
              additionalProperties: false,
            },
            minImportance: { type: 'number', description: 'Minimum importance score (0-10)' },
            maxImportance: { type: 'number', description: 'Maximum importance score (0-10)' },
          },
          additionalProperties: false,
        },
        limit: { type: 'number', description: 'Maximum results to return (default: 10)' },
        graphWeight: {
          type: 'number',
          description: 'Weight for the graph-connectivity channel (normalized PageRank). 0/omitted = channel disabled (default)',
        },
        expandNeighbors: {
          type: 'object',
          description: 'One-hop neighbor expansion: neighbors of the top-K results are appended with a damped score and re-sorted',
          properties: {
            topK: { type: 'number', description: 'Number of top-ranked results to expand from (default: 10)' },
            damping: { type: 'number', description: "Damping factor applied to the parent's combined score (default: 0.3)" },
          },
          additionalProperties: false,
        },
        explain: {
          type: 'boolean',
          description: 'Annotate each result with evidencePaths — graph paths connecting query anchor matches to the result (default: false)',
        },
        lookFor: {
          type: 'string',
          description: 'Free-text description of the desired connection; expansion neighbors are ranked by similarity to it (lookForScore)',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  // Phase 11 Sprint 3: Query Analysis
  {
    name: 'analyze_query',
    description:
      'Analyze a search query to extract entities, temporal references, question type, and complexity. Useful for understanding query structure before searching.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The query to analyze',
        },
        includePlan: {
          type: 'boolean',
          description: 'Include execution plan in response (default: false)',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  // Phase 11 Sprint 4: Smart Search
  {
    name: 'smart_search',
    description:
      'Intelligent search with automatic query planning and reflection-based refinement. Iteratively improves results until adequate.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text',
        },
        maxIterations: {
          type: 'number',
          description: 'Maximum reflection iterations (default: 3)',
        },
        adequacyThreshold: {
          type: 'number',
          description: 'Adequacy threshold 0-1 (default: 0.7)',
        },
        includePlan: {
          type: 'boolean',
          description: 'Include execution plan in response (default: true)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 10)',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  // ==================== SAVED SEARCH TOOLS ====================
  {
    name: 'save_search',
    description: 'Save a search query for later reuse',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the saved search' },
        query: { type: 'string', description: 'Search query' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags filter' },
        minImportance: { type: 'number', description: 'Optional minimum importance' },
        maxImportance: { type: 'number', description: 'Optional maximum importance' },
        description: { type: 'string', description: 'Optional description of the search' },
      },
      required: ['name', 'query'],
      additionalProperties: false,
    },
  },
  {
    name: 'execute_saved_search',
    description: 'Execute a previously saved search by name',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the saved search' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_saved_searches',
    description: 'List all saved searches',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'delete_saved_search',
    description: 'Delete a saved search',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the saved search to delete' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_saved_search',
    description: 'Update a saved search',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the saved search' },
        updates: { type: 'object', description: 'Fields to update' },
      },
      required: ['name', 'updates'],
      additionalProperties: false,
    },
  },

  // ==================== TAG TOOLS ====================
  {
    name: 'add_tags',
    description: 'Add tags to an entity',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Name of the entity' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Array of tags to add' },
      },
      required: ['entityName', 'tags'],
      additionalProperties: false,
    },
  },
  {
    name: 'remove_tags',
    description: 'Remove tags from an entity',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Name of the entity' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Array of tags to remove' },
      },
      required: ['entityName', 'tags'],
      additionalProperties: false,
    },
  },
  {
    name: 'set_importance',
    description: 'Set the importance score of an entity (0-10)',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Name of the entity' },
        importance: { type: 'number', description: 'Importance score between 0 and 10' },
      },
      required: ['entityName', 'importance'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_tags_to_multiple_entities',
    description: 'Add the same tags to multiple entities at once',
    inputSchema: {
      type: 'object',
      properties: {
        entityNames: { type: 'array', items: { type: 'string' }, description: 'Array of entity names' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Array of tags to add to all entities' },
      },
      required: ['entityNames', 'tags'],
      additionalProperties: false,
    },
  },
  {
    name: 'replace_tag',
    description: 'Replace a tag with a new tag across all entities',
    inputSchema: {
      type: 'object',
      properties: {
        oldTag: { type: 'string', description: 'The tag to replace' },
        newTag: { type: 'string', description: 'The new tag' },
      },
      required: ['oldTag', 'newTag'],
      additionalProperties: false,
    },
  },
  {
    name: 'merge_tags',
    description: 'Merge two tags into a target tag across all entities',
    inputSchema: {
      type: 'object',
      properties: {
        tag1: { type: 'string', description: 'First tag to merge' },
        tag2: { type: 'string', description: 'Second tag to merge' },
        targetTag: { type: 'string', description: 'Target tag to merge into' },
      },
      required: ['tag1', 'tag2', 'targetTag'],
      additionalProperties: false,
    },
  },

  // ==================== TAG ALIAS TOOLS ====================
  {
    name: 'add_tag_alias',
    description: 'Add a tag alias (synonym mapping)',
    inputSchema: {
      type: 'object',
      properties: {
        alias: { type: 'string', description: 'The alias/synonym' },
        canonical: { type: 'string', description: 'The canonical tag' },
        description: { type: 'string', description: 'Optional description' },
      },
      required: ['alias', 'canonical'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_tag_aliases',
    description: 'List all tag aliases',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'remove_tag_alias',
    description: 'Remove a tag alias',
    inputSchema: {
      type: 'object',
      properties: {
        alias: { type: 'string', description: 'The alias to remove' },
      },
      required: ['alias'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_aliases_for_tag',
    description: 'Get all aliases for a canonical tag',
    inputSchema: {
      type: 'object',
      properties: {
        canonicalTag: { type: 'string', description: 'The canonical tag' },
      },
      required: ['canonicalTag'],
      additionalProperties: false,
    },
  },
  {
    name: 'resolve_tag',
    description: 'Resolve a tag to its canonical form',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'Tag to resolve' },
      },
      required: ['tag'],
      additionalProperties: false,
    },
  },

  // ==================== HIERARCHY TOOLS ====================
  {
    name: 'set_entity_parent',
    description: 'Set the parent of an entity for hierarchical organization',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string' },
        parentName: { type: ['string', 'null'], description: 'Parent entity name or null to remove parent' },
      },
      required: ['entityName', 'parentName'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_children',
    description: 'Get all child entities of an entity',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_parent',
    description: 'Get the parent entity of an entity',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_ancestors',
    description: 'Get all ancestor entities of an entity',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_descendants',
    description: 'Get all descendant entities of an entity',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_subtree',
    description: 'Get entity and all its descendants as a subgraph',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_root_entities',
    description: 'Get all root entities (entities without parents)',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_entity_depth',
    description: 'Get the depth of an entity in the hierarchy',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'move_entity',
    description: 'Move an entity to a new parent',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string' },
        newParentName: { type: ['string', 'null'] },
      },
      required: ['entityName', 'newParentName'],
      additionalProperties: false,
    },
  },

  // ==================== ANALYTICS TOOLS ====================
  {
    name: 'get_graph_stats',
    description: 'Get statistics about the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'validate_graph',
    description: 'Validate the knowledge graph for integrity issues',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },

  // ==================== COMPRESSION TOOLS ====================
  {
    name: 'find_duplicates',
    description: 'Find potential duplicate entities based on similarity',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: 'Similarity threshold (0.0-1.0)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'merge_entities',
    description: 'Merge multiple entities into one',
    inputSchema: {
      type: 'object',
      properties: {
        entityNames: { type: 'array', items: { type: 'string' }, description: 'Entities to merge' },
        targetName: { type: 'string', description: 'Optional target entity name' },
      },
      required: ['entityNames'],
      additionalProperties: false,
    },
  },
  {
    name: 'compress_graph',
    description: 'Compress the graph by merging similar entities',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: 'Similarity threshold' },
        dryRun: { type: 'boolean', description: 'Preview without applying changes' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'archive_entities',
    description: 'Archive old or low-importance entities',
    inputSchema: {
      type: 'object',
      properties: {
        olderThan: { type: 'string', description: 'Archive entities older than this date (ISO 8601)' },
        importanceLessThan: { type: 'number', description: 'Archive entities below this importance' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Archive entities with these tags' },
        dryRun: { type: 'boolean', description: 'Preview without applying changes' },
      },
      additionalProperties: false,
    },
  },

  // ==================== GRAPH ALGORITHM TOOLS (Phase 4 Sprint 9) ====================
  {
    name: 'find_shortest_path',
    description: 'Find the shortest path between two entities in the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source entity name' },
        target: { type: 'string', description: 'Target entity name' },
        direction: {
          type: 'string',
          enum: ['outgoing', 'incoming', 'both'],
          description: 'Direction of traversal (default: both)',
        },
        relationTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional filter for relation types to follow',
        },
      },
      required: ['source', 'target'],
      additionalProperties: false,
    },
  },
  {
    name: 'find_all_paths',
    description: 'Find all paths between two entities up to a maximum depth',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source entity name' },
        target: { type: 'string', description: 'Target entity name' },
        maxDepth: { type: 'number', description: 'Maximum path length (default: 5)' },
        direction: {
          type: 'string',
          enum: ['outgoing', 'incoming', 'both'],
          description: 'Direction of traversal (default: both)',
        },
        relationTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional filter for relation types to follow',
        },
      },
      required: ['source', 'target'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_connected_components',
    description: 'Find all connected components in the knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_centrality',
    description: 'Calculate centrality metrics for entities in the graph',
    inputSchema: {
      type: 'object',
      properties: {
        algorithm: {
          type: 'string',
          enum: ['degree', 'betweenness', 'pagerank'],
          description: 'Centrality algorithm to use (default: degree)',
        },
        direction: {
          type: 'string',
          enum: ['in', 'out', 'both'],
          description: 'Direction for degree centrality (default: both)',
        },
        topN: { type: 'number', description: 'Number of top entities to return (default: 10)' },
        dampingFactor: { type: 'number', description: 'Damping factor for PageRank (default: 0.85)' },
        approximate: {
          type: 'boolean',
          description: 'Use approximation for faster betweenness centrality (default: false)',
        },
        sampleRate: {
          type: 'number',
          description: 'Sample rate for approximation (0.0-1.0, default: 0.2)',
          minimum: 0.01,
          maximum: 1.0,
        },
      },
      additionalProperties: false,
    },
  },

  // ==================== IMPORT/EXPORT TOOLS ====================
  {
    name: 'import_graph',
    description: 'Import knowledge graph from various formats',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['json', 'csv', 'graphml'] },
        data: { type: 'string', description: 'Import data as string' },
        mergeStrategy: {
          type: 'string',
          enum: ['replace', 'skip', 'merge', 'fail'],
          description: 'How to handle conflicts',
        },
        dryRun: { type: 'boolean', description: 'Preview without applying changes' },
      },
      required: ['format', 'data'],
      additionalProperties: false,
    },
  },
  {
    name: 'export_graph',
    description: 'Export knowledge graph in various formats with optional brotli compression and streaming for large graphs. Supports W3C Linked Data formats (turtle, rdf-xml, json-ld) added in η.5.4.',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['json', 'csv', 'graphml', 'gexf', 'dot', 'markdown', 'mermaid', 'turtle', 'rdf-xml', 'json-ld'],
          description: 'Export format. W3C Linked Data: turtle (RDF 1.1 Turtle), rdf-xml (RDF 1.1 XML with Statement reification for non-NCName predicates), json-ld (JSON-LD 1.1 with @context mapping to RDFS + DCTerms).',
        },
        redactPii: {
          type: 'boolean',
          default: false,
          description: 'When true, scrub PII (email/SSN/credit-card/phone/IPv4) from observations before export. Uses η.6.3 PiiRedactor with default pattern bank.',
        },
        filter: {
          type: 'object',
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            entityType: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          description: 'Optional filter',
        },
        compress: {
          type: 'boolean',
          description: 'Compress output with brotli (auto-enabled for >100KB)',
          default: false,
        },
        compressionQuality: {
          type: 'number',
          description: 'Brotli quality level 0-11 (default: 6). Higher = better compression but slower.',
          minimum: 0,
          maximum: 11,
          default: 6,
        },
        streaming: {
          type: 'boolean',
          description: 'Use streaming mode to write directly to file (requires outputPath)',
          default: false,
        },
        outputPath: {
          type: 'string',
          description: 'File path for streaming export. Auto-enables streaming for graphs with >= 5000 entities.',
        },
      },
      required: ['format'],
      additionalProperties: false,
    },
  },

  // Phase 13: Conversation ingestion tool
  {
    name: 'ingest',
    description: 'Ingest pre-normalized conversation data into the knowledge graph. Chunks messages by exchange pairs (user+assistant), creates entities with verbatim observations. Format-agnostic: normalize chat exports before calling.',
    inputSchema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'assistant', 'system'] },
              content: { type: 'string' },
              timestamp: { type: 'string', description: 'Optional ISO 8601 timestamp' },
            },
            required: ['role', 'content'],
          },
          description: 'Array of conversation messages to ingest',
        },
        source: { type: 'string', description: 'Source identifier (e.g., filename, session ID)' },
        projectId: { type: 'string', description: 'Project to scope ingested entities to' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to apply to all created entities' },
        chunkBy: { type: 'string', enum: ['exchange', 'paragraph', 'fixed'], description: 'Chunking strategy. Default: exchange (user+assistant pairs).' },
        dryRun: { type: 'boolean', description: 'Preview without creating entities' },
      },
      required: ['messages'],
      additionalProperties: false,
    },
  },

  // ==================== SEMANTIC SEARCH TOOLS (Phase 4 Sprint 12) ====================
  {
    name: 'semantic_search',
    description: 'Search for entities using semantic similarity. Requires embedding provider to be configured via MEMORY_EMBEDDING_PROVIDER.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        limit: { type: 'number', description: 'Maximum number of results (default: 10, max: 100)' },
        minSimilarity: {
          type: 'number',
          description: 'Minimum similarity score threshold (0.0-1.0, default: 0)',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'find_similar_entities',
    description: 'Find entities similar to a given entity using semantic similarity. Requires embedding provider.',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Name of entity to find similar entities for' },
        limit: { type: 'number', description: 'Maximum number of results (default: 10, max: 100)' },
        minSimilarity: {
          type: 'number',
          description: 'Minimum similarity score threshold (0.0-1.0, default: 0)',
        },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'index_embeddings',
    description: 'Index all entities for semantic search. Call this after adding entities to enable semantic search. Requires embedding provider.',
    inputSchema: {
      type: 'object',
      properties: {
        forceReindex: {
          type: 'boolean',
          description: 'Force re-indexing of all entities even if already indexed (default: false)',
        },
      },
      additionalProperties: false,
    },
  },

  // ==================== REF INDEX ====================
  {
    name: 'register_ref',
    description: 'Register a stable alias (ref) pointing to an entity name in the RefIndex for O(1) lookups',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Stable alias string to register' },
        entityName: { type: 'string', description: 'Entity name this ref resolves to' },
        description: { type: 'string', description: 'Optional human-readable description of this ref' },
      },
      required: ['ref', 'entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'resolve_ref',
    description: 'Resolve a stable alias (ref) to its entity name via the RefIndex',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Alias string to resolve' },
      },
      required: ['ref'],
      additionalProperties: false,
    },
  },
  {
    name: 'deregister_ref',
    description: 'Remove a stable alias (ref) from the RefIndex',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Alias string to deregister' },
      },
      required: ['ref'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_refs',
    description: 'List all registered refs in the RefIndex, optionally filtered by entity name',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Optional: filter refs by entity name' },
      },
      additionalProperties: false,
    },
  },

  // ==================== ARTIFACT ====================
  {
    name: 'create_artifact',
    description: 'Create an artifact entity (tool output, code snippet, API response, etc.) with a stable auto-generated ref',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Artifact content stored as an entity observation' },
        toolName: { type: 'string', description: 'Name of the tool or source that produced this artifact' },
        artifactType: {
          type: 'string',
          enum: ['tool_output', 'code_snippet', 'api_response', 'search_result', 'file_content', 'user_input'],
          description: 'Category of artifact for structured filtering',
        },
        description: { type: 'string', description: 'Optional human-readable description' },
        sessionId: { type: 'string', description: 'Optional session context for grouping related artifacts' },
      },
      required: ['content', 'toolName', 'artifactType'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_artifact',
    description: 'Retrieve an artifact entity by its stable ref or entity name',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Stable ref or entity name (e.g. "bash-2026-03-24-a3f2")' },
      },
      required: ['ref'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_artifacts',
    description: 'List all artifact entities, with optional filtering by tool name, type, or date',
    inputSchema: {
      type: 'object',
      properties: {
        toolName: { type: 'string', description: 'Filter by originating tool name' },
        artifactType: {
          type: 'string',
          enum: ['tool_output', 'code_snippet', 'api_response', 'search_result', 'file_content', 'user_input'],
          description: 'Filter by artifact category',
        },
        since: { type: 'string', description: 'Only return artifacts created at or after this ISO 8601 date' },
      },
      additionalProperties: false,
    },
  },

  // ==================== TEMPORAL SEARCH ====================
  {
    name: 'search_by_time',
    description: 'Search entities using a natural language time expression (e.g. "last week", "yesterday", "in January")',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language time expression to parse and search' },
        field: {
          type: 'string',
          enum: ['createdAt', 'lastModified', 'any'],
          description: 'Which timestamp field to filter on (default: any)',
        },
        includeUndated: {
          type: 'boolean',
          description: 'If true, treat entities with no timestamps as matching (default: false)',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  // ==================== DISTILLATION ====================
  {
    name: 'configure_distillation',
    description: 'Configure the distillation pipeline policy (default, noop, or none) that filters memories before context formatting',
    inputSchema: {
      type: 'object',
      properties: {
        policy: {
          type: 'string',
          enum: ['default', 'noop', 'none'],
          description: 'Policy to apply: default (relevance+freshness+dedup), noop (pass-through), none (clear pipeline)',
        },
      },
      required: ['policy'],
      additionalProperties: false,
    },
  },

  // ==================== FRESHNESS ====================
  {
    name: 'check_freshness',
    description: 'Calculate the freshness score (0–1) for a specific entity based on its TTL and confidence',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Name of the entity to check freshness for' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_stale_entities',
    description: 'Return all entities whose freshness score is below a threshold',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          description: 'Freshness threshold (0–1). Entities below this score are considered stale (default: 0.5)',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_expired_entities',
    description: 'Return all entities that have passed their TTL expiry',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'refresh_entity',
    description: 'Reset freshness for an entity by updating its creation timestamp to now and resetting confidence to 1.0',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Name of the entity to refresh' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'freshness_report',
    description: 'Generate a freshness report across all entities showing fresh, stale, and expired counts',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          description: 'Freshness threshold for fresh/stale categorisation (default: 0.5)',
        },
      },
      additionalProperties: false,
    },
  },

  // ==================== LLM QUERY PLANNER ====================
  {
    name: 'query_natural_language',
    description: 'Decompose a natural language query into a structured search plan and return matching entities',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language query to plan and execute' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  // ==================== GOVERNANCE ====================
  {
    name: 'set_governance_policy',
    description: 'Set the active governance policy controlling which write operations (create, update, delete) are permitted for future requests',
    inputSchema: {
      type: 'object',
      properties: {
        canCreate: { type: 'boolean', description: 'Whether entity creation is allowed (default: true)' },
        canUpdate: { type: 'boolean', description: 'Whether entity updates are allowed (default: true)' },
        canDelete: { type: 'boolean', description: 'Whether entity deletion is allowed (default: true)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'audit_query',
    description: 'Query the audit log for operations matching filter criteria (operation type, agent ID, entity name, date range)',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['create', 'update', 'delete', 'merge', 'archive'],
          description: 'Filter by operation type',
        },
        agentId: { type: 'string', description: 'Filter by agent identifier' },
        entityName: { type: 'string', description: 'Filter by entity name' },
        since: { type: 'string', description: 'Only entries at or after this ISO 8601 timestamp' },
        until: { type: 'string', description: 'Only entries at or before this ISO 8601 timestamp' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 50)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'audit_history',
    description: 'Get the full audit history for a specific entity in chronological order',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Name of the entity to retrieve audit history for' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'rollback_operation',
    description: 'Reverse a specific committed operation using its audit entry ID (restores entity to before-snapshot)',
    inputSchema: {
      type: 'object',
      properties: {
        auditEntryId: { type: 'string', description: 'ID of the audit entry to reverse' },
      },
      required: ['auditEntryId'],
      additionalProperties: false,
    },
  },

  // ==================== ROLE PROFILES ====================
  {
    name: 'set_agent_role',
    description: 'Apply a built-in role profile (researcher, planner, executor, reviewer, coordinator) to adjust salience weights and context budgets',
    inputSchema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['researcher', 'planner', 'executor', 'reviewer', 'default'],
          description: 'Role to apply to the agent memory system',
        },
      },
      required: ['role'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_role_profiles',
    description: 'List all built-in role profiles with their salience weight and context budget configurations',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },

  // ==================== ENTROPY FILTER ====================
  {
    name: 'enable_entropy_filter',
    description: 'Enable or disable the Shannon entropy gate that drops low-information memories during consolidation',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Whether to enable the entropy filter' },
        minEntropy: {
          type: 'number',
          description: 'Minimum entropy threshold in bits (default: 1.5). Higher = stricter filtering.',
        },
        minLength: {
          type: 'number',
          description: 'Minimum text length before entropy is evaluated (default: 10)',
        },
      },
      required: ['enabled'],
      additionalProperties: false,
    },
  },
  {
    name: 'compute_entropy',
    description: 'Compute the Shannon entropy of a text string (in bits per character)',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to compute entropy for' },
        minEntropy: {
          type: 'number',
          description: 'Optional: check if text passes this minimum entropy threshold',
        },
      },
      required: ['text'],
      additionalProperties: false,
    },
  },

  // ==================== CONSOLIDATION ====================
  {
    name: 'start_consolidation',
    description: 'Start the background consolidation scheduler that periodically deduplicates and merges memories',
    inputSchema: {
      type: 'object',
      properties: {
        intervalMs: {
          type: 'number',
          description: 'Interval between consolidation runs in milliseconds (default: 3600000 = 1 hour)',
        },
        autoMergeDuplicates: {
          type: 'boolean',
          description: 'Enable duplicate detection and merge after each consolidation (default: false)',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'stop_consolidation',
    description: 'Stop the background consolidation scheduler',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'run_consolidation_now',
    description: 'Run a consolidation cycle on demand, independently of the scheduled interval',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },

  // ==================== MEMORY FORMATTER ====================
  {
    name: 'format_with_salience_budget',
    description: 'Format memories for LLM prompt consumption with proportional token allocation based on salience scores',
    inputSchema: {
      type: 'object',
      properties: {
        entityNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of entities (memories) to format',
        },
        salienceScores: {
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Map of entityName → salience score (0–1) for proportional allocation',
        },
        totalTokenBudget: {
          type: 'number',
          description: 'Maximum total token budget for the formatted output',
        },
        header: { type: 'string', description: 'Optional header text to prepend' },
        separator: { type: 'string', description: 'Optional separator between memories (default: newline)' },
      },
      required: ['entityNames', 'salienceScores', 'totalTokenBudget'],
      additionalProperties: false,
    },
  },

  // ==================== COLLABORATIVE SYNTHESIS ====================
  {
    name: 'synthesize_collaborative_context',
    description: 'Synthesize context by traversing the graph neighbourhood from a seed entity and merging high-salience neighbors across agents',
    inputSchema: {
      type: 'object',
      properties: {
        seedEntityName: { type: 'string', description: 'Name of the entity to start traversal from' },
        maxDepth: { type: 'number', description: 'Maximum BFS depth to traverse from seed (default: 2)' },
        minNeighborSalience: {
          type: 'number',
          description: 'Minimum salience score for a neighbor to be included (default: 0.3)',
        },
        maxNeighbors: { type: 'number', description: 'Maximum number of neighbor entities to include (default: 20)' },
        queryText: { type: 'string', description: 'Optional query text for salience context scoring' },
        currentTask: { type: 'string', description: 'Optional current task identifier for salience context' },
      },
      required: ['seedEntityName'],
      additionalProperties: false,
    },
  },

  // ==================== FAILURE DISTILLATION ====================
  {
    name: 'distill_failure',
    description: 'Distill lessons from a failed session by tracing the causal chain and extracting actionable insights',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'ID of the failed session to analyze' },
        minLessonConfidence: {
          type: 'number',
          description: 'Minimum confidence required for a lesson to be persisted (default: 0.6)',
        },
        maxCauseChainLength: {
          type: 'number',
          description: 'Maximum depth to follow causal chains (default: 5)',
        },
      },
      required: ['sessionId'],
      additionalProperties: false,
    },
  },
  {
    name: 'end_session',
    description: 'End a session and trigger failure distillation if the session outcome was a failure',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'ID of the session to end' },
        outcome: {
          type: 'string',
          enum: ['success', 'failure', 'partial'],
          description: 'Outcome of the session',
        },
        distillFailures: {
          type: 'boolean',
          description: 'Whether to automatically distill lessons on failure outcome (default: true)',
        },
      },
      required: ['sessionId', 'outcome'],
      additionalProperties: false,
    },
  },

  // Phase 13: User profile + agent diary tools
  {
    name: 'get_profile',
    description: 'Get the user profile. Returns static facts (long-lived preferences) and dynamic facts (recent session context). Profiles are scoped by projectId.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Optional project scope. Omit for global profile.' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'update_profile',
    description: 'Add a fact to the user profile. Static facts are long-lived (preferences, role, tools). Dynamic facts are recent (current project, active work).',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The fact to add' },
        type: { type: 'string', enum: ['static', 'dynamic'], description: 'Fact type: static (long-lived) or dynamic (recent)' },
        projectId: { type: 'string', description: 'Optional project scope' },
      },
      required: ['content', 'type'],
      additionalProperties: false,
    },
  },
  {
    name: 'diary_write',
    description: 'Write a timestamped diary entry for a specialist agent. Each agent gets its own persistent diary (entity: diary-{agentId}). Use for code review findings, architecture decisions, ops incidents, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent identifier (e.g., reviewer, architect, ops). Alphanumeric + hyphens/underscores only.' },
        entry: { type: 'string', description: 'The diary entry content' },
        topic: { type: 'string', description: 'Optional topic tag for filtering (e.g., security, performance)' },
      },
      required: ['agentId', 'entry'],
      additionalProperties: false,
    },
  },
  {
    name: 'diary_read',
    description: 'Read recent diary entries for a specialist agent. Returns entries in reverse chronological order. Optionally filter by topic.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent identifier' },
        lastN: { type: 'number', description: 'Number of recent entries to return. Default: 10.' },
        topic: { type: 'string', description: 'Optional topic filter' },
      },
      required: ['agentId'],
      additionalProperties: false,
    },
  },

  // ==================== COGNITIVE LOAD ====================
  {
    name: 'analyze_cognitive_load',
    description: 'Analyze the cognitive load of a set of entities: token density, redundancy ratio, diversity score, and composite load score',
    inputSchema: {
      type: 'object',
      properties: {
        entityNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of entities to analyze',
        },
        loadThreshold: {
          type: 'number',
          description: 'Load score threshold above which context is considered overloaded (default: 0.7)',
        },
      },
      required: ['entityNames'],
      additionalProperties: false,
    },
  },
  {
    name: 'adaptive_reduce_memories',
    description: 'Adaptively reduce a set of memories until their cognitive load falls below the configured threshold by removing low-salience redundant memories',
    inputSchema: {
      type: 'object',
      properties: {
        entityNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of entities to reduce',
        },
        salienceScores: {
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Map of entityName → salience score (0–1) for prioritizing removal',
        },
        loadThreshold: {
          type: 'number',
          description: 'Target load threshold to reduce below (default: 0.7)',
        },
      },
      required: ['entityNames', 'salienceScores'],
      additionalProperties: false,
    },
  },

  // ==================== DREAM ENGINE TOOLS ====================
  {
    name: 'dream_start',
    description: 'Start the DreamEngine background memory maintenance. Runs 8 phases (temporal anchoring, freshness sweep, entropy pruning, consolidation, compression, entity enrichment, pattern promotion, graph hygiene) on a configurable interval.',
    inputSchema: {
      type: 'object',
      properties: {
        intervalMs: {
          type: 'number',
          description: 'Interval between dream cycles in milliseconds (default: 14400000 = 4 hours)',
        },
        runOnSessionEnd: {
          type: 'boolean',
          description: 'Run a dream cycle automatically when endSession() is called (default: true)',
        },
        maxDurationMs: {
          type: 'number',
          description: 'Hard limit on total cycle wall-clock time in milliseconds (default: 60000 = 60s)',
        },
        phases: {
          type: 'object',
          description: 'Per-phase enable/disable flags',
          properties: {
            temporalAnchoring: { type: 'boolean', description: 'Phase 1: Resolve relative date references to absolute ISO timestamps' },
            freshnessSweep: { type: 'boolean', description: 'Phase 2: Flag stale entities, decay confidence, expire TTL records' },
            entropyPruning: { type: 'boolean', description: 'Phase 3: Remove observations whose Shannon entropy is below threshold' },
            consolidation: { type: 'boolean', description: 'Phase 4: Merge working-memory items into long-term storage' },
            compression: { type: 'boolean', description: 'Phase 5: Deduplicate near-identical entities above similarity threshold' },
            entityEnrichment: { type: 'boolean', description: 'Phase 6: Auto-generate summary observations for entity enrichment' },
            patternPromotion: { type: 'boolean', description: 'Phase 7: Detect recurring observation themes and promote to semantic memory' },
            graphHygiene: { type: 'boolean', description: 'Phase 8: Orphan detection and dangling-relation cleanup' },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'dream_stop',
    description: 'Stop the DreamEngine background process.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'dream_run_now',
    description: 'Run a single dream cycle immediately. Returns detailed per-phase results.',
    inputSchema: {
      type: 'object',
      properties: {
        phases: {
          type: 'object',
          description: 'Per-phase enable/disable flags for this cycle',
          properties: {
            temporalAnchoring: { type: 'boolean', description: 'Phase 1: Resolve relative date references to absolute ISO timestamps' },
            freshnessSweep: { type: 'boolean', description: 'Phase 2: Flag stale entities, decay confidence, expire TTL records' },
            entropyPruning: { type: 'boolean', description: 'Phase 3: Remove observations whose Shannon entropy is below threshold' },
            consolidation: { type: 'boolean', description: 'Phase 4: Merge working-memory items into long-term storage' },
            compression: { type: 'boolean', description: 'Phase 5: Deduplicate near-identical entities above similarity threshold' },
            entityEnrichment: { type: 'boolean', description: 'Phase 6: Auto-generate summary observations for entity enrichment' },
            patternPromotion: { type: 'boolean', description: 'Phase 7: Detect recurring observation themes and promote to semantic memory' },
            graphHygiene: { type: 'boolean', description: 'Phase 8: Orphan detection and dangling-relation cleanup' },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },

  // Phase 13 (v12.3.2 backport): Active project scope. Mutable per-server state stored in a
  // WeakMap keyed on ManagerContext (see toolHandlers.ts projectScopeMap). Handlers that
  // want to apply the active scope may call getActiveProjectScope(ctx).
  {
    name: 'set_project_scope',
    description: 'Set the active project scope for this server session. New entities passed without an explicit projectId may be auto-stamped with this value by scope-aware handlers; pass an empty string to clear the scope. Returns { projectId } where projectId is the new active scope (null when cleared).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID to scope to. Empty string clears the active scope.' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_project_scope',
    description: 'Returns the active project scope for this server session (set via set_project_scope). Returns { projectId } where projectId is null when no scope is active.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },

  // ==================== SESSION & WORKING MEMORY TOOLS ====================
  {
    name: 'session_start',
    description: 'Start a new agent session via AgentMemoryManager. Tracks session lifecycle, enables working memory, and supports session chaining. Returns a SessionEntity with id and timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        taskDescription: { type: 'string', description: 'Description of the task for this session' },
        parentSessionId: { type: 'string', description: 'ID of a parent session to chain from' },
        metadata: { type: 'object', description: 'Arbitrary metadata to attach to the session' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'session_end',
    description: 'End an agent session via AgentMemoryManager with summary generation and working memory promotion. Unlike end_session (which handles failure distillation on graph entities), this manages the full agent session lifecycle.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID to end' },
        status: { type: 'string', enum: ['completed', 'abandoned'], description: 'Session completion status (default: completed)' },
      },
      required: ['sessionId'],
      additionalProperties: false,
    },
  },
  {
    name: 'session_checkpoint',
    description: 'Create a checkpoint snapshot of the current session state for later restore',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID to checkpoint' },
        name: { type: 'string', description: 'Optional human-readable name for the checkpoint' },
      },
      required: ['sessionId'],
      additionalProperties: false,
    },
  },
  {
    name: 'session_restore',
    description: 'Restore a session from a previously created checkpoint',
    inputSchema: {
      type: 'object',
      properties: {
        checkpointId: { type: 'string', description: 'The checkpoint ID to restore from' },
      },
      required: ['checkpointId'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_working_memory',
    description: 'Create a TTL-based short-term working memory entry scoped to a session. Working memories auto-expire and can be promoted to long-term storage.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID this memory belongs to' },
        content: { type: 'string', description: 'The memory content' },
        taskId: { type: 'string', description: 'Optional task ID for task-scoped memory' },
        importance: { type: 'number', description: 'Importance score (0-10)' },
        ttlHours: { type: 'number', description: 'Time-to-live in hours (default: 24)' },
      },
      required: ['sessionId', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'promote_working_memory',
    description: 'Promote a working memory entry to long-term episodic or semantic storage',
    inputSchema: {
      type: 'object',
      properties: {
        memoryName: { type: 'string', description: 'Name of the working memory entity to promote' },
        targetType: { type: 'string', enum: ['episodic', 'semantic'], description: 'Target memory type (default: episodic)' },
      },
      required: ['memoryName'],
      additionalProperties: false,
    },
  },
  {
    name: 'confirm_memory',
    description: 'Boost a memory\'s confidence score without resetting its timestamp. Unlike refresh_entity (which resets to 1.0), this incrementally increases confidence.',
    inputSchema: {
      type: 'object',
      properties: {
        memoryName: { type: 'string', description: 'Name of the memory entity to confirm' },
        confidenceBoost: { type: 'number', description: 'Amount to boost confidence by (default: 0.1)' },
      },
      required: ['memoryName'],
      additionalProperties: false,
    },
  },
  {
    name: 'clear_expired_memories',
    description: 'Remove all working memories that have exceeded their TTL. Complements get_expired_entities (which lists but does not delete).',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'wake_up',
    description: 'Initialize a 4-layer memory stack context (~600 tokens). L0 loads profile identity, L1 loads top entities by importance. Returns a compact boot context for LLM consumption.',
    inputSchema: {
      type: 'object',
      properties: {
        compress: { type: 'boolean', description: 'Apply n-gram compression to reduce token count (default: false)' },
      },
      additionalProperties: false,
    },
  },

  // ==================== AUTO-ENHANCEMENT TOOLS ====================
  {
    name: 'auto_link_observations',
    description: 'Detect entity mentions in observation text and suggest cross-reference relations. Unlike normalize_observations (which resolves pronouns/dates), this finds entity name mentions.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Observation text to scan for entity mentions' },
      },
      required: ['text'],
      additionalProperties: false,
    },
  },
  {
    name: 'extract_facts',
    description: 'Extract structured facts from observation text using rule-based extraction',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to extract facts from' },
      },
      required: ['text'],
      additionalProperties: false,
    },
  },
  {
    name: 'detect_contradictions',
    description: 'Find conflicting observations within an entity using semantic similarity',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Entity to check for contradictions' },
        threshold: { type: 'number', description: 'Similarity threshold for contradiction detection (0-1, default: 0.85)', minimum: 0, maximum: 1 },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'consolidate_session',
    description: 'Run the full ConsolidationPipeline on a session: promote working memory, merge duplicates, summarize, and extract patterns. Unlike run_consolidation_now (which runs the dedup scheduler), this is a comprehensive session-scoped pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID to consolidate' },
      },
      required: ['sessionId'],
      additionalProperties: false,
    },
  },
  {
    name: 'detect_patterns',
    description: 'Detect recurring token-based patterns across observations of a given entity type',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: { type: 'string', description: 'Entity type to analyze for patterns' },
        minOccurrences: { type: 'number', description: 'Minimum occurrences to qualify as a pattern (default: 3)' },
      },
      required: ['entityType'],
      additionalProperties: false,
    },
  },
  {
    name: 'summarize_entity',
    description: 'Auto-summarize redundant observations within a single entity. Unlike compress_graph (which merges similar entities), this condenses observations within one entity.',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Entity whose observations to summarize' },
        threshold: { type: 'number', description: 'Similarity threshold for merging observations (0-1)', minimum: 0, maximum: 1 },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'priority_dedup',
    description: 'Smart priority-based deduplication that keeps the highest-scored entity per duplicate group (importance > recency > observation count > tags)',
    inputSchema: {
      type: 'object',
      properties: {
        dryRun: { type: 'boolean', description: 'If true, report what would be deduplicated without making changes' },
      },
      additionalProperties: false,
    },
  },

  // ==================== CONTEXT COMPRESSION TOOLS ====================
  {
    name: 'compress_context',
    description: 'Compress text using n-gram abbreviation with a legend for token-efficient context loading. Unlike format_with_salience_budget (which allocates token budget), this does text-level compression.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to compress' },
        level: { type: 'string', enum: ['light', 'medium', 'aggressive'], description: 'Compression level (default: medium)' },
      },
      required: ['text'],
      additionalProperties: false,
    },
  },

  // ==================== DECAY & SALIENCE TOOLS ====================
  {
    name: 'run_decay_cycle',
    description: 'Run a single pass of time-based importance decay across all agent memories. Returns count of decayed and forgotten memories.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_decayed_memories',
    description: 'List memories whose importance has fallen below a threshold due to time-based decay. Unlike get_stale_entities (which uses freshness timestamps), this uses decay engine importance calculations.',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: 'Importance threshold (default: 0.1)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'forget_weak_memories',
    description: 'Bulk-delete memories that fell below a decay threshold. Unlike forget_memory (content match) or archive_entities (criteria-based move), this uses decay-based importance scoring.',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: 'Importance threshold below which to forget' },
        maxCount: { type: 'number', description: 'Maximum number of memories to forget' },
        dryRun: { type: 'boolean', description: 'If true, report what would be forgotten without deleting' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'reinforce_memory',
    description: 'Boost a memory\'s decay resistance by increasing confirmation count and/or confidence. Unlike refresh_entity (timestamp reset) or set_importance (static score), this modulates the decay model.',
    inputSchema: {
      type: 'object',
      properties: {
        memoryName: { type: 'string', description: 'Name of the memory to reinforce' },
        confirmationBoost: { type: 'number', description: 'Amount to boost confirmation count' },
        confidenceBoost: { type: 'number', description: 'Amount to boost confidence score' },
      },
      required: ['memoryName'],
      additionalProperties: false,
    },
  },
  {
    name: 'score_salience',
    description: 'Calculate 5-component relevance score for an entity: baseImportance, recencyBoost, frequencyBoost, contextRelevance, noveltyBoost. Use with format_with_salience_budget to score then format.',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Entity to score' },
        queryText: { type: 'string', description: 'Optional query text for context relevance' },
        taskDescription: { type: 'string', description: 'Optional task description for task relevance' },
        sessionId: { type: 'string', description: 'Optional session ID for session relevance' },
      },
      required: ['entityName'],
      additionalProperties: false,
    },
  },

  // ==================== MULTI-AGENT TOOLS ====================
  {
    name: 'register_agent',
    description: 'Register an agent for multi-agent operations with identity metadata. Unlike set_agent_role (which applies a role profile), this registers agent identity with type, trust level, and capabilities.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Unique agent identifier' },
        type: { type: 'string', description: 'Agent type (e.g., assistant, specialist, coordinator)' },
        trustLevel: { type: 'number', description: 'Trust level (0-1)', minimum: 0, maximum: 1 },
        capabilities: { type: 'array', items: { type: 'string' }, description: 'List of agent capabilities' },
      },
      required: ['agentId'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_cross_agent',
    description: 'Search across agent memories with trust-weighted scoring and visibility filtering',
    inputSchema: {
      type: 'object',
      properties: {
        requestingAgentId: { type: 'string', description: 'Agent ID making the request' },
        query: { type: 'string', description: 'Search query' },
        agentIds: { type: 'array', items: { type: 'string' }, description: 'Optional list of agent IDs to search across' },
      },
      required: ['requestingAgentId', 'query'],
      additionalProperties: false,
    },
  },
  {
    name: 'set_memory_visibility',
    description: 'Set the visibility of a memory entity for multi-agent access control. Auto-promotes plain entities to AgentEntity (stamps agentId/memoryType/etc.) instead of failing silently. Supports η.5.5.b extensions: allowedRoles (role gate), visibleFrom/visibleUntil (time-window gate).',
    inputSchema: {
      type: 'object',
      properties: {
        memoryName: { type: 'string', description: 'Name of the memory entity' },
        agentId: { type: 'string', description: 'Agent ID that owns the memory' },
        visibility: { type: 'string', enum: ['private', 'team', 'org', 'shared', 'public'], description: 'Visibility level' },
        allowedRoles: {
          type: 'array',
          items: { type: 'string' },
          description: 'η.5.5.b — Optional role gate. When set, requesting agents whose AgentMetadata.role is NOT in this list are denied even if the visibility level would grant. AND-combined with the level check.',
        },
        visibleFrom: {
          type: 'string',
          description: 'η.5.5.b — ISO 8601. Memory becomes visible at this instant. Absent ⇒ visible since creation. Denies even the owner before this time.',
        },
        visibleUntil: {
          type: 'string',
          description: 'η.5.5.b — ISO 8601. Memory stops being visible at this instant. Useful for shared drafts that expire on a known handoff date.',
        },
      },
      required: ['memoryName', 'agentId', 'visibility'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_visible_memories',
    description: 'Get all memories visible to a specific agent based on visibility rules and trust levels',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent ID to check visibility for' },
      },
      required: ['agentId'],
      additionalProperties: false,
    },
  },
  {
    name: 'resolve_agent_conflict',
    description: 'Resolve a conflict between two agent memories using a specified strategy',
    inputSchema: {
      type: 'object',
      properties: {
        primaryMemory: { type: 'string', description: 'Name of the first conflicting memory' },
        conflictingMemory: { type: 'string', description: 'Name of the second conflicting memory' },
        strategy: { type: 'string', enum: ['most_recent', 'highest_confidence', 'most_confirmations', 'trusted_agent'], description: 'Conflict resolution strategy (default: most_recent)' },
      },
      required: ['primaryMemory', 'conflictingMemory'],
      additionalProperties: false,
    },
  },

  // ==================== OBSERVABILITY TOOLS ====================
  {
    name: 'visualize_graph',
    description: 'Generate a self-contained interactive HTML page with a D3.js force-directed graph visualization. Nodes are colored by type and sized by importance.',
    inputSchema: {
      type: 'object',
      properties: {
        maxEntities: { type: 'number', description: 'Maximum entities to include (default: 100)' },
        title: { type: 'string', description: 'Title for the graph visualization' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'split_transcript',
    description: 'Split concatenated multi-session transcripts into per-session chunks via delimiter detection. Preprocessing step before ingest.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Raw transcript text to split' },
      },
      required: ['text'],
      additionalProperties: false,
    },
  },
  {
    name: 'estimate_query_cost',
    description: 'Estimate execution cost (time, tokens) for all available search methods on a given query. Unlike analyze_query (which extracts entities/complexity), this predicts per-method performance.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to estimate cost for' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_context_profile',
    description: 'Get a ContextWindowManager profile configuration (salience weights, retrieval strategy). Unlike get_profile (user profile facts), this returns context-aware retrieval settings.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Profile name to retrieve' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },

  // ==================== η.4.4 BITEMPORAL ENTITY TOOLS ====================
  {
    name: 'invalidate_entity',
    description: 'η.4.4 — Mark an entity as no longer valid by setting validUntil. Idempotent. Does not delete the entity — entity_as_of still returns it for past asOf timestamps. Orthogonal to v1.8 supersession.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Entity name' },
        ended: { type: 'string', description: 'ISO 8601 timestamp; defaults to current time' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'entity_as_of',
    description: 'η.4.4 — Time-travel query for an entity. Returns the entity at a given point in time, or null if it was already invalidated then. An entity is valid at asOf when validFrom <= asOf AND (validUntil is undefined OR validUntil >= asOf).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Entity name' },
        asOf: { type: 'string', description: 'ISO 8601 date string to query at' },
      },
      required: ['name', 'asOf'],
      additionalProperties: false,
    },
  },
  {
    name: 'entity_timeline',
    description: 'η.4.4 — Get all temporal versions of an entity in chronological order (by validFrom asc, with unbounded entities last). Returns the v1.8 supersession chain when one exists.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Entity name (any version in the chain)' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'invalidate_observation',
    description: 'η.4.4 — Mark a specific observation on an entity as no longer valid. Creates a parallel observationMeta[] entry if absent. Throws if observation not found on entity.',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Entity name' },
        content: { type: 'string', description: 'Exact observation content to invalidate' },
        ended: { type: 'string', description: 'ISO 8601 timestamp; defaults to current time' },
      },
      required: ['entityName', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'observations_as_of',
    description: 'η.4.4 — Get observations valid at a given point in time. Observations with no observationMeta entry are treated as unbounded (always-valid).',
    inputSchema: {
      type: 'object',
      properties: {
        entityName: { type: 'string', description: 'Entity name' },
        asOf: { type: 'string', description: 'ISO 8601 date string' },
      },
      required: ['entityName', 'asOf'],
      additionalProperties: false,
    },
  },

  // ==================== η.5.5 OCC + ATTRIBUTION TOOLS ====================
  {
    name: 'update_entity',
    description: 'η.5.5.c — Update an entity with optional optimistic concurrency control. Pass expectedVersion to assert the live entity is at that version; throws VersionConflictError on mismatch. Omit for legacy last-write-wins. OCC-guarded writes auto-increment version.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Entity name to update' },
        updates: {
          type: 'object',
          description: 'Partial entity object — fields to change',
          additionalProperties: true,
        },
        expectedVersion: {
          type: 'number',
          description: 'OCC: assert the live entity is at this version. Throws VersionConflictError on mismatch.',
        },
      },
      required: ['name', 'updates'],
      additionalProperties: false,
    },
  },

  // ==================== η.6.1 RBAC TOOLS ====================
  {
    name: 'rbac_assign_role',
    description: 'η.6.1 — Grant a role to an agent. Roles: reader (read), writer (read+write), admin (read+write+delete), owner (all four). Optional resourceType narrows to one type; optional scope narrows to a name prefix; optional validUntil expires the grant.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent identifier' },
        role: { type: 'string', description: 'Role name (reader, writer, admin, owner, or custom)' },
        resourceType: { type: 'string', enum: ['entity', 'relation', 'observation', 'session', 'artifact'], description: 'Optional resource-type narrow' },
        scope: { type: 'string', description: 'Optional name prefix (e.g. "project-x:")' },
        validFrom: { type: 'string', description: 'ISO 8601 — assignment becomes active' },
        validUntil: { type: 'string', description: 'ISO 8601 — assignment expires' },
        notes: { type: 'string', description: 'Free-form notes (e.g. ticket reference)' },
      },
      required: ['agentId', 'role'],
      additionalProperties: false,
    },
  },
  {
    name: 'rbac_revoke_role',
    description: 'η.6.1 — Remove a specific role assignment. Matching is by agentId + role + resourceType (exact, including undefined).',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        role: { type: 'string' },
        resourceType: { type: 'string', enum: ['entity', 'relation', 'observation', 'session', 'artifact'] },
      },
      required: ['agentId', 'role'],
      additionalProperties: false,
    },
  },
  {
    name: 'rbac_check_permission',
    description: 'η.6.1 — Check whether an agent can perform an action on a resource type. Falls back to defaultRole=reader for agents with no assignments.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        action: { type: 'string', enum: ['read', 'write', 'delete', 'manage'] },
        resourceType: { type: 'string', enum: ['entity', 'relation', 'observation', 'session', 'artifact'] },
        resourceName: { type: 'string', description: 'Optional resource name for scope-prefix matching' },
        now: { type: 'string', description: 'Optional time override for hypothetical-time queries' },
      },
      required: ['agentId', 'action', 'resourceType'],
      additionalProperties: false,
    },
  },
  {
    name: 'rbac_list_assignments',
    description: 'η.6.1 — List role assignments for an agent (active or all).',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        activeOnly: { type: 'boolean', default: false, description: 'If true, filter by current time' },
        now: { type: 'string', description: 'Optional time override (only meaningful when activeOnly=true)' },
      },
      required: ['agentId'],
      additionalProperties: false,
    },
  },

  // ==================== 3B.4 PROCEDURAL MEMORY TOOLS ====================
  {
    name: 'add_procedure',
    description: '3B.4 — Persist a new procedural memory (executable how-to sequence). Steps are ordered (1-indexed) with optional fallback chains. Auto-generates id when omitted. Distinct from semantic facts and episodic events.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Optional stable id; auto-generated if omitted' },
        name: { type: 'string', description: 'Human-readable name' },
        description: { type: 'string' },
        steps: {
          type: 'array',
          description: 'Ordered step list',
          items: {
            type: 'object',
            properties: {
              order: { type: 'number', description: '1-indexed step order' },
              action: { type: 'string', description: 'Caller-meaningful action identifier' },
              parameters: { type: 'object', description: 'Parameter map (string → string)', additionalProperties: { type: 'string' } },
              fallback: { type: 'object', description: 'Optional fallback step on failure' },
              timeout: { type: 'number', description: 'Caller-enforced max duration in ms' },
            },
            required: ['order', 'action', 'parameters'],
          },
        },
        triggers: { type: 'array', items: { type: 'string' }, description: 'Free-form trigger phrases for matching' },
      },
      required: ['steps'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_procedure',
    description: '3B.4 — Load a procedure by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'match_procedure',
    description: '3B.4 — Token-overlap match a context description against stored procedures. Returns ranked matches with Jaccard-like scores.',
    inputSchema: {
      type: 'object',
      properties: {
        context: { type: 'string', description: 'Context description to match against' },
        threshold: { type: 'number', minimum: 0, maximum: 1, default: 0, description: 'Minimum match score' },
        candidateIds: { type: 'array', items: { type: 'string' }, description: 'Optional procedure ids to match against (default: all)' },
      },
      required: ['context'],
      additionalProperties: false,
    },
  },
  {
    name: 'refine_procedure',
    description: '3B.4 — Apply caller feedback after a procedure execution. Increments executionCount and updates successRate via EWMA (α=0.2).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        succeeded: { type: 'boolean' },
        notes: { type: 'string' },
        recordedAt: { type: 'string' },
      },
      required: ['id', 'succeeded'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_procedure_step',
    description: '3B.4 — Load a specific step from a procedure by 1-indexed order, OR get the next step relative to currentOrder.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        order: { type: 'number', description: '1-indexed step to fetch' },
        next: { type: 'boolean', description: 'If true, returns the step after `order` instead of step `order` itself' },
      },
      required: ['id', 'order'],
      additionalProperties: false,
    },
  },

  // ==================== 3B.5 ACTIVE RETRIEVAL TOOL ====================
  {
    name: 'adaptive_retrieve',
    description: '3B.5 — Run iterative query-rewriting retrieval. Up to maxRounds of (search → score coverage → rewrite). Stops early when coverage ≥ minCoverage or no expansion tokens. Pure symbolic — no LLM provider required.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        budgetTokens: { type: 'number', description: 'Optional token budget; rejects retrieval if cost exceeds budget' },
        maxRounds: { type: 'number', default: 3 },
        minCoverage: { type: 'number', minimum: 0, maximum: 1, default: 0.6 },
        resultsPerRound: { type: 'number', default: 10 },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  // ==================== 3B.6 CAUSAL REASONING TOOLS ====================
  {
    name: 'find_causes',
    description: '3B.6 — Find causal chains ending at the named effect. Searches paths from candidate causes via causal relation types (causes/enables/prevents/precedes/correlates). Sorted by score = product of per-edge causalStrength.',
    inputSchema: {
      type: 'object',
      properties: {
        effect: { type: 'string', description: 'Target entity name (effect)' },
        candidates: { type: 'array', items: { type: 'string' }, description: 'Candidate cause entity names' },
        maxDepth: { type: 'number', default: 6 },
      },
      required: ['effect', 'candidates'],
      additionalProperties: false,
    },
  },
  {
    name: 'find_effects',
    description: '3B.6 — Find causal chains starting at the named cause and reaching any candidate effect. Symmetric counterpart to find_causes.',
    inputSchema: {
      type: 'object',
      properties: {
        cause: { type: 'string' },
        candidates: { type: 'array', items: { type: 'string' } },
        maxDepth: { type: 'number', default: 6 },
      },
      required: ['cause', 'candidates'],
      additionalProperties: false,
    },
  },
  {
    name: 'counterfactual_query',
    description: '3B.6 — "What if we remove edge (removeFrom → removeTo)? Is predict still reachable from seed?" Returns chains from seed to predict that DO NOT use the removed edge. Pure: does not mutate the graph.',
    inputSchema: {
      type: 'object',
      properties: {
        seed: { type: 'string' },
        removeFrom: { type: 'string' },
        removeTo: { type: 'string' },
        predict: { type: 'string' },
        maxDepth: { type: 'number', default: 6 },
      },
      required: ['seed', 'removeFrom', 'removeTo', 'predict'],
      additionalProperties: false,
    },
  },
  {
    name: 'detect_causal_cycles',
    description: '3B.6 — Detect cycles in the causal subgraph rooted at seed. CAVEAT: treats prevents as a directed edge, not as logical negation — prevents+enables triangles ARE flagged.',
    inputSchema: {
      type: 'object',
      properties: {
        seed: { type: 'string' },
        maxDepth: { type: 'number', default: 6 },
      },
      required: ['seed'],
      additionalProperties: false,
    },
  },

  // ==================== 3B.7 WORLD MODEL TOOLS ====================
  {
    name: 'get_world_state',
    description: '3B.7 — Capture a fresh snapshot of the live graph: entitiesByName + takenAt timestamp + size. Capped at maxSnapshotSize (default 1000); over-cap prefers high-importance entities.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'validate_fact_against_world',
    description: '3B.7 — Validate a candidate observation against a target entity. Delegates to MemoryValidator.validateConsistency. Returns null if no validator is wired.',
    inputSchema: {
      type: 'object',
      properties: {
        observation: { type: 'string' },
        entityName: { type: 'string' },
      },
      required: ['observation', 'entityName'],
      additionalProperties: false,
    },
  },
  {
    name: 'predict_outcome',
    description: '3B.7 — Predict downstream effects of an action by walking the causal subgraph. Delegates to CausalReasoner.findEffects.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Action entity name' },
        candidates: { type: 'array', items: { type: 'string' }, description: 'Candidate effect entity names' },
      },
      required: ['action', 'candidates'],
      additionalProperties: false,
    },
  },

  // ==================== v2.1.0 TOOL AFFORDANCE TOOLS ====================
  {
    name: 'record_tool_outcome',
    description: 'v2.1.0 — Record a single tool-call outcome directly via ToolAffordanceManager (bypasses ToolCallObserver). Creates the record on first call; appends to rolling window on subsequent. Throws "conflict" on concurrent writer mismatch.',
    inputSchema: {
      type: 'object',
      properties: {
        toolName: { type: 'string' },
        outcome: { type: 'string', enum: ['success', 'failure', 'partial'] },
        errorMessage: { type: 'string', description: 'Required when outcome is failure or partial (ranked in commonFailureModes).' },
        durationMs: { type: 'number', minimum: 0, description: 'Wall-clock duration. Optional.' },
      },
      required: ['toolName', 'outcome'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_tool_affordance_stats',
    description: 'v2.1.0 — Flat rolling stats for a tool: success_rate, total_calls, common_failure_modes, avg_duration_ms.',
    inputSchema: {
      type: 'object',
      properties: { toolName: { type: 'string' } },
      required: ['toolName'],
      additionalProperties: false,
    },
  },
  {
    name: 'suggest_tool',
    description: 'v2.1.0 — Suggest tools matching a task hint, ranked by successRate × recency factor (1.0 at ≤1d, linearly decays to 0.1 at ≥30d).',
    inputSchema: {
      type: 'object',
      properties: {
        taskHint: { type: 'string', description: 'Substring matched against toolName.' },
        limit: { type: 'number', minimum: 1, description: 'Max candidates. Default 5.' },
        minScore: { type: 'number', minimum: 0, maximum: 1, description: 'Default 0.' },
      },
      required: ['taskHint'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_tool_affordances',
    description: 'v2.1.0 — All recorded ToolAffordanceRecords.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'remove_tool_affordance',
    description: 'v2.1.0 — Drop a tool-affordance record by toolName.',
    inputSchema: {
      type: 'object',
      properties: { toolName: { type: 'string' } },
      required: ['toolName'],
      additionalProperties: false,
    },
  },
  {
    name: 'observe_tool_start',
    description: 'v2.1.0 — Begin observing a tool call. Returns a callId the caller threads through observe_tool_complete / observe_tool_error / observe_tool_partial / observe_tool_cancel. Emits toolCall:start on the observer EventEmitter.',
    inputSchema: {
      type: 'object',
      properties: {
        toolName: { type: 'string' },
        args: { type: 'object', additionalProperties: true, description: 'Optional structured args for telemetry.' },
      },
      required: ['toolName'],
      additionalProperties: false,
    },
  },
  {
    name: 'observe_tool_complete',
    description: 'v2.1.0 — Record successful completion. Computes durationMs from observe_tool_start. No-op on unknown callId.',
    inputSchema: {
      type: 'object',
      properties: {
        callId: { type: 'string' },
        result: { type: 'string', description: 'Optional summary string for telemetry.' },
      },
      required: ['callId'],
      additionalProperties: false,
    },
  },
  {
    name: 'observe_tool_error',
    description: 'v2.1.0 — Record failure with an error message. No-op on unknown callId.',
    inputSchema: {
      type: 'object',
      properties: {
        callId: { type: 'string' },
        errorMessage: { type: 'string' },
      },
      required: ['callId', 'errorMessage'],
      additionalProperties: false,
    },
  },
  {
    name: 'observe_tool_partial',
    description: 'v2.1.0 — Record a partial result (tool returned a usable but incomplete result). No-op on unknown callId.',
    inputSchema: {
      type: 'object',
      properties: {
        callId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['callId', 'reason'],
      additionalProperties: false,
    },
  },
  {
    name: 'observe_tool_cancel',
    description: 'v2.1.0 — Drop an in-flight observation without recording (e.g. user cancelled). No-op on unknown callId.',
    inputSchema: {
      type: 'object',
      properties: { callId: { type: 'string' } },
      required: ['callId'],
      additionalProperties: false,
    },
  },
  {
    name: 'tool_observer_in_flight_count',
    description: 'v2.1.0 — Diagnostic: number of in-flight (started but not yet completed) tool-call observations.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },

  // ==================== v2.1.0 HEURISTIC GUIDELINES TOOLS ====================
  {
    name: 'add_heuristic',
    description: 'v2.1.0 — Register a new condition→action heuristic. Storage-backed; default confidence 0.5. Pass an explicit content-addressed id (e.g. h_<sha256(condition|action)>) for caller-managed idempotency.',
    inputSchema: {
      type: 'object',
      properties: {
        condition: { type: 'string', description: 'Natural-language condition that triggers the action.' },
        action: { type: 'string', description: 'Recommended action when the condition matches.' },
        priority: { type: 'number', description: 'Tie-breaker when multiple match (higher wins).' },
        initialConfidence: { type: 'number', minimum: 0, maximum: 1, description: 'Default 0.5.' },
        importance: { type: 'number', minimum: 0, maximum: 10 },
        agentId: { type: 'string' },
        id: { type: 'string', description: 'Optional explicit id for idempotent registration.' },
      },
      required: ['condition', 'action'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_heuristic',
    description: 'v2.1.0 — Sync lookup by HeuristicId.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_heuristics',
    description: 'v2.1.0 — All registered heuristics.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'heuristic_count',
    description: 'v2.1.0 — Count of stored heuristics.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'match_heuristics',
    description: 'v2.1.0 — Find heuristics whose condition matches input via Jaccard token-overlap × confidence; sorted descending, then by priority.',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Text to match against heuristic conditions.' },
        limit: { type: 'number', minimum: 1, description: 'Max matches returned. Default 10.' },
        minScore: { type: 'number', minimum: 0, maximum: 1, description: 'Minimum score. Default 0.1.' },
      },
      required: ['input'],
      additionalProperties: false,
    },
  },
  {
    name: 'reinforce_heuristic',
    description: 'v2.1.0 — Record a successful application: bumps support; raises confidence asymptotically (new = old + (1-old)*0.1). OCC-protected — surfaces "conflict" when concurrent writer collides.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'record_heuristic_contradiction',
    description: 'v2.1.0 — Record a counter-example: bumps contradictions; lowers confidence (new = old - old*0.2). OCC-protected.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'detect_heuristic_conflicts',
    description: 'v2.1.0 — Pair-wise overlap/contradiction detection across stored heuristics. Surfaces overlap (same condition tokens, different actions) and contradiction (opposing actions on overlapping conditions; negation prefixes such as "do not" / "never" / "avoid").',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'remove_heuristic',
    description: 'v2.1.0 — Drop a heuristic by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'clear_heuristics',
    description: 'v2.1.0 — Drop every heuristic (across all entities of type "heuristic").',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },

  // ==================== v2.1.0 PROJECT CONTEXT TOOLS ====================
  {
    name: 'upsert_project_context',
    description: 'v2.1.0 — Merge structured project knowledge into the ProjectContextRecord for `projectId`. Array fields (facts/conventions/commands/glossary) append + dedup; scalars overwrite. One record per projectId.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project identifier (unique key).' },
        facts: { type: 'array', items: { type: 'string' } },
        conventions: { type: 'array', items: { type: 'string' } },
        commands: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              command: { type: 'string' },
              purpose: { type: 'string' },
            },
            required: ['name', 'command', 'purpose'],
          },
        },
        glossary: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              term: { type: 'string' },
              definition: { type: 'string' },
            },
            required: ['term', 'definition'],
          },
        },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_project_context',
    description: 'v2.1.0 — Sync lookup of the ProjectContextRecord for projectId.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'append_project_fact',
    description: 'v2.1.0 — Append one fact to a project context (auto-creates the record on first call; dedups).',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, fact: { type: 'string' } },
      required: ['projectId', 'fact'],
      additionalProperties: false,
    },
  },
  {
    name: 'append_project_convention',
    description: 'v2.1.0 — Append one convention to a project context (auto-creates; dedups).',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, convention: { type: 'string' } },
      required: ['projectId', 'convention'],
      additionalProperties: false,
    },
  },
  {
    name: 'append_project_command',
    description: 'v2.1.0 — Append a documented project command (dedup by name).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string', description: 'Short command name (e.g. "test").' },
        command: { type: 'string', description: 'The command line (e.g. "npm test").' },
        purpose: { type: 'string', description: 'What the command does.' },
      },
      required: ['projectId', 'name', 'command', 'purpose'],
      additionalProperties: false,
    },
  },
  {
    name: 'append_project_glossary_term',
    description: 'v2.1.0 — Append a glossary term (dedup by term).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        term: { type: 'string' },
        definition: { type: 'string' },
      },
      required: ['projectId', 'term', 'definition'],
      additionalProperties: false,
    },
  },
  {
    name: 'remove_project_fact',
    description: 'v2.1.0 — Remove a single fact. Returns true if found.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, fact: { type: 'string' } },
      required: ['projectId', 'fact'],
      additionalProperties: false,
    },
  },
  {
    name: 'remove_project_convention',
    description: 'v2.1.0 — Remove a single convention. Returns true if found.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, convention: { type: 'string' } },
      required: ['projectId', 'convention'],
      additionalProperties: false,
    },
  },
  {
    name: 'remove_project_command',
    description: 'v2.1.0 — Remove a command by name. Returns true if found.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, commandName: { type: 'string' } },
      required: ['projectId', 'commandName'],
      additionalProperties: false,
    },
  },
  {
    name: 'remove_project_glossary_term',
    description: 'v2.1.0 — Remove a glossary entry by term. Returns true if found.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' }, term: { type: 'string' } },
      required: ['projectId', 'term'],
      additionalProperties: false,
    },
  },
  {
    name: 'clear_project_context',
    description: 'v2.1.0 — Wipe the four arrays (facts/conventions/commands/glossary) for projectId; keeps the entity.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'format_project_context_for_llm',
    description: 'v2.1.0 — Render the ProjectContextRecord as a prose summary suitable for the wakeUp L0 layer or a system prompt. Honors budgetChars with ellipsis truncation.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        budgetChars: { type: 'number', minimum: 1, description: 'Character cap for the rendered prose.' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },

  // ==================== v2.1.0 DECISION RATIONALE TOOLS ====================
  {
    name: 'propose_decision',
    description: 'v2.1.0 — Propose a new architecture-decision-record (ADR-equivalent). Creates a "proposed" DecisionRecord. Default importance 8.',
    inputSchema: {
      type: 'object',
      properties: {
        context: { type: 'string', description: 'Problem-space description (the question the decision answers)' },
        decision: { type: 'string', description: 'The chosen path' },
        alternatives: { type: 'array', items: { type: 'string' }, description: 'Considered-but-not-chosen options. Default [].' },
        consequences: { type: 'array', items: { type: 'string' }, description: 'Anticipated downstream effects. Default [].' },
        relatedFiles: { type: 'array', items: { type: 'string' }, description: 'Optional paths to related ADRs / code.' },
        supersedes: { type: 'string', description: 'Optional backward link to the decision being replaced (DecisionId).' },
        sourceSessionId: { type: 'string' },
        sourceProjectId: { type: 'string' },
        importance: { type: 'number', minimum: 0, maximum: 10, description: 'Entity-level importance. Default 8.' },
        agentId: { type: 'string', description: 'Owning agent.' },
      },
      required: ['context', 'decision'],
      additionalProperties: false,
    },
  },
  {
    name: 'accept_decision',
    description: 'v2.1.0 — Transition a proposed decision to accepted. Returns one of: accepted | already-accepted | not-found | illegal-transition | conflict | vanished-mid-update.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'DecisionId' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'reject_decision',
    description: 'v2.1.0 — Transition a proposed decision to rejected with a reason. Returns rejected | already-rejected | not-found | illegal-transition | conflict | vanished-mid-update.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'DecisionId' },
        reason: { type: 'string', description: 'Why the decision is being rejected.' },
      },
      required: ['id', 'reason'],
      additionalProperties: false,
    },
  },
  {
    name: 'supersede_decision',
    description: 'v2.1.0 — Mark an accepted decision as superseded by another. illegal-transition when target is not accepted. not-found when target or replacement is missing.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Decision being superseded' },
        by: { type: 'string', description: 'DecisionId of the replacement' },
      },
      required: ['id', 'by'],
      additionalProperties: false,
    },
  },
  {
    name: 'find_decisions_by_context',
    description: 'v2.1.0 — Substring search across context, decision, and consequences fields.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Substring to search for' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_decision_chain',
    description: 'v2.1.0 — Walk the supersedes link backward from the supplied id to the original proposal. Returns chain oldest-first; cycle-protected.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Any DecisionId in the chain' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_decisions',
    description: 'v2.1.0 — List decisions, optionally filtered by status / sourceSessionId / sourceProjectId.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['proposed', 'accepted', 'superseded', 'rejected'] },
        sourceSessionId: { type: 'string' },
        sourceProjectId: { type: 'string' },
        limit: { type: 'number', minimum: 1 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_decision',
    description: 'v2.1.0 — Sync lookup by DecisionId.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'DecisionId' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'export_decision_as_adr_markdown',
    description: 'v2.1.0 — Render a stored decision as ADR-format markdown (# title, Status, Context, Decision, Consequences bullet list, Alternatives bullet list, optional Supersedes link).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'DecisionId' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'parse_adr_markdown',
    description: 'v2.1.0 — Parse a hand-written or previously-exported ADR markdown into a DecisionInput shape (static; no persistence). Returns null when required Context or Decision sections are missing.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Raw ADR markdown text' } },
      required: ['text'],
      additionalProperties: false,
    },
  },

  // ==================== v2.1.0 do_not_remember (Exclusion) TOOLS ====================
  {
    name: 'add_exclusion_rule',
    description: 'v2.1.0 — Add a content-pattern exclusion rule (do_not_remember). Hard-deletes existing matches (per `scope`) and write-blocks future ones when consulted by upstream callers. v1 substring-only.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Substring to match (case-insensitive).' },
        scope: {
          type: 'string',
          enum: ['future-only', 'past-only', 'both'],
          description: 'When the rule applies. Default: both.',
        },
        entityType: { type: 'string', description: 'Optional restriction by entityType.' },
        reason: { type: 'string', description: 'Free-text justification (e.g. "GDPR request 2026-05-15").' },
      },
      required: ['pattern'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_exclusion_rules',
    description: 'v2.1.0 — Return every registered ExclusionRule.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'remove_exclusion_rule',
    description: 'v2.1.0 — Drop an exclusion rule by id. Does NOT restore previously deleted memories — the contract is "user said forget".',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Rule id (exclusion-...)' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'check_exclusion',
    description: 'v2.1.0 — Check whether content would be blocked by any active forward-blocking rule. Returns {blocked, ruleId?, reason?}. Past-only rules are skipped.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Content to test.' },
        entityType: { type: 'string', description: 'Optional entityType — narrows entityType-scoped rules.' },
      },
      required: ['content'],
      additionalProperties: false,
    },
  },
  {
    name: 'find_matching_memories_for_rule',
    description: 'v2.1.0 — Dry-run preview: return entities whose observations would match the candidate exclusion pattern. Does NOT persist the rule.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Candidate substring pattern.' },
        entityType: { type: 'string', description: 'Optional entityType restriction.' },
      },
      required: ['pattern'],
      additionalProperties: false,
    },
  },

  // ==================== v2.1.0 OBSERVATION DEDUP TOOLS ====================
  {
    name: 'find_duplicate_observations',
    description: 'v2.1.0 — Find verbatim duplicate observation strings across distinct entities (SHA-256 exact tier). Complementary to MemoryEngine.checkDuplicate (turn-level) and CompressionManager.findDuplicates (whole-entity). Report-only.',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: {
          oneOf: [
            { type: 'string', description: 'Single entityType to include' },
            { type: 'array', items: { type: 'string' }, description: 'Multiple entityTypes to include' },
          ],
          description: 'Optional entityType filter (single or array). Omit to scan all.',
        },
        projectId: { type: 'string', description: 'Restrict to entities with this projectId.' },
        sessionId: { type: 'string', description: 'Restrict to entities with this sessionId.' },
        minOccurrences: { type: 'number', minimum: 2, description: 'Minimum occurrences to count as a group. Default 2.' },
        maxGroups: { type: 'number', minimum: 1, description: 'Cap on groups returned. Default 100.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'find_jaccard_duplicate_observations',
    description: 'v2.1.0 — Find near-duplicate observation strings across distinct entities via token-Jaccard similarity with union-find grouping. More expensive than the exact tier (O(o²)); opt-in for higher recall.',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
        projectId: { type: 'string' },
        sessionId: { type: 'string' },
        minOccurrences: { type: 'number', minimum: 2 },
        maxGroups: { type: 'number', minimum: 1 },
      },
      additionalProperties: false,
    },
  },

  // ==================== v2.1.0 SPELL CORRECTION TOOLS ====================
  {
    name: 'spell_suggest',
    description: 'v2.1.0 — Suggest close matches for a (potentially misspelled) query over the vocabulary of entity names + tag values. Two-stage: bigram-Jaccard pre-filter (NGramIndex) + Levenshtein re-rank.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The (potentially misspelled) query string' },
        limit: { type: 'number', minimum: 1, description: 'Maximum corrections to return. Default 5.' },
        minScore: { type: 'number', minimum: 0, maximum: 1, description: 'Minimum final similarity score (1 - distance/maxLen). Default 0.4.' },
        maxDistance: { type: 'number', minimum: 0, description: 'Maximum Levenshtein edit distance to allow. Default 3.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'spell_rebuild_vocabulary',
    description: 'v2.1.0 — Force a rebuild of the SpellChecker vocabulary + n-gram index. Call after bulk entity churn; the lazy cache is otherwise correct for low-churn graphs.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'spell_vocabulary_size',
    description: 'v2.1.0 — Return the count of unique terms in the SpellChecker vocabulary (entity names + tag values by default). Mostly diagnostic.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },

  // ==================== v12.5.0 ENGINEERING / DIAGNOSTIC TOOLS ====================
  // Parallel surface to the memoryjs CLI engineering commands (`memory diag`,
  // `memory check`, `memory reindex`, etc.). Useful when the MCP server is up
  // but the graph state is suspect.
  {
    name: 'diag',
    description: 'v12.5.0 — Runtime + storage diagnostic snapshot: node version, platform, storage path/type/size, entity + relation counts, ISO timestamp. Good first call when something feels off.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'health',
    description: 'v12.5.0 — Fast integrity checks: storage:loadGraph, entities:distinct-names, relations:no-orphans, hierarchy:no-cycles-no-missing-parents. Returns per-check duration; ok=false when any check fails.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'check_graph',
    description: 'v12.5.0 — Detect orphan relations (from/to references a missing entity), missing parents (entity.parentId references a missing entity), and hierarchy cycles. Reports findings. With apply=true, deletes orphan relations and clears missing parentIds; cycles are always reported but never auto-repaired (no safe default for which edge to break).',
    inputSchema: {
      type: 'object',
      properties: {
        apply: { type: 'boolean', description: 'When true, repair orphan relations + missing parentIds. Default false (dry-run).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'reindex',
    description: 'v12.5.0 — Rebuild search-side indexes that may have drifted (TF-IDF/BM25 ranked + spell-checker vocabulary). Pass ranked=false or spell=false to scope. Returns per-target ok flag + durationMs.',
    inputSchema: {
      type: 'object',
      properties: {
        ranked: { type: 'boolean', description: 'Rebuild the ranked-search (TF-IDF/BM25) index (default true)' },
        spell: { type: 'boolean', description: 'Rebuild the spell-checker vocabulary (default true)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'cache_stats',
    description: 'v12.5.0 — Per-tier snapshot of the global search caches (basic / ranked / boolean / fuzzy) showing hits / misses / size / hitRate. Process-local — every fresh server process starts at zero.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'cache_clear',
    description: 'v12.5.0 — Bust all four global search caches. Idempotent; safe after manual graph edits to drop stale results.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'graph_size',
    description: 'v12.5.0 — Graph + storage footprint: entity / relation / observation counts, distinct tag count, avg observations per entity, on-disk byte size + JSONL line count.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'inspect_entity',
    description: 'v12.5.0 — Verbose snapshot of one entity: observations (resolved via ObservationManager so the column-store sidecar is consulted), outgoing + incoming relations, tags, importance, timestamps, parentId, immediate children, full ancestors. Errors when entity not found.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Entity name to inspect' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'hierarchy_tree',
    description: 'v12.5.0 — Hierarchy tree as nested JSON. With an explicit root, returns just that subtree; without, returns all root entities. Useful for visualising parent/child structure.',
    inputSchema: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Root entity name. Omit to return all root entities.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'entity_neighbors',
    description: 'v12.5.0 — Incoming + outgoing relations for one entity, plus in/out degree counts. Lighter than inspect_entity when you only need the graph-topology view.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Entity name' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },

  // ==================== EVENT MEMORY TOOLS (memoryjs v3.0.0) ====================
  {
    name: 'record_event',
    description: 'Record an n-ary event: the action becomes a first-class event hub entity with role-typed relations (actor_of/targeted/occurred_in/participant_in). Missing endpoints auto-create as concept stubs. Optional flowKey groups events into a named flow.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'The verb — what happened (e.g. "deployed", "approved")' },
        actor: { type: 'string', description: 'Entity name of who performed the action' },
        target: { type: 'string', description: 'Entity name the action was performed on' },
        context: { type: 'string', description: 'Entity name of where/within-what the event occurred' },
        participants: { type: 'array', items: { type: 'string' }, description: 'Additional participant entity names' },
        occurredAt: { type: 'string', description: 'ISO 8601 timestamp of when the event occurred' },
        flowKey: { type: 'string', description: 'Flow key grouping related events (case-insensitive)' },
        detail: { type: 'array', items: { type: 'string' }, description: 'Free-text detail observations attached to the event' },
        importance: { type: 'number', description: 'Importance score for the event entity' },
      },
      required: ['action', 'actor'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_event',
    description: 'Load one recorded event by its entity name, joining the event hub with its role-typed relation endpoints (actor, target, context, participants).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Event entity name (as returned by record_event / query_events)' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'query_events',
    description: 'Query recorded events by any combination of actor, target, action, flowKey, and inclusive time range. Results are chronologically ordered (occurredAt, falling back to createdAt). Uses relation/type indexes — never a full-graph scan.',
    inputSchema: {
      type: 'object',
      properties: {
        actor: { type: 'string', description: 'Filter by actor entity name' },
        target: { type: 'string', description: 'Filter by target entity name' },
        action: { type: 'string', description: 'Filter by action verb' },
        flowKey: { type: 'string', description: 'Filter by flow key' },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Inclusive lower bound (ISO 8601)' },
            end: { type: 'string', description: 'Inclusive upper bound (ISO 8601)' },
          },
          additionalProperties: false,
          description: 'Inclusive time range; either bound may be omitted',
        },
        limit: { type: 'number', description: 'Max events to return' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_event_flow',
    description: 'All events sharing a flow key (flow:<key> tag), chronologically ordered — the full timeline of a named flow (e.g. a release, an incident).',
    inputSchema: {
      type: 'object',
      properties: {
        flowKey: { type: 'string', description: 'Flow key (case-insensitive)' },
      },
      required: ['flowKey'],
      additionalProperties: false,
    },
  },
  {
    name: 'who_did_what',
    description: 'Convenience join answering "who did what (to target / in context / within time range)?" over recorded events. Returns actor + action + event tuples; events without a resolvable actor are omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Filter by target entity name' },
        context: { type: 'string', description: 'Filter by context entity name' },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Inclusive lower bound (ISO 8601)' },
            end: { type: 'string', description: 'Inclusive upper bound (ISO 8601)' },
          },
          additionalProperties: false,
          description: 'Inclusive time range; either bound may be omitted',
        },
        limit: { type: 'number', description: 'Max entries to return' },
      },
      additionalProperties: false,
    },
  },

  // ==================== RECONSTRUCTIVE MEMORY TOOLS (memoryjs v3.0.0) ====================
  {
    name: 'ingest_dialogue',
    description: 'Distill raw dialogue turns into the Cue–Tag–Content associative memory graph (MRAgent-style "memory is reconstructed, not retrieved"). Episodic/semantic/topic layers are also persisted into the live knowledge graph. Multiple calls accumulate.',
    inputSchema: {
      type: 'object',
      properties: {
        turns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique turn id' },
              speaker: { type: 'string', description: 'Speaker name' },
              text: { type: 'string', description: 'Turn text' },
              timestamp: { type: 'string', description: 'ISO 8601 timestamp' },
            },
            required: ['id', 'text'],
            additionalProperties: false,
          },
          description: 'Dialogue turns to distill and ingest',
        },
      },
      required: ['turns'],
      additionalProperties: false,
    },
  },
  {
    name: 'reconstruct_memory',
    description: 'Answer a query via active multi-step traversal of the reconstructive (Cue–Tag–Content) memory graph. Returns accumulated evidence, the step-by-step trajectory, and whether the loop stopped early on a satisfied condition vs. budget.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Query to reconstruct an answer for' },
        maxSteps: { type: 'number', description: 'Max reasoning turns (default 8)' },
        perStepBudget: { type: 'number', description: 'Max content nodes routed per step (default 10)' },
        evidenceTarget: { type: 'number', description: 'Stop once this many distinct evidence items accumulate (default 12)' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'reconstructive_memory_stats',
    description: 'Size statistics of the reconstructive (Cue–Tag–Content) memory graph: cue / tag / content node counts and edge counts.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },

  // ==================== RELATION CONSOLIDATION TOOLS (memoryjs v3.0.0) ====================
  {
    name: 'analyze_relation_duplicates',
    description: 'Dry-run the three-tier relation janitor: tier 1 finds trivial relationType spelling variants (WorksAt/works-at/works_at) and redundant bidirectional mirrors; tier 2 (when an embedding provider is configured) finds semantically equivalent same-pair relations. Report-only — never mutates the graph.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'consolidate_relations',
    description: 'Run relation-duplicate analysis and — when apply=true — merge tier 1+2 duplicate groups (delete variants, create the canonical survivor with summed confirmationCount). apply=false (default) is identical to analyze_relation_duplicates.',
    inputSchema: {
      type: 'object',
      properties: {
        apply: { type: 'boolean', description: 'Apply tier 1+2 merges (default false = dry-run)' },
      },
      additionalProperties: false,
    },
  },
];

// Tool categories are documented in CLAUDE.md for reference:
// - Entity Operations: create_entities, delete_entities, read_graph, open_nodes
// - Relation Operations: create_relations, delete_relations
// - Observation Management: add_observations, delete_observations
// - Search: search_nodes, search_by_date_range, search_nodes_ranked, boolean_search, fuzzy_search, get_search_suggestions, search_auto
// - Semantic Search: semantic_search, find_similar_entities, index_embeddings
// - Saved Searches: save_search, execute_saved_search, list_saved_searches, delete_saved_search, update_saved_search
// - Tag Management: add_tags, remove_tags, set_importance, add_tags_to_multiple_entities, replace_tag, merge_tags
// - Tag Aliases: add_tag_alias, list_tag_aliases, remove_tag_alias, get_aliases_for_tag, resolve_tag
// - Hierarchy: set_entity_parent, get_children, get_parent, get_ancestors, get_descendants, get_subtree, get_root_entities, get_entity_depth, move_entity
// - Graph Algorithms: find_shortest_path, find_all_paths, get_connected_components, get_centrality
// - Analytics: get_graph_stats, validate_graph
// - Compression: find_duplicates, merge_entities, compress_graph, archive_entities
// - Import/Export: import_graph, export_graph
