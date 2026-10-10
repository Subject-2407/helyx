/**
 * Sample inputs for the guard's own tests. Every string the guard must reject lives here, in
 * one folder the allowlist exempts, so the test files themselves stay clean.
 */

export interface RuleSample {
  readonly rule: string;
  readonly text: string;
}

/** Lines that must be reported as naming the private design documents. */
export const REFERENCE_HITS: readonly RuleSample[] = [
  { rule: 'agent-file', text: '// read CLAUDE.md before editing this module' },
  { rule: 'agent-file', text: '// conventions live in AGENTS.md' },
  { rule: 'agent-file', text: '// GEMINI notes say otherwise' },
  { rule: 'design-acronym', text: '// the rule comes from the GDD' },
  { rule: 'design-acronym', text: '/* SRS acceptance: 3 hits */' },
  { rule: 'document-name', text: '// recorded in the decision log' },
  { rule: 'document-name', text: '// see the Decision-Log entry' },
  { rule: 'document-name', text: '// named after the lore bible' },
  { rule: 'document-name', text: '// as the design docs say' },
  { rule: 'document-name', text: '// per the design documents' },
  { rule: 'decision-id', text: '// owner choice D-151' },
  { rule: 'requirement-id', text: "it('FR-CMB-07 deals damage', () => {});" },
  { rule: 'requirement-id', text: '// covers NFR-MNT-05' },
  { rule: 'requirement-id', text: '// boundary rule ARCH-06' },
  { rule: 'requirement-id', text: '// scenario IT-12' },
  { rule: 'requirement-id', text: '// open issue OI-PIPE-8' },
  { rule: 'numbered-document', text: '// numbers from 07-combat-formulas.md' },
  { rule: 'section-sign', text: '// formula from §19' },
  { rule: 'section-sign', text: '// see § 4 for the tick order' },
  { rule: 'docs-folder', text: "const path = 'docs/notes.txt';" },
];

/** Lines that look close to a reference but must pass. */
export const REFERENCE_NEAR_MISSES: readonly string[] = [
  'const GDDX = 1;',
  'const srsCount = 0;',
  'const USER_AGENTS = [];',
  '// decisionlog is one word here',
  '// the design dock is wet',
  '// version D-15 of the sprite',
  '// build D-1234',
  "const locale = 'fr-ca';",
  "const distro = 'ARCH-linux';",
  '// file 7-combat.md has one digit',
  "import x from './07-combat.ts';",
  '// a lone § without a number',
  "const p = 'mydocs/readme.txt';",
  '// the docs folder',
];

/** Lines that contain a secret term. */
export const SECRET_HITS: readonly RuleSample[] = [
  { rule: 'secret-term-1', text: 'const waker = spawn();' },
  { rule: 'secret-term-1', text: "const id = 'TITLE_WAKER';" },
  { rule: 'secret-term-1', text: 'const Wakers = [];' },
  { rule: 'secret-term-2', text: 'Re-expression' },
  { rule: 'secret-term-2', text: "const kind = 're_express';" },
  { rule: 'secret-term-2', text: 'reexpress()' },
  { rule: 'secret-term-2', text: 'function onReExpress() {}' },
  { rule: 'secret-term-2', text: 'RE EXPRESS' },
  { rule: 'secret-term-3', text: "const key = 'x_thread_of_y';" },
  { rule: 'secret-term-4', text: 'Turning of the Thread' },
  { rule: 'secret-term-4', text: 'turning  of\tthe thread' },
];

/** Ordinary words that must not be mistaken for a secret term. */
export const SECRET_NEAR_MISSES: readonly string[] = [
  'durations are expressed in milliseconds',
  'wake up the server',
  "import express from 'express';",
  'a worker thread pool',
  'the turning of the page',
  'const threadOffset = 0;',
];

/** A word that is a secret term, used to build paths and file contents. */
export const SECRET_WORD = 'waker';

/** Paths inside the folders that hold hidden content; secret terms are allowed there. */
export const LISTENER_PATHS: readonly string[] = [
  'packages/content/data/listener/wakers.json',
  'packages/content/i18n/en/listener/strings.json',
  'assets/sprites/npc/listener/waker.png',
  'assets/listener/waker.png',
  'apps/client/src/listener/reexpress.ts',
];

/** Paths that only look like the hidden-content folders and stay covered by the scan. */
export const NEAR_LISTENER_PATHS: readonly string[] = [
  'packages/content/data/listener-notes/waker.json',
  'packages/content/i18n/listener/waker.json',
  'apps/client/src/ui/listener-waker.ts',
  'apps/server/src/listener/waker.ts',
];

