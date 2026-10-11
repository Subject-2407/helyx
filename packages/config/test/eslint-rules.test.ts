import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ESLint, type Linter } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';
import { SOLID_THRESHOLDS } from '../src/eslint/thresholds.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

// Type-aware linting builds a TypeScript program the first time it sees each file, which takes
// a few seconds. That cost is paid once, up front, so each test only lints warm files. On a busy
// machine the first program build alone can take minutes, so the warm-up gets a generous limit.
const WARM_UP_TIMEOUT_MS = 240_000;
const LINT_TIMEOUT_MS = 60_000;

// Most linted files are virtual: they never exist on disk, so no workspace tsconfig lists them.
// Letting the type-aware parser place exactly these paths in its default project keeps every
// rule from the real config while avoiding writes into other workspaces. A path that does exist
// already belongs to its workspace project and is linted there, with the test's own text.
const LINTED_FILES = [
  'packages/shared/src/x.ts',
  'packages/shared/src/x.test.ts',
  'packages/shared/src/balance/x.ts',
  'packages/shared/src/balance/listener/x.ts',
  'packages/protocol/src/x.ts',
  'packages/protocol/src/x.test.ts',
  'packages/protocol/src/listener.ts',
  'packages/content/src/x.ts',
  'packages/content/src/x.test.ts',
  'apps/server/src/x.ts',
  'apps/client/src/x.ts',
  'apps/client/src/ui/x.tsx',
  'apps/client/src/scenes/x.ts',
  'apps/client/src/listener/load.ts',
  'apps/client/src/listener/panel/x.ts',
];

const VIRTUAL_FILES = LINTED_FILES.filter((file) => !existsSync(`${repoRoot}${file}`));

/** One linter for the repository config, shared by every test so its parser state is reused. */
const eslint = new ESLint({
  cwd: repoRoot,
  overrideConfig: {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: VIRTUAL_FILES,
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: VIRTUAL_FILES.length,
        },
      },
    },
  },
});

async function lint(relativePath: string, code: string): Promise<Linter.LintMessage[]> {
  const [result] = await eslint.lintText(code, { filePath: `${repoRoot}${relativePath}` });
  if (result === undefined) {
    throw new Error(`no lint result for ${relativePath}`);
  }
  const fatal = result.messages.find((message) => message.fatal === true);
  if (fatal !== undefined) {
    throw new Error(`could not lint ${relativePath}: ${fatal.message}`);
  }
  return result.messages;
}

beforeAll(async () => {
  for (const file of LINTED_FILES) {
    await lint(file, 'export {};\n');
  }
}, WARM_UP_TIMEOUT_MS);

function byRule(messages: Linter.LintMessage[], ruleId: string): Linter.LintMessage[] {
  return messages.filter((message) => message.ruleId === ruleId);
}

const ERROR = 2;
const WARN = 1;

const impureCode = [
  'export function roll(): number {',
  '  return Math.random() + Date.now();',
  '}',
  '',
].join('\n');

function longFunction(bodyLines: number): string {
  const body = Array.from({ length: bodyLines }, (_, index) => `  total += ${String(index)};`);
  return [
    'export function long(): number {',
    '  let total = 0;',
    ...body,
    '  return total;',
    '}',
    '',
  ].join('\n');
}

/** A file with the given number of code lines, each followed by a blank line and a comment. */
function longFile(codeLines: number): string {
  const lines = Array.from(
    { length: codeLines },
    (_, index) => `export const value${String(index)} = ${String(index)};\n\n// note`,
  );
  return `${lines.join('\n')}\n`;
}

function branchyFunction(decisionPoints: number): string {
  const branches = Array.from(
    { length: decisionPoints },
    (_, index) => `  if (value === ${String(index)}) {\n    return ${String(index)};\n  }`,
  );
  return [
    'export function branchy(value: number): number {',
    ...branches,
    '  return -1;',
    '}',
    '',
  ].join('\n');
}

