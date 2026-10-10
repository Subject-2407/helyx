import { z } from 'zod';
import { matchesGlob } from './glob';
import type { CheckInfo, Finding } from './model';

/** Matches any check or any rule. */
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

function knownRules(
  entry: AllowlistEntry,
  checks: readonly CheckInfo[],
): readonly string[] | undefined {
  if (entry.check === WILDCARD) return checks.flatMap((check) => check.rules);
  return checks.find((check) => check.id === entry.check)?.rules;
}

function validateEntry(entry: AllowlistEntry, checks: readonly CheckInfo[]): void {
  const rules = knownRules(entry, checks);
  if (rules === undefined) {
    throw new Error(
      `Invalid allowlist: entry for "${entry.path}" names unknown check "${entry.check}"`,
    );
  }
  if (entry.pattern !== WILDCARD && !rules.includes(entry.pattern)) {
    throw new Error(
      `Invalid allowlist: entry for "${entry.path}" names unknown rule "${entry.pattern}" of check "${entry.check}"`,
    );
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
    (entry.check === WILDCARD || entry.check === finding.check) &&
    (entry.pattern === WILDCARD || entry.pattern === finding.rule) &&
    matchesGlob(finding.file, entry.path)
  );
}

export function isAllowed(finding: Finding, allowlist: Allowlist): boolean {
  return allowlist.some((entry) => covers(entry, finding));
}