/** A path that carries a secret term in its own name. */
export const SECRET_PATH = 'apps/server/src/systems/waker-spawn.ts';

export interface MessageSample {
  readonly rule: string;
  readonly message: string;
}

/** Commit messages that must be rejected, with the rule each one breaks. */
export const MESSAGE_HITS: readonly MessageSample[] = [
  {
    rule: 'co-author-trailer',
    message: 'feat(core): add thing\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
  },
  { rule: 'co-author-trailer', message: 'feat(core): add thing\n\nco-authored-by: Jane <j@x.io>' },
  { rule: 'co-author-trailer', message: 'feat(core): add thing\n\nCO-AUTHORED-BY: Jane <j@x.io>' },
  { rule: 'co-author-trailer', message: 'feat(core): add thing\n\n  Co-authored-by : Jane' },
  {
    rule: 'generated-with',
    message:
      'feat(core): add thing\n\n\u{1F916} Generated with [Claude Code](https://claude.com/claude-code)',
  },
  { rule: 'generated-with', message: 'fix: tidy\n\nGenerated by ChatGPT' },
  { rule: 'generated-with', message: 'fix: tidy\n\ngenerated with a tool' },
  { rule: 'ai-credit', message: 'fix: tidy\n\nAssisted-by: GitHub Copilot' },
  { rule: 'ai-credit', message: 'fix: tidy\n\nSigned-off-by: Codex <bot@example.com>' },
  { rule: 'ai-credit', message: 'fix: tidy\n\nReviewed-by: Gemini' },
  { rule: 'ai-credit', message: 'fix: tidy\n\nHelped-by: GPT-4o' },
  { rule: 'ai-credit', message: 'fix: tidy\n\nTool: Cursor' },
  { rule: 'ai-credit', message: 'fix: tidy\n\nModel: Anthropic' },
  { rule: 'ai-credit', message: 'fix: tidy\n\nThis change is AI-generated.' },
  { rule: 'ai-credit', message: 'fix: tidy\n\nAI generated patch' },
  { rule: 'header-length', message: `feat(core): ${'a'.repeat(61)}` },
  { rule: 'conventional-header', message: 'Add thing' },
  { rule: 'conventional-header', message: 'feature(core): add thing' },
  { rule: 'conventional-header', message: 'feat(core):add thing' },
  { rule: 'conventional-header', message: 'feat(): add thing' },
];

/** Commit messages that must pass. */
export const MESSAGE_ACCEPTED: readonly string[] = [
  'feat(core): add thing',
  `feat(core): ${'a'.repeat(60)}`,
  'fix(net)!: drop stale snapshots\n\nBREAKING CHANGE: the cursor field is renamed',
  'feat(ui): add text cursor blink',
  'chore: update files generated with tsup',
  'refactor(server): split room setup\n\nThe setup grew too long.\n\nRefs: #12',
  'revert: feat(core): add thing',
  'docs: explain how to run tests\n# Co-authored-by: only a git comment line',
  'test: cover edge\n\n# ------------------------ >8 ------------------------\nCo-authored-by: x',
  'build: bump deps\n\nNote: the cursor library moved to a new major',
  "Merge branch 'main' into feature",
  'Revert "feat(core): add thing"',
  'fixup! feat(core): add thing',
];

/** One staged comment that names a private design document. */
export const STAGED_REFERENCE_COMMENT =
  '// tuned to match the GDD damage table\nexport const x = 1;\n';

/** Private folders and files that git must refuse to stage. */
export const PRIVATE_PATHS: readonly string[] = ['docs', 'CLAUDE.md', '.claude'];

/** Contributor readmes: the only document files that may be committed. */
export const README_PATHS: readonly string[] = [
  'README.md',
  'apps/server/README.md',
  'tools/repo-guard/README.md',
];

/** Document files that must never be committed. */
export const DOCUMENT_PATHS: readonly string[] = [
  'notes.md',
  'docs/x.md',
  'apps/client/CHANGELOG.md',
  'plans/roadmap.mdx',
  'spec.docx',
  'old.doc',
  'manual.pdf',
  'draft.odt',
  'SHOUTING.MD',
  'readme.md',
  'README.md.pdf',
];

/** Files that only look like documents. */
export const NON_DOCUMENT_PATHS: readonly string[] = [
  'src/index.ts',
  'package.json',
  'assets/sprites/hero.png',
  'docs.ts',
  'md/file.txt',
];

/** Commit messages that name a private document or carry a secret term. */
export const MESSAGE_REFERENCE = 'fix(combat): match the GDD damage table';
export const MESSAGE_SECRET = 'feat(quest): add the waker intro';
