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

test('normalizeRequestedModules deduplicates implemented modules', () => {
  assert.deepEqual(
    normalizeRequestedModules(['security', 'security']),
    ['security'],
  );
});

test('normalizeRequestedModules rejects unknown modules', () => {
  assert.throws(
    () => normalizeRequestedModules(['security', 'pentest']),
    (error) => error.code === 'INVALID_SCAN_MODULE' && error.statusCode === 400,
  );
});

test('normalizeRequestedModules rejects known modules until their worker is explicitly enabled', () => {
  for (const moduleId of ['privacy', 'repository']) {
    assert.throws(
      () => normalizeRequestedModules([moduleId]),
      (error) => error.code === 'SCAN_MODULE_NOT_AVAILABLE' && error.statusCode === 422,
    );
  }
});

test('normalizeIdempotencyKey trims valid keys and rejects short values', () => {
  assert.equal(normalizeIdempotencyKey('  request-12345  '), 'request-12345');
  assert.equal(normalizeIdempotencyKey(undefined), null);
  assert.throws(
    () => normalizeIdempotencyKey('short'),
    (error) => error.code === 'INVALID_IDEMPOTENCY_KEY',
  );
});

test('scan submission authorizes organization and persists queue request with derived usage requirements', async () => {
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
    contractVersion: '0.2.0',
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
    usageRequirements: {},
    scannerVersion: '0.1.0',
    contractVersion: '0.2.0',
    idempotencyKey: 'request-12345',
  });
});
