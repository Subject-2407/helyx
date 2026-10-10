import { readFileSync } from 'node:fs';
import { helyxConfig } from '@helyx/config/eslint';

/** Reads an optional ignore file; a missing file means there is nothing to ignore. */
function readOptional(url) {
  try {
    return readFileSync(url, 'utf8');
  } catch {
    return '';
  }
}

export default helyxConfig({
  tsconfigRootDir: import.meta.dirname,
  // Local-only exclusions live in the clone's own exclude file; lint must skip them like git does.
  gitignore: [
    readFileSync(new URL('.gitignore', import.meta.url), 'utf8'),
    readOptional(new URL('.git/info/exclude', import.meta.url)),
  ].join('\n'),
});
