// Module boundary rules for the monorepo, checked by `pnpm depcruise`.
//
// Every rule matches on resolved paths relative to the repository root
// (`packages/shared/...`), so a relative import across package folders is
// caught the same way as a `@helyx/*` import. The `@helyx/<name>` patterns also
// catch imports that could not be resolved, and pnpm symlinks under
// `node_modules`.
'use strict';

const path = require('node:path');

/** Folder of every workspace, keyed by its `@helyx/<name>` package name. */
const WORKSPACES = {
  shared: 'packages/shared',
  protocol: 'packages/protocol',
  content: 'packages/content',
  db: 'packages/db',
  config: 'packages/config',
  client: 'apps/client',
  server: 'apps/server',
  'asset-pipeline': 'tools/asset-pipeline',
  'content-cli': 'tools/content-cli',
  bots: 'tools/bots',
  'repo-guard': 'tools/repo-guard',
};

const TOOL_DEPS = ['shared', 'protocol', 'content', 'db'];

/**
 * Which other workspaces each workspace may import. Anything missing here is
 * forbidden. Tools never import apps or each other, apps never import tools,
 * and nothing imports the lint/tsconfig presets in `config`.
 */
const ALLOWED_WORKSPACE_IMPORTS = {
  shared: [],
  protocol: ['shared'],
  content: ['shared'],
  db: ['shared'],
  config: [],
  client: ['shared', 'protocol', 'content'],
  server: ['shared', 'protocol', 'content', 'db'],
  'asset-pipeline': TOOL_DEPS,
  'content-cli': TOOL_DEPS,
  // Bots are headless game clients: they talk to the server, never to the database.
  bots: ['shared', 'protocol', 'content'],
  'repo-guard': TOOL_DEPS,
};

/** Matches a workspace by folder or by package name (resolved, unresolved or via a symlink). */
function workspacePattern(name) {
  return `^${WORKSPACES[name]}/|(^|node_modules/)@helyx/${name}(/|$)`;
}

/** Matches an npm package by its bare name or anywhere under `node_modules`. */
function npmPattern(names) {
  return `(^|node_modules/)(${names.join('|')})(/|$)`;
}

const ANY_WORKSPACE = '^(apps|packages|tools)/|(^|node_modules/)@helyx/';
const NPM_TYPES = [
  'npm',
  'npm-dev',
  'npm-optional',
  'npm-peer',
  'npm-bundled',
  'npm-no-pkg',
  'npm-unknown',
  'unknown',
];
const TEST_FILE = '\\.test\\.tsx?$';
const VITEST = npmPattern(['vitest', '@vitest/[^/]+']);
const REACT = npmPattern(['react', 'react-dom', '@types/react', '@types/react-dom']);
const PHASER = npmPattern(['phaser']);

const SHARED = '^packages/shared/';
const SHARED_TEST_CODE = `^packages/shared/src/testing/|${TEST_FILE}`;
const CLIENT_SRC = '^apps/client/src/';
const LISTENER = '^apps/client/src/listener/';
// The small loader that fetches the Listener chunk at runtime ships in the public build.
const LISTENER_LOADER = '^apps/client/src/listener/load\\.ts$';
// Listener folder files that are not the public loader.
const LISTENER_ONLY = '^apps/client/src/listener/(?!load\\.ts$)';
const LISTENER_PROTOCOL =
  '^packages/protocol/src/listener\\.ts$|(^|node_modules/)@helyx/protocol/src/listener\\.ts$';
const SERVER_SRC = '^apps/server/src/';

function workspaceRule(name) {
  const allowed = ALLOWED_WORKSPACE_IMPORTS[name];
  const ruleName =
    allowed.length === 0
      ? `${name}-imports-no-workspace-package`
      : `${name}-imports-only-${allowed.join('-')}`;
  const comment =
    allowed.length === 0
      ? `${name} must not import any other workspace package or app.`
      : `${name} may import only these workspaces: ${allowed.join(', ')}.`;
  return {
    name: ruleName,
    comment,
    severity: 'error',
    from: { path: `^${WORKSPACES[name]}/` },
    to: {
      path: ANY_WORKSPACE,
      pathNot: [name, ...allowed].map(workspacePattern),
    },
  };
}

const workspaceRules = Object.keys(ALLOWED_WORKSPACE_IMPORTS).map(workspaceRule);

const sharedRules = [
  {
    name: 'shared-no-external-packages',
    comment:
      'The shared package is pure, dependency-free code. Only its tests and test helpers may import the test runner.',
    severity: 'error',
    from: { path: SHARED },
    // Workspace packages are covered by the workspace rule above.
    to: { dependencyTypes: NPM_TYPES, pathNot: [VITEST, ANY_WORKSPACE] },
  },
  {
    name: 'shared-test-runner-only-in-tests',
    comment: 'Production code in the shared package must not import the test runner.',
    severity: 'error',
    from: { path: SHARED, pathNot: SHARED_TEST_CODE },
    to: { path: VITEST },
  },
  {
    name: 'shared-no-node-builtins',
    comment:
      'The shared package runs in the browser and on the server, so it must not use Node APIs.',
    severity: 'error',
    from: { path: SHARED },
    to: { dependencyTypes: ['core'] },
  },
];

