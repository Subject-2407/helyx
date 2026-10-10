import type { FileCheck } from '../model';
import { DOCUMENT_REFERENCE_PATTERNS } from '../patterns/document-references';
import { basename } from '../source';
import { ruleIds, scanLines } from './pattern-scan';

/** Readmes may point contributors at documentation, so they are not scanned. */
const EXEMPT_BASENAME = 'README.md';

const ID = 'document-references';

export const documentReferencesCheck: FileCheck = {
  id: ID,
  rules: ruleIds(DOCUMENT_REFERENCE_PATTERNS),
  check(file) {
    if (basename(file.path) === EXEMPT_BASENAME) return [];
    return scanLines(ID, file.path, file.lines, DOCUMENT_REFERENCE_PATTERNS);
  },
};
