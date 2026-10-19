import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { findPackProblems, mainEntry } from '../../../scripts/check-pack-list.mjs';

// scripts/check-pack-list.mjs fails when the npm tarball holds a build file that has no source.
// `tsc` never deletes output whose source is gone, so a build over an old `dist/` leaves orphans.
// Versions 12.7.0 to 12.9.0 shipped 150 of them: 168 packed files where a clean build gives 18.
const script = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scripts', 'check-pack-list.mjs');

const SOURCES = new Set([
  'src/index.ts',
  'src/server/MCPServer.ts',
  'src/server/toolHandlers.ts',
  'src/ui/panel.tsx',
]);
const sourceExists = (candidate: string) => SOURCES.has(candidate);
const base = { main: 'dist/index.js', sourceExists };

describe('findPackProblems', () => {
  it('accepts a pack list in which every build file has a source', () => {
    const packed = [
      'package.json',
      'README.md',
      'LICENSE',
      'dist/index.js',
      'dist/index.d.ts',
      'dist/index.d.ts.map',
      'dist/server/MCPServer.js',
      'dist/server/MCPServer.d.ts',
      'dist/server/MCPServer.js.map',
    ];
    expect(findPackProblems({ ...base, packed })).toEqual([]);
  });

  it('flags a build file whose source is gone', () => {
    const packed = ['package.json', 'dist/index.js', 'dist/core/EntityManager.js'];
    expect(findPackProblems({ ...base, packed })).toEqual([
      { path: 'dist/core/EntityManager.js', reason: 'no-source' },
    ]);
  });

  it('flags the declaration file and the map of an orphan as separate files', () => {
    const packed = ['package.json', 'dist/index.js', 'dist/old.d.ts', 'dist/old.d.ts.map'];
    expect(findPackProblems({ ...base, packed }).map((p) => p.path)).toEqual(['dist/old.d.ts', 'dist/old.d.ts.map']);
  });

  it('finds the source of a .tsx component', () => {
    const packed = ['package.json', 'dist/index.js', 'dist/ui/panel.js'];
    expect(findPackProblems({ ...base, packed })).toEqual([]);
  });

  it('flags a file that is neither a package file nor build output', () => {
    const packed = ['package.json', 'dist/index.js', 'notes.txt', '.env'];
    expect(findPackProblems({ ...base, packed })).toEqual([
      { path: 'notes.txt', reason: 'outside-output' },
      { path: '.env', reason: 'outside-output' },
    ]);
  });

  it('accepts the package files that npm adds on its own', () => {
    const packed = ['package.json', 'README.md', 'README', 'LICENSE', 'LICENSE.md', 'LICENCE', 'dist/index.js'];
    expect(findPackProblems({ ...base, packed })).toEqual([]);
  });

  it('flags an output file of a type it cannot map to a source', () => {
    const packed = ['package.json', 'dist/index.js', 'dist/schema.json'];
    expect(findPackProblems({ ...base, packed })).toEqual([{ path: 'dist/schema.json', reason: 'unknown-output-type' }]);
  });

  it('accepts a file that a configured allow pattern names', () => {
    const packed = ['package.json', 'dist/index.js', 'dist/schema.json'];
    expect(findPackProblems({ ...base, packed, allow: ['^dist/.+\\.json$'] })).toEqual([]);
  });

  it('flags a pack list that lacks the main entry', () => {
    const packed = ['package.json', 'README.md'];
    expect(findPackProblems({ ...base, packed })).toEqual([{ path: 'dist/index.js', reason: 'main-missing' }]);
  });

  it('reads Windows separators as folder separators', () => {
    const packed = ['package.json', 'dist\\index.js', 'dist\\core\\gone.js'];
    expect(findPackProblems({ ...base, packed })).toEqual([{ path: 'dist/core/gone.js', reason: 'no-source' }]);
  });

  it('honours a different output folder and source folder', () => {
    const packed = ['package.json', 'lib/index.js', 'lib/extra.js'];
    const result = findPackProblems({
      packed,
      main: 'lib/index.js',
      out: 'lib',
      src: 'source',
      sourceExists: (c) => c === 'source/index.ts',
    });
    expect(result).toEqual([{ path: 'lib/extra.js', reason: 'no-source' }]);
  });
});

describe('mainEntry', () => {
  it('drops a leading ./ from main', () => {
    expect(mainEntry({ main: './dist/index.js' })).toBe('dist/index.js');
  });

  it('returns null when package.json has no main', () => {
    expect(mainEntry({})).toBeNull();
  });
});

describe('check-pack-list command', () => {
  const roots: string[] = [];
  afterEach(() => {
    while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true });
  });

  const fixture = (): string => {
    const root = mkdtempSync(join(tmpdir(), 'pack-check-'));
    roots.push(root);
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fixture-pack', version: '1.0.0', main: './dist/index.js', files: ['dist'] }),
    );
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'dist'));
    writeFileSync(join(root, 'src', 'index.ts'), 'export const a = 1;\n');
    writeFileSync(join(root, 'dist', 'index.js'), 'export const a = 1;\n');
    writeFileSync(join(root, 'dist', 'index.d.ts'), 'export declare const a = 1;\n');
    return root;
  };
  const run = (root: string, extra: string[] = []) =>
    spawnSync(process.execPath, [script, '--root', root, ...extra], { encoding: 'utf8' });

  it('exits 0 for a clean build', () => {
    const result = run(fixture());
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/0 problems/);
  });

  it('exits 1 and names an orphan file', () => {
    const root = fixture();
    mkdirSync(join(root, 'dist', 'old'));
    writeFileSync(join(root, 'dist', 'old', 'leftover.js'), 'export {};\n');
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('dist/old/leftover.js');
    expect(result.stderr).toContain('no-source');
  });

  it('exits 1 when the build output is missing', () => {
    const root = fixture();
    rmSync(join(root, 'dist'), { recursive: true, force: true });
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('main-missing');
  });

  it('exits 0 when an allow pattern names the extra file', () => {
    const root = fixture();
    writeFileSync(join(root, 'dist', 'schema.json'), '{}\n');
    expect(run(root).status).toBe(1);
    expect(run(root, ['--allow', '^dist/schema\\.json$']).status).toBe(0);
  });
});
