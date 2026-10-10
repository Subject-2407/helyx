import type { ContentRecord, ContentRecordsByKind } from './content-provider.js';
import { frozenCopy } from './frozen-copy.js';

/** Thrown when one kind lists the same id twice, which would make lookups ambiguous. */
export class DuplicateContentIdError extends Error {
  constructor(
    readonly kind: string,
    readonly id: string,
  ) {
    super(`duplicate content id "${id}" in kind "${kind}"`);
    this.name = 'DuplicateContentIdError';
  }
}

interface KindEntry {
  readonly records: readonly ContentRecord[];
  readonly byId: ReadonlyMap<string, ContentRecord>;
}

const NO_RECORDS: readonly ContentRecord[] = Object.freeze([]);

function indexKind(kind: string, records: readonly ContentRecord[]): KindEntry {
  const frozen = frozenCopy(records, kind);
  const byId = new Map<string, ContentRecord>();
  for (const record of frozen) {
    if (byId.has(record.id)) {
      throw new DuplicateContentIdError(kind, record.id);
    }
    byId.set(record.id, record);
  }
  return { records: frozen, byId };
}

/**
 * Frozen, id-indexed copy of content records shared by the provider implementations. Lookups go
 * through Maps so kind or id strings such as "constructor" never hit object prototypes.
 */
export class ContentIndex {
  readonly #kinds = new Map<string, KindEntry>();

  constructor(recordsByKind: ContentRecordsByKind) {
    for (const [kind, records] of Object.entries(recordsByKind)) {
      this.#kinds.set(kind, indexKind(kind, records));
    }
  }

  get(kind: string, id: string): ContentRecord | undefined {
    return this.#kinds.get(kind)?.byId.get(id);
  }

  list(kind: string): readonly ContentRecord[] {
    return this.#kinds.get(kind)?.records ?? NO_RECORDS;
  }
}
