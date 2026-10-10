import { isAllowed, type Allowlist } from './allowlist';
import type { CommitMessage, FileCheck, Finding, MessageCheck, SourceFile } from './model';

export interface Scanner {
  scanFiles(files: Iterable<SourceFile>): Finding[];
  scanMessages(messages: Iterable<CommitMessage>): Finding[];
}

/** Runs the registered checks and drops the findings the allowlist accepts. */
export function createScanner(
  fileChecks: readonly FileCheck[],
  messageChecks: readonly MessageCheck[],
  allowlist: Allowlist,
): Scanner {
  const keep = (finding: Finding) => !isAllowed(finding, allowlist);
  return {
    scanFiles(files) {
      return Array.from(files).flatMap((file) =>
        fileChecks.flatMap((check) => check.check(file)).filter(keep),
      );
    },
    scanMessages(messages) {
      return Array.from(messages).flatMap((message) =>
        messageChecks.flatMap((check) => check.check(message)).filter(keep),
      );
    },
  };
}
