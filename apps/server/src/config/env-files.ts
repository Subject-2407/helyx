import { existsSync } from 'node:fs';

export interface EnvFileLoader {
  exists(path: string): boolean;
  load(path: string): void;
}

const nodeEnvFileLoader: EnvFileLoader = {
  exists: (path) => existsSync(path),
  load: (path) => process.loadEnvFile(path),
};

/**
 * Loads each `.env` file that exists, in order. Variables already set in the environment
 * always win, and an earlier file wins over a later one, so a deployment can override any
 * value without editing files.
 *
 * @returns the files that were loaded
 */
export function loadEnvFiles(
  paths: readonly string[],
  loader: EnvFileLoader = nodeEnvFileLoader,
): string[] {
  const unique = [...new Set(paths)];
  const present = unique.filter((path) => loader.exists(path));
  for (const path of present) loader.load(path);
  return present;
}
