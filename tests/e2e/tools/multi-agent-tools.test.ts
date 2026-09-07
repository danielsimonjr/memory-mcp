/**
 * Multi-Agent Tools E2E Tests
 *
 * Tests for register_agent, search_cross_agent, set_memory_visibility,
 * get_visible_memories, and resolve_agent_conflict tools.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManagerContext as KnowledgeGraphManager } from '@danielsimonjr/memoryjs';
import { handleToolCall } from '../../../src/server/toolHandlers.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let manager: KnowledgeGraphManager;
let testDir: string;
let memoryPath: string;

beforeEach(async () => {
  testDir = await fs.mkdtemp(join(tmpdir(), 'multi-agent-tools-'));
  memoryPath = join(testDir, 'memory.jsonl');
  await fs.writeFile(memoryPath, '');
  manager = new KnowledgeGraphManager(memoryPath);
});

afterEach(async () => {
  // Close the manager before removing its directory. This used to sleep 50 ms and
  // hope -- "allow pending async writes to settle" -- which turned `main` red on a
  // DOCS-ONLY commit (run 34119539526, ubuntu 22.x):
  //
  //   ENOTEMPTY: directory not empty, rmdir '/tmp/multi-agent-tools-O4eK3p'
  //
  // 50 ms is a guess at how long a background writer needs, and under full-suite
  // contention it is the wrong guess: the consolidation writer was still adding
  // files while `fs.rm` walked the tree. `close()` is the actual signal -- it is
  // idempotent, and its own doc example is `try { ... } finally { ctx.close(); }`.
  manager.close();
  // Belt and braces for anything already in flight when close() returned. This is
  // what vitest itself does when clearing its coverage directory, for the same
  // reason: removal of a directory another process may still touch is inherently
  // racy, so bound the retry rather than widen a sleep.
  await fs.rm(testDir, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 50,
  });
});

async function seedGraph() {
  await handleToolCall('create_entities', {
    entities: [
      { name: 'Alice', entityType: 'person', observations: ['software engineer', 'works at Acme'] },
      { name: 'Bob', entityType: 'person', observations: ['product manager', 'works at Acme'] },
    ],
  }, manager);
}

const parseResponse = (result: { content: Array<{ type: string; text: string }> }) => {
  return JSON.parse(result.content[0].text);
};

describe('Multi-Agent Tools E2E', () => {
  // ==================== register_agent ====================
  describe('register_agent tool', () => {
    it('should register agent with agentId only', async () => {
      const result = await handleToolCall('register_agent', { agentId: 'agent-1' }, manager);
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('agent-1');
      expect(result.content[0].text).toContain('registered');
    });

    it('should register agent with full metadata', async () => {
      const result = await handleToolCall('register_agent', {
        agentId: 'agent-2',
        type: 'llm',
        trustLevel: 0.9,
        capabilities: ['search', 'create', 'analyze'],
      }, manager);
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('agent-2');
      expect(result.content[0].text).toContain('trust: 0.9');
    });

    it('should require agentId', async () => {
      const result = await handleToolCall('register_agent', {}, manager);
      expect(result.isError).toBe(true);
    });

    it('should reject empty agentId', async () => {
      const result = await handleToolCall('register_agent', { agentId: '' }, manager);
      expect(result.isError).toBe(true);
    });

    it('should reject invalid trustLevel', async () => {
      const result = await handleToolCall('register_agent', {
        agentId: 'agent-3',
        trustLevel: 2.0,
      }, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== search_cross_agent ====================
  describe('search_cross_agent tool', () => {
    it('should search with requestingAgentId and query', async () => {
      await seedGraph();
      await handleToolCall('register_agent', { agentId: 'searcher' }, manager);
      const result = await handleToolCall('search_cross_agent', {
        requestingAgentId: 'searcher',
        query: 'software engineer',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('count');
    });

    it('should accept agentIds filter', async () => {
      await seedGraph();
      await handleToolCall('register_agent', { agentId: 'agent-a' }, manager);
      await handleToolCall('register_agent', { agentId: 'agent-b' }, manager);
      const result = await handleToolCall('search_cross_agent', {
        requestingAgentId: 'agent-a',
        query: 'Acme',
        agentIds: ['agent-a', 'agent-b'],
      }, manager);
      expect(result.isError).toBeUndefined();
    });

    it('should require requestingAgentId', async () => {
      const result = await handleToolCall('search_cross_agent', { query: 'test' }, manager);
      expect(result.isError).toBe(true);
    });

    it('should require query', async () => {
      const result = await handleToolCall('search_cross_agent', { requestingAgentId: 'agent-1' }, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== set_memory_visibility ====================
  describe('set_memory_visibility tool', () => {
    it('should set visibility with all required params', async () => {
      await seedGraph();
      await handleToolCall('register_agent', { agentId: 'owner-1' }, manager);
      const result = await handleToolCall('set_memory_visibility', {
        memoryName: 'Alice',
        agentId: 'owner-1',
        visibility: 'public',
      }, manager);
      expect(result.isError).toBeUndefined();
    });

    it('should accept all valid visibility values', async () => {
      await seedGraph();
      await handleToolCall('register_agent', { agentId: 'owner-2' }, manager);
      for (const visibility of ['private', 'team', 'org', 'shared', 'public']) {
        const result = await handleToolCall('set_memory_visibility', {
          memoryName: 'Alice',
          agentId: 'owner-2',
          visibility,
        }, manager);
        expect(result.isError).toBeUndefined();
      }
    });

    it('should reject invalid visibility', async () => {
      const result = await handleToolCall('set_memory_visibility', {
        memoryName: 'Alice',
        agentId: 'owner-1',
        visibility: 'invalid',
      }, manager);
      expect(result.isError).toBe(true);
    });

    it('should require all three parameters', async () => {
      const result = await handleToolCall('set_memory_visibility', {
        memoryName: 'Alice',
      }, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== get_visible_memories ====================
  describe('get_visible_memories tool', () => {
    it('should return visible memories for registered agent', async () => {
      await seedGraph();
      await handleToolCall('register_agent', { agentId: 'viewer-1' }, manager);
      const result = await handleToolCall('get_visible_memories', {
        agentId: 'viewer-1',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data).toHaveProperty('memories');
      expect(data).toHaveProperty('count');
    });

    it('should return empty list for new agent on empty graph', async () => {
      await handleToolCall('register_agent', { agentId: 'viewer-2' }, manager);
      const result = await handleToolCall('get_visible_memories', {
        agentId: 'viewer-2',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data.count).toBe(0);
    });

    it('should require agentId', async () => {
      const result = await handleToolCall('get_visible_memories', {}, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== resolve_agent_conflict ====================
  describe('resolve_agent_conflict tool', () => {
    it('should resolve conflict between two entities', async () => {
      await seedGraph();
      const result = await handleToolCall('resolve_agent_conflict', {
        primaryMemory: 'Alice',
        conflictingMemory: 'Bob',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data).toBeDefined();
    });

    it('should accept strategy parameter', async () => {
      await seedGraph();
      const result = await handleToolCall('resolve_agent_conflict', {
        primaryMemory: 'Alice',
        conflictingMemory: 'Bob',
        strategy: 'highest_confidence',
      }, manager);
      expect(result.isError).toBeUndefined();
    });

    it('should accept all strategy enum values', async () => {
      await seedGraph();
      for (const strategy of ['most_recent', 'highest_confidence', 'most_confirmations', 'trusted_agent']) {
        const result = await handleToolCall('resolve_agent_conflict', {
          primaryMemory: 'Alice',
          conflictingMemory: 'Bob',
          strategy,
        }, manager);
        expect(result.isError).toBeUndefined();
      }
    });

    it('should require primaryMemory', async () => {
      const result = await handleToolCall('resolve_agent_conflict', {
        conflictingMemory: 'Bob',
      }, manager);
      expect(result.isError).toBe(true);
    });

    it('should require conflictingMemory', async () => {
      const result = await handleToolCall('resolve_agent_conflict', {
        primaryMemory: 'Alice',
      }, manager);
      expect(result.isError).toBe(true);
    });
  });
});
