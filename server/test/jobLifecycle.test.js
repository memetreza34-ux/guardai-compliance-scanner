const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertLeaseSeconds,
  assertWorkerId,
  calculateRetryDelaySeconds,
  sanitizeJobError,
  shouldRetryWorkerError,
} = require('../domain/jobLifecycle');


test('worker identifiers are strict and bounded', () => {
  assert.equal(assertWorkerId('worker-01:security'), 'worker-01:security');
  assert.throws(() => assertWorkerId(''), /invalid/i);
  assert.throws(() => assertWorkerId('worker id'), /invalid/i);
  assert.throws(() => assertWorkerId('x'.repeat(121)), /invalid/i);
});


test('lease duration stays within GuardAI bounds', () => {
  assert.equal(assertLeaseSeconds(60), 60);
  assert.throws(() => assertLeaseSeconds(9), /invalid/i);
  assert.throws(() => assertLeaseSeconds(901), /invalid/i);
});


test('retry delay uses bounded exponential backoff', () => {
  assert.equal(calculateRetryDelaySeconds(1), 15);
  assert.equal(calculateRetryDelaySeconds(2), 30);
  assert.equal(calculateRetryDelaySeconds(3), 60);
  assert.equal(calculateRetryDelaySeconds(7), 900);
  assert.equal(calculateRetryDelaySeconds(20), 900);
  assert.throws(() => calculateRetryDelaySeconds(0));
});


test('worker errors are bounded and normalized', () => {
  const error = new Error('line one\nline two');
  error.code = 'FETCH_FAILED';
  assert.deepEqual(sanitizeJobError(error), {
    code: 'FETCH_FAILED',
    message: 'line one line two',
  });

  const invalidCode = new Error('oops');
  invalidCode.code = 'not valid';
  assert.equal(sanitizeJobError(invalidCode).code, 'WORKER_EXECUTION_FAILED');
});


test('programming, authorization and deterministic coverage/result failures are terminal', () => {
  assert.equal(shouldRetryWorkerError({ code: 'TARGET_FETCH_FAILED' }), true);
  assert.equal(shouldRetryWorkerError({ code: 'GITHUB_PROVIDER_UNAVAILABLE' }), true);
  assert.equal(shouldRetryWorkerError({ code: 'BROWSER_PROVIDER_UNAVAILABLE' }), true);

  assert.equal(shouldRetryWorkerError({ code: 'TARGET_VERIFICATION_LOST' }), false);
  assert.equal(shouldRetryWorkerError({ code: 'WORKER_JOB_TYPE_MISMATCH' }), false);
  assert.equal(shouldRetryWorkerError({ code: 'INVALID_WORKER_RESULT' }), false);

  assert.equal(shouldRetryWorkerError({ code: 'REPOSITORY_BASELINE_COVERAGE_INCOMPLETE' }), false);
  assert.equal(shouldRetryWorkerError({ code: 'REPOSITORY_TREE_METADATA_INCOMPLETE' }), false);
  assert.equal(shouldRetryWorkerError({ code: 'REPOSITORY_TREE_PATH_UNSAFE' }), false);

  assert.equal(shouldRetryWorkerError({ code: 'PRIVACY_BROWSER_OBSERVATION_INVALID' }), false);
  assert.equal(shouldRetryWorkerError({ code: 'PRIVACY_BROWSER_OBSERVATION_LIMIT' }), false);
  assert.equal(shouldRetryWorkerError({ code: 'ACCESSIBILITY_ENGINE_RESULT_INVALID' }), false);
  assert.equal(shouldRetryWorkerError({ code: 'ACCESSIBILITY_ENGINE_RESULT_LIMIT' }), false);
  assert.equal(shouldRetryWorkerError({ code: 'BROWSER_TARGET_INVALID' }), false);
});
