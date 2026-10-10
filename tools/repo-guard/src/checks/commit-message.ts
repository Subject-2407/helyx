import type { Finding, MessageCheck, SourceLine } from '../model';
import {
  AI_GENERATED,
  AI_NAMES,
  CO_AUTHOR_TRAILER,
  CREDIT_TOKEN,
  GENERATED_WITH,
  TRAILER,
} from '../patterns/ai-credit';
import { splitLines } from '../source';

export const COMMIT_TYPES: readonly string[] = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'docs',
  'style',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];

export const HEADER_MAX_LENGTH = 72;

const CONVENTIONAL_HEADER = new RegExp(
  `^(?:${COMMIT_TYPES.join('|')})(?:\\([^()\\r\\n]+\\))?!?: \\S`,
  'u',
);

/** Headers git writes itself; commitlint skips them too. */
const GIT_GENERATED_HEADERS: readonly RegExp[] = [
  /^Merge /u,
  /^Revert "/u,
  /^(?:fixup|squash|amend)! /u,
  /^Automatic merge/u,
];

const SCISSORS = /^# -+ >8 -+$/u;
const GIT_COMMENT = '#';

/** The lines git keeps from a message file: no comment lines, nothing below the scissors. */
export function cleanCommitMessage(raw: string): SourceLine[] {
  const kept: SourceLine[] = [];
  for (const line of splitLines(raw)) {
    if (SCISSORS.test(line.text)) break;
    if (!line.text.startsWith(GIT_COMMENT)) kept.push(line);
  }
  return kept;
}

interface LineRule {
  readonly rule: string;
  readonly message: string;
  matches(text: string): boolean;
}

function isAiCredit(text: string): boolean {
  if (AI_GENERATED.test(text)) return true;
  const trailer = TRAILER.exec(text);
  if (trailer === null || CO_AUTHOR_TRAILER.test(text)) return false;
  return CREDIT_TOKEN.test(trailer[1] ?? '') && AI_NAMES.test(trailer[2] ?? '');
}

const LINE_RULES: readonly LineRule[] = [
  {
    rule: 'co-author-trailer',
    message: 'has a co-author trailer; commits are authored by the repository owner only',
    matches: (text) => CO_AUTHOR_TRAILER.test(text),
  },
  {
    rule: 'generated-with',
    message: 'has a "Generated with" line; leave tool credits out of commit messages',
    matches: (text) => GENERATED_WITH.test(text),
  },
  {
    rule: 'ai-credit',
    message: 'credits an AI tool; leave tool credits out of commit messages',
    matches: isAiCredit,
  },
];

function headerFindings(check: string, source: string, header: SourceLine | undefined): Finding[] {
  const text = header?.text ?? '';
  const line = header?.number ?? 1;
  const findings: Finding[] = [];
  if (Array.from(text).length > HEADER_MAX_LENGTH) {
    findings.push({
      check,
      rule: 'header-length',
      file: source,
      line,
      message: `has a header longer than ${HEADER_MAX_LENGTH} characters`,
    });
  }
  const gitGenerated = GIT_GENERATED_HEADERS.some((regex) => regex.test(text));
  if (!gitGenerated && !CONVENTIONAL_HEADER.test(text)) {
    findings.push({
      check,
      rule: 'conventional-header',
      file: source,
      line,
      message: `needs a conventional header "type(scope): description" (types: ${COMMIT_TYPES.join(', ')})`,
      excerpt: text,
    });
  }
  return findings;
}

const ID = 'commit-message';

export const commitMessageCheck: MessageCheck = {
  id: ID,
  rules: [...LINE_RULES.map((rule) => rule.rule), 'header-length', 'conventional-header'],
  check(message) {
    const lines = cleanCommitMessage(message.text);
    const header = lines.find((line) => line.text.trim() !== '');
    const lineFindings = lines.flatMap((line) =>
      LINE_RULES.filter((rule) => rule.matches(line.text)).map((rule): Finding => ({
        check: ID,
        rule: rule.rule,
        file: message.source,
        line: line.number,
        message: rule.message,
        excerpt: line.text.trim(),
      })),
    );
    return [...headerFindings(ID, message.source, header), ...lineFindings];
  },
};
