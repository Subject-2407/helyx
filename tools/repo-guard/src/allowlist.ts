import { z } from 'zod';
import { matchesGlob } from './glob';
import type { CheckInfo, Finding } from './model';

/** Matches any rule of the one check an entry names. */
export const WILDCARD = '*';

const AllowlistEntrySchema = z.strictObject({
  path: z.string().min(1),
  check: z.string().min(1),
  pattern: z.string().min(1),
  reason: z.string().trim().min(1),
});

const AllowlistFileSchema = z.strictObject({
  entries: z.array(AllowlistEntrySchema),
});

/** A path glob where one rule of one check is expected to fire, and why that is fine. */
export type AllowlistEntry = Readonly<z.infer<typeof AllowlistEntrySchema>>;
export type Allowlist = readonly AllowlistEntry[];

/**
 * Every entry names exactly one real check, so a broad entry cannot quietly switch off a check
 * it was not written for, and never a check that must hold everywhere.
 */
function validateEntry(entry: AllowlistEntry, checks: readonly CheckInfo[]): void {
  const where = `Invalid allowlist: entry for "${entry.path}"`;
  if (entry.check === WILDCARD) {
    throw new Error(`${where} must name one check, not "${WILDCARD}"`);
  }
  const check = checks.find((candidate) => candidate.id === entry.check);
  if (check === undefined) {
    throw new Error(`${where} names unknown check "${entry.check}"`);
  }
  if (check.waivable === false) {
    throw new Error(`${where} names the check "${entry.check}", which cannot be waived`);
  }
  if (entry.pattern !== WILDCARD && !check.rules.includes(entry.pattern)) {
    throw new Error(`${where} names unknown rule "${entry.pattern}" of check "${entry.check}"`);
  }
}

/** Validates the allowlist file and checks that every entry names a real check and rule. */
export function parseAllowlist(raw: unknown, checks: readonly CheckInfo[]): Allowlist {
  const parsed = AllowlistFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid allowlist:\n${z.prettifyError(parsed.error)}`);
  }
  for (const entry of parsed.data.entries) validateEntry(entry, checks);
  return parsed.data.entries;
}

function covers(entry: AllowlistEntry, finding: Finding): boolean {
  return (
    entry.check === finding.check &&
    (entry.pattern === WILDCARD || entry.pattern === finding.rule) &&
    matchesGlob(finding.file, entry.path)
  );
}

export function isAllowed(finding: Finding, allowlist: Allowlist): boolean {
  return allowlist.some((entry) => covers(entry, finding));
}
