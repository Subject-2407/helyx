import type { MessageCheck, NamedPattern } from '../model';
import { DOCUMENT_REFERENCE_PATTERNS } from '../patterns/document-references';
import { SECRET_TERM_PATTERNS } from '../patterns/secret-terms';
import { cleanCommitMessage } from './commit-message';
import { ruleIds, scanLines } from './pattern-scan';

/** Runs a pattern list over the lines git keeps from a commit message. */
function messagePatternCheck(id: string, patterns: readonly NamedPattern[]): MessageCheck {
  return {
    id,
    rules: ruleIds(patterns),
    check(message) {
      return scanLines(id, message.source, cleanCommitMessage(message.text), patterns);
    },
  };
}

export const messageReferencesCheck = messagePatternCheck(
  'message-references',
  DOCUMENT_REFERENCE_PATTERNS,
);

export const messageSecretTermsCheck = messagePatternCheck(
  'message-secret-terms',
  SECRET_TERM_PATTERNS,
);
