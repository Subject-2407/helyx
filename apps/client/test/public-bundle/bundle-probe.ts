import { fileURLToPath } from 'node:url';
import { build, type Plugin, type Rollup } from 'vite';

/** The client package folder, so bare imports resolve the same way the real client build does. */
const CLIENT_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Id the probe entry is imported by. The leading NUL keeps other plugins from touching it. */
const PROBE_ENTRY_ID = '\0helyx-bundle-probe-entry';

/** Supplies the probe source as the only entry module, so no file has to exist on disk. */
function probeEntryPlugin(source: string): Plugin {
  return {
    name: 'helyx-bundle-probe-entry',
    enforce: 'pre',
    resolveId(id) {
      return id === PROBE_ENTRY_ID ? PROBE_ENTRY_ID : null;
    },
    load(id) {
      return id === PROBE_ENTRY_ID ? source : null;
    },
  };
}

function isRollupOutput(value: unknown): value is Rollup.RollupOutput {
  return typeof value === 'object' && value !== null && 'output' in value;
}

/**
 * Bundles a small entry module the way a production client chunk is built (minified, tree-shaken,
 * ES output) and returns the code of every emitted chunk joined together. The build stays in
 * memory: nothing is written to disk, and the client's own Vite config is not read.
 */
export async function bundleProbe(source: string): Promise<string> {
  const result = await build({
    configFile: false,
    envDir: false,
    root: CLIENT_ROOT,
    publicDir: false,
    logLevel: 'silent',
    mode: 'production',
    plugins: [probeEntryPlugin(source)],
    build: {
      write: false,
      minify: 'esbuild',
      copyPublicDir: false,
      reportCompressedSize: false,
      // Library mode keeps the entry's exports, so an `export *` probe bundles everything it names.
      lib: { entry: PROBE_ENTRY_ID, formats: ['es'], fileName: 'probe' },
      // Library mode turns a string entry into a file path; an explicit input keeps the virtual id.
      rollupOptions: { input: PROBE_ENTRY_ID, treeshake: true },
    },
  });

  const outputs = Array.isArray(result) ? result : [result];
  return outputs
    .filter(isRollupOutput)
    .flatMap((output) => output.output)
    .map((file) => (file.type === 'chunk' ? file.code : ''))
    .join('\n');
}
