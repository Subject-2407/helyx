/**
 * commitlint checks the Conventional Commits format with the stock conventional preset, whose
 * type list is the one this repository uses.
 *
 * The repository's own commit rules, the shorter header limit and the ban on co-author and
 * AI-credit lines, live in one place only: the repo guard. It runs right after commitlint in the
 * commit-msg hook and again in CI, so keeping those rules out of this file means two copies can
 * never drift apart.
 */
export default {
  extends: ['@commitlint/config-conventional'],
};
