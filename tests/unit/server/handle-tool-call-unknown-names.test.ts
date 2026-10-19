/**
 * Unit tests for the tool-name lookup in `handleToolCall`.
 *
 * `toolHandlers` is a plain object. A plain object inherits the members of
 * `Object.prototype`, so a lookup by a name that the client supplies must test
 * for an OWN property. Without that test, the names `constructor`, `toString`,
 * `valueOf`, `hasOwnProperty` and `__proto__` find an inherited member instead
 * of "no handler". The server then calls that member as if it were a tool
 * handler, or fails with an error message that does not name the tool.
 */

import { describe, it, expect } from 'vitest';
import { handleToolCall, toolHandlers } from '../../../src/server/toolHandlers.js';
import { toolDefinitions } from '../../../src/server/toolDefinitions.js';
import type { ManagerContext } from '@danielsimonjr/memoryjs';

// A name that no handler may touch: any access to the context fails the test.
const forbiddenCtx = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new Error(`handler touched the context: ${String(prop)}`);
    },
  }
) as unknown as ManagerContext;

const inheritedNames = [
  'constructor',
  'toString',
  'valueOf',
  'hasOwnProperty',
  '__proto__',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
];

describe('handleToolCall: a name that is not a tool', () => {
  it.each(inheritedNames)('rejects the inherited member name "%s" as an unknown tool', async (name) => {
    const result = await handleToolCall(name, {}, forbiddenCtx);
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: 'text', text: `Error: Unknown tool: ${name}` }]);
  });

  it('rejects every own property name of Object.prototype', async () => {
    const names = Object.getOwnPropertyNames(Object.prototype);
    expect(names.length).toBeGreaterThanOrEqual(inheritedNames.length);
    for (const name of names) {
      const result = await handleToolCall(name, {}, forbiddenCtx);
      expect(result.isError, name).toBe(true);
      expect(result.content[0]?.text, name).toBe(`Error: Unknown tool: ${name}`);
    }
  });

  it('keeps the same answer for a plain unknown name', async () => {
    const result = await handleToolCall('no_such_tool', {}, forbiddenCtx);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toBe('Error: Unknown tool: no_such_tool');
  });
});

describe('handleToolCall: a name that is a tool', () => {
  it('runs the handler of a registered tool', async () => {
    // Control: a registered name still reaches its handler.
    const ctx = {
      analyticsManager: { getGraphStats: async () => ({ totalEntities: 3 }) },
    } as unknown as ManagerContext;
    const result = await handleToolCall('get_graph_stats', {}, ctx);
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toEqual({ totalEntities: 3 });
  });

  it('has a handler for every tool definition and a definition for every handler', () => {
    const definitionNames = toolDefinitions.map((tool) => tool.name).sort();
    const handlerNames = Object.keys(toolHandlers).sort();
    expect(handlerNames).toEqual(definitionNames);
  });
});
