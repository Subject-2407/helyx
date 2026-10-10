/**
 * Size and complexity limits that keep modules focused on a single job.
 * They are reported as warnings and the lint script allows zero warnings,
 * so crossing one needs an inline disable with a written reason.
 */
export const SOLID_THRESHOLDS = Object.freeze({
  maxLinesPerFile: 400,
  maxLinesPerFunction: 60,
  maxComplexity: 12,
});