/** One side-effect import per line, so a report's line number says which import it was. */
function importLines(specifiers: readonly string[]): string {
  return `${specifiers.map((specifier) => `import '${specifier}';`).join('\n')}\n`;
}

/** Public client files outside the listener folder, with the relative path to that folder. */
const PUBLIC_CLIENT_FILES = [
  { file: 'apps/client/src/x.ts', listener: './listener' },
  { file: 'apps/client/src/scenes/x.ts', listener: '../listener' },
  { file: 'apps/client/src/ui/x.tsx', listener: '../listener' },
] as const;

const LOADER_IMPORTS = ['load', 'load.js', 'load.ts'];

const OTHER_LISTENER_IMPORTS = [
  '',
  '/index',
  '/host-shim',
  '/panel/load',
  '/loader',
  '/load/extra',
];

/** Lints the imports and returns the line and severity of each restricted-import report. */
async function restrictedLines(
  file: string,
  specifiers: readonly string[],
): Promise<Array<[number, number]>> {
  const messages = byRule(await lint(file, importLines(specifiers)), 'no-restricted-imports');
  return messages.map((m) => [m.line, m.severity]);
}

/** The reports expected when every one of the given imports is forbidden. */
function allForbidden(specifiers: readonly string[]): Array<[number, number]> {
  return specifiers.map((_, index) => [index + 1, ERROR]);
}

const SHARED_LISTENER_ENTRY = '@helyx/shared/listener';

/** Ways another package can reach the shared listener entry or the rules behind it. */
const SHARED_LISTENER_FROM_PACKAGE = [
  SHARED_LISTENER_ENTRY,
  '@helyx/shared/src/listener',
  '@helyx/shared/src/balance/listener/sync',
  '../../shared/src/listener',
  '../../shared/src/listener.js',
  '../../shared/src/balance/listener',
  '../../shared/src/balance/listener/sync',
];

const PUBLIC_SHARED_IMPORTS = ['@helyx/shared', '@helyx/shared/testing'];

