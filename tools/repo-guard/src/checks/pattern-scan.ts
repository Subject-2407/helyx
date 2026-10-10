import type { Finding, NamedPattern, SourceLine } from '../model';
import { firstMatch } from '../source';

/** Every pattern hit in a list of lines, one finding per pattern and line. */
export function scanLines(
  check: string,
  file: string,
  lines: readonly SourceLine[],
  patterns: readonly NamedPattern[],
): Finding[] {
  const findings: Finding[] = [];
  for (const line of lines) {
    for (const pattern of patterns) {
      const excerpt = firstMatch(pattern, line.text);
      if (excerpt !== undefined) {
        findings.push({
          check,
          rule: pattern.rule,
          file,
          line: line.number,
          message: pattern.description,
          excerpt,
        });
      }
    }
  }
  return findings;
}

export function ruleIds(patterns: readonly NamedPattern[]): readonly string[] {
  return patterns.map((pattern) => pattern.rule);
}
