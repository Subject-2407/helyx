import type { NamedPattern } from '../model';

/**
 * Ways code or a commit could point at the private design documents, which are never part of
 * the repository: their names, their numbered file names, their section signs, their folder,
 * and the ids of the decisions and requirements they define.
 */
export const DOCUMENT_REFERENCE_PATTERNS: readonly NamedPattern[] = [
  {
    rule: 'agent-file',
    description: 'names a private agent instruction file',
    regex: /\b(?:AGENTS|CLAUDE|GEMINI)(?:\.md)?\b/u,
  },
  {
    rule: 'design-acronym',
    description: 'names a private design document by its acronym',
    regex: /\b(?:GDD|SRS)(?:\.md)?\b/u,
  },
  {
    rule: 'document-name',
    description: 'names a private design document',
    regex: /\b(?:decision[- ]log|lore[- ]bible|design doc(?:ument)?s?)\b/iu,
  },
  {
    rule: 'decision-id',
    description: 'cites a design decision id',
    regex: /\bD-\d{3}\b/u,
  },
  {
    rule: 'requirement-id',
    description: 'cites a requirement or design id',
    regex: /\b(?:FR|NFR|ARCH|IT|OI)-[A-Z0-9-]+\b/u,
  },
  {
    rule: 'numbered-document',
    description: 'names a numbered design document file',
    regex: /\b\d{2}-[a-z-]+\.md\b/u,
  },
  {
    rule: 'section-sign',
    description: 'cites a document section number',
    regex: /§\s?\d/u,
  },
  {
    rule: 'docs-folder',
    description: 'points into the private documents folder',
    regex: /\bdocs\//u,
  },
];
