import { describe, expect, it } from 'vitest';
import { secretTermsCheck } from '../src/checks/secret-terms';
import { toSourceFile } from '../src/source';
import {
  LISTENER_PATHS,
  NEAR_LISTENER_PATHS,
  PUBLIC_LISTENER_LOADER,
  SECRET_HITS,
  SECRET_NEAR_MISSES,
  SECRET_PATH,
  SECRET_WORD,
} from './fixtures/samples';

describe('secret terms check', () => {
  it.each(SECRET_HITS)('reports $rule in "$text"', ({ rule, text }) => {
    const findings = secretTermsCheck.check(toSourceFile('src/a.ts', text));
    expect(findings.map((f) => f.rule)).toContain(rule);
    expect(findings[0]?.line).toBe(1);
  });

  it.each(SECRET_NEAR_MISSES)('accepts the ordinary text "%s"', (text) => {
    expect(secretTermsCheck.check(toSourceFile('src/a.ts', text))).toEqual([]);
  });

  it('covers every rule it declares with at least one sample', () => {
    const sampled = new Set(SECRET_HITS.map((s) => s.rule));
    expect([...secretTermsCheck.rules].sort()).toEqual([...sampled].sort());
  });

  it('reports a secret term in a file path without a line number', () => {
    const findings = secretTermsCheck.check(toSourceFile(SECRET_PATH, 'export {};'));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: SECRET_PATH, rule: 'secret-term-1' });
    expect(findings[0]?.line).toBeUndefined();
  });

  it.each(LISTENER_PATHS)('exempts the hidden-content folder file %s', (path) => {
    expect(secretTermsCheck.check(toSourceFile(path, SECRET_WORD))).toEqual([]);
  });

  it.each(NEAR_LISTENER_PATHS)('still scans the look-alike path %s', (path) => {
    const findings = secretTermsCheck.check(toSourceFile(path, SECRET_WORD));
    expect(findings.length).toBeGreaterThan(0);
  });

  it('still scans the public loader inside the hidden client folder', () => {
    const findings = secretTermsCheck.check(toSourceFile(PUBLIC_LISTENER_LOADER, SECRET_WORD));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: PUBLIC_LISTENER_LOADER, rule: 'secret-term-1' });
  });

  it('accepts a clean public loader', () => {
    const findings = secretTermsCheck.check(
      toSourceFile(PUBLIC_LISTENER_LOADER, "export const load = () => import('./bundle');"),
    );
    expect(findings).toEqual([]);
  });

  it('applies to readmes as well', () => {
    expect(secretTermsCheck.check(toSourceFile('README.md', SECRET_WORD))).toHaveLength(1);
  });
});
