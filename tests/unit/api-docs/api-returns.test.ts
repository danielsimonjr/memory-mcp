/**
 * The API.md Returns gate.
 *
 * A tool in docs/architecture/API.md can have a Returns block: TypeScript type text that shows the JSON
 * which the tool returns. This test derives the same shape from the handlers in src/server/toolHandlers.ts,
 * with the TypeScript type checker, and fails when a block and a handler disagree. It also compares the list
 * of wrapped tools in the Response Format section with the withCompression calls in the handlers.
 *
 * The gate compares key names, optional keys, and nesting (object, array, union). A block that says
 * `any` or `unknown` for a value that has a type fails, because the gate cannot compare such a block.
 * The gate does NOT compare:
 *  - the type of a leaf value (a string, a number, a union of literals)
 *  - the comments in a block and the sentences after a block
 *  - a tool that has no Returns block
 *  - which keys occur together, when one block shows several forms of one response
 *  - a value that the type checker cannot name (`any`, `unknown`, or deeper than six levels)
 *  - the text forms of a handler that also returns text, such as export_graph without compression
 *
 * The derivation uses the `typescript6` alias in package.json. The `typescript` package of this project is
 * version 7, and its module has no `createProgram`: its programmatic API is marked unstable.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { toolDefinitions } from '../../../src/server/toolDefinitions.js';
import { checkTool, checkWrapped } from './check.js';
import { derive } from './derive.js';
import type { Derivation, Handler } from './derive.js';
import { parseBlock, readReturnsBlocks, readWrappedTools } from './doc.js';

const root = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const markdown = readFileSync(path.join(root, 'docs/architecture/API.md'), 'utf8');
const blocks = readReturnsBlocks(markdown);

let derivation: Derivation;

// The build of the TypeScript program takes about 15 seconds.
// Under `npm test`, V8 coverage also instruments the compiler.
// The build then takes about 52 seconds when this file runs alone.
// The other test files that run at the same time add more.
// The explicit limit is for this hook only.
beforeAll(() => {
  derivation = derive(root);
}, 180_000);

describe('handlers', () => {
  it('compile without a diagnostic', () => {
    expect(derivation.diagnostics).toEqual([]);
  });

  it('have one entry for each tool definition', () => {
    const defined = toolDefinitions.map((t) => t.name).sort();
    expect(Object.keys(derivation.handlers).sort()).toEqual(defined);
  });
});

describe('Returns blocks of API.md', () => {
  it('are read once for each Returns marker', () => {
    const markers = markdown.split(/\r?\n/).filter((l) => /^\*\*Returns:?\*\*/.test(l)).length;
    expect(blocks.length).toBe(markers);
    expect(new Set(blocks.map((b) => b.tool)).size).toBe(blocks.length);
  });

  it('are all compared with a handler', () => {
    const skipped = blocks
      .filter((b) => checkTool(b, derivation.handlers[b.tool]).verdict === 'not-derived')
      .map((b) => `${b.tool}: ${derivation.handlers[b.tool].note ?? 'no response formatter call found'}`);
    expect(skipped).toEqual([]);
  });

  it.each(blocks.map((b) => [b.tool, b] as const))('%s agrees with its handler', (_tool, block) => {
    const result = checkTool(block, derivation.handlers[block.tool]);
    expect(result.problems.map((p) => `API.md line ${block.line}: ${p}`)).toEqual([]);
  });
});

describe('Response Format section of API.md', () => {
  it('lists the tools that withCompression wraps', () => {
    const listed = readWrappedTools(markdown);
    expect(listed.length).toBeGreaterThan(0);
    expect(checkWrapped(derivation.handlers, listed)).toEqual([]);
  });
});

