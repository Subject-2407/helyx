import type { NamedPattern, SourceFile, SourceLine } from './model';

/** Git treats a file as binary when a NUL byte shows up near its start; so do we. */
const BINARY_SNIFF_LENGTH = 8000;
const MAX_EXCERPT_LENGTH = 60;

export function isBinaryText(content: string): boolean {
  return content.slice(0, BINARY_SNIFF_LENGTH).includes('\0');
}

export function splitLines(content: string): SourceLine[] {
  return content.split(/\r?\n/u).map((text, index) => ({ number: index + 1, text }));
}

/** Builds a file to check from its full content; binary content keeps only the path. */
export function toSourceFile(path: string, content: string): SourceFile {
  return { path, lines: isBinaryText(content) ? [] : splitLines(content) };
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** First match of a pattern in a piece of text, shortened for display. */
export function firstMatch(pattern: NamedPattern, text: string): string | undefined {
  const match = pattern.regex.exec(text);
  return match === null ? undefined : match[0].slice(0, MAX_EXCERPT_LENGTH);
}
