/**
 * memoryjs v3.0.0 Tools E2E Tests (v12.6.0)
 *
 * Tests the tool surfaces added for memoryjs 3.0.0:
 * - Event Memory: record_event, get_event, query_events, get_event_flow, who_did_what
 * - Reconstructive Memory: ingest_dialogue, reconstruct_memory, reconstructive_memory_stats
 * - Relation Consolidation: analyze_relation_duplicates, consolidate_relations
 * - hybrid_search v3 options (graphWeight, expandNeighbors, explain, lookFor)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManagerContext as KnowledgeGraphManager } from '@danielsimonjr/memoryjs';
import { handleToolCall } from '../../../src/server/toolHandlers.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('memoryjs v3.0.0 Tools E2E', () => {
  let manager: KnowledgeGraphManager;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `v3-tools-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });
    manager = new KnowledgeGraphManager(join(testDir, 'graph.jsonl'));
  });

  afterEach(async () => {
    try { await fs.rm(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  const parse = (r: { content: Array<{ type: string; text: string }> }) => JSON.parse(r.content[0].text);

  describe('Event Memory', () => {
    it('records an event and reads it back', async () => {
      const recorded = await handleToolCall('record_event', {
        action: 'deployed',
        actor: 'alice',
        target: 'api-service',
        flowKey: 'release-42',
        detail: ['rollout completed in 3 minutes'],
      }, manager);
      expect(recorded.isError).toBeUndefined();
      const { event } = parse(recorded);
      expect(event.action).toBe('deployed');
      expect(event.actor).toBe('alice');
      expect(event.target).toBe('api-service');

      const fetched = await handleToolCall('get_event', { name: event.name }, manager);
      expect(parse(fetched).event.name).toBe(event.name);
    });

    it('returns a friendly message for an unknown event', async () => {
      const result = await handleToolCall('get_event', { name: 'no-such-event' }, manager);
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('not found');
    });

    it('queries events by actor', async () => {
      await handleToolCall('record_event', { action: 'approved', actor: 'bob', target: 'pr-1' }, manager);
      await handleToolCall('record_event', { action: 'merged', actor: 'alice', target: 'pr-1' }, manager);
      const result = await handleToolCall('query_events', { actor: 'bob' }, manager);
      const data = parse(result);
      expect(data.count).toBe(1);
      expect(data.events[0].action).toBe('approved');
    });

    it('returns a chronological flow', async () => {
      await handleToolCall('record_event', {
        action: 'opened', actor: 'alice', flowKey: 'incident-7', occurredAt: '2026-01-01T10:00:00Z',
      }, manager);
      await handleToolCall('record_event', {
        action: 'resolved', actor: 'bob', flowKey: 'incident-7', occurredAt: '2026-01-01T12:00:00Z',
      }, manager);
      const result = await handleToolCall('get_event_flow', { flowKey: 'incident-7' }, manager);
      const data = parse(result);
      expect(data.count).toBe(2);
      expect(data.events[0].action).toBe('opened');
      expect(data.events[1].action).toBe('resolved');
    });

    it('answers who did what to a target', async () => {
      await handleToolCall('record_event', { action: 'restarted', actor: 'carol', target: 'db-primary' }, manager);
      const result = await handleToolCall('who_did_what', { target: 'db-primary' }, manager);
      const data = parse(result);
      expect(data.count).toBe(1);
      expect(data.entries[0].actor).toBe('carol');
      expect(data.entries[0].action).toBe('restarted');
    });

    it('rejects an event without an actor', async () => {
      const result = await handleToolCall('record_event', { action: 'deployed' }, manager);
      expect(result.isError).toBe(true);
    });
  });

  describe('Reconstructive Memory', () => {
    it('ingests dialogue and reports distillation + stats', async () => {
      const result = await handleToolCall('ingest_dialogue', {
        turns: [
          { id: 't1', speaker: 'user', text: 'I adopted a cat named Miso last spring.' },
          { id: 't2', speaker: 'assistant', text: 'Miso sounds lovely. What breed is the cat?' },
          { id: 't3', speaker: 'user', text: 'Miso is a tabby and loves sitting on the keyboard.' },
        ],
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parse(result);
      expect(Array.isArray(data.distillation.sentences)).toBe(true);
      expect(data.stats).toBeDefined();
    });

    it('reconstructs an answer with evidence and trajectory', async () => {
      await handleToolCall('ingest_dialogue', {
        turns: [
          { id: 't1', speaker: 'user', text: 'My cat Miso is a tabby that loves keyboards.' },
        ],
      }, manager);
      const result = await handleToolCall('reconstruct_memory', { query: 'What is the cat called?' }, manager);
      expect(result.isError).toBeUndefined();
      const data = parse(result);
      expect(data.query).toBe('What is the cat called?');
      expect(Array.isArray(data.evidence)).toBe(true);
      expect(Array.isArray(data.trajectory)).toBe(true);
    });

    it('reports graph stats', async () => {
      const result = await handleToolCall('reconstructive_memory_stats', {}, manager);
      expect(result.isError).toBeUndefined();
      const data = parse(result);
      expect(typeof data).toBe('object');
    });

    it('rejects an empty turns array', async () => {
      const result = await handleToolCall('ingest_dialogue', { turns: [] }, manager);
      expect(result.isError).toBe(true);
    });
  });

  describe('Relation Consolidation', () => {
    beforeEach(async () => {
      await handleToolCall('create_entities', {
        entities: [
          { name: 'alice', entityType: 'person', observations: [] },
          { name: 'acme', entityType: 'company', observations: [] },
        ],
      }, manager);
      // Two trivial spelling variants of the same relation → tier 1 exact duplicate.
      await handleToolCall('create_relations', {
        relations: [
          { from: 'alice', to: 'acme', relationType: 'works_at' },
          { from: 'alice', to: 'acme', relationType: 'WorksAt' },
        ],
      }, manager);
    });

    it('reports spelling-variant duplicates without mutating', async () => {
      const result = await handleToolCall('analyze_relation_duplicates', {}, manager);
      expect(result.isError).toBeUndefined();
      const report = parse(result);
      expect(report.exactDuplicates.length).toBe(1);
      expect(report.exactDuplicates[0].normalizedType).toBe('works_at');
      // Dry run: both variants must still exist.
      const graph = await manager.storage.loadGraph();
      expect(graph.relations.filter((r) => r.from === 'alice').length).toBe(2);
    });

    it('consolidate without apply is a dry run', async () => {
      const result = await handleToolCall('consolidate_relations', {}, manager);
      const data = parse(result);
      expect(data.applied).toBe(false);
      expect(data.relationsDeleted).toBe(0);
    });

    it('consolidate with apply merges the variants', async () => {
      const result = await handleToolCall('consolidate_relations', { apply: true }, manager);
      const data = parse(result);
      expect(data.applied).toBe(true);
      expect(data.relationsDeleted).toBeGreaterThan(0);
      const graph = await manager.storage.loadGraph();
      expect(graph.relations.filter((r) => r.from === 'alice').length).toBe(1);
    });
  });

  describe('hybrid_search v3 options', () => {
    beforeEach(async () => {
      await handleToolCall('create_entities', {
        entities: [
          { name: 'auth-service', entityType: 'service', observations: ['handles login and tokens'] },
          { name: 'user-db', entityType: 'database', observations: ['stores user accounts'] },
        ],
      }, manager);
      await handleToolCall('create_relations', {
        relations: [{ from: 'auth-service', to: 'user-db', relationType: 'reads_from' }],
      }, manager);
    });

    it('accepts graph channel + explain options', async () => {
      const result = await handleToolCall('hybrid_search', {
        query: 'login',
        graphWeight: 0.2,
        expandNeighbors: { topK: 5 },
        explain: true,
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = parse(result);
      expect(data.weights.graph).toBe(0.2);
      expect(data.resultCount).toBeGreaterThan(0);
    });

    it('accepts lookFor and stays backward compatible without v3 options', async () => {
      const withLookFor = await handleToolCall('hybrid_search', {
        query: 'login',
        expandNeighbors: {},
        lookFor: 'the database it reads from',
      }, manager);
      expect(withLookFor.isError).toBeUndefined();

      const plain = await handleToolCall('hybrid_search', { query: 'login' }, manager);
      expect(plain.isError).toBeUndefined();
      const data = parse(plain);
      expect(data.weights.graph).toBeUndefined();
    });
  });
});
