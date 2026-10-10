/** 32-bit FNV-1a hashing, for room seeds and for fingerprints of byte streams in tests. */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const BYTE_MASK = 0xff;
const BITS_PER_BYTE = 8;

/** FNV-1a over raw bytes, as an unsigned 32-bit integer. */
export function fnv1aBytes(bytes: Uint8Array): number {
  let hash = FNV_OFFSET;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/**
 * A u32 seed from a text, such as a room id plus its start time. The text is hashed as the
 * two bytes of each UTF-16 code unit, low byte first, so every engine gets the same seed.
 */
export function seedFromString(text: string): number {
  const bytes = new Uint8Array(text.length * 2);
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    bytes[index * 2] = unit & BYTE_MASK;
    bytes[index * 2 + 1] = unit >>> BITS_PER_BYTE;
  }
  return fnv1aBytes(bytes);
}
