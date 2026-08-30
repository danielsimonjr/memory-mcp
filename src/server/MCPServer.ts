/**
 * MCP Server
 *
 * Handles Model Context Protocol server initialization and tool registration.
 * Tool definitions and handlers are extracted to separate modules for maintainability.
 *
 * Serves MCP protocol revision 2026-07-28 via `serveStdio`, with backward-compatible
 * support for 2025-era clients on the same stdio connection.
 *
 * @module server/MCPServer
 */

import { createRequire } from 'node:module';
import { Server, type CallToolRequest, type ListToolsResult, type Tool } from '@modelcontextprotocol/server';
import { serveStdio, type StdioServerHandle } from '@modelcontextprotocol/server/stdio';
import { logger, type ManagerContext } from '@danielsimonjr/memoryjs';
import { toolDefinitions } from './toolDefinitions.js';
import { handleToolCall } from './toolHandlers.js';

const require = createRequire(import.meta.url);
/**
 * Injected by scripts/build-bundle.mjs (esbuild `define`) for the plugin bundle;
 * undefined in the plain `tsc` build, which falls back to reading package.json.
 */
declare const __PKG_VERSION__: string | undefined;

// `require('../../package.json')` resolves from dist/server/ but NOT from
// bundle/index.mjs, where it threw "Cannot find module '../../package.json'" and
// killed the server on startup. The injected constant is used when present; the
// `typeof` guard is safe on an undeclared identifier and lets esbuild
// dead-code-eliminate the require branch in the bundle.
const version: string =
  typeof __PKG_VERSION__ === 'string'
    ? __PKG_VERSION__
    : (require('../../package.json') as { version: string }).version;

/**
 * MCP Server for Knowledge Graph operations.
 * Exposes tools for entity/relation management, search, and analysis.
 */
export class MCPServer {
  private ctx: ManagerContext;
  private stdioHandle: StdioServerHandle | null = null;

  constructor(ctx: ManagerContext) {
    this.ctx = ctx;
  }

  /**
   * Build a fresh Server instance for one stdio connection.
   * `serveStdio` pins one instance per connection; the shared ManagerContext
   * holds graph state across reconnects.
   */
  private createServer(): Server {
    const server = new Server(
      {
        name: 'memory-server',
        version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    server.setRequestHandler('tools/list', async (): Promise<ListToolsResult> => ({
      tools: toolDefinitions as Tool[],
    }));

    server.setRequestHandler('tools/call', async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;
      return handleToolCall(name, args ?? {}, this.ctx);
    });

    return server;
  }

  async start() {
    this.stdioHandle = serveStdio(() => this.createServer());
    logger.info('Knowledge Graph MCP Server running on stdio (MCP 2026-07-28)');
  }

  async close() {
    await this.stdioHandle?.close();
    this.stdioHandle = null;
  }
}
