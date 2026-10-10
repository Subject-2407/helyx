/**
 * Entry point and composition root: wires the git adapter, the registered checks and the
 * allowlist together, runs one command and turns its findings into an exit code.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAllowlist } from './allowlist';
import { buildCommands, USAGE, UsageError } from './commands';
import { formatReport } from './format';
import { ChildProcessGit, findRepositoryRoot } from './git/child-process-git';
import { FILE_CHECKS, MESSAGE_CHECKS } from './registry';
import { createScanner } from './scanner';

const EXIT_CLEAN = 0;
const EXIT_FINDINGS = 1;
const EXIT_ERROR = 2;

const ALLOWLIST_URL = new URL('../allowlist.json', import.meta.url);

function main(argv: readonly string[]): number {
  const [name = '', ...args] = argv;
  const cwd = process.cwd();
  const allowlist = parseAllowlist(JSON.parse(readFileSync(ALLOWLIST_URL, 'utf8')), [
    ...FILE_CHECKS,
    ...MESSAGE_CHECKS,
  ]);
  const commands = buildCommands({
    git: new ChildProcessGit(findRepositoryRoot(cwd)),
    scanner: createScanner(FILE_CHECKS, MESSAGE_CHECKS, allowlist),
    readTextFile: (path) => readFileSync(resolve(cwd, path), 'utf8'),
  });
  const command = commands.get(name);
  if (command === undefined) throw new UsageError(USAGE);
  const findings = command(args);
  if (findings.length === 0) return EXIT_CLEAN;
  process.stderr.write(`${formatReport(findings)}\n`);
  return EXIT_FINDINGS;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  const text = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${error instanceof UsageError ? text : `repo-guard: ${text}`}\n`);
  process.exitCode = EXIT_ERROR;
}
