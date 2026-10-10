import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CommitMessage, SourceFile } from '../model';
import { toSourceFile } from '../source';
import { parseAddedLines } from './diff';
import type { GitPort } from './git-port';

/** Large enough for the whole tracked tree listing or a big staged diff. */
const MAX_OUTPUT_BYTES = 512 * 1024 * 1024;
const SHORT_SHA_LENGTH = 7;
const NUL = '\0';

/** Paths reported by git always use forward slashes and keep non-ASCII characters readable. */
const BASE_ARGS = ['-c', 'core.quotePath=false'];

function runGit(cwd: string, args: readonly string[]): string {
  const result = spawnSync('git', [...BASE_ARGS, ...args], {
    cwd,
    maxBuffer: MAX_OUTPUT_BYTES,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args[0] ?? ''} failed: ${result.stderr.toString('utf8').trim()}`);
  }
  return result.stdout.toString('utf8');
}

function splitNul(output: string): string[] {
  return output.split(NUL).filter((entry) => entry !== '');
}

/** The repository root that contains `cwd`. */
export function findRepositoryRoot(cwd: string): string {
  return runGit(cwd, ['rev-parse', '--show-toplevel']).trim();
}

function isMissingFile(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === 'ENOENT' || code === 'EISDIR';
}

/** Reads the repository through the git command line. */
export class ChildProcessGit implements GitPort {
  constructor(private readonly root: string) {}

  stagedPaths(): readonly string[] {
    return splitNul(
      runGit(this.root, ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']),
    );
  }

  stagedAddedLines(): readonly SourceFile[] {
    const diff = runGit(this.root, [
      'diff',
      '--cached',
      '-U0',
      '--no-color',
      '--no-ext-diff',
      '--no-textconv',
      '--diff-filter=ACMR',
      '--src-prefix=a/',
      '--dst-prefix=b/',
    ]);
    return parseAddedLines(diff);
  }

  /** Tracked paths with their working-tree contents, the same files lint and format look at. */
  trackedFiles(): readonly SourceFile[] {
    return splitNul(runGit(this.root, ['ls-files', '-z'])).flatMap((path) => {
      try {
        return [toSourceFile(path, readFileSync(join(this.root, path), 'utf8'))];
      } catch (error) {
        if (isMissingFile(error)) return [];
        throw error;
      }
    });
  }

  commitMessages(range: string): readonly CommitMessage[] {
    const output = runGit(this.root, ['log', '-z', '--no-merges', '--format=%H%n%B', range, '--']);
    return splitNul(output).map((entry) => {
      const newline = entry.indexOf('\n');
      const sha = newline < 0 ? entry : entry.slice(0, newline);
      const text = newline < 0 ? '' : entry.slice(newline + 1);
      return { source: `commit ${sha.slice(0, SHORT_SHA_LENGTH)}`, text };
    });
  }
}
