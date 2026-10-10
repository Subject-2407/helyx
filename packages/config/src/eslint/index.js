import prettier from 'eslint-config-prettier';
import { boundaryConfigs } from './boundaries.js';
import { gitignoreToEslintIgnores } from './gitignore.js';
import { IGNORED_PATHS } from './ignores.js';
import { purityConfigs } from './purity.js';
import { solidConfigs } from './solid.js';
import { typescriptConfigs } from './typescript.js';

export { SOLID_THRESHOLDS } from './thresholds.js';
export { IGNORED_PATHS } from './ignores.js';
export { gitignoreToEslintIgnores } from './gitignore.js';

/**
 * The full flat config for the repository. Formatting belongs to Prettier, so the config
 * that switches off conflicting style rules comes last.
 *
 * @param {{ tsconfigRootDir: string; gitignore?: string }} options
 *   `gitignore` is the text of the repository's .gitignore; whatever git ignores is not linted.
 */
export function helyxConfig({ tsconfigRootDir, gitignore = '' }) {
  return [
    { name: 'helyx/gitignored', ignores: gitignoreToEslintIgnores(gitignore) },
    { name: 'helyx/ignores', ignores: [...IGNORED_PATHS] },
    ...typescriptConfigs({ tsconfigRootDir }),
    ...solidConfigs(),
    ...purityConfigs(),
    ...boundaryConfigs(),
    { ...prettier, name: 'helyx/prettier' },
  ];
}
