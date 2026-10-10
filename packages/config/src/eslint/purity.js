const SHARED_SOURCES = ['packages/shared/src/**'];

const PURITY_REASON =
  'The shared package must stay deterministic and free of I/O: inject a Clock or Rng instead.';

const RESTRICTED_GLOBALS = [
  'Date',
  'performance',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'queueMicrotask',
  'process',
  'window',
  'document',
];

/** Global objects through which the same timers and clocks can be reached. */
const GLOBAL_OBJECTS = ['globalThis', 'window', 'self', 'global'];

const GLOBAL_OBJECT_PROPERTIES = [
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'queueMicrotask',
  'performance',
  'Date',
  'process',
];

const restrictedProperties = [
  {
    object: 'Math',
    property: 'random',
    message: `Math.random is not allowed here. ${PURITY_REASON}`,
  },
  { object: 'Date', property: 'now', message: `Date.now is not allowed here. ${PURITY_REASON}` },
  ...GLOBAL_OBJECTS.flatMap((object) =>
    GLOBAL_OBJECT_PROPERTIES.map((property) => ({
      object,
      property,
      message: `${object}.${property} is not allowed here. ${PURITY_REASON}`,
    })),
  ),
];

/** Keeps the shared package free of wall-clock time, ambient randomness, timers and host APIs. */
export function purityConfigs() {
  return [
    {
      name: 'helyx/shared-purity',
      files: SHARED_SOURCES,
      rules: {
        'no-restricted-globals': [
          'error',
          ...RESTRICTED_GLOBALS.map((name) => ({
            name,
            message: `${name} is not allowed here. ${PURITY_REASON}`,
          })),
        ],
        'no-restricted-properties': ['error', ...restrictedProperties],
      },
    },
  ];
}
