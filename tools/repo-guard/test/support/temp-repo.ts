/**
 * Throwaway git repositories for tests that drive the real git command line. Each one lives in
 * the system temp folder with its own local identity and settings, so the developer's global git
 * configuration and the project's own repository never affect it.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** True when a `git` executable is on the PATH. */
export const HAS_GIT_COMMAND = spawnSync('git', ['--version'], { windowsHide: true }).status === 0;

/** Tests and hooks that drive git spawn many processes, which is slow on a busy machine. */
export const GIT_TEST_TIMEOUT_MS = 60_000;

const REPOSITORY_ENV_VARIABLES = ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE'] as const;

const LOCAL_SETTINGS: readonly (readonly [string, string])[] = [
  ['user.name', 'Guard Test'],
  ['user.email', 'guard-test@example.com'],
  ['commit.gpgsign', 'false'],
  ['core.autocrlf', 'false'],
  ['core.hooksPath', '.git/no-hooks'],
];

export interface TempRepo {
  readonly root: string;
  /** Runs git in the repository and returns its trimmed output; throws when git fails. */
  git(args: readonly string[]): string;
  write(path: string, content: string): void;
  /** Stages everything and commits it; returns the new commit's full id. */
  commit(message: string): string;
  dispose(): void;
}

/** The current environment without variables that would point git at another repository. */
export function isolatedGitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const name of REPOSITORY_ENV_VARIABLES) delete env[name];
  return env;
}

export function createTempRepo(prefix: string): TempRepo {
  const root = mkdtempSync(join(tmpdir(), prefix));

  function git(args: readonly string[]): string {
    const result = spawnSync('git', args, {
      cwd: root,
      env: isolatedGitEnv(),
      encoding: 'utf8',
      windowsHide: true,
    });
    if (result.status !== 0) {
      throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    }
    return result.stdout.trim();
  }

  git(['init', '--quiet', '--initial-branch=main']);
  for (const [key, value] of LOCAL_SETTINGS) git(['config', key, value]);

  return {
    root,
    git,
    write(path, content) {
      const target = join(root, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
    },
    commit(message) {
      git(['add', '--all']);
      git(['commit', '--quiet', '--allow-empty', '--message', message]);
      return git(['rev-parse', 'HEAD']);
    },
    dispose() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}
