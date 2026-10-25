/**
 * Reads the Returns blocks of docs/architecture/API.md.
 *
 * A Returns block is TypeScript type text. The module parses each block with the TypeScript parser and
 * reduces the block to a Shape (see shape.ts). The gate therefore does not depend on the layout of the text.
 */
import ts from 'typescript6';
import type { Prop, Shape } from './shape.js';

export interface ReturnsBlock {
  tool: string;
  /** 1-based line of the `**Returns:**` marker. */
  line: number;
  /** The text between the code fences. */
  text: string;
}

/**
 * Finds the first fenced block after each `**Returns:**` marker, under a `### <tool>` heading.
 * A heading of more than one word is not a tool name and does not start a block.
 */
export function readReturnsBlocks(markdown: string): ReturnsBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReturnsBlock[] = [];
  let tool: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const heading = /^### (.+?)\s*$/.exec(lines[i]);
    if (heading) {
      tool = /^\S+$/.test(heading[1]) ? heading[1] : null;
      continue;
    }
    if (/^## /.test(lines[i])) {
      tool = null;
      continue;
    }
    if (!tool || !/^\*\*Returns:?\*\*/.test(lines[i])) continue;
    let open = i + 1;
    while (open < lines.length && lines[open].trim() === '') open++;
    if (open >= lines.length || !/^```/.test(lines[open])) continue;
    const body: string[] = [];
    let close = open + 1;
    while (close < lines.length && !/^```/.test(lines[close])) body.push(lines[close++]);
    blocks.push({ tool, line: i + 1, text: body.join('\n') });
  }
  return blocks;
}

/** The tool names in the bullet list that follows "These tools are wrapped:". */
export function readWrappedTools(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => /These tools are wrapped:\s*$/.test(l));
  if (start < 0) throw new Error('API.md has no line that ends with "These tools are wrapped:"');
  const names: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === '' && names.length === 0) continue;
    const bullet = /^- `([^`]+)`\s*$/.exec(lines[i]);
    if (!bullet) break;
    names.push(bullet[1]);
  }
  return names;
}

export interface ParsedBlock {
  shape: Shape;
  /** Syntax errors that the TypeScript parser reports for the block text. */
  diagnostics: string[];
}

/** Parses the text of one block as the right side of a type alias and reduces it to a Shape. */
export function parseBlock(text: string): ParsedBlock {
  const prefix = 'type __Returns = ';
  const source = ts.createSourceFile('block.ts', `${prefix}${text}\n;`, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const parseDiagnostics = (source as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics;
  const diagnostics = parseDiagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '));
  const alias = source.statements.find(ts.isTypeAliasDeclaration);
  if (!alias) return { shape: { k: 'unparsed' }, diagnostics: [...diagnostics, 'no type alias'] };
  return { shape: shapeOfNode(alias.type), diagnostics };
}

function shapeOfNode(node: ts.TypeNode): Shape {
  if (ts.isParenthesizedTypeNode(node)) return shapeOfNode(node.type);
  if (ts.isArrayTypeNode(node)) return { k: 'array', el: shapeOfNode(node.elementType) };
  if (ts.isUnionTypeNode(node)) return { k: 'union', members: node.types.map(shapeOfNode) };
  if (ts.isLiteralTypeNode(node)) {
    return node.literal.kind === ts.SyntaxKind.NullKeyword ? { k: 'nullish' } : { k: 'prim' };
  }
  if (ts.isTypeLiteralNode(node)) return shapeOfLiteral(node);
  if (ts.isTypeReferenceNode(node)) {
    const name = node.typeName.getText();
    const args = node.typeArguments ?? [];
    if (name === 'Array' && args.length === 1) return { k: 'array', el: shapeOfNode(args[0]) };
    if (name === 'Record' && args.length === 2) return { k: 'record', value: shapeOfNode(args[1]) };
    return { k: 'named', name };
  }
  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword:
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.BooleanKeyword:
      return { k: 'prim' };
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.UndefinedKeyword:
    case ts.SyntaxKind.VoidKeyword:
      return { k: 'nullish' };
    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword:
      return { k: 'any' };
    default:
      return { k: 'unparsed' };
  }
}

function shapeOfLiteral(node: ts.TypeLiteralNode): Shape {
  const props: Prop[] = [];
  let index: Shape | null = null;
  for (const member of node.members) {
    if (ts.isIndexSignatureDeclaration(member)) {
      index = member.type ? shapeOfNode(member.type) : { k: 'any' };
    } else if (ts.isPropertySignature(member) && member.type) {
      const name = ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : member.name.getText();
      props.push({ name, optional: member.questionToken !== undefined, t: shapeOfNode(member.type) });
    } else {
      return { k: 'unparsed' };
    }
  }
  if (props.length === 0 && index) return { k: 'record', value: index };
  return { k: 'obj', props };
}
