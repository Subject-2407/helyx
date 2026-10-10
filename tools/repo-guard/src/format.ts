import type { Finding } from './model';

/** `path:line: what is wrong (found "text") [check/rule]` */
export function formatFinding(finding: Finding): string {
  const where = finding.line === undefined ? finding.file : `${finding.file}:${finding.line}`;
  const found = finding.excerpt === undefined ? '' : ` (found "${finding.excerpt}")`;
  return `${where}: ${finding.message}${found} [${finding.check}/${finding.rule}]`;
}

export function formatReport(findings: readonly Finding[]): string {
  const count = findings.length;
  const summary = `repo-guard: ${count} problem${count === 1 ? '' : 's'} found.`;
  return [...findings.map(formatFinding), summary].join('\n');
}
