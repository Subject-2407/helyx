import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChildProcessGit, findRepositoryRoot } from '../src/git/child-process-git';
import {
  createTempRepo,
  GIT_TEST_TIMEOUT_MS,
  HAS_GIT_COMMAND,
  type TempRepo,
} from './support/temp-repo';

const SHORT_SHA_LENGTH = 7;
const NON_ASCII_PATH = 'src/café.ts';

function samePath(path: string): string {
  return realpathSync.native(path).toLowerCase();
}

describe.skipIf(!HAS_GIT_COMMAND)(
  'git adapter on a real repository',
  { timeout: GIT_TEST_TIMEOUT_MS },
  () => {
    let repo: TempRepo;
    let git: ChildProcessGit;

    beforeEach(() => {
      repo = createTempRepo('repo-guard-git-');
      git = new ChildProcessGit(repo.root);
    }, GIT_TEST_TIMEOUT_MS);

    afterEach(() => {
      repo.dispose();
      vi.unstubAllEnvs();
    });

    it('finds the repository root from a nested folder', () => {
      const nested = join(repo.root, 'a', 'b');
      mkdirSync(nested, { recursive: true });
      expect(samePath(findRepositoryRoot(nested))).toBe(samePath(repo.root));
    });

    it('reports a git failure outside any repository', () => {
      const outside = mkdtempSync(join(tmpdir(), 'repo-guard-plain-'));
      vi.stubEnv('GIT_CEILING_DIRECTORIES', tmpdir());
      try {
        expect(() => findRepositoryRoot(outside)).toThrow(/git rev-parse failed/u);
      } finally {
        rmSync(outside, { recursive: true, force: true });
      }
    });

    describe('staged changes', () => {
      beforeEach(() => {
        repo.write('a.ts', 'one\ntwo\n');
        repo.write('b.ts', 'gone\n');
        repo.write('c.ts', 'moved\nunchanged\ncontent\n');
        repo.commit('feat: base');
        repo.write('a.ts', 'one\nnew\ntwo\n');
        repo.git(['rm', '--quiet', 'b.ts']);
        repo.git(['mv', 'c.ts', 'd.ts']);
        repo.write(NON_ASCII_PATH, 'x\ny\n');
        repo.git(['add', 'a.ts', NON_ASCII_PATH]);
        repo.write('untracked.ts', 'not staged\n');
      }, GIT_TEST_TIMEOUT_MS);

      it('lists added, modified and renamed paths, but not deletions or unstaged files', () => {
        expect([...git.stagedPaths()].sort()).toEqual(['a.ts', 'd.ts', NON_ASCII_PATH]);
      });

      it('returns only the added lines with their new line numbers', () => {
        const added = new Map(git.stagedAddedLines().map((file) => [file.path, file.lines]));
        expect(added.get('a.ts')).toEqual([{ number: 2, text: 'new' }]);
        expect(added.get(NON_ASCII_PATH)).toEqual([
          { number: 1, text: 'x' },
          { number: 2, text: 'y' },
        ]);
        expect(added.has('b.ts')).toBe(false);
        expect(added.has('untracked.ts')).toBe(false);
      });
    });

    it('reads tracked files from the working tree and skips the ones removed from it', () => {
      repo.write('kept.ts', 'committed\n');
      repo.write('removed.ts', 'committed\n');
      repo.commit('feat: base');
      repo.write('kept.ts', 'edited\nin the tree\n');
      rmSync(join(repo.root, 'removed.ts'));
      repo.write('untracked.ts', 'not tracked\n');

      expect(git.trackedFiles()).toEqual([
        {
          path: 'kept.ts',
          lines: [
            { number: 1, text: 'edited' },
            { number: 2, text: 'in the tree' },
            { number: 3, text: '' },
          ],
        },
      ]);
    });

    describe('commit messages', () => {
      let base: string;

      beforeEach(() => {
        base = repo.commit('feat: base');
        repo.commit('feat: first');
        repo.git(['switch', '--quiet', '--create', 'side']);
        repo.commit('fix: on the side');
        repo.git(['switch', '--quiet', 'main']);
        repo.commit('fix(core): second\n\nWith a body line.');
        repo.git(['merge', '--quiet', '--no-ff', '--no-edit', 'side']);
      }, GIT_TEST_TIMEOUT_MS);

      it('returns every commit in the range except merges, with short ids', () => {
        const messages = git.commitMessages(`${base}..HEAD`);
        expect(messages.map((m) => m.text.trimEnd()).sort()).toEqual([
          'feat: first',
          'fix(core): second\n\nWith a body line.',
          'fix: on the side',
        ]);
        for (const message of messages) {
          expect(message.source).toMatch(new RegExp(`^commit [0-9a-f]{${SHORT_SHA_LENGTH}}$`, 'u'));
        }
      });

      it('names the commit each message came from', () => {
        const head = repo.git(['rev-parse', 'HEAD^1']);
        const [newest] = git.commitMessages(`${base}..HEAD^1`);
        expect(newest?.source).toBe(`commit ${head.slice(0, SHORT_SHA_LENGTH)}`);
      });

      it('returns nothing for an empty range', () => {
        expect(git.commitMessages('HEAD..HEAD')).toEqual([]);
      });

      it("throws with git's reason for an unknown revision", () => {
        expect(() => git.commitMessages('no-such-branch..HEAD')).toThrow(/git log failed/u);
      });
    });
  },
);
