import { fileURLToPath } from 'node:url';
import { ESLint, type Linter } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';
import { SOLID_THRESHOLDS } from '../src/eslint/thresholds.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

// Type-aware linting builds a TypeScript program the first time it sees each file, which takes
// a few seconds. That cost is paid once, up front, so each test only lints warm files.
const WARM_UP_TIMEOUT_MS = 120_000;
const LINT_TIMEOUT_MS = 60_000;

// The linted files are virtual: they never exist on disk, so no workspace tsconfig lists them.
// Letting the type-aware parser place exactly these paths in its default project keeps every
// rule from the real config while avoiding writes into other workspaces.
const VIRTUAL_FILES = [
  'packages/shared/src/x.ts',
  'apps/server/src/x.ts',
  'apps/client/src/x.ts',
  'apps/client/src/ui/x.tsx',
  'apps/client/src/scenes/x.ts',
  'apps/client/src/listener/panel/x.ts',
];

/** One linter for the repository config, shared by every test so its parser state is reused. */
const eslint = new ESLint({
  cwd: repoRoot,
  overrideConfig: {
    languageOptions: {
      parserOptions: { projectService: { allowDefaultProject: VIRTUAL_FILES } },
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
  for (const file of VIRTUAL_FILES) {
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
});
