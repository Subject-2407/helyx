import { describe, expect, it } from 'vitest';
import { cleanCommitMessage, commitMessageCheck } from '../src/checks/commit-message';
import { MESSAGE_ACCEPTED, MESSAGE_HITS } from './fixtures/samples';

function check(text: string) {
  return commitMessageCheck.check({ source: 'COMMIT_EDITMSG', text });
}

describe('commit message check', () => {
  it.each(MESSAGE_HITS)('rejects with $rule: $message', ({ rule, message }) => {
    const findings = check(message);
    expect(findings.map((f) => f.rule)).toContain(rule);
    expect(findings.every((f) => f.file === 'COMMIT_EDITMSG')).toBe(true);
  });

  it.each(MESSAGE_ACCEPTED)('accepts: %s', (message) => {
    expect(check(message)).toEqual([]);
  });

  it('covers every rule it declares with at least one sample', () => {
    const sampled = new Set(MESSAGE_HITS.map((s) => s.rule));
    expect([...commitMessageCheck.rules].sort()).toEqual([...sampled].sort());
  });

  it('points at the line that carries the trailer', () => {
    const [hit] = check('feat(core): add thing\n\nbody\n\nCo-authored-by: x');
    expect(hit?.line).toBe(5);
  });

  it('drops git comment lines and everything below the scissors line', () => {
    const raw =
      'feat: a\r\n# comment\r\nbody\n# ------------------------ >8 ------------------------\ndiff';
    expect(cleanCommitMessage(raw)).toEqual([
      { number: 1, text: 'feat: a' },
      { number: 3, text: 'body' },
    ]);
  });
});
