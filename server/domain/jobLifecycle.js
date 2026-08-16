const { HttpError } = require('../lib/httpError');

const MIN_LEASE_SECONDS = 10;
const MAX_LEASE_SECONDS = 900;
const MAX_WORKER_ID_LENGTH = 120;
const MAX_JOB_ERROR_MESSAGE_LENGTH = 500;

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
  sanitizeJobError,
};