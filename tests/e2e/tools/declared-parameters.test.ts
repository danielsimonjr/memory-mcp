/**
 * Declared-parameter E2E tests
 *
 * Nothing between a client and a handler validates arguments against the inputSchema, so the text
 * of tools/list is the whole contract for a client. These tests pin what the handlers do with
 * parameters whose declaration was missing or untrue:
 *
 * - `adaptive_retrieve` takes `budgetTokens`, `maxRounds`, `minCoverage` and `resultsPerRound`.
 *   The library fixes the retrieval settings in the constructor and `adaptiveRetrieve` reads only
 *   the query, so the four parameters have no effect. The case below fails when the library starts
 *   to honour one: the text in tools/list and in API.md must then change.
 * - `session_start` takes `metadata`. The session record has no such field.
 * - `save_search` and `update_saved_search` accept and store `entityType`. The saved search does not
 *   apply it when it runs, so neither inputSchema declares it.
 * - `create_relations` stores `weight`, `confidence` and `metadata`. `delete_relations` matches on
 *   `from`, `to` and `relationType` only.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManagerContext as KnowledgeGraphManager } from '@danielsimonjr/memoryjs';
import { handleToolCall } from '../../../src/server/toolHandlers.js';
import { toolDefinitions } from '../../../src/server/toolDefinitions.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let manager: KnowledgeGraphManager;
let testDir: string;
let memoryPath: string;

beforeEach(async () => {
  testDir = await fs.mkdtemp(join(tmpdir(), 'declared-parameters-'));
  memoryPath = join(testDir, 'memory.jsonl');
  await fs.writeFile(memoryPath, '');
  manager = new KnowledgeGraphManager(memoryPath);
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };

const parseResponse = (result: ToolResult) => JSON.parse(result.content[0].text);

const call = async (name: string, args: Record<string, unknown>) =>
  (await handleToolCall(name, args, manager)) as ToolResult;

describe('adaptive_retrieve parameters that have no effect', () => {
  // 15 entities; 12 contain "gadget" and 3 contain "sprocket". A term that is in every document has an
  // IDF of 0 and the TF-IDF search returns nothing. The term must therefore be in some documents only.
  beforeEach(async () => {
    const entities = Array.from({ length: 15 }, (_, i) => ({
      name: `Widget${i}`,
      entityType: 'thing',
      observations: [i % 5 === 4 ? `The widget number ${i} is a plain sprocket` : `The widget number ${i} belongs to the gadget family`],
    }));
    expect((await call('create_entities', { entities })).isError).toBeUndefined();
    expect((await call('reindex', {})).isError).toBeUndefined();
  });

  const retrieve = async (args: Record<string, unknown>) => {
    const result = await call('adaptive_retrieve', args);
    expect(result.isError).toBeUndefined();
    return parseResponse(result);
  };

  it('runs the fixed settings: 3 rounds of 10 results while coverage stays below 0.6', async () => {
    const base = await retrieve({ query: 'gadget' });
    expect(base.rounds).toHaveLength(3);
    expect(base.bestResults).toHaveLength(10);
    expect(base.bestCoverage).toBeLessThan(0.6);
  });

  // Without this control the "changes nothing" cases below could pass for a fixture on which no
  // setting matters. The controller takes the three settings in its constructor, and this server
  // never passes them. Here the same fixture runs under a controller that does get them.
  it.each([
    ['the fixed settings', {}, { rounds: 3, results: 10 }],
    ['maxRounds 1', { maxRounds: 1 }, { rounds: 1, results: 10 }],
    ['resultsPerRound 3', { resultsPerRound: 3 }, { rounds: 3, results: 3 }],
    ['minCoverage 0', { minCoverage: 0 }, { rounds: 1, results: 10 }],
  ])('control: the fixture does react to a constructor setting (%s)', async (_label, config, expected) => {
    type Controller = new (
      rankedSearch: unknown,
      config: Record<string, unknown>,
    ) => { adaptiveRetrieve(context: { query: string }): Promise<{ rounds: unknown[]; bestResults: unknown[] }> };
    const ControllerClass = manager.activeRetrieval.constructor as unknown as Controller;
    const result = await new ControllerClass(manager.rankedSearch, config).adaptiveRetrieve({ query: 'gadget' });
    expect({ rounds: result.rounds.length, results: result.bestResults.length }).toEqual(expected);
  });

  it('control: a different query gives a different result', async () => {
    const gadget = await retrieve({ query: 'gadget' });
    const sprocket = await retrieve({ query: 'sprocket' });
    expect(sprocket.rounds.length).not.toBe(gadget.rounds.length);
    expect(sprocket.bestResults).toHaveLength(3);
  });

  it.each([
    ['0', 0],
    ['-5', -5],
    ['1.5', 1.5],
    ['the string "10"', '10'],
  ])('rejects a budgetTokens that is not a positive integer (%s)', async (_label, budgetTokens) => {
    const result = await call('adaptive_retrieve', { query: 'gadget', budgetTokens });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid budgetTokens');
  });

  it.each([
    ['budgetTokens 1', { budgetTokens: 1 }],
    ['maxRounds 1', { maxRounds: 1 }],
    ['minCoverage 0', { minCoverage: 0 }],
    ['resultsPerRound 3', { resultsPerRound: 3 }],
    ['all four at once', { budgetTokens: 1, maxRounds: 1, minCoverage: 0, resultsPerRound: 3 }],
  ])('%s changes nothing', async (_label, extra) => {
    const base = await retrieve({ query: 'gadget' });
    expect(await retrieve({ query: 'gadget', ...extra })).toEqual(base);
  });
});

describe('session_start metadata', () => {
  it('accepts metadata and does not store it', async () => {
    const withMetadata = await call('session_start', { taskDescription: 'check the plan', metadata: { team: 'blue' } });
    const without = await call('session_start', { taskDescription: 'check the plan' });
    expect(withMetadata.isError).toBeUndefined();
    const a = parseResponse(withMetadata);
    const b = parseResponse(without);
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    expect(JSON.stringify(a)).not.toContain('blue');
    expect(a).not.toHaveProperty('metadata');
  });
});

describe('saved searches with entityType', () => {
  beforeEach(async () => {
    await call('create_entities', {
      entities: [
        { name: 'Alice', entityType: 'person', observations: ['likes tea'] },
        { name: 'Teapot', entityType: 'object', observations: ['holds tea'] },
      ],
    });
  });

  const names = (executed: unknown): string[] => {
    const value = executed as { entities?: Array<{ name: string }> } | Array<{ name: string }>;
    const list = Array.isArray(value) ? value : (value.entities ?? []);
    return list.map((e) => e.name).sort();
  };

  // The library stores entityType with the saved search. `executeSavedSearch` passes the query, the
  // tags and the two importance limits to the search, and never reads entityType. The filter
  // therefore has no effect when the search runs. A parameter that does nothing is not declared: a
  // declaration invites a client to rely on it. The handlers keep accepting and storing it. These
  // cases fail when the library starts to apply it: the declarations and API.md must then change.
  it('neither save_search nor update_saved_search declares entityType in its inputSchema', () => {
    const schema = (name: string) => toolDefinitions.find(t => t.name === name)?.inputSchema as { properties?: Record<string, { properties?: Record<string, unknown> }> };
    const save = schema('save_search').properties;
    const updates = schema('update_saved_search').properties?.updates?.properties;
    expect(Object.keys(save ?? {})).not.toContain('entityType');
    expect(updates).toBeDefined();
    expect(Object.keys(updates ?? {})).not.toContain('entityType');
  });

  it('control: execute_saved_search applies the query', async () => {
    await call('save_search', { name: 'holders', query: 'holds' });
    expect(names(parseResponse(await call('execute_saved_search', { name: 'holders' })))).toEqual(['Teapot']);
  });

  it('save_search stores entityType and execute_saved_search does not apply it', async () => {
    const saved = await call('save_search', { name: 'tea people', query: 'tea', entityType: 'person' });
    expect(saved.isError).toBeUndefined();
    expect(parseResponse(saved).entityType).toBe('person');
    expect(names(parseResponse(await call('execute_saved_search', { name: 'tea people' })))).toEqual(['Alice', 'Teapot']);
  });

  it('update_saved_search changes the stored entityType and execute_saved_search does not apply it', async () => {
    await call('save_search', { name: 'tea', query: 'tea' });
    const updated = await call('update_saved_search', { name: 'tea', updates: { entityType: 'object' } });
    expect(updated.isError).toBeUndefined();
    expect(parseResponse(updated).entityType).toBe('object');
    expect(names(parseResponse(await call('execute_saved_search', { name: 'tea' })))).toEqual(['Alice', 'Teapot']);
  });

  it('update_saved_search rejects a key that is not one of its six', async () => {
    await call('save_search', { name: 'tea', query: 'tea' });
    const result = await call('update_saved_search', { name: 'tea', updates: { bogus: 1 } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid update data');
  });
});

describe('relation keys beyond from, to and relationType', () => {
  beforeEach(async () => {
    await call('create_entities', {
      entities: [
        { name: 'A', entityType: 'thing', observations: ['a'] },
        { name: 'B', entityType: 'thing', observations: ['b'] },
      ],
    });
  });

  const relations = async () => parseResponse(await call('read_graph', {})).relations as Array<Record<string, unknown>>;

  it('create_relations stores weight, confidence and metadata', async () => {
    const result = await call('create_relations', {
      relations: [{ from: 'A', to: 'B', relationType: 'knows', weight: 0.5, confidence: 0.3, metadata: { source: 'test' } }],
    });
    expect(result.isError).toBeUndefined();
    const [relation] = await relations();
    expect(relation).toMatchObject({ from: 'A', to: 'B', relationType: 'knows', weight: 0.5, confidence: 0.3, metadata: { source: 'test' } });
  });

  it.each([
    ['weight 0 to 1', { weight: 2 }],
    ['confidence 0 to 1', { confidence: -1 }],
  ])('create_relations keeps the range of %s', async (_label, extra) => {
    const result = await call('create_relations', { relations: [{ from: 'A', to: 'B', relationType: 'knows', ...extra }] });
    expect(result.isError).toBe(true);
    expect(await relations()).toEqual([]);
  });

  it('delete_relations matches on from, to and relationType only', async () => {
    await call('create_relations', { relations: [{ from: 'A', to: 'B', relationType: 'knows', weight: 0.5 }] });
    const result = await call('delete_relations', { relations: [{ from: 'A', to: 'B', relationType: 'knows' }] });
    expect(result.isError).toBeUndefined();
    expect(await relations()).toEqual([]);
  });

  it('delete_relations ignores a weight that differs from the stored one', async () => {
    await call('create_relations', { relations: [{ from: 'A', to: 'B', relationType: 'knows', weight: 0.5 }] });
    const result = await call('delete_relations', { relations: [{ from: 'A', to: 'B', relationType: 'knows', weight: 0.9 }] });
    expect(result.isError).toBeUndefined();
    expect(await relations()).toEqual([]);
  });
});
