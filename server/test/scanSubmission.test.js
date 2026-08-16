const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createScanSubmissionService,
  normalizeIdempotencyKey,
  normalizeRequestedModules,
} = require('../domain/scanSubmission');

const organizationAuthorization = {
  async requireRole(organizationId, userId, role) {
    assert.equal(organizationId, 'org-a');
    assert.equal(userId, 'user-a');
    assert.equal(role, 'member');
    return { organizationId, userId, role: 'member' };
  },
};

test('normalizeRequestedModules deduplicates valid modules', () => {
  assert.deepEqual(
    normalizeRequestedModules(['security', 'privacy', 'security']),
    ['security', 'privacy'],
  );
});

test('normalizeRequestedModules rejects unknown modules', () => {
  assert.throws(
    () => normalizeRequestedModules(['security', 'pentest']),
    (error) => error.code === 'INVALID_SCAN_MODULE' && error.statusCode === 400,
  );
});

test('normalizeIdempotencyKey trims valid keys and rejects short values', () => {
  assert.equal(normalizeIdempotencyKey('  request-12345  '), 'request-12345');
  assert.equal(normalizeIdempotencyKey(undefined), null);
  assert.throws(
    () => normalizeIdempotencyKey('short'),
    (error) => error.code === 'INVALID_IDEMPOTENCY_KEY',
  );
});

test('scan submission authorizes organization and persists queue request', async () => {
  let received = null;
  const scanRepository = {
    async createQueuedScanWithJobs(input) {
      received = input;
      return {
        created: true,
        scan: { id: 'scan-a', status: 'queued' },
        jobs: [{ id: 'job-a', status: 'queued', jobType: 'security' }],
      };
    },
  };

  const service = createScanSubmissionService({
    organizationAuthorization,
    scanRepository,
    scannerVersion: '0.1.0',
    contractVersion: '0.1.0',
  });

  const result = await service.submit({
    organizationId: 'org-a',
    targetId: 'target-a',
    requestedBy: 'user-a',
    requestedModules: ['security'],
    idempotencyKey: 'request-12345',
  });

  assert.equal(result.scan.status, 'queued');
  assert.deepEqual(received, {
    organizationId: 'org-a',
    targetId: 'target-a',
    requestedBy: 'user-a',
    requestedModules: ['security'],
    scannerVersion: '0.1.0',
    contractVersion: '0.1.0',
    idempotencyKey: 'request-12345',
  });
});
