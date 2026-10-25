/**
 * Fail when the committed bundle differs from a fresh build of the source.
 *
 * `.mcp.json` starts the bundle (`bundle/index.mjs`), so the plugin does not run `dist/`.
 * `check-bundle-version.mjs` reads only the version that the bundle reports. A bundle that
 * lags the source still reports the right version. The committed 12.10.0 bundle lacked two
 * merged changes and the version check passed.
 *
 * The check runs the build script with the output set to a temp file. The check turns CRLF into LF in
 * the committed bundle and then compares the two files. A Windows checkout can convert the line
 * endings of the committed file. The build needs the installed dependencies, so run
 * `bun install --frozen-lockfile` first. A new dependency version
 * changes the bundle, so a dependency update also needs a rebuilt bundle.
 *
 * Usage: node scripts/check-bundle-content.mjs [--root <dir>] [--committed <file>] [--build <file>] [--timeout <ms>]
 *   --root       Repository root. Default: the repository root. Environment: BUNDLE_CHECK_ROOT.
 *   --committed  The committed bundle, relative to the root. Default: bundle/index.mjs. Environment: BUNDLE_CONTENT_COMMITTED.
 *   --build      The build script, relative to the root. Default: scripts/build-bundle.mjs. Environment: BUNDLE_CONTENT_BUILD.
 *   --timeout    Milliseconds to wait for the build. Default: 120000. Environment: BUNDLE_CONTENT_TIMEOUT_MS.
 * The build script must write its bundle to the file named in the environment variable BUNDLE_OUT.
 * Exit 0 when the bundles agree, 1 otherwise.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULTS = Object.freeze({
  committed: 'bundle/index.mjs',
  buildScript: 'scripts/build-bundle.mjs',
  outputVariable: 'BUNDLE_OUT',
  timeoutMs: 120_000,
  excerptLength: 120,
});

/**
 * Turns CRLF into LF. A lone CR stays.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n');
}

/**
 * Finds the first line at which two texts differ.
 *
 * @param {string} committed
 * @param {string} fresh
 * @returns {{ line: number, committed: string, fresh: string } | null} The line is counted from 1. Null when the texts are equal.
 */
export function firstDifference(committed, fresh) {
  const committedLines = committed.split('\n');
  const freshLines = fresh.split('\n');
  const count = Math.max(committedLines.length, freshLines.length);
  for (let i = 0; i < count; i += 1) {
    if (committedLines[i] !== freshLines[i]) {
      return {
        line: i + 1,
        committed: (committedLines[i] ?? '').slice(0, DEFAULTS.excerptLength),
        fresh: (freshLines[i] ?? '').slice(0, DEFAULTS.excerptLength),
      };
    }
  }
  return null;
}

/**
 * Compares the committed bundle with a fresh build.
 *
 * @param {{ committed: string, fresh: string }} bundles
 * @returns {{ ok: boolean, message: string }}
 */
export function compareBundles({ committed, fresh }) {
  const rebuild = `Run \`node ${DEFAULTS.buildScript}\` after \`bun install --frozen-lockfile\` and commit ${DEFAULTS.committed}.`;
  if (committed === '') {
    return { ok: false, message: `the committed bundle is empty. ${rebuild}` };
  }
  const difference = firstDifference(normalizeLineEndings(committed), normalizeLineEndings(fresh));
  if (difference === null) {
    return { ok: true, message: 'the committed bundle matches a fresh build' };
  }
  return {
    ok: false,
    message:
      `the committed bundle differs from a fresh build at line ${difference.line} ` +
      `(committed: ${JSON.stringify(difference.committed)}; fresh: ${JSON.stringify(difference.fresh)}). ${rebuild}`,
  };
}

function parseArgs(argv, env) {
  const options = {
    root: env.BUNDLE_CHECK_ROOT ?? fileURLToPath(new URL('..', import.meta.url)),
    committed: env.BUNDLE_CONTENT_COMMITTED ?? DEFAULTS.committed,
    build: env.BUNDLE_CONTENT_BUILD ?? DEFAULTS.buildScript,
    timeoutMs: Number(env.BUNDLE_CONTENT_TIMEOUT_MS ?? DEFAULTS.timeoutMs),
  };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`flag ${flag} needs a value`);
    if (flag === '--root') options.root = value;
    else if (flag === '--committed') options.committed = value;
    else if (flag === '--build') options.build = value;
    else if (flag === '--timeout') options.timeoutMs = Number(value);
    else throw new Error(`unknown flag ${flag}`);
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error(`the timeout must be a positive number, got ${options.timeoutMs}`);
  }
  return options;
}

function inRoot(root, file) {
  return isAbsolute(file) ? file : join(root, file);
}

function main() {
  let tempFolder = null;
  try {
    const options = parseArgs(process.argv.slice(2), process.env);
    const committedPath = inRoot(options.root, options.committed);
    if (!existsSync(committedPath)) {
      console.error(`the committed bundle ${options.committed} is missing. Run \`node ${options.build}\` and commit it.`);
      process.exitCode = 1;
      return;
    }

    tempFolder = mkdtempSync(join(tmpdir(), 'bundle-content-'));
    const freshPath = join(tempFolder, 'index.mjs');
    const build = spawnSync(process.execPath, [inRoot(options.root, options.build)], {
      cwd: options.root,
      env: { ...process.env, [DEFAULTS.outputVariable]: freshPath },
      encoding: 'utf8',
      timeout: options.timeoutMs,
    });
    if (build.error || build.status !== 0 || !existsSync(freshPath)) {
      const detail = (build.error?.message ?? build.stderr ?? '').trim().slice(0, 300);
      console.error(`the build did not produce a bundle (status ${build.status})${detail ? `: ${detail}` : ''}`);
      process.exitCode = 1;
      return;
    }

    const result = compareBundles({
      committed: readFileSync(committedPath, 'utf8'),
      fresh: readFileSync(freshPath, 'utf8'),
    });
    if (!result.ok) {
      console.error(result.message);
      process.exitCode = 1;
      return;
    }
    console.log(result.message);
  } catch (error) {
    console.error(`bundle content check failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (tempFolder !== null) {
      try {
        rmSync(tempFolder, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch (error) {
        console.warn(`could not remove ${tempFolder}: ${error.message}`);
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
