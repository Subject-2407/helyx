import { z } from 'zod';
import { ContentIndex } from './content-index.js';
import type { ContentProvider, ContentRecord } from './content-provider.js';

/**
 * The smallest shape a content bundle must have to be served: a hash and records grouped by
 * kind, each with a non-empty string id. Fields beyond `id` are kept as they are; checking them
 * is the job of each kind's own schema.
 */
const bundleEnvelopeSchema = z.object({
  contentHash: z.string().min(1),
  records: z.record(z.string().min(1), z.array(z.looseObject({ id: z.string().min(1) }))),
});

/** Thrown when parsed bundle JSON does not have the expected envelope. */
export class InvalidContentBundleError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`invalid content bundle:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'InvalidContentBundleError';
  }
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.map((segment) => String(segment)).join('.');
  return path === '' ? issue.message : `${path}: ${issue.message}`;
}

/**
 * Content provider over a parsed content bundle. It performs no I/O: reading and parsing the file
 * is the caller's job. The envelope is validated, duplicate ids within a kind are rejected, and
 * every record is served deeply frozen because content never changes at runtime.
 */
export class BundleContentProvider implements ContentProvider {
  readonly contentHash: string;
  readonly #index: ContentIndex;

  /** @param bundle the parsed bundle JSON, still untrusted */
  constructor(bundle: unknown) {
    const parsed = bundleEnvelopeSchema.safeParse(bundle);
    if (!parsed.success) {
      throw new InvalidContentBundleError(parsed.error.issues.map(describeIssue));
    }
    this.contentHash = parsed.data.contentHash;
    this.#index = new ContentIndex(parsed.data.records);
  }

  get(kind: string, id: string): ContentRecord | undefined {
    return this.#index.get(kind, id);
  }

  list(kind: string): readonly ContentRecord[] {
    return this.#index.list(kind);
  }
}
