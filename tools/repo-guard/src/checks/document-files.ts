import type { FileCheck } from '../model';
import { basename } from '../source';

const DOCUMENT_EXTENSIONS: readonly string[] = ['.md', '.mdx', '.docx', '.doc', '.pdf', '.odt'];

/** The one document a contributor may commit: a readme that explains how to work on the code. */
const CONTRIBUTOR_README = 'README.md';

const RULE = 'document-file';

function isDocument(path: string): boolean {
  const lower = path.toLowerCase();
  return DOCUMENT_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

const ID = 'document-files';

/** Private documents must never be committed, so no folder may be exempted from this check. */
export const documentFilesCheck: FileCheck = {
  id: ID,
  rules: [RULE],
  waivable: false,
  check(file) {
    if (!isDocument(file.path) || basename(file.path) === CONTRIBUTOR_README) return [];
    return [
      {
        check: ID,
        rule: RULE,
        file: file.path,
        message: 'is a document file; only README.md files may be committed',
      },
    ];
  },
};
