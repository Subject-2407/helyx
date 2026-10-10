import { describe, expect, it } from 'vitest';
import { gitignoreToEslintIgnores } from '../src/eslint/gitignore.js';

describe('gitignore to eslint ignores', () => {
  it('skips blank lines and comments', () => {
    expect(gitignoreToEslintIgnores('# build output\n\n   \n')).toEqual([]);
  });

  it('matches unanchored patterns at every depth', () => {
    expect(gitignoreToEslintIgnores('*.log\nnode_modules/\n')).toEqual([
      '**/*.log',
      '**/node_modules/',
    ]);
  });

  it('anchors patterns with a leading or inner slash to the root', () => {
    expect(gitignoreToEslintIgnores('/private/\napps/client/public/assets/\n')).toEqual([
      'private/',
      'apps/client/public/assets/',
    ]);
  });

  it('keeps negations', () => {
    expect(gitignoreToEslintIgnores('!.env.example\n!/keep/\n')).toEqual([
      '!**/.env.example',
      '!keep/',
    ]);
  });

  it('accepts Windows line endings and trailing spaces', () => {
    expect(gitignoreToEslintIgnores('dist/  \r\ncoverage/\r\n')).toEqual([
      '**/dist/',
      '**/coverage/',
    ]);
  });
});
