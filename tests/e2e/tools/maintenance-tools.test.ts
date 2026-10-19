/**
 * Maintenance Tools E2E Tests
 *
 * Tests for auto_link_observations, extract_facts, detect_contradictions,
 * consolidate_session, detect_patterns, summarize_entity, priority_dedup,
 * and compress_context tools.
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
  testDir = await fs.mkdtemp(join(tmpdir(), 'maintenance-tools-'));
  memoryPath = join(testDir, 'memory.jsonl');
  await fs.writeFile(memoryPath, '');
  manager = new KnowledgeGraphManager(memoryPath);
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

const parseResponse = (result: { content: Array<{ type: string; text: string }> }) => {
  return JSON.parse(result.content[0].text);
};

async function seedEntities() {
  await handleToolCall('create_entities', {
    entities: [
      { name: 'Alice', entityType: 'person', observations: ['software engineer', 'works at Acme'] },
      { name: 'Bob', entityType: 'person', observations: ['product manager', 'works at Acme'] },
      { name: 'Acme', entityType: 'company', observations: ['tech startup', 'founded in 2020'] },
    ],
  }, manager);
}

async function startSession(taskDescription?: string): Promise<string> {
  const args: Record<string, unknown> = {};
  if (taskDescription) args.taskDescription = taskDescription;
  const result = await handleToolCall('session_start', args, manager);
  const data = parseResponse(result);
  return data.sessionId;
}

describe('Maintenance Tools E2E', () => {
  // ==================== auto_link_observations ====================
  describe('auto_link_observations tool', () => {
    it('should detect entity mentions in text', async () => {
      await seedEntities();
      const result = await handleToolCall('auto_link_observations', {
        text: 'Alice met with Bob at the Acme office',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data.mentions).toBeDefined();
      expect(data.count).toBeGreaterThanOrEqual(1);
    });

    it('should return empty mentions when no entities match', async () => {
      await seedEntities();
      const result = await handleToolCall('auto_link_observations', {
        text: 'No known entities mentioned here',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data.count).toBe(0);
    });

    it('should reject missing text', async () => {
      const result = await handleToolCall('auto_link_observations', {}, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== extract_facts ====================
  describe('extract_facts tool', () => {
    it('should extract facts from text', async () => {
      const result = await handleToolCall('extract_facts', {
        text: 'Alice is a software engineer. She works at Acme Corp.',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data.facts).toBeDefined();
      expect(data.count).toBeGreaterThanOrEqual(0);
    });

    it('should handle minimal text', async () => {
      const result = await handleToolCall('extract_facts', {
        text: 'Hello.',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data.facts).toBeDefined();
    });

    it('should reject missing text', async () => {
      const result = await handleToolCall('extract_facts', {}, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== detect_contradictions ====================
  describe('detect_contradictions tool', () => {
    it('should handle entity without semantic search available', async () => {
      await seedEntities();
      const result = await handleToolCall('detect_contradictions', {
        entityName: 'Alice',
      }, manager);
      // Without MEMORY_EMBEDDING_PROVIDER, semantic search is unavailable
      // Handler may return text response or error depending on implementation
      expect(result.content[0].text).toBeDefined();
    });

    it('should error for missing entity', async () => {
      const result = await handleToolCall('detect_contradictions', {
        entityName: 'NonExistent',
      }, manager);
      expect(result.isError).toBe(true);
    });

    it('should reject missing entityName', async () => {
      const result = await handleToolCall('detect_contradictions', {}, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== consolidate_session ====================
  describe('consolidate_session tool', () => {
    it('should consolidate an active session', async () => {
      const sessionId = await startSession('test consolidation');
      await handleToolCall('add_working_memory', {
        sessionId,
        content: 'learned something important',
      }, manager);
      const result = await handleToolCall('consolidate_session', { sessionId }, manager);
      expect(result.isError).toBeUndefined();
    });

    it('should reject missing sessionId', async () => {
      const result = await handleToolCall('consolidate_session', {}, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== detect_patterns ====================
  describe('detect_patterns tool', () => {
    it('should detect patterns by entityType', async () => {
      await seedEntities();
      const result = await handleToolCall('detect_patterns', {
        entityType: 'person',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data.patterns).toBeDefined();
    });

    it('should accept optional minOccurrences', async () => {
      await seedEntities();
      const result = await handleToolCall('detect_patterns', {
        entityType: 'person',
        minOccurrences: 2,
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data.count).toBeGreaterThanOrEqual(0);
    });

    it('should reject missing entityType', async () => {
      const result = await handleToolCall('detect_patterns', {}, manager);
      expect(result.isError).toBe(true);
    });

    it('should reject minOccurrences below 2', async () => {
      const result = await handleToolCall('detect_patterns', {
        entityType: 'person',
        minOccurrences: 1,
      }, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== summarize_entity ====================
  describe('summarize_entity tool', () => {
    it('should summarize an existing entity', async () => {
      await seedEntities();
      const result = await handleToolCall('summarize_entity', {
        entityName: 'Alice',
      }, manager);
      expect(result.isError).toBeUndefined();
    });

    it('should accept optional threshold', async () => {
      await seedEntities();
      const result = await handleToolCall('summarize_entity', {
        entityName: 'Alice',
        threshold: 0.5,
      }, manager);
      expect(result.isError).toBeUndefined();
    });

    it('should reject missing entityName', async () => {
      const result = await handleToolCall('summarize_entity', {}, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== priority_dedup ====================
  describe('priority_dedup tool', () => {
    it('should run dedup on empty graph', async () => {
      const result = await handleToolCall('priority_dedup', {}, manager);
      expect(result.isError).toBeUndefined();
    });

    it('should run dedup after seeding entities', async () => {
      await seedEntities();
      const result = await handleToolCall('priority_dedup', {}, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data).toBeDefined();
    });

    describe('dryRun', () => {
      // Two near-identical people (one duplicate group) and one unrelated company.
      async function seedDuplicates() {
        await handleToolCall('create_entities', {
          entities: [
            { name: 'Alice Johnson', entityType: 'person', observations: ['software engineer', 'works at Acme', 'lives in Boston'], importance: 8 },
            { name: 'Alice Johnsen', entityType: 'person', observations: ['software engineer', 'works at Acme', 'lives in Boston'], importance: 2 },
            { name: 'Acme', entityType: 'company', observations: ['tech startup'] },
          ],
        }, manager);
        await handleToolCall('create_relations', {
          relations: [{ from: 'Alice Johnsen', to: 'Acme', relationType: 'works_at' }],
        }, manager);
      }

      const readGraph = async () => parseResponse(await handleToolCall('read_graph', {}, manager));

      it('should leave the graph unchanged and describe the groups when dryRun is true', async () => {
        await seedDuplicates();
        const before = await readGraph();

        const result = await handleToolCall('priority_dedup', { dryRun: true }, manager);
        expect(result.isError).toBeUndefined();
        const data = parseResponse(result);
        expect(data.groups).toHaveLength(1);
        expect(data.groups[0].kept).toBe('Alice Johnson');
        expect(data.groups[0].removed).toEqual(['Alice Johnsen']);
        expect(data.totalRemoved).toBe(1);

        expect(await readGraph()).toEqual(before);
      });

      it('should merge the group when dryRun is false', async () => {
        await seedDuplicates();
        const result = await handleToolCall('priority_dedup', { dryRun: false }, manager);
        expect(result.isError).toBeUndefined();
        expect(parseResponse(result).totalRemoved).toBe(1);
        const names = (await readGraph()).entities.map((e: { name: string }) => e.name).sort();
        expect(names).toEqual(['Acme', 'Alice Johnson']);
      });

      it('should merge the group when dryRun is absent', async () => {
        await seedDuplicates();
        const result = await handleToolCall('priority_dedup', {}, manager);
        expect(result.isError).toBeUndefined();
        expect(parseResponse(result).totalRemoved).toBe(1);
        const names = (await readGraph()).entities.map((e: { name: string }) => e.name).sort();
        expect(names).toEqual(['Acme', 'Alice Johnson']);
      });

      it.each(['true', 1, null, {}])('should reject a dryRun that is not a boolean (%j) and leave the graph unchanged', async (dryRun) => {
        await seedDuplicates();
        const before = await readGraph();
        const result = await handleToolCall('priority_dedup', { dryRun }, manager);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Invalid dryRun');
        expect(await readGraph()).toEqual(before);
      });
    });
  });

  // ==================== compress_context ====================
  describe('compress_context tool', () => {
    it('should compress text with default level', async () => {
      const result = await handleToolCall('compress_context', {
        text: 'Alice is a software engineer who works at Acme Corp. She has been there for five years.',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data).toBeDefined();
    });

    it('should accept level enum values', async () => {
      for (const level of ['light', 'medium', 'aggressive'] as const) {
        const result = await handleToolCall('compress_context', {
          text: 'Some text to compress for context window optimization.',
          level,
        }, manager);
        expect(result.isError).toBeUndefined();
      }
    });

    it('should reject invalid level', async () => {
      const result = await handleToolCall('compress_context', {
        text: 'test',
        level: 'extreme',
      }, manager);
      expect(result.isError).toBe(true);
    });

    it('should reject missing text', async () => {
      const result = await handleToolCall('compress_context', {}, manager);
      expect(result.isError).toBe(true);
    });
  });
});