// The checks above pass on the real files. These tests change one input and show that the gate then fails.
describe('the gate fails on a changed input', () => {
  const site = (shape: ReturnType<typeof parseBlock>['shape']): Handler['sites'][number] => ({ kind: 'json', wrapped: false, line: 1, shape });
  const handlerOf = (type: string): Handler => ({ line: 1, sites: [site(parseBlock(type).shape)] });
  const blockOf = (text: string) => ({ tool: 'sample', line: 1, text });
  const problemsOf = (text: string, handler: Handler | undefined) => checkTool(blockOf(text), handler).problems.join('\n');

  it('accepts a block that has the shape of the handler', () => {
    expect(problemsOf('{ id: string; tags?: string[] }', handlerOf('{ id: string; tags?: string[] }'))).toBe('');
  });

  it('rejects a renamed key', () => {
    const problems = problemsOf('{ id: string; label: string }', handlerOf('{ id: string; name: string }'));
    expect(problems).toContain('$.label: the block shows this key');
    expect(problems).toContain('$.name: the handler type has this key');
  });

  it('rejects a key that the handler type does not have', () => {
    expect(problemsOf('{ id: string; extra: number }', handlerOf('{ id: string }'))).toContain('$.extra: the block shows this key');
  });

  it('rejects a key that the block does not show', () => {
    expect(problemsOf('{ id: string }', handlerOf('{ id: string; extra: number }'))).toContain('$.extra: the handler type has this key');
  });

  it('rejects a key that changes between optional and required', () => {
    expect(problemsOf('{ id: string; note?: string }', handlerOf('{ id: string; note: string }'))).toContain('$.note: the block says optional');
    expect(problemsOf('{ id: string; note: string }', handlerOf('{ id: string; note?: string }'))).toContain('$.note: the block says required');
  });

  it('rejects a changed nesting', () => {
    expect(problemsOf('{ items: string[] }', handlerOf('{ items: { id: string }[] }'))).toContain('$.items[]');
  });

  it('accepts one block for several forms, and rejects a key that is required in the block only', () => {
    const forms = handlerOf('{ a: string; b: string } | { a: string; c: string }');
    expect(problemsOf('{ a: string; b?: string; c?: string }', forms)).toBe('');
    expect(problemsOf('{ a: string; b: string; c?: string }', forms)).toContain('$.b: the block says required');
  });

  it('rejects a block that does not parse', () => {
    expect(problemsOf('{ id: string', handlerOf('{ id: string }'))).toContain('does not parse');
  });

  it('rejects a block for a name that is not a handler', () => {
    expect(problemsOf('{ id: string }', undefined)).toContain('not a handler');
  });

  it('rejects a block that says any or unknown for a value that has a type', () => {
    expect(problemsOf('{ id: any }', handlerOf('{ id: string }'))).toContain('$.id: the block uses any or unknown');
    expect(problemsOf('unknown', handlerOf('{ id: string }'))).toContain('$: the block uses any or unknown');
  });

  it('accepts unknown in the block when the handler type is unknown too', () => {
    expect(problemsOf('{ details: unknown }', handlerOf('{ details: unknown }'))).toBe('');
  });

  it('rejects a type name that the handler does not return', () => {
    expect(problemsOf('Mystery', handlerOf('{ id: string }'))).toContain('Mystery');
  });

  it('requires string for a handler that returns only text', () => {
    const textOnly: Handler = { line: 1, sites: [{ kind: 'text', wrapped: false, line: 1, shape: null }] };
    expect(problemsOf('string', textOnly)).toBe('');
    expect(problemsOf('{ id: string }', textOnly)).toContain('handler returns');
  });

  it('rejects a handler type that lost a key', () => {
    const block = blocks.find((b) => {
      const shape = parseBlock(b.text).shape;
      const handler = derivation.handlers[b.tool];
      return shape.k === 'obj' && shape.props.length >= 2 && handler?.sites.length === 1 && handler.sites[0].kind === 'json';
    });
    expect(block, 'API.md has a block for an object with a single JSON site').toBeDefined();
    const handler = structuredClone(derivation.handlers[block!.tool]);
    const shape = handler.sites[0].shape;
    expect(shape?.k).toBe('obj');
    const lost = (shape as Extract<typeof shape, { k: 'obj' }>).props.pop()!;
    expect(problemsOf(block!.text, handler)).toContain(`$.${lost.name}: the block shows this key`);
  });

  it('rejects a wrapped tool that the section does not list, and a listed tool that is not wrapped', () => {
    const listed = readWrappedTools(markdown);
    expect(checkWrapped(derivation.handlers, listed.slice(1)).join('\n')).toContain(listed[0]);
    expect(checkWrapped(derivation.handlers, [...listed, 'no_such_tool']).join('\n')).toContain('no_such_tool');
  });
});

describe('the reader of API.md', () => {
  it('finds a block after a Returns marker under a one-word heading', () => {
    const sample = ['## Group', '### some_tool', '', '**Returns:**', '```typescript', '{ id: string }', '```', '### Two words', '**Returns:**', '```typescript', 'string', '```'].join('\n');
    expect(readReturnsBlocks(sample)).toEqual([{ tool: 'some_tool', line: 4, text: '{ id: string }' }]);
  });

  it('stops with an error when the wrapped list is missing', () => {
    expect(() => readWrappedTools('A document with no list.')).toThrow('These tools are wrapped:');
  });
});
