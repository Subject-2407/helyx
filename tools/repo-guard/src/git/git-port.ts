import type { CommitMessage, SourceFile } from '../model';

/** What is about to be committed. */
export interface StagedChanges {
  /** Paths added, copied, modified or renamed in the index (deletions excluded). */
  stagedPaths(): readonly string[];
  /** Only the lines the staged change adds, per file, with their new line numbers. */
  stagedAddedLines(): readonly SourceFile[];
}

/** Everything the repository tracks, with full contents. */
export interface TrackedFiles {
  trackedFiles(): readonly SourceFile[];
}

/** Commit messages in a revision range such as `main..HEAD` (merge commits excluded). */
export interface CommitLog {
  commitMessages(range: string): readonly CommitMessage[];
}

export interface GitPort extends StagedChanges, TrackedFiles, CommitLog {}
