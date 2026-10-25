/**
 * Derives what each handler of src/server/toolHandlers.ts returns, from the TypeScript type checker.
 *
 * The result does not depend on any comment or document. For each property of the `toolHandlers` object,
 * the code finds every call of the three response formatters. The code follows a call of a local function
 * (up to three levels). The code reduces the TypeScript type of the argument to a Shape.
 */
import path from 'node:path';
import ts from 'typescript6';
import type { Prop, Shape } from './shape.js';

export type SiteKind = 'json' | 'text' | 'raw';

export interface Site {
  kind: SiteKind;
  /** True when the call sits inside a withCompression(...) call, or in a local function that one calls. */
  wrapped: boolean;
  /** 1-based line in toolHandlers.ts. */
  line: number;
  /** The shape of the value for a `json` site. */
  shape: Shape | null;
}

export interface Handler {
  line: number;
  sites: Site[];
  /** Why the handler has no sites, when its initializer is not an inline function. */
  note?: string;
}

export interface Derivation {
  tsVersion: string;
  handlers: Record<string, Handler>;
  /** Pre-emit diagnostics of the whole program, as text. The gate requires none. */
  diagnostics: string[];
}

const FORMATTERS: Record<string, SiteKind> = { formatToolResponse: 'json', formatTextResponse: 'text', formatRawResponse: 'raw' };
/** Properties below this depth are not expanded. A deeper type is reported as `any`, which the gate does not compare. */
const MAX_DEPTH = 6;
const LOCAL_CALL_DEPTH = 3;

export function derive(root: string, tsconfig = 'tsconfig.json'): Derivation {
  const configPath = path.join(root, tsconfig);
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'));
  // The config path sets configFilePath: the automatic type roots resolve from it, not from the current directory.
  const config = ts.parseJsonConfigFileContent(read.config, ts.sys, root, undefined, configPath);
  const program = ts.createProgram({ rootNames: config.fileNames, options: { ...config.options, noEmit: true } });
  const checker = program.getTypeChecker();
  const handlersFile = program.getSourceFile(path.join(root, 'src/server/toolHandlers.ts').replace(/\\/g, '/'));
  if (!handlersFile) throw new Error('toolHandlers.ts is not in the program');

  const diagnostics = ts.getPreEmitDiagnostics(program).map((d) => {
    const where = d.file && d.start !== undefined ? `${path.basename(d.file.fileName)}:${d.file.getLineAndCharacterOfPosition(d.start).line + 1} ` : '';
    return where + ts.flattenDiagnosticMessageText(d.messageText, ' ');
  });

  const lineOf = (node: ts.Node) => handlersFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const calleeName = (call: ts.CallExpression): string | null => {
    const e = call.expression;
    return ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : null;
  };
  const isInsideWithCompression = (node: ts.Node, stopAt: ts.Node | undefined): boolean => {
    for (let n = node.parent; n && n !== stopAt; n = n.parent) {
      if (ts.isCallExpression(n) && calleeName(n) === 'withCompression') return true;
    }
    return false;
  };

  const localFunctions = new Map<string, ts.FunctionLikeDeclaration>();
  handlersFile.forEachChild((n) => {
    if (ts.isFunctionDeclaration(n) && n.name) localFunctions.set(n.name.text, n);
    if (ts.isVariableStatement(n)) {
      for (const d of n.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) {
          localFunctions.set(d.name.text, d.initializer);
        }
      }
    }
  });

  const shapeOf = (type: ts.Type, node: ts.Node, depth: number): Shape => shapeOfType(checker, type, node, depth);

  function sitesOf(fn: ts.Node, depth: number, viaCompression: boolean): Site[] {
    const sites: Site[] = [];
    const visit = (node: ts.Node): void => {
      if (node !== fn && ts.isFunctionLike(node)) {
        // A nested function belongs to the handler only when it is the argument of withCompression.
        const parent = node.parent;
        if (!(parent && ts.isCallExpression(parent) && calleeName(parent) === 'withCompression')) return;
      }
      if (ts.isCallExpression(node)) {
        const name = calleeName(node);
        if (name && FORMATTERS[name]) {
          const arg = node.arguments[0];
          sites.push({
            kind: FORMATTERS[name],
            wrapped: viaCompression || isInsideWithCompression(node, fn.parent),
            line: lineOf(node),
            shape: FORMATTERS[name] === 'json' && arg ? shapeOf(checker.getTypeAtLocation(arg), arg, 0) : null,
          });
        } else if (name && name !== 'withCompression' && localFunctions.has(name) && depth < LOCAL_CALL_DEPTH) {
          sites.push(...sitesOf(localFunctions.get(name)!, depth + 1, viaCompression || isInsideWithCompression(node, fn.parent)));
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(fn);
    return sites;
  }

  let registry: ts.ObjectLiteralExpression | null = null;
  handlersFile.forEachChild((n) => {
    if (!ts.isVariableStatement(n)) return;
    for (const d of n.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.name.text === 'toolHandlers' && d.initializer && ts.isObjectLiteralExpression(d.initializer)) registry = d.initializer;
    }
  });
  if (!registry) throw new Error('the toolHandlers object literal is not in toolHandlers.ts');

  const handlers: Record<string, Handler> = {};
  for (const p of (registry as ts.ObjectLiteralExpression).properties) {
    const key = p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null;
    if (!key) continue;
    if (ts.isPropertyAssignment(p) && (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer))) {
      handlers[key] = { line: lineOf(p), sites: sitesOf(p.initializer, 0, false) };
    } else {
      handlers[key] = { line: lineOf(p), sites: [], note: 'the initializer is not an inline function' };
    }
  }
  return { tsVersion: ts.version, handlers, diagnostics };
}

