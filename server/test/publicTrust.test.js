const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertPublicTrustSlug,
  buildPublicTrustProjection,
  createPublicTrustSlug,
} = require('../domain/publicTrust');
const { buildTechnicalReportSnapshot, REPORT_SCHEMA_VERSION } = require('../domain/reportSnapshot');

function storedReport() {
  const scanResult = {
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
      overallScore: 50,
      coverage: { security: { state: 'assessed', score: 50 } },
      notices: [],
      startedAt: '2026-08-16T12:00:00.000Z',
      completedAt: '2026-08-16T12:00:05.000Z',
    },
    jobs: [],
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
      severity: 'critical',
      status: 'open',
      message: 'Sensitive internal finding detail.',
      remediation: 'Sensitive remediation detail.',
      evidenceIds: ['66666666-6666-4666-8666-666666666666'],
      firstSeenAt: '2026-08-16T12:00:04.000Z',
      lastSeenAt: '2026-08-16T12:00:04.000Z',
    }],
  };
  const built = buildTechnicalReportSnapshot(scanResult);
  return {
    id: '88888888-8888-4888-8888-888888888888',
    organizationId: scanResult.scan.organizationId,
    scanId: scanResult.scan.id,
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: 'technical-screening',
    snapshot: built.snapshot,
    snapshotHash: built.snapshotHash,
    createdBy: '99999999-9999-4999-8999-999999999999',
    createdAt: '2026-08-16T12:01:00.000Z',
  };
}

test('public Trust slug is high-entropy base64url and strictly validated', () => {
  const slug = createPublicTrustSlug();
  assert.match(slug, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(assertPublicTrustSlug(slug), slug);
  assert.throws(
    () => assertPublicTrustSlug('short'),
    (error) => error.code === 'TRUST_PUBLICATION_NOT_FOUND',
  );
});

test('public Trust projection exposes provenance but not findings, evidence or score', () => {
  const report = storedReport();
  const projection = buildPublicTrustProjection({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    organizationNameSnapshot: 'Example GmbH',
    publishedAt: '2026-08-16T12:02:00.000Z',
  }, report);

  assert.equal(projection.organization.name, 'Example GmbH');
  assert.equal(projection.report.snapshotHash, report.snapshotHash);
  assert.deepEqual(projection.screening.modules, ['security']);
  assert.equal(Object.prototype.hasOwnProperty.call(projection.screening, 'score'), false);

  const serialized = JSON.stringify(projection);
  assert.equal(serialized.includes('Sensitive internal finding detail.'), false);
  assert.equal(serialized.includes('Sensitive remediation detail.'), false);
  assert.equal(serialized.includes('66666666-6666-4666-8666-666666666666'), false);
});
