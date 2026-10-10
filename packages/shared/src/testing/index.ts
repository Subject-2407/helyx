// Reusable contract suites for the ports this package defines. Every implementation of a
// port, wherever it lives, runs the matching suite in its own tests.
export { describeClockContract } from './clock-contract.js';
export { describeRngContract } from './rng-contract.js';
