import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  compareVersions,
  entryFromMcpJson,
  expandPlaceholders,
  readBundleVersion,
} from '../../../scripts/check-bundle-version.mjs';

// scripts/check-bundle-version.mjs runs the bundle that `.mcp.json` starts and compares the version
// that it reports with package.json and .claude-plugin/plugin.json. The plugin runs bundle/index.mjs,
// not dist/. A committed bundle that nobody rebuilt keeps reporting an old version under a newer
// release label. The bundle of 12.9.0 reported 12.8.2 and held none of the fixes of 12.9.0.
const script = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scripts', 'check-bundle-version.mjs');

// A stand-in server: it answers `initialize` with the version in STUB_VERSION and nothing else.
const STUB = `
import { createInterface } from 'node:readline';
const mode = process.env.STUB_MODE ?? 'answer';
if (mode === 'exit') process.exit(3);
const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.method !== 'initialize' || mode === 'silent') return;
  const serverInfo = mode === 'no-version' ? { name: 'stub' } : { name: 'stub', version: process.env.STUB_VERSION };
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo } }) + '\\n');
});
`;

describe('compareVersions', () => {
  it('accepts three equal versions', () => {
    const result = compareVersions({ packageVersion: '12.9.1', pluginVersion: '12.9.1', bundleVersion: '12.9.1' });
    expect(result.ok).toBe(true);
  });

  it('rejects a bundle that reports another version, and names both versions', () => {
    const result = compareVersions({ packageVersion: '12.9.0', pluginVersion: '12.9.0', bundleVersion: '12.8.2' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('bundle');
    expect(result.message).toContain('12.8.2');
    expect(result.message).toContain('12.9.0');
  });

  it('rejects a plugin manifest that is not at the package version', () => {
    const result = compareVersions({ packageVersion: '2.0.0', pluginVersion: '1.9.0', bundleVersion: '2.0.0' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('plugin.json');
  });

  it('skips the plugin manifest when the repository has none', () => {
    expect(compareVersions({ packageVersion: '2.0.0', pluginVersion: null, bundleVersion: '2.0.0' }).ok).toBe(true);
    expect(compareVersions({ packageVersion: '2.0.0', pluginVersion: null, bundleVersion: '1.0.0' }).ok).toBe(false);
  });
});

describe('entryFromMcpJson', () => {
  const mcp = {
    mcpServers: { demo: { command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/bundle/index.mjs'] } },
  };

  it('resolves the plugin-root path against the repository root', () => {
    expect(entryFromMcpJson(mcp, join('/r', 'repo')).replace(/\\/g, '/')).toBe('/r/repo/bundle/index.mjs');
  });

  it('fails with a clear message when no server argument is under the plugin root', () => {
    expect(() => entryFromMcpJson({ mcpServers: { x: { command: 'node', args: ['server.js'] } } }, '/r')).toThrow(
      /CLAUDE_PLUGIN_ROOT/,
    );
  });
});

describe('expandPlaceholders', () => {
  it('replaces the temp-folder placeholder', () => {
    expect(expandPlaceholders('@TMP@/memory.jsonl', '/t')).toBe('/t/memory.jsonl');
  });

  it('leaves a value without the placeholder unchanged', () => {
    expect(expandPlaceholders('jsonl', '/t')).toBe('jsonl');
  });
});

describe('with a stand-in server', () => {
  const roots: string[] = [];
  afterEach(() => {
    while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true });
  });

  const fixture = (versions: { pkg: string; plugin: string | null }): string => {
    const root = mkdtempSync(join(tmpdir(), 'bundle-check-'));
    roots.push(root);
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: versions.pkg }));
    mkdirSync(join(root, 'bundle'));
    writeFileSync(join(root, 'bundle', 'index.mjs'), STUB);
    writeFileSync(
      join(root, '.mcp.json'),
      JSON.stringify({ mcpServers: { s: { command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/bundle/index.mjs'] } } }),
    );
    if (versions.plugin !== null) {
      mkdirSync(join(root, '.claude-plugin'));
      writeFileSync(join(root, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'fixture', version: versions.plugin }));
    }
    return root;
  };
  const entryOf = (root: string) => join(root, 'bundle', 'index.mjs');

  describe('readBundleVersion', () => {
    it('returns the version that the server reports', async () => {
      const root = fixture({ pkg: '3.1.4', plugin: null });
      await expect(readBundleVersion(entryOf(root), { env: { STUB_VERSION: '3.1.4' }, timeoutMs: 10_000 })).resolves.toBe('3.1.4');
    });

    it('rejects when the server stays silent past the timeout', async () => {
      const root = fixture({ pkg: '1.0.0', plugin: null });
      await expect(
        readBundleVersion(entryOf(root), { env: { STUB_MODE: 'silent' }, timeoutMs: 600 }),
      ).rejects.toThrow(/timed out/);
    });

    it('rejects when the server exits before it answers', async () => {
      const root = fixture({ pkg: '1.0.0', plugin: null });
      await expect(
        readBundleVersion(entryOf(root), { env: { STUB_MODE: 'exit' }, timeoutMs: 10_000 }),
      ).rejects.toThrow(/exited/);
    });

    it('rejects an answer that holds no version', async () => {
      const root = fixture({ pkg: '1.0.0', plugin: null });
      await expect(
        readBundleVersion(entryOf(root), { env: { STUB_MODE: 'no-version' }, timeoutMs: 10_000 }),
      ).rejects.toThrow(/serverInfo\.version/);
    });
  });

  describe('check-bundle-version command', () => {
    const run = (root: string, env: Record<string, string>, extra: string[] = []) =>
      spawnSync(
        process.execPath,
        [script, '--root', root, '--timeout', '10000', ...Object.entries(env).flatMap(([k, v]) => ['--env', `${k}=${v}`]), ...extra],
        { encoding: 'utf8' },
      );

    it('exits 0 when the bundle, package.json and plugin.json agree', () => {
      const root = fixture({ pkg: '2.0.0', plugin: '2.0.0' });
      const result = run(root, { STUB_VERSION: '2.0.0' });
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('2.0.0');
    });

    it('exits 1 when the bundle is older than package.json', () => {
      const root = fixture({ pkg: '2.0.0', plugin: '2.0.0' });
      const result = run(root, { STUB_VERSION: '1.0.0' });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('1.0.0');
      expect(result.stderr).toContain('2.0.0');
    });

    it('exits 1 when plugin.json is not at the package version', () => {
      const root = fixture({ pkg: '2.0.0', plugin: '1.9.0' });
      const result = run(root, { STUB_VERSION: '2.0.0' });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('plugin.json');
    });

    it('exits 0 for a repository without a plugin manifest', () => {
      const root = fixture({ pkg: '2.0.0', plugin: null });
      expect(run(root, { STUB_VERSION: '2.0.0' }).status).toBe(0);
    });

    it('takes the entry from --entry when the flag is given', () => {
      const root = fixture({ pkg: '2.0.0', plugin: null });
      rmSync(join(root, '.mcp.json'));
      expect(run(root, { STUB_VERSION: '2.0.0' }, ['--entry', entryOf(root)]).status).toBe(0);
    });

    it('exits 1 and says so when the server never answers', () => {
      const root = fixture({ pkg: '2.0.0', plugin: null });
      const result = spawnSync(
        process.execPath,
        [script, '--root', root, '--timeout', '600', '--env', 'STUB_MODE=silent'],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/timed out/);
    });
  });
});