/** The tools that have a response formatter call inside a withCompression call. */
export function wrappedTools(handlers: Record<string, Handler>): string[] {
  return Object.entries(handlers)
    .filter(([, h]) => h.sites.some((s) => s.wrapped))
    .map(([tool]) => tool)
    .sort();
}

// ---------- type to Shape ----------

function nameOf(type: ts.Type): string | undefined {
  const symbol = type.aliasSymbol ?? type.symbol;
  const name = symbol?.name;
  if (!name || name.startsWith('__') || name === 'Array' || name === 'Object') return undefined;
  return name;
}

const JSON_UNSAFE = new Set(['Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp', 'Error', 'Promise', 'Buffer', 'Uint8Array']);

function shapeOfType(checker: ts.TypeChecker, type: ts.Type, node: ts.Node, depth: number): Shape {
  const F = ts.TypeFlags;
  const flags = type.flags;
  if (flags & (F.Any | F.Unknown)) return { k: 'any' };
  if (flags & (F.Null | F.Undefined | F.Void)) return { k: 'nullish' };
  if (flags & (F.BooleanLike | F.StringLike | F.NumberLike)) return { k: 'prim' };
  if (flags & F.BigIntLike) return { k: 'risk', why: 'bigint' };
  if (type.isUnion()) {
    // undefined is dropped: JSON.stringify omits a key whose value is undefined, so it makes the key optional.
    const members: Shape[] = [];
    for (const t of type.types) {
      if (t.flags & (F.Undefined | F.Void)) continue;
      const m = shapeOfType(checker, t, node, depth);
      const same = members.some((x) => JSON.stringify(x) === JSON.stringify(m));
      if (!same) members.push(m);
    }
    // literals and booleans become one primitive member
    const rest = members.filter((m) => m.k !== 'prim');
    const prims = members.filter((m) => m.k === 'prim');
    const merged = prims.length ? [{ k: 'prim' } as Shape, ...rest] : rest;
    return merged.length === 1 ? merged[0] : { k: 'union', members: merged };
  }
  if (flags & F.Intersection) return objectShape(checker, type, node, depth);
  if (checker.isArrayType(type)) {
    const el = checker.getTypeArguments(type as ts.TypeReference)[0];
    return { k: 'array', el: el ? shapeOfType(checker, el, node, depth) : { k: 'any' } };
  }
  if (checker.isTupleType(type)) {
    const els = checker.getTypeArguments(type as ts.TypeReference).map((t) => shapeOfType(checker, t, node, depth));
    return { k: 'array', el: els.length === 1 ? els[0] : { k: 'union', members: els } };
  }
  const symbol = type.symbol;
  if (symbol && JSON_UNSAFE.has(symbol.name)) return { k: 'risk', why: symbol.name };
  if (type.getCallSignatures().length) return { k: 'risk', why: 'function' };
  if (symbol && symbol.flags & ts.SymbolFlags.Class) return { k: 'risk', why: `class instance ${symbol.name}` };
  if (flags & F.Object) return objectShape(checker, type, node, depth);
  return { k: 'any' };
}

function objectShape(checker: ts.TypeChecker, type: ts.Type, node: ts.Node, depth: number): Shape {
  const index = type.getStringIndexType();
  const props: Prop[] = [];
  for (const symbol of checker.getPropertiesOfType(type)) {
    const t = checker.getTypeOfSymbolAtLocation(symbol, node);
    const includesUndefined = t.isUnion() ? t.types.some((x) => x.flags & ts.TypeFlags.Undefined) : (t.flags & ts.TypeFlags.Undefined) !== 0;
    props.push({
      name: symbol.name,
      optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0 || includesUndefined,
      t: depth + 1 > MAX_DEPTH ? { k: 'any' } : shapeOfType(checker, t, node, depth + 1),
    });
  }
  if (props.length === 0 && index) return { k: 'record', value: shapeOfType(checker, index, node, depth + 1) };
  return { k: 'obj', props, name: nameOf(type) };
}
