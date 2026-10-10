import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isAllowed, parseAllowlist } from '../src/allowlist';
import { FILE_CHECKS, MESSAGE_CHECKS } from '../src/registry';
import type { Finding } from '../src/model';
import { createScanner } from '../src/scanner';
import { toSourceFile } from '../src/source';
import { GUARD_FOLDER_DOCUMENT_PATHS, REFERENCE_HITS } from './fixtures/samples';

const CHECKS = [...FILE_CHECKS, ...MESSAGE_CHECKS];

function committedAllowlist() {
  const raw: unknown = JSON.parse(
    readFileSync(new URL('../allowlist.json', import.meta.url), 'utf8'),
  );
  return parseAllowlist(raw, CHECKS);
}

const entry = {
  path: 'tools/x/**',
  check: 'secret-terms',
  pattern: 'secret-term-1',
  reason: 'test',
};

const finding: Finding = {
  check: 'secret-terms',
  rule: 'secret-term-1',
  file: 'tools/x/a.ts',
  line: 1,
  message: 'm',
};

describe('allowlist', () => {
  it('parses the committed allowlist and gives every entry a reason', () => {
    const allowlist = committedAllowlist();
    expect(allowlist.length).toBeGreaterThan(0);
    expect(allowlist.every((e) => e.reason.trim().length > 0)).toBe(true);
  });

  it('honors an entry that matches path, check and rule', () => {
    const allowlist = parseAllowlist({ entries: [entry] }, CHECKS);
    expect(isAllowed(finding, allowlist)).toBe(true);
  });

  it('accepts a wildcard rule within the one check an entry names', () => {
    const allowlist = parseAllowlist({ entries: [{ ...entry, pattern: '*' }] }, CHECKS);
    expect(isAllowed({ ...finding, rule: 'secret-term-3' }, allowlist)).toBe(true);
    expect(
      isAllowed({ ...finding, check: 'document-references', rule: 'docs-folder' }, allowlist),
    ).toBe(false);
  });

  it.each(GUARD_FOLDER_DOCUMENT_PATHS)(
    'still reports a document file at %s, inside a folder the committed allowlist exempts',
    (path) => {
      const scanner = createScanner(FILE_CHECKS, MESSAGE_CHECKS, committedAllowlist());
      const text = REFERENCE_HITS.map((sample) => sample.text).join('\n');
      const findings = scanner.scanFiles([toSourceFile(path, text)]);
      expect(findings).toEqual([expect.objectContaining({ check: 'document-files', file: path })]);
    },
  );

  it.each([
    ['another path', { ...finding, file: 'tools/y/a.ts' }],
    ['another check', { ...finding, check: 'document-references', rule: 'secret-term-1' }],
    ['another rule', { ...finding, rule: 'secret-term-3' }],
  ])('does not cover %s', (_label, other) => {
    const allowlist = parseAllowlist({ entries: [entry] }, CHECKS);
    expect(isAllowed(other, allowlist)).toBe(false);
  });

  it.each([
    ['a missing reason', { entries: [{ ...entry, reason: '' }] }],
    ['an unknown check', { entries: [{ ...entry, check: 'nope' }] }],
    ['an unknown rule', { entries: [{ ...entry, pattern: 'nope' }] }],
    ['a wildcard check', { entries: [{ ...entry, check: '*', pattern: '*' }] }],
    ['a check that cannot be waived', { entries: [{ ...entry, check: 'document-files' }] }],
    [
      'a wildcard rule of a check that cannot be waived',
      { entries: [{ ...entry, check: 'document-files', pattern: '*' }] },
    ],
    ['an extra field', { entries: [{ ...entry, extra: 1 }] }],
    ['a bare array', [entry]],
  ])('rejects %s', (_label, raw) => {
    expect(() => parseAllowlist(raw, CHECKS)).toThrow(/allowlist/i);
  });
});
