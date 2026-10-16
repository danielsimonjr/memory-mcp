import { describe, expect, it } from 'vitest';
import { splitClauseItems } from '../../tools/create-dependency-graph/clause-items';

// tools/create-dependency-graph reads the names inside `{ ... }` of an import or export clause.
// The body can hold `//` and block comments. Before the fix, the comment text joined the next
// name: `ManagerContext, // note\n  type Entity` became the two names `// note` and `type Entity`
// with the comment glued to the front of the second.
describe('splitClauseItems', () => {
  it('keeps a comment after a comma out of the next name', () => {
    const body = ' logger, ManagerContext, // Re-export types for backward compatibility\n  type Entity, Relation ';
    expect(splitClauseItems(body)).toEqual(['logger', 'ManagerContext', 'type Entity', 'Relation']);
  });

  it('does not split on a comma that is inside a line comment', () => {
    expect(splitClauseItems('a, // one, two, three\n b')).toEqual(['a', 'b']);
  });

  it('removes a block comment, also one that holds a comma', () => {
    expect(splitClauseItems('a, /* x, y */ b, c /* z */')).toEqual(['a', 'b', 'c']);
  });

  it('removes a block comment that spans lines', () => {
    expect(splitClauseItems('a,\n /* first line\n second line */\n b')).toEqual(['a', 'b']);
  });

  it('removes a comment after the last name when there is no trailing comma', () => {
    expect(splitClauseItems('\n  a,\n  b // last item\n')).toEqual(['a', 'b']);
  });

  it('handles Windows line endings', () => {
    expect(splitClauseItems('a, // note\r\n  b,\r\n  c // last\r\n')).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty list for a body that holds only comments', () => {
    expect(splitClauseItems(' // nothing here\n /* or here */ ')).toEqual([]);
  });

  it('leaves a clause without comments as it was, and drops empty items', () => {
    expect(splitClauseItems(' a ,b,  c , ')).toEqual(['a', 'b', 'c']);
  });

  it('keeps the `type` prefix and the `as` rename for the caller to read', () => {
    expect(splitClauseItems('type Foo, Bar as Baz')).toEqual(['type Foo', 'Bar as Baz']);
  });
});
