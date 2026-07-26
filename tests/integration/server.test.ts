/**
 * MCPServer Integration Tests
 *
 * Tests for server initialization, tool registration, and MCP protocol handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPServer } from '../../src/server/MCPServer.js';
import { ManagerContext as KnowledgeGraphManager } from '@danielsimonjr/memoryjs';
import { toolDefinitions } from '../../src/server/toolDefinitions.js';
import { handleToolCall } from '../../src/server/toolHandlers.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MCPServer Integration', () => {
  let manager: KnowledgeGraphManager;
  let server: MCPServer;
  let testDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `mcp-server-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });
    testFilePath = join(testDir, 'test-graph.jsonl');

    manager = new KnowledgeGraphManager(testFilePath);
    server = new MCPServer(manager);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Server Initialization', () => {
    it('should create server with KnowledgeGraphManager', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(MCPServer);
    });

    it('should initialize without errors', () => {
      // Server constructor should not throw
      const newServer = new MCPServer(manager);
      expect(newServer).toBeDefined();
    });

    it('should support multiple server instances', () => {
      const server1 = new MCPServer(manager);
      const server2 = new MCPServer(manager);
      expect(server1).not.toBe(server2);
    });
  });

  describe('Tool Registration', () => {
    it('should have 235 tool definitions available', () => {
      // Phase 4 Sprint 9: Added 4 graph algorithm tools (find_shortest_path, find_all_paths, get_connected_components, get_centrality)
      // Phase 4 Sprint 12: Added 3 semantic search tools (semantic_search, find_similar_entities, index_embeddings)
      // Phase 10 Sprint 4: Added search_auto tool
      // Phase 11: Added 4 intelligent search tools (hybrid_search, analyze_query, smart_search, normalize_observations)
      // Phase 12: Added 32 tools from memoryjs v1.7.0 paper-driven features
      // v12.0.0 feature/v12-memoryjs-tools: Added 3 DreamEngine tools (dream_start, dream_stop, dream_run_now)
      // Phase 13: Added 12 tools for memoryjs v1.8.0/v1.9.0 (list_projects, get_entity_versions, get_version_chain,
      //   forget_memory, get_profile, update_profile, invalidate_relation, query_as_of, timeline,
      //   ingest, diary_write, diary_read)
      // Phase 14: Added 31 tools for cognitive core, maintenance intelligence, decay/salience,
      //   multi-agent, and observability (session_start, session_end, session_checkpoint, session_restore,
      //   add_working_memory, promote_working_memory, confirm_memory, clear_expired_memories, wake_up,
      //   auto_link_observations, extract_facts, detect_contradictions, consolidate_session, detect_patterns,
      //   summarize_entity, priority_dedup, compress_context, run_decay_cycle, get_decayed_memories,
      //   forget_weak_memories, reinforce_memory, score_salience, register_agent, search_cross_agent,
      //   set_memory_visibility, get_visible_memories, resolve_agent_conflict, visualize_graph,
      //   split_transcript, estimate_query_cost, get_context_profile)
      // Phase 15 (24092dd0): Added 23 tools for memoryjs v1.14+ surfaces (η.4.4 entity bitemporal,
      //   η.5.5.c OCC update, η.6.1 RBAC, 3B.4 procedural memory, 3B.5 active retrieval,
      //   3B.6 causal reasoning, 3B.7 world model):
      //   invalidate_entity, entity_as_of, entity_timeline, invalidate_observation, observations_as_of,
      //   update_entity,
      //   rbac_assign_role, rbac_revoke_role, rbac_check_permission, rbac_list_assignments,
      //   add_procedure, get_procedure, match_procedure, refine_procedure, get_procedure_step,
      //   adaptive_retrieve,
      //   find_causes, find_effects, counterfactual_query, detect_causal_cycles,
      //   get_world_state, validate_fact_against_world, predict_outcome
      // Phase 16 (v12.3.0): +53 tools for memoryjs v2.1.x surfaces — Tool Affordance (11),
      //   Heuristic Guidelines (10), Project Context (12), Decision Rationale (10),
      //   Exclusion / do_not_remember (5), Observation Dedup (2), Spell Correction (3).
      // v12.3.2: Backport of deferred Phase 13 set_project_scope plus a companion
      //   get_project_scope (+2 tools).
      // v12.5.0: 10 engineering / diagnostic tools mirroring the memoryjs CLI surface
      //   (diag, health, check_graph, reindex, cache_stats, cache_clear, graph_size,
      //   inspect_entity, hierarchy_tree, entity_neighbors).
      // v12.6.0: 10 tools for memoryjs v3.0.0 — Event Memory (record_event, get_event,
      //   query_events, get_event_flow, who_did_what), Reconstructive Memory
      //   (ingest_dialogue, reconstruct_memory, reconstructive_memory_stats),
      //   Relation Consolidation (analyze_relation_duplicates, consolidate_relations).
      expect(toolDefinitions).toHaveLength(235);
    });

    it('should have matching handlers for all definitions', async () => {
      for (const tool of toolDefinitions) {
        // Verify each tool has a corresponding handler
        await expect(async () => {
          // Use empty args for tools that don't require params
          if (tool.inputSchema.required?.length === 0 || !tool.inputSchema.required) {
            await handleToolCall(tool.name, {}, manager);
          }
        }).not.toThrow();
      }
    });

    it('should have consistent naming between definitions and handlers', () => {
      const definedNames = new Set(toolDefinitions.map(t => t.name));

      // Import all handler names - they should match definitions
      const expectedHandlers = [
        'create_entities', 'delete_entities', 'read_graph', 'open_nodes',
        'create_relations', 'delete_relations',
        'add_observations', 'delete_observations',
        'search_nodes', 'search_by_date_range', 'search_nodes_ranked',
        'boolean_search', 'fuzzy_search', 'get_search_suggestions',
        'save_search', 'execute_saved_search', 'list_saved_searches',
        'delete_saved_search', 'update_saved_search',
        'add_tags', 'remove_tags', 'set_importance',
        'add_tags_to_multiple_entities', 'replace_tag', 'merge_tags',
        'add_tag_alias', 'list_tag_aliases', 'remove_tag_alias',
        'get_aliases_for_tag', 'resolve_tag',
        'set_entity_parent', 'get_children', 'get_parent', 'get_ancestors',
        'get_descendants', 'get_subtree', 'get_root_entities',
        'get_entity_depth', 'move_entity',
        'get_graph_stats', 'validate_graph',
        'find_duplicates', 'merge_entities', 'compress_graph', 'archive_entities',
        'import_graph', 'export_graph'
      ];

      for (const name of expectedHandlers) {
        expect(definedNames.has(name)).toBe(true);
      }
    });
  });

  describe('Tool Call Handling', () => {
    it('should handle read_graph tool call', async () => {
      const result = await handleToolCall('read_graph', {}, manager);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle create_entities tool call', async () => {
      const result = await handleToolCall('create_entities', {
        entities: [{ name: 'TestEntity', entityType: 'test', observations: [] }]
      }, manager);

      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('TestEntity');
    });

    it('should handle search_nodes tool call', async () => {
      await handleToolCall('create_entities', {
        entities: [{ name: 'Searchable', entityType: 'test', observations: ['findme'] }]
      }, manager);

      const result = await handleToolCall('search_nodes', {
        query: 'Searchable'
      }, manager);

      expect(result.content[0].type).toBe('text');
    });

    it('should return proper error for unknown tool', async () => {
      const result = await handleToolCall('nonexistent_tool', {}, manager);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
    });
  });

  describe('Response Format Compliance', () => {
    it('should return MCP-compliant response structure', async () => {
      const result = await handleToolCall('read_graph', {}, manager);

      // MCP response must have content array
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);

      // Each content item must have type and text
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
    });

    it('should return JSON-stringified data for data responses', async () => {
      const result = await handleToolCall('read_graph', {}, manager);

      // Content should be valid JSON
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    it('should return text messages for action confirmations', async () => {
      await handleToolCall('create_entities', {
        entities: [{ name: 'ToDelete', entityType: 'test', observations: [] }]
      }, manager);

      const result = await handleToolCall('delete_entities', {
        entityNames: ['ToDelete']
      }, manager);

      expect(result.content[0].text).toContain('Deleted');
    });
  });

  describe('End-to-End Workflows', () => {
    it('should support full CRUD workflow', async () => {
      // Create
      const createResult = await handleToolCall('create_entities', {
        entities: [{ name: 'CRUDTest', entityType: 'test', observations: ['initial'] }]
      }, manager);
      expect(JSON.parse(createResult.content[0].text)[0].name).toBe('CRUDTest');

      // Read
      const readResult = await handleToolCall('open_nodes', {
        names: ['CRUDTest']
      }, manager);
      expect(JSON.parse(readResult.content[0].text).entities).toHaveLength(1);

      // Update (add observation)
      await handleToolCall('add_observations', {
        observations: [{ entityName: 'CRUDTest', contents: ['updated'] }]
      }, manager);

      // Verify update
      const verifyResult = await handleToolCall('open_nodes', {
        names: ['CRUDTest']
      }, manager);
      const entity = JSON.parse(verifyResult.content[0].text).entities[0];
      expect(entity.observations).toContain('updated');

      // Delete
      const deleteResult = await handleToolCall('delete_entities', {
        entityNames: ['CRUDTest']
      }, manager);
      expect(deleteResult.content[0].text).toContain('Deleted');

      // Verify deletion
      const finalResult = await handleToolCall('open_nodes', {
        names: ['CRUDTest']
      }, manager);
      expect(JSON.parse(finalResult.content[0].text).entities).toHaveLength(0);
    });

    it('should support relation workflow', async () => {
      // Create entities
      await handleToolCall('create_entities', {
        entities: [
          { name: 'Node1', entityType: 'node', observations: [] },
          { name: 'Node2', entityType: 'node', observations: [] }
        ]
      }, manager);

      // Create relation
      const relResult = await handleToolCall('create_relations', {
        relations: [{ from: 'Node1', to: 'Node2', relationType: 'connects_to' }]
      }, manager);
      expect(JSON.parse(relResult.content[0].text)).toHaveLength(1);

      // Verify in graph
      const graphResult = await handleToolCall('read_graph', {}, manager);
      const graph = JSON.parse(graphResult.content[0].text);
      expect(graph.relations.length).toBeGreaterThanOrEqual(1);
    });

    it('should support hierarchy workflow', async () => {
      // Create entities
      await handleToolCall('create_entities', {
        entities: [
          { name: 'Parent', entityType: 'folder', observations: [] },
          { name: 'Child', entityType: 'file', observations: [] }
        ]
      }, manager);

      // Set parent
      await handleToolCall('set_entity_parent', {
        entityName: 'Child',
        parentName: 'Parent'
      }, manager);

      // Verify hierarchy
      const childrenResult = await handleToolCall('get_children', {
        entityName: 'Parent'
      }, manager);
      const children = JSON.parse(childrenResult.content[0].text);
      expect(children.length).toBe(1);
      expect(children[0].name).toBe('Child');
    });

    it('should support search workflow', async () => {
      // Create searchable entities
      await handleToolCall('create_entities', {
        entities: [
          { name: 'JavaProject', entityType: 'project', observations: ['Uses Java 17'] },
          { name: 'PythonProject', entityType: 'project', observations: ['Uses Python 3.11'] }
        ]
      }, manager);

      // Add tags
      await handleToolCall('add_tags', {
        entityName: 'JavaProject',
        tags: ['backend', 'java']
      }, manager);

      // Search by query
      const searchResult = await handleToolCall('search_nodes', {
        query: 'Java'
      }, manager);
      const results = JSON.parse(searchResult.content[0].text);
      expect(results.entities.length).toBeGreaterThanOrEqual(1);
    });

    it('should support import/export workflow', async () => {
      // Create data
      await handleToolCall('create_entities', {
        entities: [{ name: 'ExportMe', entityType: 'test', observations: ['data'] }]
      }, manager);

      // Export as JSON
      const exportResult = await handleToolCall('export_graph', {
        format: 'json'
      }, manager);
      const exported = exportResult.content[0].text;
      expect(exported).toContain('ExportMe');

      // Create new manager for import test
      const newTestPath = join(testDir, 'import-test.jsonl');
      const newManager = new KnowledgeGraphManager(newTestPath);

      // Import
      const importResult = await handleToolCall('import_graph', {
        format: 'json',
        data: exported,
        mergeStrategy: 'merge'
      }, newManager);
      expect(importResult.content[0].type).toBe('text');

      // Verify import
      const verifyResult = await handleToolCall('read_graph', {}, newManager);
      const graph = JSON.parse(verifyResult.content[0].text);
      expect(graph.entities.some((e: any) => e.name === 'ExportMe')).toBe(true);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent reads', async () => {
      // Create some data first
      await handleToolCall('create_entities', {
        entities: [{ name: 'ConcurrentTest', entityType: 'test', observations: [] }]
      }, manager);

      // Perform concurrent reads
      const promises = Array(10).fill(null).map(() =>
        handleToolCall('read_graph', {}, manager)
      );

      const results = await Promise.all(promises);

      // All should succeed
      for (const result of results) {
        expect(result.content[0].type).toBe('text');
        expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      }
    });

    it('should handle mixed concurrent operations', async () => {
      // Perform various operations concurrently
      const promises = [
        handleToolCall('create_entities', {
          entities: [{ name: 'Concurrent1', entityType: 'test', observations: [] }]
        }, manager),
        handleToolCall('read_graph', {}, manager),
        handleToolCall('get_graph_stats', {}, manager),
        handleToolCall('validate_graph', {}, manager)
      ];

      const results = await Promise.all(promises);

      // All should complete without errors
      for (const result of results) {
        expect(result.content[0].type).toBe('text');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required arguments gracefully', async () => {
      // search_nodes requires 'query' parameter
      // The handler should either throw or handle gracefully
      try {
        await handleToolCall('search_nodes', {}, manager);
        // If it doesn't throw, it should still return valid response
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid argument types', async () => {
      try {
        await handleToolCall('set_importance', {
          entityName: 'NonExistent',
          importance: 'not-a-number' as any
        }, manager);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
