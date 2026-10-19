/**
 * Fail when the committed bundle reports a version that differs from package.json.
 *
 * `.mcp.json` starts the bundle (`bundle/index.mjs`), so the plugin does not run
 * `dist/`. A bundle that nobody rebuilt keeps its old code and its old version
 * under a newer release label. The bundle of 12.9.0 reported 12.8.2 and held
 * none of the fixes of 12.9.0.
 *
 * The check starts the bundle, sends `initialize` over stdio and reads
 * `serverInfo.version`. It compares that version with package.json and with
 * .claude-plugin/plugin.json. It skips the plugin manifest when the file is absent.
 *
 * Usage: node scripts/check-bundle-version.mjs [--root <dir>] [--entry <file>] [--env KEY=VALUE]... [--timeout <ms>] [--protocol <version>]
 *   --root      Repository root. Default: the repository root. Environment: BUNDLE_CHECK_ROOT.
 *   --entry     The bundle to start. Default: the first `${CLAUDE_PLUGIN_ROOT}/...` argument in `.mcp.json`. Environment: BUNDLE_CHECK_ENTRY.
 *   --env       Environment variable for the bundle process. Repeat the flag for more.
 *               `@TMP@` in a value becomes a new temp folder that the check removes at the end.
 *   --timeout   Milliseconds to wait for the answer. Default: 20000. Environment: BUNDLE_CHECK_TIMEOUT_MS.
 *   --protocol  Protocol version in `initialize`. Default: 2025-06-18. Environment: BUNDLE_CHECK_PROTOCOL.
 * The bundle must not touch real data. Pass the --env pairs that point its store at `@TMP@`.
 * Exit 0 when the versions agree, 1 otherwise.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULTS = Object.freeze({
  timeoutMs: 20_000,
  protocolVersion: '2025-06-18',
  pluginRootVariable: '${CLAUDE_PLUGIN_ROOT}',
  mcpConfig: '.mcp.json',
  pluginManifest: '.claude-plugin/plugin.json',
  tempPlaceholder: '@TMP@',
});

/**
 * Compares the version of the bundle with the versions in package.json and plugin.json.
 *
 * @param {{ packageVersion: string, pluginVersion: string | null, bundleVersion: string }} versions
 * @returns {{ ok: boolean, message: string }}
 */
export function compareVersions({ packageVersion, pluginVersion, bundleVersion }) {
  const mismatches = [];
  if (bundleVersion !== packageVersion) {
    mismatches.push(`the bundle reports ${bundleVersion} but package.json says ${packageVersion}`);
  }
  if (pluginVersion !== null && pluginVersion !== packageVersion) {
    mismatches.push(`plugin.json says ${pluginVersion} but package.json says ${packageVersion}`);
  }
  if (mismatches.length > 0) return { ok: false, message: mismatches.join('; ') };
  const manifests = pluginVersion === null ? 'package.json' : 'package.json and plugin.json';
  return { ok: true, message: `the bundle reports ${bundleVersion}, which matches ${manifests}` };
}

/**
 * Returns the bundle that the plugin starts: the first server argument under the plugin-root variable.
 *
 * @param {{ mcpServers?: Record<string, { args?: string[] }> }} mcpJson
 * @param {string} root
 * @param {string} [variable]
 * @returns {string}
 */
export function entryFromMcpJson(mcpJson, root, variable = DEFAULTS.pluginRootVariable) {
  for (const server of Object.values(mcpJson.mcpServers ?? {})) {
    for (const arg of server.args ?? []) {
      if (typeof arg === 'string' && arg.startsWith(`${variable}/`)) {
        return join(root, arg.slice(variable.length + 1));
      }
    }
  }
  throw new Error(`${DEFAULTS.mcpConfig} has no server argument under ${variable}`);
}

/**
 * Replaces the temp-folder placeholder in a value.
 *
 * @param {string} value
 * @param {string} tempFolder
 * @returns {string}
 */
export function expandPlaceholders(value, tempFolder) {
  return value.split(DEFAULTS.tempPlaceholder).join(tempFolder);
}

/**
 * Starts the bundle under Node, sends `initialize` and returns `serverInfo.version`.
 * Rejects when the bundle stays silent, exits first, or answers without a version.
 *
 * @param {string} entry
 * @param {{ env?: Record<string, string>, timeoutMs?: number, protocolVersion?: string }} [options]
 * @returns {Promise<string>}
 */
