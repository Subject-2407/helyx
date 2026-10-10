import type { SourceFile, SourceLine } from '../model';

const FILE_START = 'diff --git ';
const NEW_FILE_HEADER = '+++ ';
const NEW_SIDE_PREFIX = 'b/';
const NULL_DEVICE = '/dev/null';
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/u;

const C_ESCAPES: Readonly<Record<string, string>> = {
  a: '\u0007',
  b: '\b',
  t: '\t',
  n: '\n',
  v: '\v',
  f: '\f',
  r: '\r',
  '"': '"',
  '\\': '\\',
};

const OCTAL_ESCAPE = /^[0-7]{3}$/u;
const OCTAL_RADIX = 8;
const OCTAL_DIGITS = 3;

/** Git quotes unusual paths C-style (`"dir/a \"b\".ts"`, octal bytes for raw UTF-8). */
export function unquoteGitPath(token: string): string {
  if (token.length < 2 || !token.startsWith('"') || !token.endsWith('"')) return token;
  const chars = Array.from(token.slice(1, -1));
  const bytes: Buffer[] = [];
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index] ?? '';
    if (char !== '\\') {
      bytes.push(Buffer.from(char, 'utf8'));
      continue;
    }
    const octal = chars.slice(index + 1, index + 1 + OCTAL_DIGITS).join('');
    if (OCTAL_ESCAPE.test(octal)) {
      bytes.push(Buffer.from([Number.parseInt(octal, OCTAL_RADIX)]));
      index += OCTAL_DIGITS;
    } else {
      const next = chars[index + 1] ?? '';
      bytes.push(Buffer.from(C_ESCAPES[next] ?? next, 'utf8'));
      index += 1;
    }
  }
  return Buffer.concat(bytes).toString('utf8');
}

function newSidePath(headerRest: string): string | undefined {
  const path = unquoteGitPath(headerRest);
  if (path === NULL_DEVICE) return undefined;
  return path.startsWith(NEW_SIDE_PREFIX) ? path.slice(NEW_SIDE_PREFIX.length) : path;
}

interface FileUnderParse {
  readonly path: string;
  readonly lines: SourceLine[];
}

interface ParseState {
  readonly files: FileUnderParse[];
  /** The file whose hunks are being read; undefined while the new side is /dev/null. */
  current: FileUnderParse | undefined;
  inHunk: boolean;
  nextLine: number;
}

/** Handles the per-file and per-hunk header lines; returns false for anything else. */
function readHeaderLine(state: ParseState, line: string): boolean {
  if (line.startsWith(FILE_START)) {
    state.current = undefined;
    state.inHunk = false;
    return true;
  }
  if (!state.inHunk && line.startsWith(NEW_FILE_HEADER)) {
    const path = newSidePath(line.slice(NEW_FILE_HEADER.length));
    state.current = path === undefined ? undefined : { path, lines: [] };
    if (state.current) state.files.push(state.current);
    return true;
  }
  const hunk = HUNK_HEADER.exec(line);
  if (hunk === null) return false;
  state.nextLine = Number(hunk[1]);
  state.inHunk = true;
  return true;
}

function readHunkLine(state: ParseState, line: string): void {
  if (!state.inHunk) return;
  if (line.startsWith('+')) {
    state.current?.lines.push({ number: state.nextLine, text: line.slice(1) });
    state.nextLine += 1;
  } else if (line.startsWith(' ')) {
    state.nextLine += 1;
  }
}

/**
 * Reads `git diff --cached -U0` output and keeps the added lines of every file, numbered as in
 * the new version of the file.
 */
export function parseAddedLines(diff: string): SourceFile[] {
  const state: ParseState = { files: [], current: undefined, inHunk: false, nextLine: 0 };
  for (const rawLine of diff.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!readHeaderLine(state, line)) readHunkLine(state, line);
  }
  return state.files;
}
