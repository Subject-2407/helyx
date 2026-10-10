import { describe, expect, it } from 'vitest';
import { describeContentProviderContract } from '../testing/content-provider-contract.js';
import { DuplicateContentIdError } from './content-index.js';
import { ContentValueError } from './frozen-copy.js';
import { InMemoryContentProvider } from './in-memory-content-provider.js';

describeContentProviderContract('InMemoryContentProvider', (content) => {
  return new InMemoryContentProvider(content);
});

describe('InMemoryContentProvider', () => {
  it('rejects the same id twice within one kind', () => {
    const build = (): InMemoryContentProvider =>
      new InMemoryContentProvider({
        contentHash: 'hash',
        records: { items: [{ id: 'itm_a' }, { id: 'itm_b' }, { id: 'itm_a' }] },
      });
    expect(build).toThrow(DuplicateContentIdError);
    expect(build).toThrow(/"itm_a".*"items"/);
  });

  it('leaves the caller’s records unfrozen and unaffected by later edits', () => {
    const record = { id: 'itm_a', stats: { power: 1 } };
    const provider = new InMemoryContentProvider({
      contentHash: 'hash',
      records: { items: [record] },
    });
    expect(Object.isFrozen(record)).toBe(false);
    record.stats.power = 50;
    expect(provider.get('items', 'itm_a')).toEqual({ id: 'itm_a', stats: { power: 1 } });
  });

  it('rejects values that are not plain data', () => {
    expect(
      () =>
        new InMemoryContentProvider({
          contentHash: 'hash',
          records: { items: [{ id: 'itm_a', since: new Map() }] },
        }),
    ).toThrow(ContentValueError);
    expect(
      () =>
        new InMemoryContentProvider({
          contentHash: 'hash',
          records: { items: [{ id: 'itm_a', handler: () => 1 }] },
        }),
    ).toThrow(/items\[0\]\.handler/);
  });
});
