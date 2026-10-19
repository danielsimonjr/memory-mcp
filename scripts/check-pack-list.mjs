/**
 * Fail when the npm tarball holds a build file that has no source.
 *
 * `tsc` never deletes output whose source is gone. A build over an old `dist/`
 * leaves orphan files, and `npm pack` packs them. Versions 12.7.0 to
 * 12.9.0 shipped 150 such files: 168 packed files where a clean build gives 18.
 *
 * The check lists what `npm pack` would pack and compares the list with the
 * source folder. These rules apply:
 *   - A package file that npm adds on its own (package.json, README, LICENSE) is fine.
 *   - A file under the output folder needs a source file with the same path and
 *     a source extension. `dist/server/a.d.ts.map` needs `src/server/a.ts`.
 *   - The `main` entry of package.json must be in the list.
 *   - Any other file is a problem, unless an --allow pattern names it.
 *
 * Usage: node scripts/check-pack-list.mjs [--root <dir>] [--src <dir>] [--out <dir>] [--allow <regex>]...
 *   --root   Package folder. Default: the repository root. Environment: PACK_CHECK_ROOT.
 *   --src    Source folder, relative to the root. Default: src. Environment: PACK_CHECK_SRC.
 *   --out    Build output folder, relative to the root. Default: dist. Environment: PACK_CHECK_OUT.
 *   --allow  Regular expression for a packed path that is allowed. Repeat the flag for more patterns.
 * Exit 0 when the list is clean, 1 otherwise.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULTS = Object.freeze({
  src: 'src',
  out: 'dist',
  sourceExtensions: Object.freeze(['.ts', '.tsx', '.mts', '.cts']),
});

// The files that npm adds to every tarball, whatever the `files` field says.
const PACKAGE_FILE = /^(package\.json|(README|LICENSE|LICENCE)(\.[^/]+)?)$/i;
// The suffix of an emitted file: the code, its declaration and the maps of both.
const OUTPUT_SUFFIX = /(\.d\.[cm]?ts(\.map)?|\.[cm]?js(\.map)?)$/;

const toSlashes = (path) => path.replace(/\\/g, '/');
const trimSlashes = (path) => toSlashes(path).replace(/^\.\//, '').replace(/\/+$/, '');

/**
 * Returns the packed path that package.json names as `main`, or null when it names none.
 * The value `./dist/index.js` returns `dist/index.js`.
 *
 * @param {{ main?: string }} pkg
 * @returns {string | null}
 */
export function mainEntry(pkg) {
  return typeof pkg.main === 'string' && pkg.main.length > 0 ? trimSlashes(pkg.main) : null;
}

/**
 * Compares a pack list with the source folder.
 * Returns one entry per file that must not be in the tarball, and one when `main` is missing.
 *
 * @param {object} options
 * @param {string[]} options.packed Paths that `npm pack` lists, relative to the package root.
 * @param {string | null} [options.main] The `main` entry, as a packed path.
 * @param {string} [options.out] Build output folder.
 * @param {string} [options.src] Source folder.
 * @param {readonly string[]} [options.sourceExtensions] Extensions of source files.
 * @param {string[]} [options.allow] Regular expressions for paths that are allowed.
 * @param {(candidate: string) => boolean} options.sourceExists True when the source file exists. The path is relative to the package root.
 * @returns {{ path: string, reason: 'outside-output' | 'unknown-output-type' | 'no-source' | 'main-missing' }[]}
 */
export function findPackProblems({
  packed,
  main = null,
  out = DEFAULTS.out,
  src = DEFAULTS.src,
  sourceExtensions = DEFAULTS.sourceExtensions,
  allow = [],
  sourceExists,
}) {
  const outPrefix = `${trimSlashes(out)}/`;
  const srcPrefix = trimSlashes(src);
  const allowed = allow.map((pattern) => new RegExp(pattern));
  const files = packed.map(toSlashes);
  const problems = [];

  for (const path of files) {
    if (PACKAGE_FILE.test(path)) continue;
    if (allowed.some((pattern) => pattern.test(path))) continue;
    if (!path.startsWith(outPrefix)) {
      problems.push({ path, reason: 'outside-output' });
      continue;
    }
    const suffix = OUTPUT_SUFFIX.exec(path);
    if (suffix === null) {
      problems.push({ path, reason: 'unknown-output-type' });
      continue;
    }
    const stem = path.slice(outPrefix.length, suffix.index);
    if (!sourceExtensions.some((extension) => sourceExists(`${srcPrefix}/${stem}${extension}`))) {
      problems.push({ path, reason: 'no-source' });
    }
  }

  if (main !== null && !files.includes(toSlashes(main))) {
    problems.push({ path: toSlashes(main), reason: 'main-missing' });
  }
  return problems;
}

/**
 * Lists the paths that `npm pack` would put in the tarball, without writing a tarball.
 * Lifecycle scripts stay off, so the check never rebuilds `dist/`.
 *
 * @param {string} root
 * @returns {string[]}
 */
function packedPaths(root) {
  const output = execSync('npm pack --dry-run --json --ignore-scripts', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output)[0].files.map((file) => file.path);
}

function parseArgs(argv, env) {
  const options = {
    root: env.PACK_CHECK_ROOT ?? fileURLToPath(new URL('..', import.meta.url)),
    src: env.PACK_CHECK_SRC ?? DEFAULTS.src,
    out: env.PACK_CHECK_OUT ?? DEFAULTS.out,
    allow: [],
  };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`flag ${flag} needs a value`);
    if (flag === '--root') options.root = value;
    else if (flag === '--src') options.src = value;
    else if (flag === '--out') options.out = value;
    else if (flag === '--allow') options.allow.push(value);
    else throw new Error(`unknown flag ${flag}`);
  }
  return options;
}

function main() {
  let options;
  let packed;
  let pkg;
  try {
    options = parseArgs(process.argv.slice(2), process.env);
    pkg = JSON.parse(readFileSync(join(options.root, 'package.json'), 'utf8'));
    packed = packedPaths(options.root);
  } catch (error) {
    console.error(`pack list check could not run: ${error.message}`);
    process.exit(1);
  }

  const problems = findPackProblems({
    packed,
    main: mainEntry(pkg),
    out: options.out,
    src: options.src,
    allow: options.allow,
    sourceExists: (candidate) => existsSync(join(options.root, candidate)),
  });

  if (problems.length > 0) {
    for (const problem of problems) console.error(`  ${problem.reason}  ${problem.path}`);
    console.error(`pack list: ${packed.length} files, ${problems.length} problems`);
    process.exit(1);
  }
  console.log(`pack list: ${packed.length} files, 0 problems`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
