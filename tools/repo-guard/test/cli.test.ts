/**
 * Runs the real entry point in a child process, the way the hooks and CI call it, to prove the
 * exit code and the report reach the shell.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { EXIT_CLEAN, EXIT_ERROR, EXIT_FINDINGS } from '../src/run-cli';
import {
  createTempRepo,
  GIT_TEST_TIMEOUT_MS,
  HAS_GIT_COMMAND,
  isolatedGitEnv,
  type TempRepo,
} from './support/temp-repo';

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CLI_PATH = join(PACKAGE_ROOT, 'src', 'cli.ts');

const ManifestSchema = z.object({ bin: z.string() });

/** The TypeScript runner the repository's `guard` script uses. */
function tsxCliPath(): string {
  const require = createRequire(join(PACKAGE_ROOT, '..', '..', 'package.json'));
  const manifestPath = require.resolve('tsx/package.json');
  const manifest = ManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  return join(dirname(manifestPath), manifest.bin);
}

describe.skipIf(!HAS_GIT_COMMAND)('guard entry point', () => {
  let repo: TempRepo;
  let base: string;

  function guard(...args: string[]) {
    return spawnSync(process.execPath, [tsxCliPath(), CLI_PATH, ...args], {
      cwd: repo.root,
      env: isolatedGitEnv(),
      encoding: 'utf8',
      windowsHide: true,
    });
  }

  beforeAll(() => {
    repo = createTempRepo('repo-guard-entry-');
    base = repo.commit('feat: base');
    repo.commit('feat(core): add a thing');
  }, GIT_TEST_TIMEOUT_MS);

  afterAll(() => {
    repo.dispose();
  });

  it(
    'exits 0 for a clean commit range',
    () => {
      const result = guard('commits', `${base}..HEAD`);
      expect(result.status, result.stderr).toBe(EXIT_CLEAN);
      expect(result.stderr).toBe('');
    },
    GIT_TEST_TIMEOUT_MS,
  );

  it(
    'exits 1 and prints the findings for a range with a bad commit',
    () => {
      repo.commit('Add thing');
      const result = guard('commits', `${base}..HEAD`);
      expect(result.status, result.stderr).toBe(EXIT_FINDINGS);
      expect(result.stderr).toContain('[commit-message/conventional-header]');
    },
    GIT_TEST_TIMEOUT_MS,
  );

  it(
    'exits 2 with the usage for wrong arguments',
    () => {
      const result = guard('commits', `${base}..HEAD`, 'extra');
      expect(result.status).toBe(EXIT_ERROR);
      expect(result.stderr).toContain('Usage: guard <command>');
    },
    GIT_TEST_TIMEOUT_MS,
  );
});
