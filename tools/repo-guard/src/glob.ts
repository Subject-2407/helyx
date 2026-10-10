/**
 * A small glob dialect for repository paths (always forward slashes):
 * `**` crosses folders, `*` and `?` stay inside one path segment, everything else is literal.
 */
export function globToRegExp(glob: string): RegExp {
  let source = '';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob.charAt(index);
    if (char === '*' && glob.charAt(index + 1) === '*') {
      const folderPrefix = glob.charAt(index + 2) === '/';
      source += folderPrefix ? '(?:.*/)?' : '.*';
      index += folderPrefix ? 2 : 1;
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/gu, '\\$&');
    }
  }
  return new RegExp(`^${source}$`, 'u');
}

export function matchesGlob(path: string, glob: string): boolean {
  return globToRegExp(glob).test(path);
}