export function readBundleVersion(entry, options = {}) {
  const { env = {}, timeoutMs = DEFAULTS.timeoutMs, protocolVersion = DEFAULTS.protocolVersion } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let settled = false;
    let stderrText = '';
    const finish = (settle, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      settle(value);
    };
    const timer = setTimeout(
      () => finish(reject, new Error(`the bundle did not answer initialize within ${timeoutMs} ms (timed out)`)),
      timeoutMs,
    );

    child.on('error', (error) => finish(reject, error));
    // `close` fires after the output streams end, so an answer that arrives with the exit is still read.
    child.on('close', (code, signal) => {
      const detail = stderrText.trim().slice(0, 300);
      finish(reject, new Error(`the bundle exited before it answered (code ${code}, signal ${signal})${detail ? `: ${detail}` : ''}`));
    });
    child.stderr.on('data', (chunk) => {
      stderrText += chunk.toString('utf8');
    });
    // The bundle can exit while this process still writes to it.
    child.stdin.on('error', () => {});

    createInterface({ input: child.stdout }).on('line', (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      if (message.id !== 1) return;
      const version = message.result?.serverInfo?.version;
      if (typeof version !== 'string' || version === '') {
        finish(reject, new Error('the answer to initialize holds no serverInfo.version'));
      } else {
        finish(resolve, version);
      }
    });

    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion, capabilities: {}, clientInfo: { name: 'check-bundle-version', version: '0' } },
      })}\n`,
    );
  });
}

function parseArgs(argv, env) {
  const options = {
    root: env.BUNDLE_CHECK_ROOT ?? fileURLToPath(new URL('..', import.meta.url)),
    entry: env.BUNDLE_CHECK_ENTRY ?? null,
    env: [],
    timeoutMs: Number(env.BUNDLE_CHECK_TIMEOUT_MS ?? DEFAULTS.timeoutMs),
    protocolVersion: env.BUNDLE_CHECK_PROTOCOL ?? DEFAULTS.protocolVersion,
  };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`flag ${flag} needs a value`);
    if (flag === '--root') options.root = value;
    else if (flag === '--entry') options.entry = value;
    else if (flag === '--timeout') options.timeoutMs = Number(value);
    else if (flag === '--protocol') options.protocolVersion = value;
    else if (flag === '--env') {
      const at = value.indexOf('=');
      if (at < 1) throw new Error(`--env needs KEY=VALUE, got ${JSON.stringify(value)}`);
      options.env.push([value.slice(0, at), value.slice(at + 1)]);
    } else throw new Error(`unknown flag ${flag}`);
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error(`the timeout must be a positive number, got ${options.timeoutMs}`);
  }
  return options;
}

async function main() {
  let tempFolder = null;
  try {
    const options = parseArgs(process.argv.slice(2), process.env);
    const packageVersion = JSON.parse(readFileSync(join(options.root, 'package.json'), 'utf8')).version;
    const manifestPath = join(options.root, DEFAULTS.pluginManifest);
    const pluginVersion = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).version : null;
    const entry =
      options.entry ?? entryFromMcpJson(JSON.parse(readFileSync(join(options.root, DEFAULTS.mcpConfig), 'utf8')), options.root);

    if (options.env.some(([, value]) => value.includes(DEFAULTS.tempPlaceholder))) {
      tempFolder = mkdtempSync(join(tmpdir(), 'bundle-check-'));
    }
    const env = Object.fromEntries(
      options.env.map(([key, value]) => [key, tempFolder === null ? value : expandPlaceholders(value, tempFolder)]),
    );

    const bundleVersion = await readBundleVersion(entry, {
      env,
      timeoutMs: options.timeoutMs,
      protocolVersion: options.protocolVersion,
    });
    const result = compareVersions({ packageVersion, pluginVersion, bundleVersion });
    if (!result.ok) {
      console.error(result.message);
      process.exitCode = 1;
      return;
    }
    console.log(result.message);
  } catch (error) {
    console.error(`bundle version check failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (tempFolder !== null) {
      try {
        // Windows can hold the store file for a moment after the child process ends.
        rmSync(tempFolder, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch (error) {
        console.warn(`could not remove ${tempFolder}: ${error.message}`);
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
