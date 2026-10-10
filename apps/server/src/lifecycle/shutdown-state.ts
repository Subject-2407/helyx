import type { ReadinessCheck } from '../http/readiness.js';

/** Remembers whether the process has started shutting down. */
export class ShutdownState {
  #shuttingDown = false;

  get shuttingDown(): boolean {
    return this.#shuttingDown;
  }

  begin(): void {
    this.#shuttingDown = true;
  }

  /** A readiness check that fails once shutdown has begun, so traffic drains away. */
  readinessCheck(): ReadinessCheck {
    return { name: 'shutdown', isReady: () => !this.#shuttingDown };
  }
}
