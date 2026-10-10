import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXIT_CLEAN, EXIT_ERROR, EXIT_FINDINGS, runCli } from '../src/run-cli';
import { SECRET_WORD, STAGED_REFERENCE_COMMENT } from './fixtures/samples';
import {
  createTempRepo,
  GIT_TEST_TIMEOUT_MS,
  HAS_GIT_COMMAND,
  type TempRepo,
} from './support/temp-repo';

const SHORT_SHA_LENGTH = 7;

describe.skipIf(!HAS_GIT_COMMAND)('guard command line', { timeout: GIT_TEST_TIMEOUT_MS }, () => {
  let repo: TempRepo;
  let base: string;
  let errors: string;

  function writeError(text: string): void {
    errors += text;
  }

  function run(...argv: string[]): number {
    return runCli(argv, { cwd: repo.root, writeError });
  }

  beforeEach(() => {
    repo = createTempRepo('repo-guard-cli-');
    repo.write('src/index.ts', 'export const answer = 42;\n');
    base = repo.commit('feat: base');
    errors = '';
  }, GIT_TEST_TIMEOUT_MS);

  afterEach(() => {
    repo.dispose();
    vi.unstubAllEnvs();
  });

  describe('argument parsing', () => {
    it.each([[[]], [['unknown']], [['commits']], [['commits', 'main']], [['tracked', 'x']]])(
      'prints the usage and exits with an error for %j',
      (argv: string[]) => {
        expect(run(...argv)).toBe(EXIT_ERROR);
        expect(errors).toMatch(/^Usage: guard <command>/u);
      },
    );

    it('rejects a range that could be read as an option', () => {
      expect(run('commits', '--all..HEAD')).toBe(EXIT_ERROR);
      expect(errors).toMatch(/^Usage: guard <command>/u);
    });
  });

  describe('commits <from>..<to>', () => {
    it('exits cleanly when every commit in the range follows the rules', () => {
      repo.commit('feat(core): add a thing');
      repo.commit('fix: handle the empty case');
      expect(run('commits', `${base}..HEAD`)).toBe(EXIT_CLEAN);
      expect(errors).toBe('');
    });

    it('reports the commit that breaks a rule and exits with findings', () => {
      repo.commit('feat(core): add a thing');
      const bad = repo.commit('Add thing');
      expect(run('commits', `${base}..HEAD`)).toBe(EXIT_FINDINGS);
      expect(errors).toContain(`commit ${bad.slice(0, SHORT_SHA_LENGTH)}`);
      expect(errors).toContain('[commit-message/conventional-header]');
      expect(errors).toContain('repo-guard: 1 problem found.');
    });

    it('only checks the commits inside the range', () => {
      const bad = repo.commit('Add thing');
      repo.commit('feat: fine');
      expect(run('commits', `${bad}..HEAD`)).toBe(EXIT_CLEAN);
    });

    it('exits with an error when git cannot read the range', () => {
      expect(run('commits', 'no-such-branch..HEAD')).toBe(EXIT_ERROR);
      expect(errors).toMatch(/^repo-guard: git log failed/u);
    });
  });

  describe('commit-msg <file>', () => {
    it('reads the message file relative to the working folder', () => {
      repo.write('.git/MSG_OK', 'feat: add thing\n');
      expect(run('commit-msg', '.git/MSG_OK')).toBe(EXIT_CLEAN);
    });

    it('reports a message that breaks a rule', () => {
      repo.write('.git/MSG_BAD', 'Add thing\n');
      expect(run('commit-msg', '.git/MSG_BAD')).toBe(EXIT_FINDINGS);
      expect(errors).toContain('.git/MSG_BAD:1');
      expect(errors).toContain('[commit-message/conventional-header]');
    });

    it('exits with an error when the file is missing', () => {
      expect(run('commit-msg', 'missing.txt')).toBe(EXIT_ERROR);
      expect(errors).toMatch(/^repo-guard: .*missing\.txt/u);
    });
  });

  describe('tracked and staged', () => {
    it('exits cleanly for a clean tree', () => {
      expect(run('tracked')).toBe(EXIT_CLEAN);
      expect(run('staged')).toBe(EXIT_CLEAN);
      expect(errors).toBe('');
    });

    it('reports a tracked document file', () => {
      repo.write('notes.md', 'some notes\n');
      repo.commit('chore: add notes');
      expect(run('tracked')).toBe(EXIT_FINDINGS);
      expect(errors).toContain('notes.md');
      expect(errors).toContain('[document-files/');
    });

    it('reports a staged line that breaks a rule', () => {
      repo.write('src/probe.ts', STAGED_REFERENCE_COMMENT);
      repo.git(['add', 'src/probe.ts']);
      expect(run('staged')).toBe(EXIT_FINDINGS);
      expect(errors).toContain('src/probe.ts:1');
    });

    it('reports a hidden term in a tracked file', () => {
      repo.write('src/probe.ts', `const x = '${SECRET_WORD}';\n`);
      repo.commit('feat: add probe');
      expect(run('tracked')).toBe(EXIT_FINDINGS);
      expect(errors).toContain('src/probe.ts:1');
      expect(errors).toContain('[secret-terms/');
    });
  });

  it('exits with an error outside any repository', () => {
    const outside = mkdtempSync(join(tmpdir(), 'repo-guard-plain-'));
    vi.stubEnv('GIT_CEILING_DIRECTORIES', tmpdir());
    try {
      expect(runCli(['tracked'], { cwd: outside, writeError })).toBe(EXIT_ERROR);
      expect(errors).toMatch(/^repo-guard: git rev-parse failed/u);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
