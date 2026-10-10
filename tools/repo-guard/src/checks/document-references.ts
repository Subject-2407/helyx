import type { FileCheck } from '../model';
import { DOCUMENT_REFERENCE_PATTERNS } from '../patterns/document-references';
import { ruleIds, scanLines } from './pattern-scan';

const ID = 'document-references';

/**
 * Every file is scanned, contributor readmes included: a readme explains how to work on the code
 * and has no more reason than any other file to cite the private planning material.
 */
export const documentReferencesCheck: FileCheck = {
  id: ID,
  rules: ruleIds(DOCUMENT_REFERENCE_PATTERNS),
  check(file) {
    return scanLines(ID, file.path, file.lines, DOCUMENT_REFERENCE_PATTERNS);
  },
};
