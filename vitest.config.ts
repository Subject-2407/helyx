import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

const WORKSPACE_GROUPS = ['apps', 'packages', 'tools'] as const;

/** Every folder under a workspace group that has a package manifest gets its own test project. */
function workspaceDirs(): string[] {
  return WORKSPACE_GROUPS.flatMap((group) =>
    readdirSync(group, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(group, entry.name, 'package.json')))
      .map((entry) => `${group}/${entry.name}`),
  );
}

const TEST_INCLUDE = ['src/**/*.test.ts', 'test/**/*.test.ts'];
const TEST_EXCLUDE = ['**/node_modules/**', '**/fixtures/**', 'e2e/**', 'dist/**'];

/** Coverage gates for the code whose correctness the game depends on most. */
const COVERAGE_GATES = {
  'packages/shared/src/balance/**': { lines: 80, functions: 100 },
  'packages/shared/src/sim/**': { lines: 80 },
  'apps/server/src/{services,systems}/**': { lines: 70 },
};

export default defineConfig({
  test: {
    retry: 0,
    projects: workspaceDirs().map((dir) => ({
      extends: true,
      test: {
        name: dir,
        root: dir,
        include: TEST_INCLUDE,
        exclude: TEST_EXCLUDE,
      },
    })),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['{apps,packages,tools}/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', '**/fixtures/**', '**/src/testing/**'],
      thresholds: COVERAGE_GATES,
    },
  },
});
