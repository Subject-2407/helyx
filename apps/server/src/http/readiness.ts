/** One condition the process needs before it should receive traffic. */
export interface ReadinessCheck {
  readonly name: string;
  isReady(): boolean | Promise<boolean>;
}

export interface ReadinessReport {
  readonly ready: boolean;
  /** Names of the checks that did not pass. */
  readonly failing: readonly string[];
}

/** Answers "can this process take traffic right now?". */
export interface ReadinessProbe {
  evaluate(): Promise<ReadinessReport>;
}

async function passes(check: ReadinessCheck): Promise<boolean> {
  try {
    return (await check.isReady()) === true;
  } catch {
    // A check that cannot answer counts as not ready; it must never take the endpoint down.
    return false;
  }
}

/** Ready only when every registered check passes. Checks run concurrently. */
export function readinessFrom(checks: readonly ReadinessCheck[]): ReadinessProbe {
  return {
    async evaluate() {
      const results = await Promise.all(checks.map(passes));
      const failing = checks.filter((_, index) => results[index] !== true).map((c) => c.name);
      return { ready: failing.length === 0, failing };
    },
  };
}
