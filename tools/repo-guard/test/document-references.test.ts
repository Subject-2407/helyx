import { describe, expect, it } from 'vitest';
import { documentReferencesCheck } from '../src/checks/document-references';
import { toSourceFile } from '../src/source';
import { REFERENCE_HITS, REFERENCE_NEAR_MISSES } from './fixtures/samples';

function checkLine(text: string, path = 'src/module.ts') {
  return documentReferencesCheck.check(toSourceFile(path, text));
}

describe('document references check', () => {
  it.each(REFERENCE_HITS)('reports $rule in "$text"', ({ rule, text }) => {
    const findings = checkLine(text);
    expect(findings.map((f) => f.rule)).toContain(rule);
    expect(findings.every((f) => f.line === 1 && f.file === 'src/module.ts')).toBe(true);
  });

  it.each(REFERENCE_NEAR_MISSES)('accepts the near miss "%s"', (text) => {
    expect(checkLine(text)).toEqual([]);
  });

  it('covers every rule it declares with at least one sample', () => {
    const sampled = new Set(REFERENCE_HITS.map((s) => s.rule));
    expect([...documentReferencesCheck.rules].sort()).toEqual([...sampled].sort());
  });

  it.each(['README.md', 'apps/x/README.md'])('scans the contributor readme %s too', (path) => {
    const text = REFERENCE_HITS.map((s) => s.text).join('\n');
    const findings = documentReferencesCheck.check(toSourceFile(path, text));
    const reported = new Set(findings.map((f) => f.rule));
    expect([...reported].sort()).toEqual([...documentReferencesCheck.rules].sort());
  });

  it('reports the line number of each hit', () => {
    const [hit] = REFERENCE_HITS;
    const text = ['const a = 1;', 'const b = 2;', hit?.text ?? ''].join('\n');
    expect(checkLine(text).map((f) => f.line)).toEqual([3]);
  });
});
