/** One line of text with its 1-based line number in the file or message it came from. */
export interface SourceLine {
  readonly number: number;
  readonly text: string;
}

/**
 * A file to check. `lines` holds either the whole content (tracked scan) or only the lines a
 * change adds (staged scan); binary files carry no lines, so only their path is checked.
 */
export interface SourceFile {
  readonly path: string;
  readonly lines: readonly SourceLine[];
}

/** A commit message and where it came from (a message file or a commit id). */
export interface CommitMessage {
  readonly source: string;
  readonly text: string;
}

/** One problem a check found. `file` names the file or the commit; `line` is 1-based. */
export interface Finding {
  readonly check: string;
  readonly rule: string;
  readonly file: string;
  readonly line?: number;
  readonly message: string;
  readonly excerpt?: string;
}

/** What every check declares about itself, so allowlist entries can be validated. */
export interface CheckInfo {
  readonly id: string;
  readonly rules: readonly string[];
}

export interface FileCheck extends CheckInfo {
  check(file: SourceFile): readonly Finding[];
}

export interface MessageCheck extends CheckInfo {
  check(message: CommitMessage): readonly Finding[];
}

/** A regular expression with a stable rule id and a plain-words explanation. */
export interface NamedPattern {
  readonly rule: string;
  readonly description: string;
  readonly regex: RegExp;
}