const clientRules = [
  {
    name: 'client-no-raw-content-data',
    comment:
      'The client reads content through the content loader and bundle, never from the raw JSON data files.',
    severity: 'error',
    from: { path: '^apps/client/' },
    to: { path: '^packages/content/data/|(^|node_modules/)@helyx/content/data/' },
  },
  {
    name: 'client-no-node-builtins',
    comment: 'Client code runs in the browser and must not use Node APIs.',
    severity: 'error',
    from: { path: CLIENT_SRC, pathNot: TEST_FILE },
    to: { dependencyTypes: ['core'] },
  },
  {
    name: 'no-static-listener-import',
    comment:
      'Listener code is a separate build loaded at runtime. Outside its folder only a dynamic import() may reach it (the loader excepted).',
    severity: 'error',
    from: { pathNot: LISTENER },
    to: { path: LISTENER, pathNot: LISTENER_LOADER, dynamic: false },
  },
  {
    name: 'listener-imports-only-shared-protocol',
    comment:
      'Listener code may import only its own folder (including the host shim), the shared package and the protocol package.',
    severity: 'error',
    from: { path: LISTENER, pathNot: [LISTENER_LOADER, TEST_FILE] },
    to: {
      path: ANY_WORKSPACE,
      pathNot: [LISTENER, workspacePattern('shared'), workspacePattern('protocol')],
    },
  },
  {
    name: 'public-client-no-listener-protocol',
    comment:
      'Listener-only message codes and failure reasons must never reach the public build, so only Listener code may import that protocol entry point.',
    severity: 'error',
    from: { path: CLIENT_SRC, pathNot: [LISTENER_ONLY] },
    to: { path: LISTENER_PROTOCOL },
  },
  {
    name: 'client-ui-no-phaser',
    comment: 'React UI talks to the game only through the state stores and the UI bridge.',
    severity: 'error',
    from: { path: '^apps/client/src/ui/' },
    to: { path: PHASER },
  },
  {
    name: 'client-ui-no-scenes',
    comment: 'React UI talks to the game only through the state stores and the UI bridge.',
    severity: 'error',
    from: { path: '^apps/client/src/ui/' },
    to: { path: '^apps/client/src/scenes/' },
  },
  {
    name: 'client-scenes-no-react',
    comment: 'Phaser scenes talk to the React UI only through the state stores and the UI bridge.',
    severity: 'error',
    from: { path: '^apps/client/src/scenes/' },
    to: { path: REACT },
  },
  {
    name: 'client-scenes-reach-ui-only-through-bridge',
    comment: 'Phaser scenes talk to the React UI only through the state stores and the UI bridge.',
    severity: 'error',
    from: { path: '^apps/client/src/scenes/' },
    to: { path: '^apps/client/src/ui/', pathNot: '^apps/client/src/ui/bridge\\.ts$' },
  },
];

const serverRules = [
  {
    name: 'server-no-browser-libraries',
    comment: 'The server never imports React or Phaser.',
    severity: 'error',
    from: { path: '^apps/server/' },
    to: { path: [REACT, PHASER] },
  },
  {
    name: 'server-services-no-systems-or-rooms',
    comment:
      'Services are lower level than tick systems and rooms, so they must not depend on them.',
    severity: 'error',
    from: { path: '^apps/server/src/services/' },
    to: { path: '^apps/server/src/(systems|rooms)/' },
  },
  {
    name: 'server-db-only-from-data-layers',
    comment:
      'Repositories are used by services, jobs, HTTP routes and auth, and wired up in the composition root. Rooms and systems go through services.',
    severity: 'error',
    from: {
      path: SERVER_SRC,
      pathNot: '^apps/server/src/((services|jobs|http|auth|db)/|main\\.ts$)',
    },
    to: { path: '^apps/server/src/db/' },
  },
];

const structuralRules = [
  {
    name: 'no-circular',
    comment: 'Circular imports are forbidden everywhere.',
    severity: 'error',
    from: {},
    to: { circular: true },
  },
];

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    ...workspaceRules,
    ...sharedRules,
    ...clientRules,
    ...serverRules,
    ...structuralRules,
  ],
  options: {
    // npm packages stay in the graph as leaves so the package rules can see them;
    // excluding them would hide every import of an external package.
    doNotFollow: { path: '(^|/)node_modules/' },
    // Build output, coverage and test fixtures in our own folders are not source.
    // Anchored to the workspace folders so npm files that live under `dist/` stay visible.
    exclude: { path: '^(apps|packages|tools)/.*/(dist|dist-listener|fixtures|coverage)/' },
    tsPreCompilationDeps: true,
    // Absolute, so the config also works when cruising from another base directory.
    tsConfig: { fileName: path.join(__dirname, 'tsconfig.json') },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.d.ts', '.js', '.mjs', '.cjs', '.json'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
