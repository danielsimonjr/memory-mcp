/**
 * Procedural memory E2E tests: add_procedure argument validation
 *
 * `add_procedure` used to cast its arguments to the library type and pass them on. The library
 * checks only that `steps` is present, so a step list given as a string, a step without an
 * `action`, a step order given as a string, a name that is a number and similar input were
 * stored. The handler now validates the arguments with the shape that the inputSchema declares
 * (plus `successRate` and `executionCount`, which the library accepts and a restore can supply).
 *
 * The library does not store `name`: `get_procedure` returns the id as the name. These tests do
 * not assert the name of a stored procedure.
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
  testDir = await fs.mkdtemp(join(tmpdir(), 'procedural-memory-'));
  memoryPath = join(testDir, 'memory.jsonl');
  await fs.writeFile(memoryPath, '');
  manager = new KnowledgeGraphManager(memoryPath);
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };

const parseResponse = (result: ToolResult) => JSON.parse(result.content[0].text);

const entityCount = async () =>
  parseResponse((await handleToolCall('read_graph', {}, manager)) as ToolResult).entities.length as number;

const step = { order: 1, action: 'http.get', parameters: { url: 'https://example.test' } };

describe('add_procedure argument validation E2E', () => {
  /** Input that the inputSchema forbids. Each case used to be accepted or to fail with another message. */
  const invalid: Array<[string, Record<string, unknown>]> = [
    ['steps missing', { id: 'p' }],
    ['steps given as a string', { id: 'p', steps: 'not an array' }],
    ['a step without action', { id: 'p', steps: [{ order: 1, parameters: {} }] }],
    ['a step without parameters', { id: 'p', steps: [{ order: 1, action: 'a' }] }],
    ['a step order given as a string', { id: 'p', steps: [{ order: '1', action: 'a', parameters: {} }] }],
    ['a step parameter value that is a number', { id: 'p', steps: [{ order: 1, action: 'a', parameters: { n: 5 } }] }],
    ['a step timeout given as a string', { id: 'p', steps: [{ order: 1, action: 'a', parameters: {}, timeout: '5' }] }],
    ['a fallback that is not a step', { id: 'p', steps: [{ order: 1, action: 'a', parameters: {}, fallback: { action: 'x' } }] }],
    ['a name that is a number', { id: 'p', name: 42, steps: [step] }],
    ['an id that is a number', { id: 9, steps: [step] }],
    ['triggers given as a string', { id: 'p', steps: [step], triggers: 'abc' }],
    ['a successRate above 1', { id: 'p', steps: [step], successRate: 5 }],
    ['a negative executionCount', { id: 'p', steps: [step], executionCount: -1 }],
  ];

  it.each(invalid)('rejects %s and stores nothing', async (_label, args) => {
    const result = (await handleToolCall('add_procedure', args, manager)) as ToolResult;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid procedure');
    expect(await entityCount()).toBe(0);
  });

  it('stores a full procedure and returns it from get_procedure', async () => {
    const added = (await handleToolCall('add_procedure', {
      id: 'deploy',
      name: 'Deploy the site',
      description: 'Push the build',
      steps: [
        { order: 1, action: 'build', parameters: { target: 'prod' }, timeout: 60000 },
        { order: 2, action: 'push', parameters: {}, fallback: { order: 1, action: 'rollback', parameters: {} } },
      ],
      triggers: ['deploy', 'release'],
    }, manager)) as ToolResult;
    expect(added.isError).toBeUndefined();
    expect(parseResponse(added).id).toBe('deploy');

    const got = (await handleToolCall('get_procedure', { id: 'deploy' }, manager)) as ToolResult;
    expect(got.isError).toBeUndefined();
    const procedure = parseResponse(got);
    expect(procedure.description).toBe('Push the build');
    expect(procedure.triggers).toEqual(['deploy', 'release']);
    expect(procedure.steps.map((s: { action: string }) => s.action)).toEqual(['build', 'push']);
    expect(procedure.steps[0].parameters).toEqual({ target: 'prod' });
  });

  it('generates an id when the id is absent', async () => {
    const result = (await handleToolCall('add_procedure', { steps: [step] }, manager)) as ToolResult;
    expect(result.isError).toBeUndefined();
    expect(parseResponse(result).id).toMatch(/^proc-/);
  });

  it('keeps a successRate and an executionCount that the caller supplies (a restore path)', async () => {
    const added = (await handleToolCall('add_procedure', {
      id: 'restored',
      steps: [step],
      successRate: 0.5,
      executionCount: 3,
    }, manager)) as ToolResult;
    expect(added.isError).toBeUndefined();
    const procedure = parseResponse((await handleToolCall('get_procedure', { id: 'restored' }, manager)) as ToolResult);
    expect(procedure.successRate).toBe(0.5);
    expect(procedure.executionCount).toBe(3);
  });

  it('accepts a key that the inputSchema does not declare and ignores it, as before', async () => {
    // The inputSchema says additionalProperties false, but no layer has ever rejected an extra key.
    // This case pins that behaviour. A decision to reject extra keys changes this case.
    const result = (await handleToolCall('add_procedure', { id: 'extra', steps: [step], bogus: 1 }, manager)) as ToolResult;
    expect(result.isError).toBeUndefined();
    expect(parseResponse(result)).not.toHaveProperty('bogus');
  });
});
