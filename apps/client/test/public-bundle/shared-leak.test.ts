import * as listener from '@helyx/shared/listener';
import { describe, expect, it } from 'vitest';
import { bundleProbe } from './bundle-probe.js';

/** Bundling the whole shared package takes a few seconds; a cold machine under load needs more. */
const BUILD_TIMEOUT_MS = 120_000;

/** Characters of surrounding code printed on each side of a hit, so a failure shows where it is. */
const CONTEXT_CHARS = 40;

interface ForbiddenRule {
  readonly label: string;
  readonly pattern: RegExp;
}

interface Hit {
  readonly rule: string;
  readonly token: string;
  readonly context: string;
}

/**
 * A token that matched a rule but was reviewed and found harmless in the public bundle. Every
 * entry must say why it is safe; an entry without a reason is a hidden leak.
 */
interface AllowedToken {
  readonly token: string;
  readonly reason: string;
}

/** Reviewed exceptions. Empty: nothing in the public bundle needs one yet. */
const ALLOWED_TOKENS: readonly AllowedToken[] = [];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** One case-sensitive pattern that matches any of the names as a whole word. */
function wholeWords(names: readonly string[]): RegExp {
  return new RegExp(`\\b(?:${names.map(escapeRegExp).join('|')})\\b`, 'g');
}

const listenerKeys = Object.keys(listener.K_LISTENER);
const listenerExports = Object.keys(listener);

const RULES: readonly ForbiddenRule[] = [
  { label: 'listener constant key', pattern: wholeWords(listenerKeys) },
  { label: 'listener entry export', pattern: wholeWords(listenerExports) },
  {
    label: 'listener constant prefix',
    pattern: /\b(?:SYNC|SP|DIS|UNBOUND|RES|CALM|LISTEN|JARRED)_[A-Z0-9_]+/g,
  },
  {
    label: 'discovery or meter word',
    pattern: /\b(?:folio|exile|circuit|dissonance|listener|attune\w*)\b/gi,
  },
];

function contextAround(code: string, index: number, length: number): string {
  const start = Math.max(0, index - CONTEXT_CHARS);
  const end = Math.min(code.length, index + length + CONTEXT_CHARS);
  return code.slice(start, end).replace(/\s+/g, ' ');
}

function findHits(code: string): Hit[] {
  const allowed = new Set(ALLOWED_TOKENS.map((entry) => entry.token));
  return RULES.flatMap((rule) =>
    [...code.matchAll(rule.pattern)]
      .filter((match) => !allowed.has(match[0]))
      .map((match) => ({
        rule: rule.label,
        token: match[0],
        context: contextAround(code, match.index, match[0].length),
      })),
  );
}

function describeHits(hits: readonly Hit[]): string {
  return hits.map((hit) => `${hit.rule}: ${hit.token}  ...${hit.context}...`).join('\n');
}

async function hitsFor(source: string): Promise<Hit[]> {
  return findHits(await bundleProbe(source));
}

describe('public shared bundle', () => {
  it('reads the names it scans for from the listener entry', () => {
    expect(listenerKeys.length).toBeGreaterThan(0);
    expect(listenerExports).toContain('K_LISTENER');
    for (const entry of ALLOWED_TOKENS) {
      expect(entry.reason.trim(), entry.token).not.toBe('');
    }
  });

  it(
    'carries no listener name when the whole public entry is bundled',
    async () => {
      const hits = await hitsFor("export * from '@helyx/shared';");
      expect(hits, describeHits(hits)).toEqual([]);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'carries no listener name when only the movement step is bundled',
    async () => {
      const hits = await hitsFor(
        "import { stepMove } from '@helyx/shared'; export const probe = stepMove;",
      );
      expect(hits, describeHits(hits)).toEqual([]);
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'finds listener names in the listener entry, so the scan can see a leak',
    async () => {
      const hits = await hitsFor("export * from '@helyx/shared/listener';");
      const rules = new Set(hits.map((hit) => hit.rule));

      expect(rules).toContain('listener constant key');
      expect(rules).toContain('listener entry export');
      expect(rules).toContain('listener constant prefix');
    },
    BUILD_TIMEOUT_MS,
  );
});
