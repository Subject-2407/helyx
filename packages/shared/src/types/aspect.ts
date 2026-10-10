/** The six Aspects, in their canonical order. Aspects are principles, never elements. */
export const ASPECTS = Object.freeze([
  'growth',
  'entropy',
  'order',
  'change',
  'force',
  'void',
] as const);

export type Aspect = (typeof ASPECTS)[number];

/** A value per Aspect, for resists, resonance and similar vectors. */
export type AspectVector = Readonly<Record<Aspect, number>>;

/** A value for some Aspects; Aspects that are missing count as 0. */
export type PartialAspectVector = Readonly<Partial<Record<Aspect, number>>>;
