import { describe, expect, it } from 'vitest';
import { describeContentProviderContract } from '../testing/content-provider-contract.js';
import { BundleContentProvider, InvalidContentBundleError } from './bundle-content-provider.js';
import { DuplicateContentIdError } from './content-index.js';

// Round-trip through JSON so the provider sees exactly what a parsed bundle file would hold.
describeContentProviderContract('BundleContentProvider', (content) => {
  return new BundleContentProvider(JSON.parse(JSON.stringify(content)));
});

function issuesOf(bundle: unknown): readonly string[] {
  try {
    new BundleContentProvider(bundle);
  } catch (error) {
    if (error instanceof InvalidContentBundleError) {
      return error.issues;
    }
    throw error;
  }
  throw new Error('expected the bundle to be rejected');
}

describe('BundleContentProvider', () => {
  it('rejects a bundle that is not an object', () => {
    for (const bundle of [null, undefined, 'bundle', 42, []]) {
      expect(() => new BundleContentProvider(bundle)).toThrow(InvalidContentBundleError);
    }
  });

  it('rejects a bundle without a usable content hash', () => {
    expect(issuesOf({ records: {} })).toEqual([expect.stringMatching(/^contentHash: /)]);
    expect(issuesOf({ contentHash: '', records: {} })).toEqual([
      expect.stringMatching(/^contentHash: /),
    ]);
    expect(issuesOf({ contentHash: 7, records: {} })).toEqual([
      expect.stringMatching(/^contentHash: /),
    ]);
  });

  it('rejects records that are not grouped by kind into lists', () => {
    expect(issuesOf({ contentHash: 'h' })).toEqual([expect.stringMatching(/^records: /)]);
    expect(issuesOf({ contentHash: 'h', records: [] })).toEqual([
      expect.stringMatching(/^records: /),
    ]);
    expect(issuesOf({ contentHash: 'h', records: { items: { id: 'itm_a' } } })).toEqual([
      expect.stringMatching(/^records\.items: /),
    ]);
  });

  it('rejects records without a non-empty string id and reports where', () => {
    const issues = issuesOf({
      contentHash: 'h',
      records: { items: [{ id: 'itm_a' }, { name: 'no id' }, { id: 3 }, { id: '' }, 'itm_b'] },
    });
    expect(issues).toEqual([
      expect.stringMatching(/^records\.items\.1\.id: /),
      expect.stringMatching(/^records\.items\.2\.id: /),
      expect.stringMatching(/^records\.items\.3\.id: /),
      expect.stringMatching(/^records\.items\.4: /),
    ]);
  });

  it('lists every problem in the error message', () => {
    expect(() => new BundleContentProvider({ contentHash: 1, records: 2 })).toThrow(
      /contentHash: [\s\S]*records: /,
    );
  });

  it('rejects the same id twice within one kind', () => {
    const bundle = {
      contentHash: 'h',
      records: { items: [{ id: 'itm_a' }], monsters: [{ id: 'mon_a' }, { id: 'mon_a' }] },
    };
    expect(() => new BundleContentProvider(bundle)).toThrow(DuplicateContentIdError);
    expect(() => new BundleContentProvider(bundle)).toThrow(/"mon_a".*"monsters"/);
  });

  it('checks duplicates per kind only', () => {
    const provider = new BundleContentProvider({
      contentHash: 'h',
      records: { items: [{ id: 'shared_id' }], monsters: [{ id: 'shared_id' }] },
    });
    expect(provider.get('items', 'shared_id')).toEqual({ id: 'shared_id' });
    expect(provider.get('monsters', 'shared_id')).toEqual({ id: 'shared_id' });
  });

  it('keeps every record field, not just the id', () => {
    const provider = new BundleContentProvider({
      contentHash: 'h',
      records: { items: [{ id: 'itm_a', weight: 2, tags: ['x'], stats: { power: 3 } }] },
    });
    expect(provider.get('items', 'itm_a')).toEqual({
      id: 'itm_a',
      weight: 2,
      tags: ['x'],
      stats: { power: 3 },
    });
  });

  it('keeps a "__proto__" key from parsed JSON as plain data', () => {
    const bundle: unknown = JSON.parse(
      '{"contentHash":"h","records":{"items":[{"id":"itm_a","nested":{"__proto__":{"polluted":true}}}]}}',
    );
    const record = new BundleContentProvider(bundle).get('items', 'itm_a');
    const nested = record?.['nested'] as Record<string, unknown>;
    expect(Object.getPrototypeOf(nested)).toBe(Object.prototype);
    expect(Object.keys(nested)).toEqual(['__proto__']);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('is not affected by later edits to the parsed bundle', () => {
    const bundle = { contentHash: 'h', records: { items: [{ id: 'itm_a', stats: { power: 1 } }] } };
    const provider = new BundleContentProvider(bundle);
    bundle.records.items[0]!.stats.power = 50;
    bundle.records.items.push({ id: 'itm_b', stats: { power: 2 } });
    expect(provider.get('items', 'itm_a')).toEqual({ id: 'itm_a', stats: { power: 1 } });
    expect(provider.list('items')).toHaveLength(1);
  });
});
