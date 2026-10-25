/**
 * The API.md gate checks are functions. Each check takes the input as an argument. The test file runs the
 * checks on the real API.md and the real handlers. The test file runs the checks again on changed input to
 * show each check can fail.
 */
import { combine, conform } from './conform.js';
import type { Problems } from './conform.js';
import { parseBlock } from './doc.js';
import type { ReturnsBlock } from './doc.js';
import { wrappedTools } from './derive.js';
import type { Handler } from './derive.js';

export type Verdict = 'compared' | 'text-only' | 'not-derived' | 'no-handler';

export interface ToolResult {
  tool: string;
  line: number;
  verdict: Verdict;
  problems: Problems;
}

/** Compares one Returns block with the handler of the same name. */
export function checkTool(block: ReturnsBlock, handler: Handler | undefined): ToolResult {
  const result = (verdict: Verdict, problems: Problems): ToolResult => ({ tool: block.tool, line: block.line, verdict, problems });
  if (!handler) return result('no-handler', ['the document has a Returns block for a name that is not a handler']);

  const parsed = parseBlock(block.text);
  if (parsed.diagnostics.length) return result('compared', parsed.diagnostics.map((d) => `the block does not parse as a TypeScript type: ${d}`));

  const json = handler.sites.filter((s) => s.kind === 'json' && s.shape).map((s) => s.shape!);
  const text = handler.sites.filter((s) => s.kind === 'text' || s.kind === 'raw');
  if (json.length === 0) {
    if (text.length === 0) return result('not-derived', []);
    // a handler that returns only text: the block shows `string`
    return result('text-only', conform(parsed.shape, { k: 'prim' }));
  }
  const real = combine(json);
  if (real.k === 'any') return result('not-derived', []);
  return result('compared', conform(parsed.shape, real));
}

/** Compares the tools that call a formatter inside withCompression with the list in the Response Format section. */
export function checkWrapped(handlers: Record<string, Handler>, documented: string[]): Problems {
  const derived = wrappedTools(handlers);
  const listed = [...documented].sort();
  const problems: Problems = [];
  for (const t of derived) if (!listed.includes(t)) problems.push(`${t} is wrapped by withCompression and the Response Format section does not list it`);
  for (const t of listed) if (!derived.includes(t)) problems.push(`${t} is listed in the Response Format section and no withCompression call wraps it`);
  return problems;
}
