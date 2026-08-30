/**
 * MCP 2026-07-28 protocol integration tests.
 *
 * Exercises the server through createMcpHandler with modern _meta envelopes,
 * matching how MCP 2.0 clients reach remote servers over Streamable HTTP.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createMcpHandler,
  PROTOCOL_VERSION_META_KEY,
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
} from '@modelcontextprotocol/server';
import { Server } from '@modelcontextprotocol/server';
import { ManagerContext as KnowledgeGraphManager } from '@danielsimonjr/memoryjs';
import { toolDefinitions } from '../../src/server/toolDefinitions.js';
import { handleToolCall } from '../../src/server/toolHandlers.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/** MCP 2.0 protocol revision (2026-07-28). */
const MCP_2026_07_28 = '2026-07-28';

function modernHeaders(method: string, name?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'mcp-protocol-version': MCP_2026_07_28,
    'mcp-method': method,
  };
  if (name !== undefined) {
    headers['mcp-name'] = name;
  }
  return headers;
}

function modernMeta() {
  return {
    [PROTOCOL_VERSION_META_KEY]: MCP_2026_07_28,
    [CLIENT_CAPABILITIES_META_KEY]: {},
    [CLIENT_INFO_META_KEY]: { name: 'vitest', version: '1.0.0' },
  };
}

function buildServer() {
  const server = new Server(
    { name: 'memory-server-test', version: '0.0.0-test' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler('tools/list', async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args ?? {}, manager);
  });

  return server;
}

let manager: KnowledgeGraphManager;
let testDir: string;

describe('MCP 2026-07-28 protocol', () => {
  beforeEach(async () => {
    testDir = join(tmpdir(), `mcp2-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });
    manager = new KnowledgeGraphManager(join(testDir, 'test-graph.jsonl'));
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('serves tools/list over the modern protocol envelope', async () => {
    const handler = createMcpHandler(buildServer);

    const response = await handler.fetch(
      new Request('http://test.local/mcp', {
        method: 'POST',
        headers: modernHeaders('tools/list'),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {
            _meta: modernMeta(),
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.error).toBeUndefined();
    expect(payload.result.tools).toHaveLength(241);
  });

  it('serves tools/call over the modern protocol envelope', async () => {
    const handler = createMcpHandler(buildServer);

    const response = await handler.fetch(
      new Request('http://test.local/mcp', {
        method: 'POST',
        headers: modernHeaders('tools/call', 'read_graph'),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'read_graph',
            arguments: {},
            _meta: modernMeta(),
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.error).toBeUndefined();
    expect(payload.result.content[0].type).toBe('text');
    expect(() => JSON.parse(payload.result.content[0].text)).not.toThrow();
  });

  it('answers server/discover with supported modern protocol versions', async () => {
    const handler = createMcpHandler(buildServer);

    const response = await handler.fetch(
      new Request('http://test.local/mcp', {
        method: 'POST',
        headers: modernHeaders('server/discover'),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'server/discover',
          params: {
            _meta: modernMeta(),
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.error).toBeUndefined();
    expect(payload.result.supportedVersions).toContain(MCP_2026_07_28);
    expect(payload.result.capabilities?.tools).toBeDefined();
  });
});
