import { describe, expect, it } from 'vitest';
import { parseAddedLines, unquoteGitPath } from '../src/git/diff';

const DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1111111..2222222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -3,0 +4,2 @@ export const x = 1;',
  '+const added = 1;',
  '+const more = 2;',
  '@@ -10 +12 @@',
  '-old',
  '+new',
  'diff --git a/new.ts b/new.ts',
  'new file mode 100644',
  'index 0000000..3333333',
  '--- /dev/null',
  '+++ b/new.ts',
  '@@ -0,0 +1 @@',
  '++++ starts with plus signs',
  'diff --git a/img.png b/img.png',
  'new file mode 100644',
  'Binary files /dev/null and b/img.png differ',
  'diff --git "a/dir/caf\\303\\251 \\"x\\".ts" "b/dir/caf\\303\\251 \\"x\\".ts"',
  '--- "a/dir/caf\\303\\251 \\"x\\".ts"',
  '+++ "b/dir/caf\\303\\251 \\"x\\".ts"',
  '@@ -1 +1 @@',
  '-a',
  '+b',
  '\\ No newline at end of file',
  '',
].join('\n');

describe('staged diff parser', () => {
  it('collects added lines with their new line numbers per file', () => {
    const files = parseAddedLines(DIFF);
    expect(files).toEqual([
      {
        path: 'src/a.ts',
        lines: [
          { number: 4, text: 'const added = 1;' },
          { number: 5, text: 'const more = 2;' },
          { number: 12, text: 'new' },
        ],
      },
      { path: 'new.ts', lines: [{ number: 1, text: '+++ starts with plus signs' }] },
      { path: 'dir/café "x".ts', lines: [{ number: 1, text: 'b' }] },
    ]);
  });

  it('handles windows line endings in the diff output', () => {
    const files = parseAddedLines(DIFF.replaceAll('\n', '\r\n'));
    expect(files[0]?.lines[0]).toEqual({ number: 4, text: 'const added = 1;' });
  });

  it('returns nothing for an empty diff', () => {
    expect(parseAddedLines('')).toEqual([]);
  });

  it('unquotes c-style quoted paths', () => {
    expect(unquoteGitPath('plain/path.ts')).toBe('plain/path.ts');
    expect(unquoteGitPath('"tab\\there\\\\back"')).toBe('tab\there\\back');
  });
});