describe('lint rules', { timeout: LINT_TIMEOUT_MS }, () => {
  it('rejects Math.random and Date.now inside the pure shared package', async () => {
    const messages = await lint('packages/shared/src/x.ts', impureCode);
    const properties = byRule(messages, 'no-restricted-properties');
    const globals = byRule(messages, 'no-restricted-globals');

    expect(properties.map((m) => m.severity)).toEqual([ERROR, ERROR]);
    expect(properties.map((m) => m.message).join('\n')).toMatch(/Math\.random/);
    expect(properties.map((m) => m.message).join('\n')).toMatch(/Date\.now/);
    expect(globals.length).toBeGreaterThan(0);
    expect(globals.every((m) => m.severity === ERROR)).toBe(true);
  });

  it('allows the same code outside the shared package', async () => {
    const messages = await lint('apps/server/src/x.ts', impureCode);

    expect(byRule(messages, 'no-restricted-properties')).toEqual([]);
    expect(byRule(messages, 'no-restricted-globals')).toEqual([]);
  });

  it('rejects timers reached through globalThis inside the shared package', async () => {
    const code =
      'export function later(): void {\n  globalThis.setTimeout(() => undefined, 1);\n}\n';
    const messages = await lint('packages/shared/src/x.ts', code);

    expect(byRule(messages, 'no-restricted-properties').map((m) => m.severity)).toEqual([ERROR]);
  });

  it('rejects an explicit any', async () => {
    const code = 'export function id(value: any): unknown {\n  return value;\n}\n';
    const messages = await lint('apps/server/src/x.ts', code);

    expect(byRule(messages, '@typescript-eslint/no-explicit-any').map((m) => m.severity)).toEqual([
      ERROR,
    ]);
  });

  it('warns when a function grows past the length limit', async () => {
    // Signature, accumulator, return and closing brace add four lines to the body.
    const over = longFunction(SOLID_THRESHOLDS.maxLinesPerFunction - 3);
    const atLimit = longFunction(SOLID_THRESHOLDS.maxLinesPerFunction - 4);

    const overMessages = byRule(await lint('apps/server/src/x.ts', over), 'max-lines-per-function');
    const atLimitMessages = byRule(
      await lint('apps/server/src/x.ts', atLimit),
      'max-lines-per-function',
    );

    expect(SOLID_THRESHOLDS.maxLinesPerFunction).toBe(60);
    expect(overMessages.map((m) => m.severity)).toEqual([WARN]);
    expect(atLimitMessages).toEqual([]);
  });

  it('warns when a file grows past the length limit, not counting blanks and comments', async () => {
    const over = longFile(SOLID_THRESHOLDS.maxLinesPerFile + 1);
    const atLimit = longFile(SOLID_THRESHOLDS.maxLinesPerFile);

    const overMessages = byRule(await lint('apps/server/src/x.ts', over), 'max-lines');
    const atLimitMessages = byRule(await lint('apps/server/src/x.ts', atLimit), 'max-lines');

    expect(SOLID_THRESHOLDS.maxLinesPerFile).toBe(400);
    expect(overMessages.map((m) => m.severity)).toEqual([WARN]);
    expect(atLimitMessages).toEqual([]);
  });

  it('warns when cyclomatic complexity passes the limit', async () => {
    // A function starts at complexity 1; each if adds one.
    const over = branchyFunction(SOLID_THRESHOLDS.maxComplexity);
    const atLimit = branchyFunction(SOLID_THRESHOLDS.maxComplexity - 1);

    const overMessages = byRule(await lint('apps/server/src/x.ts', over), 'complexity');
    const atLimitMessages = byRule(await lint('apps/server/src/x.ts', atLimit), 'complexity');

    expect(SOLID_THRESHOLDS.maxComplexity).toBe(12);
    expect(overMessages.map((m) => m.severity)).toEqual([WARN]);
    expect(atLimitMessages).toEqual([]);
  });

  it('rejects phaser inside the react overlay', async () => {
    const code = "import Phaser from 'phaser';\n\nexport const game = Phaser;\n";
    const restricted = byRule(
      await lint('apps/client/src/ui/x.tsx', code),
      'no-restricted-imports',
    );

    expect(restricted.map((m) => m.severity)).toEqual([ERROR]);
    expect(restricted[0]?.message).toMatch(/Phaser/);
  });

  it('rejects react inside scenes', async () => {
    const code = "import { useState } from 'react';\n\nexport const hook = useState;\n";
    const restricted = byRule(
      await lint('apps/client/src/scenes/x.ts', code),
      'no-restricted-imports',
    );

    expect(restricted.map((m) => m.severity)).toEqual([ERROR]);
    expect(restricted[0]?.message).toMatch(/React/);
  });

  it('allows public client code to import the listener loader statically', async () => {
    for (const { file, listener } of PUBLIC_CLIENT_FILES) {
      const code = importLines(LOADER_IMPORTS.map((name) => `${listener}/${name}`));
      const restricted = byRule(await lint(file, code), 'no-restricted-imports');

      expect(restricted, file).toEqual([]);
    }
  });

  it('rejects static imports of any other listener path from public client code', async () => {
    for (const { file, listener } of PUBLIC_CLIENT_FILES) {
      const code = importLines(OTHER_LISTENER_IMPORTS.map((rest) => `${listener}${rest}`));
      const restricted = byRule(await lint(file, code), 'no-restricted-imports');

      expect(
        restricted.map((m) => [m.line, m.severity]),
        file,
      ).toEqual(OTHER_LISTENER_IMPORTS.map((_, index) => [index + 1, ERROR]));
      expect(restricted[0]?.message).toMatch(/dynamic import/);
    }
  });

  it('lets listener code import its own folder', async () => {
    const code = importLines(['../load', '../index', '../host-shim', './view']);
    const restricted = byRule(
      await lint('apps/client/src/listener/panel/x.ts', code),
      'no-restricted-imports',
    );

    expect(restricted).toEqual([]);
  });

  it('rejects the shared listener entry in public client code', async () => {
    const specifiers = [
      SHARED_LISTENER_ENTRY,
      '@helyx/shared/src/balance/listener/sync',
      '../../../packages/shared/src/listener',
    ];
    for (const { file } of PUBLIC_CLIENT_FILES) {
      expect(await restrictedLines(file, specifiers), file).toEqual(allForbidden(specifiers));
    }
  });

  it('rejects both listener entry points in the public listener loader', async () => {
    const file = 'apps/client/src/listener/load.ts';
    const specifiers = [
      SHARED_LISTENER_ENTRY,
      '@helyx/shared/src/balance/listener/sync',
      '../../../../packages/shared/src/listener',
      '../../../../packages/shared/src/balance/listener/sync',
      '@helyx/protocol/listener',
      '../../../../packages/protocol/src/listener',
    ];

    expect(await restrictedLines(file, specifiers)).toEqual(allForbidden(specifiers));
    expect(await restrictedLines(file, ['@helyx/shared', '@helyx/protocol'])).toEqual([]);
  });

  it('lets listener-only client code import the shared listener entry', async () => {
    const specifiers = [SHARED_LISTENER_ENTRY, '@helyx/protocol/listener'];

    expect(await restrictedLines('apps/client/src/listener/panel/x.ts', specifiers)).toEqual([]);
  });

  it('rejects public shared code reaching the listener rules', async () => {
    const fromRoot = [
      './listener',
      './listener.js',
      './balance/listener',
      './balance/listener/sync',
      SHARED_LISTENER_ENTRY,
    ];
    const fromBalance = ['./listener', './listener/sync.js', '../listener', '../listener.ts'];

    expect(await restrictedLines('packages/shared/src/x.ts', fromRoot)).toEqual(
      allForbidden(fromRoot),
    );
    expect(await restrictedLines('packages/shared/src/balance/x.ts', fromBalance)).toEqual(
      allForbidden(fromBalance),
    );
    const [report] = byRule(
      await lint('packages/shared/src/x.ts', importLines(['./listener'])),
      'no-restricted-imports',
    );
    expect(report?.message).toMatch(/public bundle/);
  });

  it('allows public shared code to import modules whose names only contain listener', async () => {
    const specifiers = ['./event-listener', './listeners', './proficiency', '../rng/rng'];

    expect(await restrictedLines('packages/shared/src/balance/x.ts', specifiers)).toEqual([]);
  });

  it('lets the shared listener rules import public shared modules', async () => {
    const specifiers = ['../proficiency', '../../rng/rng', './sync', '../../listener'];

    expect(await restrictedLines('packages/shared/src/balance/listener/x.ts', specifiers)).toEqual(
      [],
    );
  });

  it('rejects the shared listener entry in public protocol and content code', async () => {
    for (const file of ['packages/protocol/src/x.ts', 'packages/content/src/x.ts']) {
      expect(await restrictedLines(file, SHARED_LISTENER_FROM_PACKAGE), file).toEqual(
        allForbidden(SHARED_LISTENER_FROM_PACKAGE),
      );
      expect(await restrictedLines(file, PUBLIC_SHARED_IMPORTS), file).toEqual([]);
    }
  });

  it('lets the protocol listener entry, the server and tests import the shared listener entry', async () => {
    const files = [
      'packages/protocol/src/listener.ts',
      'packages/protocol/src/x.test.ts',
      'packages/content/src/x.test.ts',
      'apps/server/src/x.ts',
    ];
    for (const file of files) {
      expect(await restrictedLines(file, SHARED_LISTENER_FROM_PACKAGE), file).toEqual([]);
    }
    const fromSharedTest = ['./listener', './balance/listener/sync', SHARED_LISTENER_ENTRY];
    expect(await restrictedLines('packages/shared/src/x.test.ts', fromSharedTest)).toEqual([]);
  });
});
