/**
 * Compares the Shape of a Returns block with the Shape that the handler returns.
 *
 * What is compared: key names, whether a key is optional, and how values nest (object, array, union).
 * What is not compared: the type of a leaf. A string, a number and a union of literals are all `prim`.
 * A type that the document names and does not expand (Entity, Relation) must be the type of the handler.
 */
import { describe } from './shape.js';
import type { Shape } from './shape.js';

/** A list of reasons why the block and the handler differ. An empty list means that they agree. */
export type Problems = string[];

function parts(shape: Shape): Shape[] {
  return shape.k === 'union' ? shape.members.flatMap(parts) : [shape];
}

export function conform(doc: Shape, real: Shape, at = '$'): Problems {
  // A block that says any or unknown for a value that has a type states nothing, so the gate cannot compare it.
  // When the handler type is also any or unknown, the block agrees with the type.
  if (doc.k === 'any') return real.k === 'any' ? [] : [`${at}: the block uses any or unknown, and the handler returns ${describe(real)}`];
  if (doc.k === 'unparsed') return [`${at}: the block uses a form that the gate cannot read`];
  // a value that the type checker cannot name gives nothing to compare against
  if (real.k === 'any') return [];
  if (real.k === 'risk') return [`${at}: the handler returns ${real.why}, and JSON.stringify changes that value`];

  const d = parts(doc);
  const r = parts(real);
  // One object in the block can show several object forms of the handler: a key that not every form has is optional.
  if (d.length === 1 && d[0].k === 'obj' && r.length > 1 && r.every((m) => m.k === 'obj')) {
    return conformObject(d[0], mergeObjects(r as ObjShape[]), at);
  }
  if (d.length > 1 || r.length > 1) return conformUnion(d, r, at);

  if (doc.k === 'nullish' && real.k === 'nullish') return [];
  if (doc.k === 'prim' && real.k === 'prim') return [];
  if (doc.k === 'array' && real.k === 'array') return conform(doc.el, real.el, `${at}[]`);
  if (doc.k === 'record' && real.k === 'record') return conform(doc.value, real.value, `${at}{}`);
  if (doc.k === 'named') {
    if (real.k === 'obj' && real.name === doc.name) return [];
    return [`${at}: the block names ${doc.name}, the handler returns ${describe(real)}`];
  }
  if (doc.k === 'obj' && real.k === 'obj') return conformObject(doc, real, at);
  return [`${at}: the block shows ${describe(doc)}, the handler returns ${describe(real)}`];
}

type ObjShape = Extract<Shape, { k: 'obj' }>;

/** The object that shows every key of the forms. A key is optional when a form lacks it or a form marks it optional. */
function mergeObjects(forms: ObjShape[]): ObjShape {
  const names = [...new Set(forms.flatMap((f) => f.props.map((p) => p.name)))];
  const props = names.map((name) => {
    const found = forms.map((f) => f.props.find((p) => p.name === name));
    return {
      name,
      optional: found.some((p) => !p || p.optional),
      t: combine(found.filter((p): p is NonNullable<typeof p> => !!p).map((p) => p.t)),
    };
  });
  return { k: 'obj', props, name: undefined };
}

function conformObject(doc: ObjShape, real: ObjShape, at: string): Problems {
  const problems: Problems = [];
  const realProps = new Map(real.props.map((p) => [p.name, p]));
  const docProps = new Map(doc.props.map((p) => [p.name, p]));
  for (const p of doc.props) {
    if (!realProps.has(p.name)) problems.push(`${at}.${p.name}: the block shows this key, the handler type has no such key`);
  }
  for (const p of real.props) {
    if (!docProps.has(p.name)) problems.push(`${at}.${p.name}: the handler type has this key, the block does not show it`);
  }
  for (const p of doc.props) {
    const q = realProps.get(p.name);
    if (!q) continue;
    if (p.optional !== q.optional) {
      problems.push(`${at}.${p.name}: the block says ${p.optional ? 'optional' : 'required'}, the handler type says ${q.optional ? 'optional' : 'required'}`);
    }
    problems.push(...conform(p.t, q.t, `${at}.${p.name}`));
  }
  return problems;
}

/** Every member of the block needs a counterpart in the handler type, and every member of the handler type needs one in the block. */
function conformUnion(d: Shape[], r: Shape[], at: string): Problems {
  const problems: Problems = [];
  for (const m of d) {
    if (!r.some((x) => conform(m, x, at).length === 0)) problems.push(`${at}: the block member ${describe(m)} has no counterpart in the handler type ${r.map(describe).join(' | ')}`);
  }
  for (const m of r) {
    if (!d.some((x) => conform(x, m, at).length === 0)) problems.push(`${at}: the handler member ${describe(m)} has no counterpart in the block ${d.map(describe).join(' | ')}`);
  }
  return problems;
}

/** The Shape of everything a handler returns as JSON: one shape, or a union of the distinct shapes of its sites. */
export function combine(shapes: Shape[]): Shape {
  const distinct: Shape[] = [];
  for (const s of shapes) {
    if (!distinct.some((x) => JSON.stringify(x) === JSON.stringify(s))) distinct.push(s);
  }
  return distinct.length === 1 ? distinct[0] : { k: 'union', members: distinct };
}
