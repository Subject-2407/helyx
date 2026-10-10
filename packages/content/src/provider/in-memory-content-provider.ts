import { ContentIndex } from './content-index.js';
import type { ContentProvider, ContentRecord, ContentRecordsByKind } from './content-provider.js';

export interface InMemoryContentInput {
  readonly contentHash: string;
  readonly records: ContentRecordsByKind;
}

/**
 * Content provider over records that are already typed and in memory, for tests and fixtures.
 * The records are copied and frozen on construction; duplicate ids within a kind are rejected.
 */
export class InMemoryContentProvider implements ContentProvider {
  readonly contentHash: string;
  readonly #index: ContentIndex;

  constructor(input: InMemoryContentInput) {
    this.contentHash = input.contentHash;
    this.#index = new ContentIndex(input.records);
  }

  get(kind: string, id: string): ContentRecord | undefined {
    return this.#index.get(kind, id);
  }

  list(kind: string): readonly ContentRecord[] {
    return this.#index.list(kind);
  }
}
