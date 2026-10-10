import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { JS_FILES, TS_FILES } from './files.js';

/**
 * Type-aware TypeScript rules for every workspace, plus plain JavaScript linting
 * (without type information) for config files.
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function typescriptConfigs({ tsconfigRootDir }) {
  return [
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      name: 'helyx/typescript-project',
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
    },
    {
      name: 'helyx/typescript-rules',
      files: [...TS_FILES],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': [
          'error',
          { considerDefaultExhaustiveForUnions: true },
        ],
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
        ],
      },
    },
    {
      ...tseslint.configs.disableTypeChecked,
      name: 'helyx/javascript-files',
      files: [...JS_FILES],
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: { projectService: false, project: false },
      },
    },
    {
      name: 'helyx/commonjs-files',
      files: ['**/*.cjs'],
      languageOptions: { sourceType: 'commonjs' },
      rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
  ];
}
