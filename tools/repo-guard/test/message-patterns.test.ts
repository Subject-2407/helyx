import { describe, expect, it } from 'vitest';
import { messageReferencesCheck, messageSecretTermsCheck } from '../src/checks/message-patterns';
import { MESSAGE_REFERENCE, MESSAGE_SECRET } from './fixtures/samples';

const source = 'commit 1234567';

describe('commit message pattern checks', () => {
  it('reports a private document named in a commit message', () => {
    const findings = messageReferencesCheck.check({ source, text: MESSAGE_REFERENCE });
    expect(findings).toMatchObject([{ file: source, line: 1, rule: 'design-acronym' }]);
  });

  it('reports a secret term in a commit message', () => {
    const findings = messageSecretTermsCheck.check({
      source,
      text: `feat: x\n\n${MESSAGE_SECRET}`,
    });
    expect(findings).toMatchObject([{ file: source, line: 3, rule: 'term-awakened' }]);
  });

  it('ignores git comment lines', () => {
    const text = `feat(core): add thing\n# ${MESSAGE_REFERENCE}\n# ${MESSAGE_SECRET}`;
    expect(messageReferencesCheck.check({ source, text })).toEqual([]);
    expect(messageSecretTermsCheck.check({ source, text })).toEqual([]);
  });

  it('accepts a clean message', () => {
    const text = 'feat(core): add thing\n\nExplain the change in plain words.';
    expect(messageReferencesCheck.check({ source, text })).toEqual([]);
    expect(messageSecretTermsCheck.check({ source, text })).toEqual([]);
  });
});
