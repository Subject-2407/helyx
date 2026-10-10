/** A co-author trailer in any letter case; commits are authored by the owner only. */
export const CO_AUTHOR_TRAILER = /^\s*co-authored-by\s*:/iu;

/** A "Generated with/by ..." line, also when an emoji or bullet comes first. */
export const GENERATED_WITH = /^[^\p{L}\p{N}]*generated\s+(?:with|by)\b/iu;

/** Text that labels the change itself as machine written. */
export const AI_GENERATED = /\bai[- ]generated\b/iu;

/** Names of AI assistants and their makers. */
export const AI_NAMES =
  /\b(?:claude|anthropic|copilot|chatgpt|gpt(?:-[\w.]+)?|gemini|cursor|codex)\b/iu;

/** A git trailer: `Token: value`. */
export const TRAILER = /^\s*([A-Za-z][\w-]*)\s*:\s*(.*)$/u;

/** Trailer tokens that give credit (`Assisted-by`, `Signed-off-by`, `Tool`, ...). */
export const CREDIT_TOKEN =
  /^(?:[\w-]+-by|ai|agent|assistant|generator|generated|llm|model|tools?)$/iu;
