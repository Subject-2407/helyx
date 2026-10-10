import { describe, expect, it } from 'vitest';
import type { TestProjectInlineConfiguration } from 'vitest/config';
import config from '../../../vitest.config.js';

type ProjectTest = NonNullable<TestProjectInlineConfiguration['test']>;

const TOOLING_SUFFIX = ' (tooling)';

function projectTests(): ProjectTest[] {
  const projects = config.test?.projects ?? [];
  return projects.map((project) => {
    if (typeof project !== 'object' || project instanceof Promise || !project.test) {
      throw new TypeError('every test project is expected to be an inline configuration');
    }
    return project.test;
  });
}

/** Projects are named by plain strings; a labelled name would be a configuration mistake. */
function nameOf(test: ProjectTest): string {
  if (typeof test.name !== 'string') {
    throw new TypeError('every test project is expected to have a plain string name');
  }
  return test.name;
}

function isTooling(test: ProjectTest): boolean {
  return nameOf(test).endsWith(TOOLING_SUFFIX);
}

describe('test runner configuration', () => {
  it('keeps the coverage gates for balance, simulation and server rules', () => {
    const coverage = config.test?.coverage;
    const thresholds = coverage && 'thresholds' in coverage ? coverage.thresholds : undefined;

    expect(thresholds).toEqual({
      'packages/shared/src/balance/**': { lines: 80, functions: 100 },
      'packages/shared/src/sim/**': { lines: 80 },
      'apps/server/src/{services,systems}/**': { lines: 70 },
    });
  });

  it('never retries a failing test', () => {
    expect(config.test?.retry).toBe(0);
  });

  it('runs the slow tooling suites last, one file at a time', () => {
    const tooling = projectTests().filter(isTooling);

    expect(tooling.map((test) => nameOf(test))).toEqual(
      expect.arrayContaining([
        `packages/config${TOOLING_SUFFIX}`,
        `tools/repo-guard${TOOLING_SUFFIX}`,
      ]),
    );
    for (const test of tooling) {
      expect(test.pool, nameOf(test)).toBe('forks');
      expect(test.poolOptions?.forks?.singleFork, nameOf(test)).toBe(true);
      expect(test.sequence?.groupOrder, nameOf(test)).toBeGreaterThan(0);
    }
  });

  it('keeps every other project parallel and ahead of the tooling suites', () => {
    const fast = projectTests().filter((test) => !isTooling(test));

    expect(fast.map((test) => nameOf(test))).toEqual(
      expect.arrayContaining(['packages/shared', 'apps/server', 'packages/config']),
    );
    for (const test of fast) {
      expect(test.poolOptions?.forks?.singleFork, nameOf(test)).toBeUndefined();
      expect(test.sequence?.groupOrder, nameOf(test)).toBe(0);
    }
  });

  it('runs each tooling suite in exactly one project', () => {
    const tests = projectTests();
    for (const tooling of tests.filter(isTooling)) {
      const owner = tests.find((test) => `${nameOf(test)}${TOOLING_SUFFIX}` === nameOf(tooling));

      expect(owner?.root, nameOf(tooling)).toBe(tooling.root);
      expect(owner?.exclude, nameOf(tooling)).toEqual(
        expect.arrayContaining(tooling.include ?? []),
      );
    }
  });
});
