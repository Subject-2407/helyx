import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isAllowed, parseAllowlist } from '../src/allowlist';
import { FILE_CHECKS, MESSAGE_CHECKS } from '../src/registry';
import type { Finding } from '../src/model';

const CHECKS = [...FILE_CHECKS, ...MESSAGE_CHECKS];

const entry = {
  path: 'tools/x/**',
  check: 'secret-terms',
  pattern: 'term-awakened',
  reason: 'test',
};

const finding: Finding = {
  check: 'secret-terms',
  rule: 'term-awakened',
  file: 'tools/x/a.ts',
  line: 1,
  message: 'm',
};

describe('allowlist', () => {
  it('parses the committed allowlist and gives every entry a reason', () => {
    const raw: unknown = JSON.parse(
      readFileSync(new URL('../allowlist.json', import.meta.url), 'utf8'),
    );
    const allowlist = parseAllowlist(raw, CHECKS);
    expect(allowlist.length).toBeGreaterThan(0);
    expect(allowlist.every((e) => e.reason.trim().length > 0)).toBe(true);
  });

  it('honors an entry that matches path, check and rule', () => {
    const allowlist = parseAllowlist({ entries: [entry] }, CHECKS);
    expect(isAllowed(finding, allowlist)).toBe(true);
  });

  it('accepts a wildcard check and rule', () => {
    const allowlist = parseAllowlist({ entries: [{ ...entry, check: '*', pattern: '*' }] }, CHECKS);
    expect(
      isAllowed({ ...finding, check: 'document-references', rule: 'docs-folder' }, allowlist),
    ).toBe(true);
  });

  it.each([
    ['another path', { ...finding, file: 'tools/y/a.ts' }],
    ['another check', { ...finding, check: 'document-references', rule: 'term-awakened' }],
    ['another rule', { ...finding, rule: 'term-thread-of' }],
  ])('does not cover %s', (_label, other) => {
    const allowlist = parseAllowlist({ entries: [entry] }, CHECKS);
    expect(isAllowed(other, allowlist)).toBe(false);
  });

  it.each([
    ['a missing reason', { entries: [{ ...entry, reason: '' }] }],
    ['an unknown check', { entries: [{ ...entry, check: 'nope' }] }],
    ['an unknown rule', { entries: [{ ...entry, pattern: 'nope' }] }],
    ['an extra field', { entries: [{ ...entry, extra: 1 }] }],
    ['a bare array', [entry]],
  ])('rejects %s', (_label, raw) => {
    expect(() => parseAllowlist(raw, CHECKS)).toThrow(/allowlist/i);
  });
});
