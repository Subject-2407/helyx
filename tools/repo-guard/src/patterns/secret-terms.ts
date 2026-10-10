import type { NamedPattern } from '../model';

const DESCRIPTION = 'uses a secret term outside the listener folders';

/** Character classes that match a word in any letter case. */
function anyCase(word: string): string {
  return Array.from(word, (char) => `[${char.toLowerCase()}${char.toUpperCase()}]`).join('');
}

const PREFIX = anyCase('re');
const STEM = anyCase('express');

/**
 * The hidden-lore terms. The rebirth term needs a word start (or a camelCase hump) before it,
 * so ordinary English such as "values are expressed" is not mistaken for it.
 */
export const SECRET_TERM_PATTERNS: readonly NamedPattern[] = [
  { rule: 'term-awakened', description: DESCRIPTION, regex: /waker/iu },
  {
    rule: 'term-rebirth',
    description: DESCRIPTION,
    regex: new RegExp(`(?<![A-Za-z])${PREFIX}[-_ ]?${STEM}|(?<=[a-z])R[eE][-_ ]?${STEM}`, 'u'),
  },
  { rule: 'term-thread-of', description: DESCRIPTION, regex: /thread_of/iu },
  {
    rule: 'term-thread-turning',
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
