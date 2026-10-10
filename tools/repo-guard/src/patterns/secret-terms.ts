import type { NamedPattern } from '../model';

const DESCRIPTION = 'uses a secret term outside the listener folders';

/** Character classes that match a word in any letter case. */
function anyCase(word: string): string {
  return Array.from(word, (char) => `[${char.toLowerCase()}${char.toUpperCase()}]`).join('');
}

const PREFIX = anyCase('re');
const STEM = anyCase('express');

/**
 * The secret terms, under neutral rule ids so the guard's output says nothing about them. The
 * second term needs a word start (or a camelCase hump) before it, so ordinary English such as
 * "values are expressed" is not mistaken for it.
 */
export const SECRET_TERM_PATTERNS: readonly NamedPattern[] = [
  { rule: 'secret-term-1', description: DESCRIPTION, regex: /waker/iu },
  {
    rule: 'secret-term-2',
    description: DESCRIPTION,
    regex: new RegExp(`(?<![A-Za-z])${PREFIX}[-_ ]?${STEM}|(?<=[a-z])R[eE][-_ ]?${STEM}`, 'u'),
  },
  { rule: 'secret-term-3', description: DESCRIPTION, regex: /thread_of/iu },
  {
    rule: 'secret-term-4',
    description: DESCRIPTION,
    regex: /turning\s+of\s+the\s+thread/iu,
  },
];

/** Folders that hold the hidden content sources; the terms are expected there. */
export const SECRET_TERM_EXEMPT_GLOBS: readonly string[] = [
  'packages/content/data/listener/**',
  'packages/content/i18n/*/listener/**',
  'assets/**/listener/**',
  'apps/client/src/listener/**',
];

/**
 * Files inside the folders above that still ship in the public build, so they keep being
 * scanned: the client's loader for the hidden content is bundled for every player.
 */
export const SECRET_TERM_SCANNED_GLOBS: readonly string[] = ['apps/client/src/listener/load.ts'];
