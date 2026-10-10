import { describe, expect, it } from 'vitest';
import type {
  ContentProvider,
  ContentRecord,
  ContentRecordsByKind,
} from '../provider/content-provider.js';

/** The content every provider under test is built from. */
export interface ContentProviderFixture {
  readonly contentHash: string;
  readonly records: ContentRecordsByKind;
}

function fixture(): ContentProviderFixture {
  return {
    contentHash: 'a1b2c3d4e5f6',
    records: {
      items: [
        { id: 'itm_zeta', weight: 2, tags: ['blade', 'iron'], stats: { power: { base: 4 } } },
        { id: 'itm_alpha', weight: 1, tags: [] },
        { id: 'itm_mid', weight: 3, nested: [{ deep: { value: 1 } }] },
      ],
      monsters: [{ id: 'mon_wisp', level: 1 }],
      quests: [],
    },
  };
}

function ids(records: readonly ContentRecord[]): string[] {
  return records.map((record) => record.id);
}

/** Every object and array reachable from `value`, including `value` itself. */
function reachableObjects(value: unknown): object[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  return [value, ...Object.values(value).flatMap(reachableObjects)];
}

/**
 * The behavior every ContentProvider must share, so test fixtures and the real content database
 * are interchangeable wherever game code reads content.
 *
 * @param build creates a provider serving exactly the given content; it receives a fresh copy of
 *   the fixture on every call
 */
export function describeContentProviderContract(
  name: string,
  build: (content: ContentProviderFixture) => ContentProvider,
): void {
  describe(`${name} honors the ContentProvider contract`, () => {
    it('echoes the content hash it was built with', () => {
      expect(build(fixture()).contentHash).toBe(fixture().contentHash);
    });

    it('lists every record of a kind in the order it was given', () => {
      const provider = build(fixture());
      expect(ids(provider.list('items'))).toEqual(['itm_zeta', 'itm_alpha', 'itm_mid']);
      expect(provider.list('items')).toEqual(fixture().records['items']);
      expect(ids(provider.list('monsters'))).toEqual(['mon_wisp']);
    });

    it('keeps list order stable across calls', () => {
      const provider = build(fixture());
      const first = ids(provider.list('items'));
      for (let call = 0; call < 3; call += 1) {
        expect(ids(provider.list('items'))).toEqual(first);
      }
    });

    it('returns an empty list for a kind with no records', () => {
      expect(build(fixture()).list('quests')).toEqual([]);
    });

    it('returns an empty list for an unknown kind', () => {
      const provider = build(fixture());
      for (const kind of ['abilities', '', 'constructor', '__proto__', 'toString']) {
        expect(provider.list(kind)).toEqual([]);
      }
    });

    it('finds each listed record by kind and id', () => {
      const provider = build(fixture());
      for (const record of provider.list('items')) {
        expect(provider.get('items', record.id)).toEqual(record);
      }
      expect(provider.get('monsters', 'mon_wisp')).toEqual({ id: 'mon_wisp', level: 1 });
    });

    it('returns undefined for an unknown id', () => {
      const provider = build(fixture());
      for (const id of ['itm_missing', '', 'constructor', '__proto__', 'hasOwnProperty']) {
        expect(provider.get('items', id)).toBeUndefined();
      }
    });

    it('returns undefined for an unknown kind', () => {
      const provider = build(fixture());
      expect(provider.get('abilities', 'itm_alpha')).toBeUndefined();
      expect(provider.get('constructor', 'itm_alpha')).toBeUndefined();
    });

    it('scopes ids to their kind', () => {
      expect(build(fixture()).get('monsters', 'itm_alpha')).toBeUndefined();
    });

    it('serves records that are frozen all the way down', () => {
      const provider = build(fixture());
      const reachable = reachableObjects(provider.list('items'));
      expect(reachable.length).toBeGreaterThan(provider.list('items').length);
      for (const value of reachable) {
        expect(Object.isFrozen(value)).toBe(true);
      }
      expect(Object.isFrozen(provider.get('monsters', 'mon_wisp'))).toBe(true);
      expect(Object.isFrozen(provider.list('unknown_kind'))).toBe(true);
    });

    it('rejects attempts to change records or lists', () => {
      const provider = build(fixture());
      const record = provider.get('items', 'itm_zeta') as Record<string, unknown>;
      const list = provider.list('items') as ContentRecord[];
      expect(() => {
        record['weight'] = 99;
      }).toThrow(TypeError);
      expect(() => {
        list.push({ id: 'itm_injected' });
      }).toThrow(TypeError);
      expect(provider.get('items', 'itm_zeta')).toEqual(fixture().records['items']?.[0]);
      expect(ids(provider.list('items'))).toEqual(['itm_zeta', 'itm_alpha', 'itm_mid']);
    });
  });
}
