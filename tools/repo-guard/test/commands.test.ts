import { describe, expect, it } from 'vitest';
import { buildCommands } from '../src/commands';
import type { GitPort } from '../src/git/git-port';
import type { Allowlist } from '../src/allowlist';
import { formatFinding } from '../src/format';
import { FILE_CHECKS, MESSAGE_CHECKS } from '../src/registry';
import { createScanner } from '../src/scanner';
import { toSourceFile } from '../src/source';
import { REFERENCE_HITS, SECRET_WORD } from './fixtures/samples';

const REFERENCE = REFERENCE_HITS[0]?.text ?? '';

function fakeGit(overrides: Partial<GitPort> = {}): GitPort {
  return {
    stagedPaths: () => [],
    stagedAddedLines: () => [],
    trackedFiles: () => [],
    commitMessages: () => [],
    ...overrides,
  };
}

function commands(git: GitPort, allowlist: Allowlist = [], files: Record<string, string> = {}) {
  const scanner = createScanner(FILE_CHECKS, MESSAGE_CHECKS, allowlist);
  return buildCommands({
    git,
    scanner,
    readTextFile: (path) => {
      const text = files[path];
      if (text === undefined) throw new Error(`missing ${path}`);
      return text;
    },
  });
}

function run(map: ReturnType<typeof commands>, name: string, args: string[] = []) {
  const command = map.get(name);
  if (!command) throw new Error(`no command ${name}`);
  return command(args);
}

describe('guard commands', () => {
  it('registers the four commands', () => {
    expect([...commands(fakeGit()).keys()].sort()).toEqual([
      'commit-msg',
      'commits',
      'staged',
      'tracked',
    ]);
  });

  it('staged: checks staged paths and only the added lines', () => {
    const git = fakeGit({
      stagedPaths: () => ['notes.md', 'src/clean.ts', 'src/a.ts'],
      stagedAddedLines: () => [{ path: 'src/a.ts', lines: [{ number: 7, text: REFERENCE }] }],
    });
    const findings = run(commands(git), 'staged');
    expect(findings.map((f) => [f.file, f.check, f.line])).toEqual([
      ['notes.md', 'document-files', undefined],
      ['src/a.ts', 'document-references', 7],
    ]);
  });

  it('tracked: checks full contents and honors the allowlist', () => {
    const git = fakeGit({
      trackedFiles: () => [
        toSourceFile('src/a.ts', `ok\n${SECRET_WORD}`),
        toSourceFile('tools/x/a.ts', SECRET_WORD),
      ],
    });
    const allowlist: Allowlist = [
      { path: 'tools/x/**', check: 'secret-terms', pattern: '*', reason: 'test' },
    ];
    const findings = run(commands(git, allowlist), 'tracked');
    expect(findings.map((f) => [f.file, f.line])).toEqual([['src/a.ts', 2]]);
  });

  it('commit-msg: reads the message file', () => {
    const findings = run(commands(fakeGit(), [], { msg: 'Add thing' }), 'commit-msg', ['msg']);
    expect(findings.map((f) => f.rule)).toEqual(['conventional-header']);
  });

  it('commits: checks every commit in the range', () => {
    let asked = '';
    const git = fakeGit({
      commitMessages: (range) => {
        asked = range;
        return [
          { source: 'commit 1111111', text: 'feat: ok' },
          { source: 'commit 2222222', text: 'bad header' },
        ];
      },
    });
    const findings = run(commands(git), 'commits', ['main..HEAD']);
    expect(asked).toBe('main..HEAD');
    expect(findings.map((f) => f.file)).toEqual(['commit 2222222']);
  });

  it.each([
    ['commit-msg', []],
    ['commits', []],
    ['commits', ['main']],
    ['commits', ['--all..HEAD']],
    ['staged', ['extra']],
  ])('rejects bad arguments for %s %j', (name, args) => {
    expect(() => run(commands(fakeGit()), name, args)).toThrow(/usage/i);
  });

  it('formats a finding with file, line and rule in plain words', () => {
    const text = formatFinding({
      check: 'secret-terms',
      rule: 'term-awakened',
      file: 'src/a.ts',
      line: 3,
      message: 'contains a hidden term',
      excerpt: 'abc',
    });
    expect(text).toContain('src/a.ts:3');
    expect(text).toContain('contains a hidden term');
    expect(text).toContain('secret-terms/term-awakened');
    expect(text).toContain('"abc"');
  });
});
