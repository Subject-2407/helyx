const CLIENT_SOURCES = 'apps/client/src';

/**
 * Any path into the listener folder, except its public loader (`listener/load`, with or without
 * a script extension). The loader is tiny, holds no secret text and ships in the public build:
 * it is what fetches the separate listener bundle at runtime, so public code imports it directly.
 */
const listenerPattern = {
  regex: '(^|/)listener(/(?!load(\\.[cm]?[jt]s)?$)|$)',
  message:
    'Listener code is a separate bundle: outside its folder only the public loader may be imported statically; anything else is reached through a dynamic import().',
};

/** Any relative path with a `listener` folder or file in it (`./listener`, `../listener.js`, `./listener/x`). */
const RELATIVE_LISTENER = String.raw`^\.{1,2}/(.*/)?listener(\.[cm]?[jt]s)?(/|$)`;

/** The shared package's listener entry point, or a deep path into its listener files. */
const SHARED_LISTENER_PACKAGE = String.raw`^@helyx/shared/(src/(balance/)?)?listener(\.[cm]?[jt]s)?(/|$)`;

/** A relative path that climbs out of another package into the shared package's listener files. */
const RELATIVE_SHARED_LISTENER = String.raw`^\.{1,2}/(.*/)?shared/src/(balance/)?listener(\.[cm]?[jt]s)?(/|$)`;

const SHARED_LISTENER_MESSAGE =
  'Listener-only constants and rules must never reach the public bundle: only Listener code, the server, tools and tests may import the shared listener entry.';

const sharedListenerInsideShared = {
  regex: `${RELATIVE_LISTENER}|${SHARED_LISTENER_PACKAGE}`,
  message: SHARED_LISTENER_MESSAGE,
};

const sharedListenerFromPackage = {
  regex: `${RELATIVE_SHARED_LISTENER}|${SHARED_LISTENER_PACKAGE}`,
  message: SHARED_LISTENER_MESSAGE,
};

/** The protocol package's listener entry point, by package subpath or by relative path. */
const PROTOCOL_LISTENER = String.raw`^@helyx/protocol/(src/)?listener(\.[cm]?[jt]s)?$|^\.{1,2}/(.*/)?protocol/src/listener(\.[cm]?[jt]s)?$`;

const listenerEntryFromLoader = {
  regex: `${SHARED_LISTENER_PACKAGE}|${RELATIVE_SHARED_LISTENER}|${PROTOCOL_LISTENER}`,
  message:
    'The listener loader ships in the public bundle, so it must not import either listener entry point.',
};

/** Tests never ship, so they may reach listener code to check it. */
const UNIT_TEST_FILES = ['**/*.test.ts', '**/*.test.tsx'];

const phaserPattern = {
  regex: '^phaser(/|$)',
  message:
    'React overlay code must not import Phaser: talk to scenes through the state stores and the bridge.',
};

const reactPattern = {
  regex: '^react(-dom)?(/|$)',
  message:
    'Scenes must not import React: talk to the overlay through the state stores and the bridge.',
};

/**
 * @param {ReadonlyArray<{ regex: string; message: string }>} patterns
 * @returns {import('eslint').Linter.RuleEntry}
 */
function restrictImports(patterns) {
  return ['error', { patterns }];
}

/**
 * Import boundaries inside the client, and between the public package code and the shared
 * package's listener entry. A later config object replaces the options an earlier
 * one set for the same rule, so each area repeats the listener restriction next to its own.
 */
export function boundaryConfigs() {
  return [
    {
      name: 'helyx/client-listener-boundary',
      files: [`${CLIENT_SOURCES}/**`],
      ignores: [`${CLIENT_SOURCES}/listener/**`],
      rules: { 'no-restricted-imports': restrictImports([listenerPattern]) },
    },
    {
      name: 'helyx/client-listener-loader-boundary',
      files: [`${CLIENT_SOURCES}/listener/load.ts`],
      rules: { 'no-restricted-imports': restrictImports([listenerEntryFromLoader]) },
    },
    {
      name: 'helyx/shared-listener-boundary',
      files: ['packages/shared/src/**'],
      ignores: [
        'packages/shared/src/listener.ts',
        'packages/shared/src/balance/listener/**',
        ...UNIT_TEST_FILES,
      ],
      rules: { 'no-restricted-imports': restrictImports([sharedListenerInsideShared]) },
    },
    {
      name: 'helyx/protocol-listener-boundary',
      files: ['packages/protocol/src/**'],
      ignores: ['packages/protocol/src/listener.ts', ...UNIT_TEST_FILES],
      rules: { 'no-restricted-imports': restrictImports([sharedListenerFromPackage]) },
    },
    {
      name: 'helyx/content-listener-boundary',
      files: ['packages/content/src/**'],
      ignores: [...UNIT_TEST_FILES],
      rules: { 'no-restricted-imports': restrictImports([sharedListenerFromPackage]) },
    },
    {
      name: 'helyx/client-ui-boundary',
      files: [`${CLIENT_SOURCES}/ui/**`],
      rules: { 'no-restricted-imports': restrictImports([listenerPattern, phaserPattern]) },
    },
    {
      name: 'helyx/client-scenes-boundary',
      files: [`${CLIENT_SOURCES}/scenes/**`],
      rules: { 'no-restricted-imports': restrictImports([listenerPattern, reactPattern]) },
    },
  ];
}
