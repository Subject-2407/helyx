import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { TestProjectInlineConfiguration } from 'vitest/config';

const REPO_ROOT = fileURLToPath(new URL('./', import.meta.url));
const WORKSPACE_GROUPS = ['apps', 'packages', 'tools'] as const;

/** Every folder under a workspace group that has a package manifest gets its own test project. */
function workspaceDirs(): string[] {
  return WORKSPACE_GROUPS.flatMap((group) =>
    readdirSync(`${REPO_ROOT}${group}`, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() && existsSync(`${REPO_ROOT}${group}/${entry.name}/package.json`),
      )
      .map((entry) => `${group}/${entry.name}`),
  );
}

const TEST_INCLUDE = ['src/**/*.test.ts', 'test/**/*.test.ts'];
const TEST_EXCLUDE = ['**/node_modules/**', '**/fixtures/**', 'e2e/**', 'dist/**'];

/**
 * Suites that drive whole tools (type-aware ESLint, dependency-cruiser, git and its hooks, a full
 * production bundler run) and block their worker for many seconds. Run beside the fast suites they
 * starve for CPU, and a worker that stays blocked too long misses the runner's reporting deadline,
 * which fails the run even though every test passed. Paths are relative to each workspace folder.
 */
const TOOLING_SUITES: Readonly<Record<string, readonly string[]>> = {
  'apps/client': ['test/public-bundle/**/*.test.ts'],
  'packages/config': ['test/eslint-rules.test.ts', 'test/depcruise/**/*.test.ts'],
  'tools/repo-guard': [
    'test/hooks.test.ts',
    'test/cli.test.ts',
    'test/run-cli.test.ts',
    'test/child-process-git.test.ts',
  ],
};

/** Name suffix of the project that holds a workspace's tooling suites. */
const TOOLING_PROJECT_SUFFIX = ' (tooling)';

/**
 * Fast suites run first, all in parallel. Tooling suites wait until they finish, then run one
 * file at a time in a single child process, so nothing competes with them for the machine.
 */
const FAST_GROUP = 0;
const TOOLING_GROUP = 1;

function fastProject(dir: string): TestProjectInlineConfiguration {
  return {
    extends: true,
    test: {
      name: dir,
      root: dir,
      include: TEST_INCLUDE,
      exclude: [...TEST_EXCLUDE, ...(TOOLING_SUITES[dir] ?? [])],
      sequence: { groupOrder: FAST_GROUP },
    },
  };
}

function toolingProject(dir: string, suites: readonly string[]): TestProjectInlineConfiguration {
  return {
    extends: true,
    test: {
      name: `${dir}${TOOLING_PROJECT_SUFFIX}`,
      root: dir,
      include: [...suites],
      exclude: TEST_EXCLUDE,
      pool: 'forks',
      poolOptions: { forks: { singleFork: true } },
      sequence: { groupOrder: TOOLING_GROUP },
    },
  };
}

function testProjects(): TestProjectInlineConfiguration[] {
  return workspaceDirs().flatMap((dir) => {
    const suites = TOOLING_SUITES[dir];
    return suites ? [fastProject(dir), toolingProject(dir, suites)] : [fastProject(dir)];
  });
}

/** Coverage gates for the code whose correctness the game depends on most. */
const COVERAGE_GATES = {
  'packages/shared/src/balance/**': { lines: 80, functions: 100 },
  'packages/shared/src/sim/**': { lines: 80 },
  'apps/server/src/{services,systems}/**': { lines: 70 },
};

export default defineConfig({
  test: {
    // A test that only passes on a second try is a flaky test, and it must fail the run.
    retry: 0,
    projects: testProjects(),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['{apps,packages,tools}/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        '**/fixtures/**',
        '**/src/testing/**',
        // A thin process entry point: it only hands the arguments to the command runner, whose
        // behavior is tested directly, and exits with its code.
        'tools/repo-guard/src/cli.ts',
      ],
      thresholds: COVERAGE_GATES,
    },
  },
});
