const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertReportSnapshotIntegrity,
  buildTechnicalReportSnapshot,
  REPORT_SCHEMA_VERSION,
} = require('../domain/reportSnapshot');

function completedScan() {
  return {
    scan: {
      id: '44444444-4444-4444-8444-444444444444',
      organizationId: '11111111-1111-4111-8111-111111111111',
      targetId: '22222222-2222-4222-8222-222222222222',
      status: 'completed',
      scannerVersion: '0.1.0',
      contractVersion: '0.2.0',
      requestedModules: ['security'],
      scoringProfileId: 'security-mvp',
      scoringProfileVersion: 1,
      targetSnapshot: {
        id: '22222222-2222-4222-8222-222222222222',
        type: 'website',
        displayName: 'Example',
        canonicalUrl: 'https://example.com/',
        provider: null,
        verificationState: 'verified',
      },
      overallScore: 80,
      coverage: { security: { state: 'assessed', score: 80 } },
      notices: [],
      startedAt: '2026-08-16T12:00:00.000Z',
      completedAt: '2026-08-16T12:00:05.000Z',
    },
    jobs: [{
      jobType: 'security',
      status: 'completed',
      resultSummary: { state: 'assessed', score: 80 },
      completedAt: '2026-08-16T12:00:05.000Z',
    }],
    evidence: [{
      id: '66666666-6666-4666-8666-666666666666',
      detectorId: 'security.headers',
      detectorVersion: '1.1.0',
      type: 'website-security-baseline',
      source: 'https://example.com/',
      contentHash: 'a'.repeat(64),
      capturedAt: '2026-08-16T12:00:04.000Z',
    }],
    findings: [{
      findingId: '77777777-7777-4777-8777-777777777777',
      fingerprint: 'b'.repeat(64),
      ruleId: 'security.content_security_policy',
      ruleVersion: 1,
      severity: 'warning',
      status: 'open',
      message: 'Missing CSP',
      remediation: 'Add CSP.',
      evidenceIds: ['66666666-6666-4666-8666-666666666666'],
      firstSeenAt: '2026-08-16T12:00:04.000Z',
      lastSeenAt: '2026-08-16T12:00:04.000Z',
    }],
  };
}

test('completed Scan produces deterministic report hash with immutable provenance', () => {
  const first = buildTechnicalReportSnapshot(completedScan());
  const second = buildTechnicalReportSnapshot(completedScan());
  assert.equal(first.snapshotHash, second.snapshotHash);
  assert.match(first.snapshotHash, /^[a-f0-9]{64}$/);
  assert.equal(first.snapshot.schemaVersion, REPORT_SCHEMA_VERSION);
  assert.equal(first.snapshot.target.canonicalUrl, 'https://example.com/');
  assert.equal(first.snapshot.scoring.profileId, 'security-mvp');
  assert.equal(first.snapshot.scoring.profileVersion, 1);
  assert.equal(first.snapshot.findings[0].ruleId, 'security.content_security_policy');
  assert.equal(first.snapshot.findings[0].ruleVersion, 1);
});

test('report snapshot keeps explicit limitations', () => {
  const report = buildTechnicalReportSnapshot(completedScan());
  assert.ok(report.snapshot.limitations.some((line) => line.includes('not a legal opinion')));
});

test('stored report integrity verification rejects tampering', () => {
  const built = buildTechnicalReportSnapshot(completedScan());
  const stored = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: 'technical-screening',
    snapshot: structuredClone(built.snapshot),
    snapshotHash: built.snapshotHash,
  };
  assert.equal(assertReportSnapshotIntegrity(stored), stored);

  stored.snapshot.scan.overallScore = 100;
  assert.throws(
    () => assertReportSnapshotIntegrity(stored),
    (error) => error.code === 'REPORT_INTEGRITY_FAILED' && error.statusCode === 500,
  );
});

test('report creation rejects missing Target or scoring provenance', () => {
  const missingTarget = completedScan();
  missingTarget.scan.targetSnapshot = null;
  assert.throws(
    () => buildTechnicalReportSnapshot(missingTarget),
    (error) => error.code === 'SCAN_PROVENANCE_INCOMPLETE',
  );

  const missingScoring = completedScan();
  missingScoring.scan.scoringProfileId = null;
  assert.throws(
    () => buildTechnicalReportSnapshot(missingScoring),
    (error) => error.code === 'SCAN_PROVENANCE_INCOMPLETE',
  );
});

test('non-completed Scan cannot create a report snapshot', () => {
  const input = completedScan();
  input.scan.status = 'running';
  assert.throws(
    () => buildTechnicalReportSnapshot(input),
    (error) => error.code === 'SCAN_NOT_REPORTABLE' && error.statusCode === 409,
  );
});
