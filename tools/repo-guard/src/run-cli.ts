/**
 * Composition root: wires the git adapter, the registered checks and the allowlist together,
 * runs one command and turns its findings into an exit code.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAllowlist } from './allowlist';
import { buildCommands, USAGE, UsageError } from './commands';
import { formatReport } from './format';
import { ChildProcessGit, findRepositoryRoot } from './git/child-process-git';
import { FILE_CHECKS, MESSAGE_CHECKS } from './registry';
import { createScanner } from './scanner';

export const EXIT_CLEAN = 0;
export const EXIT_FINDINGS = 1;
export const EXIT_ERROR = 2;

const ALLOWLIST_URL = new URL('../allowlist.json', import.meta.url);

/** Where the command line runs and where its report goes. */
export interface CliEnvironment {
  /** The folder relative paths are read from; its repository is the one checked. */
  readonly cwd: string;
  writeError(text: string): void;
}

function runCommand(argv: readonly string[], env: CliEnvironment): number {
  const [name = '', ...args] = argv;
  const allowlist = parseAllowlist(JSON.parse(readFileSync(ALLOWLIST_URL, 'utf8')), [
    ...FILE_CHECKS,
    ...MESSAGE_CHECKS,
  ]);
  const commands = buildCommands({
    git: new ChildProcessGit(findRepositoryRoot(env.cwd)),
    scanner: createScanner(FILE_CHECKS, MESSAGE_CHECKS, allowlist),
    readTextFile: (path) => readFileSync(resolve(env.cwd, path), 'utf8'),
  });
  const command = commands.get(name);
  if (command === undefined) throw new UsageError(USAGE);
  const findings = command(args);
  if (findings.length === 0) return EXIT_CLEAN;
  env.writeError(`${formatReport(findings)}\n`);
  return EXIT_FINDINGS;
}

/** Runs the guard for the given arguments and returns the process exit code. */
export function runCli(argv: readonly string[], env: CliEnvironment): number {
  try {
    return runCommand(argv, env);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    env.writeError(`${error instanceof UsageError ? text : `repo-guard: ${text}`}\n`);
    return EXIT_ERROR;
  }
}
