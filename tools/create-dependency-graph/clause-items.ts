/**
 * Names inside the braces of an import or export clause.
 *
 * The text between `{` and `}` can hold `//` comments and block comments. A comma that is
 * inside a comment must not split the list, and a comment must not become part of a name.
 */

const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

/**
 * Split the body of a clause into its items.
 *
 * The function removes the comments, splits on commas, trims each item and drops empty items.
 * An item keeps its `type` prefix and its `as` rename for the caller to read.
 */
export function splitClauseItems(body: string): string[] {
  return body
    .replace(COMMENT, ' ')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
