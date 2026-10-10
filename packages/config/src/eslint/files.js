/** File groups shared by the preset modules. */
export const TS_FILES = Object.freeze(['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']);

export const JS_FILES = Object.freeze(['**/*.js', '**/*.mjs', '**/*.cjs']);

/** Test code and the reusable contract suites that packages export for their ports. */
export const TEST_FILES = Object.freeze([
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/test/**',
  '**/e2e/**',
  '**/src/testing/**',
]);
