const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CONTRACT_VERSION,
  finalizePersistentStatus,
  finalizePersistentSubmission,
  SUPPORTED_READ_VERSIONS,
} = require('../lib/persistentScanContract');

const ids = {
  org: '11111111-1111-4111-8111-111111111111',
  target: '22222222-2222-4222-8222-222222222222',
  user: '33333333-3333-4333-8333-333333333333',
  scan: '44444444-4444-4444-8444-444444444444',
  job: '55555555-5555-4555-8555-555555555555',
  evidence: '66666666-6666-4666-8666-666666666666',
  finding: '77777777-7777-4777-8777-777777777777',
};

const now = new Date('2026-08-16T12:00:00.000Z');

function submissionPayload() {
  return {
    scan: {
      id: ids.scan,
      organizationId: ids.org,
      targetId: ids.target,
      requestedBy: ids.user,
      status: 'queued',
      scannerVersion: '0.1.0',
      contractVersion: CONTRACT_VERSION,
      requestedModules: ['security'],
      idempotencyKey: null,
      createdAt: now,
    },
    jobs: [{
      id: ids.job,
      scanId: ids.scan,
      jobType: 'security',
      status: 'queued',
      attemptCount: 0,
      maxAttempts: 3,
      availableAt: now,
      leasedAt: null,
      leaseExpiresAt: null,
      resultSummary: {},
      completedAt: null,
      failedAt: null,
      createdAt: now,
      workerId: 'must-not-cross-public-contract',
    }],
    idempotentReplay: false,
  };
}

function completedStatusPayload({ contractVersion = CONTRACT_VERSION, coverage, overallScore, requestedModules = ['security'] }) {
  const base = submissionPayload();
  return {
    scan: {
      ...base.scan,
      contractVersion,
      requestedModules,
      status: 'completed',
      overallScore,
      coverage,
      notices: [],
      startedAt: now,
      completedAt: now,
      failedAt: null,
      errorCode: null,
      errorMessage: null,
      updatedAt: now,
    },
    jobs: [{
      ...base.jobs[0],
      jobType: requestedModules[0],
      status: 'completed',
      resultSummary: {},
      completedAt: now,
    }],
    evidence: [],
    findings: [],
  };
}

test('persistent submission injects version and strips internal worker fields', () => {
  const result = finalizePersistentSubmission(submissionPayload());
  assert.equal(CONTRACT_VERSION, '0.3.0');
  assert.equal(result.contractVersion, CONTRACT_VERSION);
  assert.equal(result.jobs[0].workerId, undefined);
  assert.equal(result.scan.createdAt, now.toISOString());
});

test('current persistent reader keeps explicit support for contract 0.2.0', () => {
  assert.deepEqual(SUPPORTED_READ_VERSIONS, ['0.2.0', '0.3.0']);

  const result = finalizePersistentStatus(completedStatusPayload({
    contractVersion: '0.2.0',
    coverage: { security: { state: 'assessed', score: 75 } },
    overallScore: 75,
  }));

  assert.equal(result.contractVersion, '0.3.0');
  assert.equal(result.scan.contractVersion, '0.2.0');
});

test('persistent status carries observed coverage without inventing a score', () => {
  const result = finalizePersistentStatus(completedStatusPayload({
    coverage: {
      privacy: {
        state: 'observed',
        score: null,
        detectorId: 'privacy.browser-observation',
        detectorVersion: '0.1.0',
      },
    },
    overallScore: null,
    requestedModules: ['privacy'],
  }));

  assert.equal(result.scan.coverage.privacy.state, 'observed');
  assert.equal(result.scan.coverage.privacy.score, null);
  assert.equal(result.scan.overallScore, null);
});

test('persistent status validates evidence and findings', () => {
  const base = submissionPayload();
  const result = finalizePersistentStatus({
    scan: {
      ...base.scan,
      status: 'completed',
      overallScore: 75,
      coverage: { security: { state: 'assessed', score: 75 } },
      notices: [],
      startedAt: now,
      completedAt: now,
      failedAt: null,
      errorCode: null,
      errorMessage: null,
      updatedAt: now,
    },
    jobs: [{ ...base.jobs[0], status: 'completed', resultSummary: { state: 'assessed', score: 75 }, completedAt: now }],
    evidence: [{
      id: ids.evidence,
      detectorId: 'security.headers',
      detectorVersion: '1.0.0',
      type: 'http-security-headers',
      source: 'https://example.com/',
      normalizedData: { secureTransport: true },
      contentHash: 'a'.repeat(64),
      capturedAt: now,
      createdAt: now,
    }],
    findings: [{
      findingId: ids.finding,
      fingerprint: 'b'.repeat(64),
      status: 'open',
      severity: 'warning',
      confidence: null,
      evidenceIds: [ids.evidence],
      message: 'Missing header',
      remediation: 'Add the header.',
      firstSeenAt: now,
      lastSeenAt: now,
      instanceCreatedAt: now,
    }],
  });

  assert.equal(result.contractVersion, CONTRACT_VERSION);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.findings.length, 1);
});
