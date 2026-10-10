import { TEST_FILES } from './files.js';
import { SOLID_THRESHOLDS } from './thresholds.js';

/**
 * Soft limits for file size, function size and branching.
 * Test callbacks group many cases in one describe block, so the function length
 * limit does not apply to test code; file size and complexity still do.
 */
export function solidConfigs() {
  return [
    {
      name: 'helyx/solid-limits',
      rules: {
        'max-lines': [
          'warn',
          { max: SOLID_THRESHOLDS.maxLinesPerFile, skipBlankLines: true, skipComments: true },
        ],
        'max-lines-per-function': [
          'warn',
          {
            max: SOLID_THRESHOLDS.maxLinesPerFunction,
            skipBlankLines: true,
            skipComments: true,
          },
        ],
        complexity: ['warn', { max: SOLID_THRESHOLDS.maxComplexity }],
      },
    },
    {
      name: 'helyx/solid-limits-tests',
      files: [...TEST_FILES],
      rules: {
        'max-lines-per-function': 'off',
      },
    },
  ];
}
