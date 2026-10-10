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
 * Import boundaries inside the client. A later config object replaces the options an earlier
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
