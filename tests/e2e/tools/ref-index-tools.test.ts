/**
 * Ref Index Tools E2E Tests
 *
 * Tests for register_ref, resolve_ref, deregister_ref, and list_refs tools.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManagerContext as KnowledgeGraphManager } from '@danielsimonjr/memoryjs';
import { handleToolCall } from '../../../src/server/toolHandlers.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../../..');

// getStorageFilePath() in toolHandlers falls back to 'memory.jsonl' in cwd when
// storage.filePath is undefined. RefIndex, AuditLog, etc. are therefore written
// to the project root. We must reset those shared files between tests.
const SHARED_REF_INDEX = join(PROJECT_ROOT, 'memory-ref-index.jsonl');

let manager: KnowledgeGraphManager;
let testDir: string;
let memoryPath: string;

beforeEach(async () => {
  // Truncate the shared ref-index file so each test starts clean
  await fs.writeFile(SHARED_REF_INDEX, '');
  testDir = await fs.mkdtemp(join(tmpdir(), 'ref-index-tools-'));
  memoryPath = join(testDir, 'memory.jsonl');
  await fs.writeFile(memoryPath, '');
  manager = new KnowledgeGraphManager(memoryPath);
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

async function createTestEntity(name: string) {
  await handleToolCall('create_entities', {
    entities: [{ name, entityType: 'test', observations: [`Test entity ${name}`] }],
  }, manager);
}

describe('Ref Index Tools E2E', () => {
  // ==================== register_ref ====================
  describe('register_ref tool', () => {
    it('should register a ref pointing to an entity', async () => {
      await createTestEntity('Alice');
      const result = await handleToolCall('register_ref', {
        ref: 'alice-ref',
        entityName: 'Alice',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.ref).toBe('alice-ref');
      expect(data.entityName).toBe('Alice');
    });

    it('should register a ref with optional description', async () => {
      await createTestEntity('Bob');
      const result = await handleToolCall('register_ref', {
        ref: 'bob-ref',
        entityName: 'Bob',
        description: 'Primary reference for Bob',
      }, manager);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.ref).toBe('bob-ref');
      expect(data.description).toBe('Primary reference for Bob');
    });

    it('should require ref parameter', async () => {
      const result = await handleToolCall('register_ref', {
        entityName: 'Alice',
      }, manager);
      expect(result.isError).toBe(true);
    });

    it('should require entityName parameter', async () => {
      const result = await handleToolCall('register_ref', {
        ref: 'some-ref',
      }, manager);
      expect(result.isError).toBe(true);
    });

    it('should reject empty ref string', async () => {
      const result = await handleToolCall('register_ref', {
        ref: '',
        entityName: 'Alice',
      }, manager);
      expect(result.isError).toBe(true);
    });

    it('should return MCP-compliant content array', async () => {
      await createTestEntity('Alice');
      const result = await handleToolCall('register_ref', {
        ref: 'format-ref',
        entityName: 'Alice',
      }, manager);
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should include createdAt timestamp in response', async () => {
      await createTestEntity('Alice');
      const result = await handleToolCall('register_ref', {
        ref: 'ts-ref',
        entityName: 'Alice',
      }, manager);
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('createdAt');
    });
  });

  // ==================== resolve_ref ====================
  describe('resolve_ref tool', () => {
    it('should resolve a registered ref to entity name', async () => {
      await createTestEntity('Alice');
      await handleToolCall('register_ref', { ref: 'alice-ref', entityName: 'Alice' }, manager);

      const result = await handleToolCall('resolve_ref', { ref: 'alice-ref' }, manager);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.ref).toBe('alice-ref');
      expect(data.entityName).toBe('Alice');
    });

    it('should return text message for unknown ref', async () => {
      const result = await handleToolCall('resolve_ref', { ref: 'nonexistent-ref' }, manager);
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('not registered');
    });

    it('should require ref parameter', async () => {
      const result = await handleToolCall('resolve_ref', {}, manager);
      expect(result.isError).toBe(true);
    });

    it('should reject empty ref string', async () => {
      const result = await handleToolCall('resolve_ref', { ref: '' }, manager);
      expect(result.isError).toBe(true);
    });
  });

  // ==================== deregister_ref ====================
  describe('deregister_ref tool', () => {
    it('should deregister a registered ref', async () => {
      await createTestEntity('Alice');
      await handleToolCall('register_ref', { ref: 'alice-ref', entityName: 'Alice' }, manager);

      const result = await handleToolCall('deregister_ref', { ref: 'alice-ref' }, manager);
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('deregistered');
    });

    it('should make ref unresolvable after deregistration', async () => {
      await createTestEntity('Alice');
      await handleToolCall('register_ref', { ref: 'temp-ref', entityName: 'Alice' }, manager);
      await handleToolCall('deregister_ref', { ref: 'temp-ref' }, manager);

      const result = await handleToolCall('resolve_ref', { ref: 'temp-ref' }, manager);
      expect(result.content[0].text).toContain('not registered');
    });

    it('should require ref parameter', async () => {
      const result = await handleToolCall('deregister_ref', {}, manager);
      expect(result.isError).toBe(true);
    });

    it('should include ref name in deregister response', async () => {
      await createTestEntity('Alice');
      await handleToolCall('register_ref', { ref: 'alice-ref', entityName: 'Alice' }, manager);

      const result = await handleToolCall('deregister_ref', { ref: 'alice-ref' }, manager);
      expect(result.content[0].text).toContain('alice-ref');
    });
  });

  // ==================== list_refs ====================
  describe('list_refs tool', () => {
    it('should return a list of refs (empty after truncation or with parallel test artifacts)', async () => {
      const result = await handleToolCall('list_refs', {}, manager);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      // May contain refs from parallel test suites sharing the same ref-index file
      expect(Array.isArray(data.refs)).toBe(true);
      expect(typeof data.count).toBe('number');
      expect(data.count).toBeGreaterThanOrEqual(0);
    });

    it('should list all registered refs (including test-registered ones)', async () => {
      await createTestEntity('Alice');
      await createTestEntity('Bob');
      await handleToolCall('register_ref', { ref: 'ref-a', entityName: 'Alice' }, manager);
      await handleToolCall('register_ref', { ref: 'ref-b', entityName: 'Bob' }, manager);

      const result = await handleToolCall('list_refs', {}, manager);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      // When run concurrently with other test files that also use RefIndex,
      // the count may be higher — verify expected refs ARE present
      expect(data.count).toBeGreaterThanOrEqual(2);
      const refNames = data.refs.map((r: { ref: string }) => r.ref);
      expect(refNames).toContain('ref-a');
      expect(refNames).toContain('ref-b');
    });

    it('should filter refs by entityName', async () => {
      await createTestEntity('Alice');
      await createTestEntity('Bob');
      await handleToolCall('register_ref', { ref: 'alice-ref-1', entityName: 'Alice' }, manager);
      await handleToolCall('register_ref', { ref: 'alice-ref-2', entityName: 'Alice' }, manager);
      await handleToolCall('register_ref', { ref: 'bob-ref', entityName: 'Bob' }, manager);

      const result = await handleToolCall('list_refs', { entityName: 'Alice' }, manager);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      // When filtering by entityName, only Alice's refs should be returned
      expect(data.count).toBeGreaterThanOrEqual(2);
      data.refs.forEach((r: { entityName: string }) => {
        expect(r.entityName).toBe('Alice');
      });
    });

    it('should return count matching refs array length', async () => {
      await createTestEntity('Alice');
      await handleToolCall('register_ref', { ref: 'r1', entityName: 'Alice' }, manager);
      await handleToolCall('register_ref', { ref: 'r2', entityName: 'Alice' }, manager);

      const result = await handleToolCall('list_refs', {}, manager);
      const data = JSON.parse(result.content[0].text);
      expect(data.count).toBe(data.refs.length);
    });
  });
});

// The reference index file follows the store name, as it does in memoryjs
// (`<store basename>-ref-index.jsonl`). A literal name made two stores in one
// folder share one index.
describe('Ref Index file name', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(tmpdir(), 'ref-index-name-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  async function newStore(fileName: string): Promise<KnowledgeGraphManager> {
    const storePath = join(dir, fileName);
    await fs.writeFile(storePath, '');
    const ctx = new KnowledgeGraphManager(storePath);
    await handleToolCall('create_entities', {
      entities: [{ name: 'Alice', entityType: 'test', observations: ['Test entity Alice'] }],
    }, ctx);
    return ctx;
  }

  it('writes <store basename>-ref-index.jsonl next to a store with a non-default name', async () => {
    const ctx = await newStore('foo.jsonl');
    const result = await handleToolCall('register_ref', { ref: 'alice-ref', entityName: 'Alice' }, ctx);
    expect(result.isError).toBeUndefined();

    const names = await fs.readdir(dir);
    expect(names).toContain('foo-ref-index.jsonl');
    expect(names).not.toContain('memory-ref-index.jsonl');
  });

  it('keeps the refs of two stores in one folder apart', async () => {
    const first = await newStore('first.jsonl');
    const second = await newStore('second.jsonl');
    await handleToolCall('register_ref', { ref: 'shared-ref', entityName: 'Alice' }, first);

    const result = await handleToolCall('resolve_ref', { ref: 'shared-ref' }, second);
    expect(result.content[0].text).toContain('is not registered');
  });
});
