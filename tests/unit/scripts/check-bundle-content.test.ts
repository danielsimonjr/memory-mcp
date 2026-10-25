import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { compareBundles, firstDifference, normalizeLineEndings } from '../../../scripts/check-bundle-content.mjs';

// scripts/check-bundle-content.mjs builds the bundle again and compares it with the committed
// bundle/index.mjs. The plugin runs the committed bundle, not dist/. The version check cannot see a bundle
// that lags the source: the committed 12.10.0 bundle lacked two merged changes and still reported 12.10.0.
const script = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scripts', 'check-bundle-content.mjs');

describe('normalizeLineEndings', () => {
  it('turns CRLF into LF and leaves lone CR and LF alone', () => {
    expect(normalizeLineEndings('a\r\nb\nc\rd')).toBe('a\nb\nc\rd');
  });
});

describe('firstDifference', () => {
  it('returns null for equal texts', () => {
    expect(firstDifference('a\nb\nc', 'a\nb\nc')).toBeNull();
  });

  it('names the first line that differs, counted from 1', () => {
    expect(firstDifference('a\nb\nc', 'a\nX\nc')).toEqual({ line: 2, committed: 'b', fresh: 'X' });
  });

  it('finds a text that ends early', () => {
    expect(firstDifference('a\nb', 'a\nb\nc')).toEqual({ line: 3, committed: '', fresh: 'c' });
  });

  it('cuts a long line to 120 characters', () => {
    const difference = firstDifference(`${'x'.repeat(300)}`, 'y');
    expect(difference?.committed).toHaveLength(120);
  });
});

describe('compareBundles', () => {
  it('accepts equal bundles', () => {
    const result = compareBundles({ committed: 'one\ntwo\n', fresh: 'one\ntwo\n' });
    expect(result.ok).toBe(true);
    expect(result.message).toContain('matches a fresh build');
  });

  it('accepts a committed bundle whose line endings were converted to CRLF by a checkout', () => {
    const result = compareBundles({ committed: 'one\r\ntwo\r\n', fresh: 'one\ntwo\n' });
    expect(result.ok).toBe(true);
  });

  it('rejects a stale bundle and names the first differing line and the command that fixes it', () => {
    const result = compareBundles({ committed: 'one\nold\nthree\n', fresh: 'one\nnew\nthree\n' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('line 2');
    expect(result.message).toContain('old');
    expect(result.message).toContain('new');
    expect(result.message).toContain('node scripts/build-bundle.mjs');
  });

  it('rejects an empty committed bundle', () => {
    const result = compareBundles({ committed: '', fresh: 'one\n' });
    expect(result.ok).toBe(false);
  });
});

describe('check-bundle-content command', () => {
  const folders: string[] = [];
  afterEach(() => {
    for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
  });

  // A stand-in repository: its build script writes the file named by BUNDLE_OUT.
  function makeRoot(committed: string | null, built: string): string {
    const root = mkdtempSync(join(tmpdir(), 'bundle-content-'));
    folders.push(root);
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'bundle'));
    writeFileSync(
      join(root, 'scripts', 'build-bundle.mjs'),
      `import { writeFileSync } from 'node:fs';\nwriteFileSync(process.env.BUNDLE_OUT, ${JSON.stringify(built)});\n`,
    );
    if (committed !== null) writeFileSync(join(root, 'bundle', 'index.mjs'), committed);
    return root;
  }

  function run(root: string): { status: number | null; stdout: string; stderr: string } {
    const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  }

  it('exits 0 when the fresh build equals the committed bundle', () => {
    const result = run(makeRoot('export {};\n', 'export {};\n'));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('matches a fresh build');
  });

  it('exits 1 when the committed bundle is stale', () => {
    const result = run(makeRoot('export const a = 1;\n', 'export const a = 2;\n'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('line 1');
  });

  it('exits 1 when the committed bundle is missing', () => {
    const result = run(makeRoot(null, 'export {};\n'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('is missing');
  });

  it('exits 1 when the build script fails', () => {
    const root = makeRoot('export {};\n', 'export {};\n');
    writeFileSync(join(root, 'scripts', 'build-bundle.mjs'), 'process.exit(7);\n');
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('build');
  });
});
