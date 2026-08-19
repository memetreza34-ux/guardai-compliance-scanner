const { HttpError } = require('../lib/httpError');

const MIN_LEASE_SECONDS = 10;
const MAX_LEASE_SECONDS = 900;
const MAX_WORKER_ID_LENGTH = 120;
const MAX_JOB_ERROR_MESSAGE_LENGTH = 500;

const NON_RETRYABLE_WORKER_CODES = new Set([
  'ACCESSIBILITY_ENGINE_RESULT_INVALID',
  'ACCESSIBILITY_ENGINE_RESULT_LIMIT',
  'ASSET_BINARY_CONTENT_REJECTED',
  'ASSET_CONTENT_SAMPLE_MISSING',
  'ASSET_MEDIA_TYPE_MISMATCH',
  'ASSET_OBJECT_KEY_PROVENANCE_INVALID',
  'ASSET_PARSER_OUTPUT_LIMIT',
  'ASSET_PARSER_RESULT_INVALID',
  'ASSET_SHA256_INVALID',
  'ASSET_STORAGE_PROMOTION_INVALID',
  'ASSET_TEXT_ENCODING_INVALID',
  'ASSET_UPLOAD_EMPTY',
  'ASSET_UPLOAD_METADATA_INCOMPLETE',
  'ASSET_UPLOAD_SIZE_EXCEEDED',
  'ASSET_UPLOAD_SIZE_MISMATCH',
  'BROWSER_TARGET_INVALID',
  'BROWSER_TASK_TYPE_UNSUPPORTED',
  'FINDING_RULE_PROVENANCE_CONFLICT',
  'GITHUB_BLOB_READ_LIMIT',
  'GITHUB_REPOSITORY_METADATA_INVALID',
  'GITHUB_REPOSITORY_REF_INVALID',
  'GITHUB_REPOSITORY_TREE_TRUNCATED',
  'INVALID_WORKER_RESULT',
  'PRIVACY_BROWSER_OBSERVATION_INVALID',
  'PRIVACY_BROWSER_OBSERVATION_LIMIT',
  'PRIVACY_EVIDENCE_INVALID',
  'REPOSITORY_BASELINE_COVERAGE_INCOMPLETE',
  'REPOSITORY_TARGET_PROVENANCE_INVALID',
  'REPOSITORY_TREE_BUDGET_EXCEEDED',
  'REPOSITORY_TREE_METADATA_INCOMPLETE',
  'REPOSITORY_TREE_PATH_UNSAFE',
  'SCORING_PROFILE_NOT_AVAILABLE',
  'TARGET_NOT_VERIFIED',
  'TARGET_VERIFICATION_LOST',
  'TARGET_URL_MISSING',
  'WORKER_JOB_TYPE_MISMATCH',
  'WORKER_TARGET_TYPE_MISMATCH',
]);

function assertWorkerId(workerId) {
  if (
    typeof workerId !== 'string' ||
    workerId.trim().length === 0 ||
    workerId.length > MAX_WORKER_ID_LENGTH ||
    !/^[A-Za-z0-9._:-]+$/.test(workerId)
  ) {
    throw new HttpError(400, 'Worker identifier is invalid.', 'INVALID_WORKER_ID');
  }

  return workerId;
}

function assertLeaseSeconds(leaseSeconds) {
  if (
    !Number.isInteger(leaseSeconds) ||
    leaseSeconds < MIN_LEASE_SECONDS ||
    leaseSeconds > MAX_LEASE_SECONDS
  ) {
    throw new HttpError(400, 'Worker lease duration is invalid.', 'INVALID_JOB_LEASE');
  }

  return leaseSeconds;
}

function calculateRetryDelaySeconds(attemptCount) {
  if (!Number.isInteger(attemptCount) || attemptCount < 1) {
    throw new TypeError('attemptCount must be a positive integer.');
  }

  return Math.min(900, 15 * (2 ** Math.min(attemptCount - 1, 6)));
}

function shouldRetryWorkerError(error) {
  return !NON_RETRYABLE_WORKER_CODES.has(error?.code);
}

function sanitizeJobError(error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_:-]{1,80}$/.test(error.code)
    ? error.code
    : 'WORKER_EXECUTION_FAILED';

  const rawMessage = error instanceof Error ? error.message : 'Worker execution failed.';
  const message = String(rawMessage)
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, MAX_JOB_ERROR_MESSAGE_LENGTH) || 'Worker execution failed.';

  return { code, message };
}

module.exports = {
  assertLeaseSeconds,
  assertWorkerId,
  calculateRetryDelaySeconds,
  NON_RETRYABLE_WORKER_CODES,
  sanitizeJobError,
  shouldRetryWorkerError,
};
