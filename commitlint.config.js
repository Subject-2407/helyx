/**
 * Commit messages follow Conventional Commits with a short header, and carry no co-author or
 * AI-credit lines: commits are authored by the repository owner only. The repo guard repeats the
 * credit check, so a message is rejected even when commitlint is not the tool that reads it.
 */

const COMMIT_TYPES = [
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

const HEADER_MAX_LENGTH = 72;

const CO_AUTHOR_TRAILER = /^\s*co-authored-by\s*:/iu;
const GENERATED_WITH = /^[^\p{L}\p{N}]*generated\s+(?:with|by)\b/iu;
const AI_GENERATED = /\bai[- ]generated\b/iu;
const AI_NAMES = /\b(?:claude|anthropic|copilot|chatgpt|gpt(?:-[\w.]+)?|gemini|cursor|codex)\b/iu;
const TRAILER = /^\s*([A-Za-z][\w-]*)\s*:\s*(.*)$/u;
const CREDIT_TOKEN = /^(?:[\w-]+-by|ai|agent|assistant|generator|generated|llm|model|tools?)$/iu;

/** @param {string} line */
function isAttribution(line) {
  if (CO_AUTHOR_TRAILER.test(line) || GENERATED_WITH.test(line) || AI_GENERATED.test(line)) {
    return true;
  }
  const trailer = TRAILER.exec(line);
  return trailer !== null && CREDIT_TOKEN.test(trailer[1] ?? '') && AI_NAMES.test(trailer[2] ?? '');
}

/**
 * @param {{ raw?: string | null }} parsed
 * @returns {[boolean, string]}
 */
function noAttribution(parsed) {
  const lines = (parsed.raw ?? '').split(/\r?\n/u).filter((line) => !line.startsWith('#'));
  const offending = lines.find(isAttribution);
  return [
    offending === undefined,
    `remove the co-author or AI-credit line "${offending?.trim() ?? ''}"`,
  ];
}

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [{ rules: { 'no-attribution': noAttribution } }],
  rules: {
    'header-max-length': [2, 'always', HEADER_MAX_LENGTH],
    'type-enum': [2, 'always', COMMIT_TYPES],
    'no-attribution': [2, 'always'],
  },
};
