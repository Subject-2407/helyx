import { globToRegExp } from '../glob';
import type { FileCheck, Finding, SourceFile } from '../model';
import { SECRET_TERM_EXEMPT_GLOBS, SECRET_TERM_PATTERNS } from '../patterns/secret-terms';
import { firstMatch } from '../source';
import { ruleIds, scanLines } from './pattern-scan';

const EXEMPT_PATHS = SECRET_TERM_EXEMPT_GLOBS.map(globToRegExp);

function isExempt(path: string): boolean {
  return EXEMPT_PATHS.some((regex) => regex.test(path));
}

function pathFindings(check: string, file: SourceFile): Finding[] {
  return SECRET_TERM_PATTERNS.flatMap((pattern) => {
    const excerpt = firstMatch(pattern, file.path);
    if (excerpt === undefined) return [];
    return [
      {
        check,
        rule: pattern.rule,
        file: file.path,
        message: `path ${pattern.description}`,
        excerpt,
      },
    ];
  });
}

const ID = 'secret-terms';

export const secretTermsCheck: FileCheck = {
  id: ID,
  rules: ruleIds(SECRET_TERM_PATTERNS),
  check(file) {
    if (isExempt(file.path)) return [];
    return [
      ...pathFindings(ID, file),
      ...scanLines(ID, file.path, file.lines, SECRET_TERM_PATTERNS),
    ];
  },
};
