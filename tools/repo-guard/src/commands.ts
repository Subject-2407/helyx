import type { CommitLog, GitPort, StagedChanges, TrackedFiles } from './git/git-port';
import type { Finding, SourceFile } from './model';
import type { Scanner } from './scanner';

/** Raised for wrong command-line arguments; the message carries the usage line. */
export class UsageError extends Error {
  override readonly name = 'UsageError';
}

export type Command = (args: readonly string[]) => readonly Finding[];

export interface CommandDependencies {
  readonly git: GitPort;
  readonly scanner: Scanner;
  readTextFile(path: string): string;
}

export const USAGE = [
  'Usage: guard <command>',
  '  staged               check what is staged for the next commit',
  '  commit-msg <file>    check a commit message file',
  '  tracked              check every tracked file',
  '  commits <from>..<to> check the messages of the commits in a range',
].join('\n');

function expectArgs(args: readonly string[], count: number): void {
  if (args.length !== count) throw new UsageError(USAGE);
}

function stagedCommand(git: StagedChanges, scanner: Scanner): Command {
  return (args) => {
    expectArgs(args, 0);
    const added = new Map(git.stagedAddedLines().map((file) => [file.path, file.lines]));
    const files: SourceFile[] = git
      .stagedPaths()
      .map((path) => ({ path, lines: added.get(path) ?? [] }));
    return scanner.scanFiles(files);
  };
}

function trackedCommand(git: TrackedFiles, scanner: Scanner): Command {
  return (args) => {
    expectArgs(args, 0);
    return scanner.scanFiles(git.trackedFiles());
  };
}

function commitMsgCommand(readTextFile: (path: string) => string, scanner: Scanner): Command {
  return (args) => {
    expectArgs(args, 1);
    const [path = ''] = args;
    return scanner.scanMessages([{ source: path, text: readTextFile(path) }]);
  };
}

const RANGE = /^[^-\s][^\s]*\.\.[^\s]+$/u;

function commitsCommand(git: CommitLog, scanner: Scanner): Command {
  return (args) => {
    expectArgs(args, 1);
    const [range = ''] = args;
    if (!RANGE.test(range)) throw new UsageError(USAGE);
    return scanner.scanMessages(git.commitMessages(range));
  };
}

/** The command table. A new command is a new entry here, not a new branch elsewhere. */
export function buildCommands(deps: CommandDependencies): ReadonlyMap<string, Command> {
  return new Map<string, Command>([
    ['staged', stagedCommand(deps.git, deps.scanner)],
    ['commit-msg', commitMsgCommand((path) => deps.readTextFile(path), deps.scanner)],
    ['tracked', trackedCommand(deps.git, deps.scanner)],
    ['commits', commitsCommand(deps.git, deps.scanner)],
  ]);
}
