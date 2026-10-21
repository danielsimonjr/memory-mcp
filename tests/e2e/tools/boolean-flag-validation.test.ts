/**
 * Boolean flag validation E2E tests
 *
 * `forget_memory` (dryRun), `ingest` (dryRun), `normalize_observations` (persist), `analyze_query`
 * (includePlan) and `smart_search` (includePlan) must validate their boolean flag. A flag that is
 * not a boolean returns an error and changes nothing. An earlier form of these handlers read the
 * flag with `args.X === true` (or `!== false`). The string "true" or the number 1 therefore counted
 * as false. `forget_memory` and `ingest` then performed the action that the client had asked to
 * preview.
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
  testDir = await fs.mkdtemp(join(tmpdir(), 'boolean-flag-'));
  memoryPath = join(testDir, 'memory.jsonl');
  await fs.writeFile(memoryPath, '');
  manager = new KnowledgeGraphManager(memoryPath);
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };

const parseResponse = (result: ToolResult) => JSON.parse(result.content[0].text);

/** The whole graph as the read_graph tool returns it. */
async function readGraph() {
  return parseResponse((await handleToolCall('read_graph', {}, manager)) as ToolResult);
}

const entityNames = (graph: { entities: Array<{ name: string }> }) => graph.entities.map((e) => e.name).sort();

/** Values that a JSON client can send and that are not a boolean. */
const notBoolean: Array<[string, unknown]> = [
  ['the string "true"', 'true'],
  ['the number 1', 1],
  ['null', null],
  ['an object', {}],
];

describe('Boolean flag validation E2E', () => {
  // ==================== forget_memory ====================
  describe('forget_memory dryRun', () => {
    const content = 'software engineer';

    beforeEach(async () => {
      await handleToolCall('create_entities', {
        entities: [
          { name: 'Alice', entityType: 'person', observations: [content, 'works at Acme'] },
          { name: 'Bob', entityType: 'person', observations: ['product manager', 'works at Acme'] },
        ],
      }, manager);
    });

    it.each(notBoolean)('rejects %s and deletes nothing', async (_label, value) => {
      const before = await readGraph();
      const result = (await handleToolCall('forget_memory', { content, dryRun: value }, manager)) as ToolResult;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid dryRun value');
      expect(await readGraph()).toEqual(before);
    });

    it('previews with dryRun true: lists the observation and changes nothing', async () => {
      const before = await readGraph();
      const result = (await handleToolCall('forget_memory', { content, dryRun: true }, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      const data = parseResponse(result);
      expect(data.method).toBe('exact');
      expect(data.deletedObservations).toEqual([{ entityName: 'Alice', observation: content }]);
      expect(await readGraph()).toEqual(before);
    });

    it('deletes with dryRun false', async () => {
      const result = (await handleToolCall('forget_memory', { content, dryRun: false }, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      const graph = await readGraph();
      const alice = graph.entities.find((e: { name: string }) => e.name === 'Alice');
      expect(alice.observations).toEqual(['works at Acme']);
    });

    it('deletes when dryRun is absent', async () => {
      const result = (await handleToolCall('forget_memory', { content }, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      const graph = await readGraph();
      const alice = graph.entities.find((e: { name: string }) => e.name === 'Alice');
      expect(alice.observations).toEqual(['works at Acme']);
    });
  });

  // ==================== ingest ====================
  describe('ingest dryRun', () => {
    const messages = [
      { role: 'user', content: 'What is the capital of France?' },
      { role: 'assistant', content: 'The capital of France is Paris.' },
    ];

    it.each(notBoolean)('rejects %s and writes nothing', async (_label, value) => {
      const result = (await handleToolCall('ingest', { messages, source: 'chat', dryRun: value }, manager)) as ToolResult;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid dryRun value');
      expect((await readGraph()).entities).toEqual([]);
    });

    it('previews with dryRun true: counts the entity and writes nothing', async () => {
      const result = (await handleToolCall('ingest', { messages, source: 'chat', dryRun: true }, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      expect(parseResponse(result).entitiesCreated).toBe(1);
      expect((await readGraph()).entities).toEqual([]);
    });

    it('writes with dryRun false', async () => {
      const result = (await handleToolCall('ingest', { messages, source: 'chat', dryRun: false }, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      expect(entityNames(await readGraph())).toContain('chat-001');
    });

    it('writes when dryRun is absent', async () => {
      const result = (await handleToolCall('ingest', { messages, source: 'chat' }, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      expect(entityNames(await readGraph())).toContain('chat-001');
    });
  });

  // ==================== normalize_observations ====================
  describe('normalize_observations persist', () => {
    const original = 'She joined Acme yesterday';

    beforeEach(async () => {
      await handleToolCall('create_entities', {
        entities: [{ name: 'Alice', entityType: 'person', observations: [original, 'software engineer'] }],
      }, manager);
    });

    const aliceObservations = async () => {
      const graph = await readGraph();
      return graph.entities.find((e: { name: string }) => e.name === 'Alice').observations as string[];
    };

    it.each(notBoolean)('rejects %s and saves nothing', async (_label, value) => {
      const before = await readGraph();
      const result = (await handleToolCall('normalize_observations', { persist: value }, manager)) as ToolResult;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid persist value');
      expect(await readGraph()).toEqual(before);
    });

    it('saves the normalized observations with persist true', async () => {
      const result = (await handleToolCall('normalize_observations', { persist: true }, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      expect(parseResponse(result).persisted).toBe(true);
      const observations = await aliceObservations();
      expect(observations[0]).not.toBe(original);
      expect(observations[0]).toContain('Alice joined Acme');
    });

    it('reports but saves nothing with persist false', async () => {
      const before = await readGraph();
      const result = (await handleToolCall('normalize_observations', { persist: false }, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      expect(parseResponse(result).persisted).toBe(false);
      expect(await readGraph()).toEqual(before);
    });

    it('reports but saves nothing when persist is absent', async () => {
      const before = await readGraph();
      const result = (await handleToolCall('normalize_observations', {}, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      expect(parseResponse(result).persisted).toBe(false);
      expect(await readGraph()).toEqual(before);
    });
  });

  // ==================== analyze_query and smart_search includePlan ====================
  // The two tools differ on purpose when the flag is absent: analyze_query returns no plan,
  // smart_search returns one. A flag that is not a boolean returns an error in both.
  describe.each([
    ['analyze_query', false],
    ['smart_search', true],
  ] as const)('%s includePlan', (tool, planWhenAbsent) => {
    const base = { query: 'find all engineers' };

    it.each(notBoolean)('rejects %s', async (_label, value) => {
      const result = (await handleToolCall(tool, { ...base, includePlan: value }, manager)) as ToolResult;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid includePlan value');
    });

    it('returns a plan with includePlan true', async () => {
      const result = (await handleToolCall(tool, { ...base, includePlan: true }, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      expect(parseResponse(result).plan).toBeDefined();
    });

    it('returns no plan with includePlan false', async () => {
      const result = (await handleToolCall(tool, { ...base, includePlan: false }, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      expect(parseResponse(result).plan).toBeUndefined();
    });

    it(`${planWhenAbsent ? 'returns a plan' : 'returns no plan'} when includePlan is absent`, async () => {
      const result = (await handleToolCall(tool, base, manager)) as ToolResult;
      expect(result.isError).toBeUndefined();
      expect(parseResponse(result).plan !== undefined).toBe(planWhenAbsent);
    });
  });
});
