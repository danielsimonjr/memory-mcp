/**
 * The shape of a JSON value, as far as the API.md gate compares it.
 *
 * The gate compares key names, whether a key is optional, and how values nest. The gate does not compare the
 * type of a leaf (string, number, a literal union): the documents narrow some leaves by hand.
 */
export type Shape =
  /** string, number, boolean, a literal or a union of literals */
  | { k: 'prim' }
  | { k: 'nullish' }
  | { k: 'any' }
  | { k: 'array'; el: Shape }
  /** An object with named keys. `name` is the name of the TypeScript type when it has one. */
  | { k: 'obj'; props: Prop[]; name?: string }
  /** An object with no named keys and an index signature, or Record<string, V>. */
  | { k: 'record'; value: Shape }
  /** A type that the document names and does not expand (Entity, Relation). */
  | { k: 'named'; name: string }
  | { k: 'union'; members: Shape[] }
  /** A value that JSON.stringify changes (Map, Set, Date, a class instance, a function). */
  | { k: 'risk'; why: string }
  /** Text that the gate cannot reduce to a shape. */
  | { k: 'unparsed' };

export interface Prop {
  name: string;
  optional: boolean;
  t: Shape;
}

/** Writes a shape as one short line, for failure messages. */
export function describe(shape: Shape): string {
  switch (shape.k) {
    case 'prim':
      return 'primitive';
    case 'nullish':
      return 'null';
    case 'any':
      return 'any';
    case 'array':
      return `${describe(shape.el)}[]`;
    case 'obj':
      return shape.name ? `${shape.name} {${shape.props.map((p) => p.name + (p.optional ? '?' : '')).join(', ')}}` : `{${shape.props.map((p) => p.name + (p.optional ? '?' : '')).join(', ')}}`;
    case 'record':
      return `{ [key: string]: ${describe(shape.value)} }`;
    case 'named':
      return shape.name;
    case 'union':
      return shape.members.map(describe).join(' | ');
    case 'risk':
      return `risk(${shape.why})`;
    case 'unparsed':
      return 'unparsed';
  }
}
