import { fileURLToPath } from 'node:url';
import { cruise, type ICruiseOptions, type ICruiseResult } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config';
import { beforeAll, describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const configFile = fileURLToPath(new URL('../../../../.dependency-cruiser.cjs', import.meta.url));
const tsConfigFile = fileURLToPath(new URL('../../../../tsconfig.json', import.meta.url));
const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url));

// Parsing TypeScript for a whole fixture tree can take a few seconds on a cold start.
const CRUISE_TIMEOUT_MS = 60_000;

interface Finding {
  readonly rule: string;
  readonly from: string;
  readonly to: string;
}

let baseOptions: ICruiseOptions;
let tsConfig: unknown;

async function cruiseTree(baseDir: string, roots: string[]): Promise<ICruiseResult> {
  const { output } = await cruise(roots, { ...baseOptions, baseDir }, undefined, { tsConfig });
  if (typeof output === 'string') {
    throw new TypeError('expected a structured cruise result');
  }
  return output;
}

async function findingsFor(fixture: string): Promise<Finding[]> {
  const result = await cruiseTree(`${fixturesDir}${fixture}`, ['.']);
  return result.summary.violations.map((v) => ({ rule: v.rule.name, from: v.from, to: v.to }));
}

beforeAll(async () => {
  baseOptions = await extractDepcruiseOptions(configFile);
  tsConfig = extractTSConfig(tsConfigFile);
});

describe('module boundary rules', { timeout: CRUISE_TIMEOUT_MS }, () => {
  it('rejects the shared package importing the protocol package', async () => {
    expect(await findingsFor('shared-imports-protocol')).toEqual([
      {
        rule: 'shared-imports-no-workspace-package',
        from: 'packages/shared/src/bad.ts',
        to: 'packages/protocol/src/index.ts',
      },
    ]);
  });

  it('rejects bots importing the database package', async () => {
    expect(await findingsFor('bots-import-db')).toEqual([
      {
        rule: 'bots-imports-only-shared-protocol-content',
        from: 'tools/bots/src/bad.ts',
        to: 'packages/db/src/index.ts',
      },
    ]);
  });

  it('rejects a two-file import cycle', async () => {
    const result = await cruiseTree(`${fixturesDir}cycle`, ['.']);
    const violations = result.summary.violations;
    expect(violations.map((v) => v.rule.name)).toEqual(['no-circular']);
    const cycleFiles = [violations[0]?.from, ...(violations[0]?.cycle ?? []).map((c) => c.name)];
    expect(new Set(cycleFiles)).toEqual(
      new Set(['packages/shared/src/a.ts', 'packages/shared/src/b.ts']),
    );
  });

  it('rejects a scene statically importing listener code', async () => {
    expect(await findingsFor('scene-imports-listener')).toEqual([
      {
        rule: 'no-static-listener-import',
        from: 'apps/client/src/scenes/x.ts',
        to: 'apps/client/src/listener/y.ts',
      },
    ]);
  });

  it('accepts a tree that only uses allowed imports', async () => {
    const result = await cruiseTree(`${fixturesDir}clean`, ['.']);
    expect(result.summary.violations).toEqual([]);

    // Every relative import in the tree must resolve, otherwise a rule could
    // pass only because the file it points at was never found.
    const unresolvedLocal = result.modules.flatMap((m) =>
      m.dependencies
        .filter((d) => d.couldNotResolve && d.module.startsWith('.'))
        .map((d) => `${m.source} -> ${d.module}`),
    );
    expect(unresolvedLocal).toEqual([]);

    // The dynamic import of the listener entry is seen, and allowed.
    const main = result.modules.find((m) => m.source === 'apps/client/src/main.ts');
    expect(main?.dependencies.find((d) => d.module === './listener/index')?.dynamic).toBe(true);
  });

  it('reports every other forbidden import in a mixed tree', async () => {
    const findings = await findingsFor('forbidden');
    const actual = new Set(findings.map((f) => `${f.rule} | ${f.from}`));
    expect(actual).toEqual(
      new Set([
        'shared-no-external-packages | packages/shared/src/uses-npm.ts',
        'shared-no-node-builtins | packages/shared/src/uses-node.ts',
        'shared-test-runner-only-in-tests | packages/shared/src/uses-vitest.ts',
        'shared-imports-no-workspace-package | packages/shared/src/uses-alias.ts',
        'protocol-imports-only-shared | packages/protocol/src/bad.ts',
        'content-imports-only-shared | packages/content/src/uses-config.ts',
        'client-imports-only-shared-protocol-content | apps/client/src/net/bad.ts',
        'client-no-node-builtins | apps/client/src/net/node.ts',
        'client-no-raw-content-data | apps/client/src/world/raw.ts',
        'client-ui-no-phaser | apps/client/src/ui/game.ts',
        'client-ui-no-scenes | apps/client/src/ui/scene-peek.ts',
        'client-scenes-no-react | apps/client/src/scenes/hud.ts',
        'client-scenes-reach-ui-only-through-bridge | apps/client/src/scenes/panel-peek.ts',
        'listener-imports-only-shared-protocol | apps/client/src/listener/leaky.ts',
        'server-imports-only-shared-protocol-content-db | apps/server/src/bad-client.ts',
        'server-imports-only-shared-protocol-content-db | apps/server/src/uses-tool.ts',
        'server-no-browser-libraries | apps/server/src/render.ts',
        'server-services-no-systems-or-rooms | apps/server/src/services/peek.ts',
        'server-db-only-from-data-layers | apps/server/src/systems/tick.ts',
        'content-cli-imports-only-shared-protocol-content-db | tools/content-cli/src/bad.ts',
      ]),
    );
  });

  it('finds no violations in the repository itself', async () => {
    const result = await cruiseTree(repoRoot, ['apps', 'packages', 'tools']);
    expect(result.summary.violations).toEqual([]);
    expect(result.summary.error).toBe(0);
  });
});
