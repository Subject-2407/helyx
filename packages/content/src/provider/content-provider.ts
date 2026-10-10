/**
 * One piece of game content (an ability, an item, a monster…). Content is plain data: every
 * record has a stable `id` and otherwise carries whatever fields its kind defines.
 */
export type ContentRecord = { readonly id: string } & Readonly<Record<string, unknown>>;

/** Content records grouped by kind (`items`, `monsters`, …), each list in its authored order. */
export type ContentRecordsByKind = Readonly<Record<string, readonly ContentRecord[]>>;

/**
 * Read-only access to the content loaded for this process.
 *
 * Content never changes while the game runs: a new content version means a new provider with a
 * new hash. Implementations therefore hand out frozen records, keep lists in a stable order and
 * scope ids to their kind.
 */
export interface ContentProvider {
  /** Identifies this exact version of the content; clients with another hash must reload. */
  readonly contentHash: string;
  /** The record of `kind` with this `id`, or `undefined` when either is unknown. */
  get(kind: string, id: string): ContentRecord | undefined;
  /** Every record of `kind` in a stable order; an unknown kind yields an empty list. */
  list(kind: string): readonly ContentRecord[];
}
