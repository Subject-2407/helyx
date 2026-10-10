/**
 * Turns the lines of a .gitignore file into ESLint ignore patterns, so anything git never
 * tracks is never linted either and the list of private or generated paths lives in one place.
 *
 * Follows the gitignore anchoring rules: a pattern with a slash at the start or in the middle
 * is relative to the repository root; any other pattern matches at every depth.
 *
 * @param {string} gitignoreText
 * @returns {string[]}
 */
export function gitignoreToEslintIgnores(gitignoreText) {
  return gitignoreText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map(toEslintPattern);
}

/** @param {string} line */
function toEslintPattern(line) {
  const negated = line.startsWith('!');
  const pattern = negated ? line.slice(1) : line;
  const slashIndex = pattern.indexOf('/');
  const anchored = slashIndex >= 0 && slashIndex < pattern.length - 1;
  const relative = pattern.startsWith('/') ? pattern.slice(1) : pattern;
  return `${negated ? '!' : ''}${anchored ? '' : '**/'}${relative}`;
}
