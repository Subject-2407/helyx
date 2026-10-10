/**
 * Drives the real git hooks end to end. Files are staged into a throwaway index built from HEAD,
 * so the developer's own index and working tree are never touched.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PRIVATE_PATHS, STAGED_REFERENCE_COMMENT } from './fixtures/samples';

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const HAS_GIT = existsSync(join(REPO_ROOT, '.git'));
const HOOK_TIMEOUT_MS = 120_000;
const HOOKS_PATH = '.husky/_';
const REGULAR_FILE_MODE = '100644';

const suiteName = HAS_GIT
  ? 'git hooks'
  : 'git hooks (skipped: no .git folder, so this is not a git checkout)';

interface GitResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

describe.skipIf(!HAS_GIT)(suiteName, () => {
  const workDir = HAS_GIT ? mkdtempSync(join(tmpdir(), 'repo-guard-hooks-')) : '';
  const indexFile = join(workDir, 'index');

  /** Environment for every git call: the throwaway index, hooks enabled. */
  function gitEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env, GIT_INDEX_FILE: indexFile };
    delete env['HUSKY'];
    return env;
  }

  function git(args: readonly string[], input?: string): GitResult {
    const result = spawnSync('git', args, {
      cwd: REPO_ROOT,
      env: gitEnv(),
      encoding: 'utf8',
      ...(input === undefined ? {} : { input }),
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  }

  function gitOk(args: readonly string[], input?: string): string {
    const result = git(args, input);
    if (result.status !== 0) {
      throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    }
    return result.stdout.trim();
  }

  function stage(path: string, content: string): void {
    const sha = gitOk(['hash-object', '-w', '--stdin'], content);
    gitOk(['update-index', '--add', '--cacheinfo', `${REGULAR_FILE_MODE},${sha},${path}`]);
  }

  function runHook(name: string, args: readonly string[] = []): GitResult {
    const extra = args.length > 0 ? ['--', ...args] : [];
    return git(['-c', `core.hooksPath=${HOOKS_PATH}`, 'hook', 'run', name, ...extra]);
  }

  function commitMsg(message: string): GitResult {
    const file = join(workDir, 'COMMIT_EDITMSG');
    writeFileSync(file, `${message}\n`);
    return runHook('commit-msg', [file]);
  }

  const output = (r: GitResult) => `${r.stdout}\n${r.stderr}`;

  beforeEach(() => {
    if (!existsSync(join(REPO_ROOT, HOOKS_PATH, 'h'))) {
      throw new Error('The husky hook runner is missing: run "pnpm install" to set up the hooks.');
    }
    rmSync(indexFile, { force: true });
    const hasHead = git(['rev-parse', '--verify', '--quiet', 'HEAD']).status === 0;
    gitOk(hasHead ? ['read-tree', 'HEAD'] : ['read-tree', '--empty']);
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it(
    'pre-commit accepts a clean source file',
    () => {
      stage('src/hook-probe.ts', 'export const answer = 42;\n');
      const result = runHook('pre-commit');
      expect(result.status, output(result)).toBe(0);
    },
    HOOK_TIMEOUT_MS,
  );

  it(
    'pre-commit rejects a comment that points at a private document',
    () => {
      stage('src/hook-probe.ts', STAGED_REFERENCE_COMMENT);
      const result = runHook('pre-commit');
      expect(result.status).not.toBe(0);
      expect(output(result)).toContain('src/hook-probe.ts:1');
    },
    HOOK_TIMEOUT_MS,
  );

  it(
    'pre-commit rejects a staged notes file',
    () => {
      stage('notes.md', 'some notes\n');
      const result = runHook('pre-commit');
      expect(result.status).not.toBe(0);
      expect(output(result)).toContain('notes.md');
    },
    HOOK_TIMEOUT_MS,
  );

  it(
    'commit-msg accepts a conventional header',
    () => {
      const result = commitMsg('feat(core): add thing');
      expect(result.status, output(result)).toBe(0);
    },
    HOOK_TIMEOUT_MS,
  );

  it(
    'commit-msg rejects a co-author trailer',
    () => {
      const result = commitMsg(
        'feat(core): add thing\n\nCo-authored-by: Someone <someone@example.com>',
      );
      expect(result.status).not.toBe(0);
      expect(output(result).toLowerCase()).toContain('co-author');
    },
    HOOK_TIMEOUT_MS,
  );

  it(
    'commit-msg rejects a header that is not conventional',
    () => {
      const result = commitMsg('Add thing');
      expect(result.status).not.toBe(0);
      expect(output(result)).toContain('type may not be empty');
      expect(output(result)).toContain('type-empty');
    },
    HOOK_TIMEOUT_MS,
  );

  it(
    'commit-msg runs the guard after commitlint and names its rule',
    () => {
      const result = commitMsg('feat(): add thing');
      expect(result.status).not.toBe(0);
      expect(output(result)).toContain('needs a conventional header');
      expect(output(result)).toContain('[commit-message/conventional-header]');
    },
    HOOK_TIMEOUT_MS,
  );

  it('git refuses to stage the private folders', () => {
    const result = spawnSync('git', ['add', '--dry-run', ...PRIVATE_PATHS], {
      cwd: REPO_ROOT,
      env: gitEnv(),
      encoding: 'utf8',
    });
    expect(result.stdout).toBe('');
  });
});
