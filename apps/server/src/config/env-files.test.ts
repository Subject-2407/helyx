import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadEnvFiles } from './env-files.js';

const KEY = 'HELYX_ENV_FILE_TEST_VALUE';
const dirs: string[] = [];

afterEach(() => {
  Reflect.deleteProperty(process.env, KEY);
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function envFile(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'helyx-env-'));
  dirs.push(dir);
  const path = join(dir, '.env');
  writeFileSync(path, contents);
  return path;
}

describe('loadEnvFiles', () => {
  it('skips files that do not exist', () => {
    expect(loadEnvFiles([join(tmpdir(), 'helyx-missing', '.env')])).toEqual([]);
  });

  it('loads present files, with earlier files winning', () => {
    const first = envFile(`${KEY}=first\n`);
    const second = envFile(`${KEY}=second\n`);
    expect(loadEnvFiles([first, second, first])).toEqual([first, second]);
    expect(process.env[KEY]).toBe('first');
  });

  it('never overrides a variable that is already set', () => {
    process.env[KEY] = 'from-shell';
    loadEnvFiles([envFile(`${KEY}=from-file\n`)]);
    expect(process.env[KEY]).toBe('from-shell');
  });
});
