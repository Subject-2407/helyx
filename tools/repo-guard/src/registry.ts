import { commitMessageCheck } from './checks/commit-message';
import { documentFilesCheck } from './checks/document-files';
import { documentReferencesCheck } from './checks/document-references';
import { messageReferencesCheck, messageSecretTermsCheck } from './checks/message-patterns';
import { secretTermsCheck } from './checks/secret-terms';
import type { FileCheck, MessageCheck } from './model';

/** Checks run on every staged or tracked file. Add a check by adding it here. */
export const FILE_CHECKS: readonly FileCheck[] = [
  documentFilesCheck,
  documentReferencesCheck,
  secretTermsCheck,
];

/** Checks run on every commit message. */
export const MESSAGE_CHECKS: readonly MessageCheck[] = [
  commitMessageCheck,
  messageReferencesCheck,
  messageSecretTermsCheck,
];
