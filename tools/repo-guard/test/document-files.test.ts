import { describe, expect, it } from 'vitest';
import { documentFilesCheck } from '../src/checks/document-files';
import { DOCUMENT_PATHS, NON_DOCUMENT_PATHS, README_PATHS } from './fixtures/samples';

function check(path: string) {
  return documentFilesCheck.check({ path, lines: [] });
}

describe('document files check', () => {
  it.each(README_PATHS)('allows the contributor readme %s', (path) => {
    expect(check(path)).toEqual([]);
  });

  it.each(DOCUMENT_PATHS)('rejects the document file %s', (path) => {
    const findings = check(path);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      check: 'document-files',
      rule: 'document-file',
      file: path,
    });
    expect(findings[0]?.line).toBeUndefined();
  });

  it.each(NON_DOCUMENT_PATHS)('ignores the non-document file %s', (path) => {
    expect(check(path)).toEqual([]);
  });
});
