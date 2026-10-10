import { describe, expect, it } from 'vitest';
import { matchesGlob } from '../src/glob';

describe('glob matcher', () => {
  it.each([
    ['.gitignore', '.gitignore'],
    ['src/*.ts', 'src/a.ts'],
    ['src/**', 'src/a/b/c.ts'],
    ['src/**/x.ts', 'src/x.ts'],
    ['src/**/x.ts', 'src/a/b/x.ts'],
    ['**/fixtures/**', 'tools/a/test/fixtures/s.ts'],
    ['packages/*/listener/**', 'packages/en/listener/a.json'],
    ['file?.ts', 'file1.ts'],
    ['a.b+c(d)', 'a.b+c(d)'],
  ])('%s matches %s', (glob, path) => {
    expect(matchesGlob(path, glob)).toBe(true);
  });

  it.each([
    ['.gitignore', 'x/.gitignore'],
    ['src/*.ts', 'src/a/b.ts'],
    ['src/**', 'srcx/a.ts'],
    ['packages/*/listener/**', 'packages/listener/a.json'],
    ['file?.ts', 'file10.ts'],
    ['a.b', 'aXb'],
  ])('%s does not match %s', (glob, path) => {
    expect(matchesGlob(path, glob)).toBe(false);
  });
});
