const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertActiveLease,
  normalizeWorkerJobTypes,
} = require('../repositories/jobRepository');


test('worker job types are deduplicated and validated', () => {
  assert.deepEqual(normalizeWorkerJobTypes(['security', 'security']), ['security']);
  assert.throws(() => normalizeWorkerJobTypes([]), /at least one/i);
  assert.throws(() => normalizeWorkerJobTypes(['unknown']), /unsupported/i);
});


test('active lease requires running job, matching worker, valid lease and running scan', () => {
  const row = {
    status: 'running',
    worker_id: 'worker-1',
    lease_valid: true,
    scan_status: 'running',
  };

  assert.doesNotThrow(() => assertActiveLease(row, 'worker-1'));
  assert.throws(() => assertActiveLease({ ...row, worker_id: 'worker-2' }, 'worker-1'), /lease/i);
  assert.throws(() => assertActiveLease({ ...row, lease_valid: false }, 'worker-1'), /lease/i);
  assert.throws(() => assertActiveLease({ ...row, scan_status: 'failed' }, 'worker-1'), /lease/i);
});