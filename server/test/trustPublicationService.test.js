const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTechnicalReportSnapshot, REPORT_SCHEMA_VERSION } = require('../domain/reportSnapshot');
const { createTrustPublicationService } = require('../services/trustPublicationService');

function reportRecord() {
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
      overallScore: 100,
      coverage: { security: { state: 'assessed', score: 100 } },
      notices: [],
      startedAt: '2026-08-16T12:00:00.000Z',
      completedAt: '2026-08-16T12:00:05.000Z',
    },
    jobs: [],
    evidence: [],
    findings: [],
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

function buildService({ publicStatus = 'published' } = {}) {
  const report = reportRecord();
  const authorizationCalls = [];
  const organizationAuthorization = {
    async requireRole(organizationId, userId, role) {
      authorizationCalls.push({ organizationId, userId, role });
      return { organizationId, userId, role };
    },
  };
  const reportService = {
    async get() {
      return report;
    },
  };
  const publication = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    organizationId: report.organizationId,
    targetId: report.snapshot.target.id,
    reportSnapshotId: report.id,
    publicSlug: 'abcdefghijklmnopqrstuvwxyzABCDEF',
    organizationNameSnapshot: 'Example GmbH',
    status: publicStatus,
    createdBy: report.createdBy,
    publishedAt: '2026-08-16T12:02:00.000Z',
    revokedAt: publicStatus === 'revoked' ? '2026-08-16T12:03:00.000Z' : null,
    createdAt: '2026-08-16T12:02:00.000Z',
    updatedAt: '2026-08-16T12:02:00.000Z',
  };
  const trustPublicationRepository = {
    async createPublication(input) {
      return { created: true, slugCollision: false, publication: { ...publication, publicSlug: input.publicSlug } };
    },
    async listPublications() {
      return { publications: [publication], nextCursor: null };
    },
    async revokePublication() {
      return { ...publication, status: 'revoked', revokedAt: '2026-08-16T12:03:00.000Z' };
    },
    async getByPublicSlug() {
      return { publication, report };
    },
  };
  return {
    authorizationCalls,
    service: createTrustPublicationService({
      organizationAuthorization,
      reportService,
      trustPublicationRepository,
    }),
  };
}

test('publishing requires admin role and returns share paths', async () => {
  const { service, authorizationCalls } = buildService();
  const result = await service.publish({
    organizationId: '11111111-1111-4111-8111-111111111111',
    userId: '99999999-9999-4999-8999-999999999999',
    reportId: '88888888-8888-4888-8888-888888888888',
  });
  assert.equal(authorizationCalls[0].role, 'admin');
  assert.match(result.publicPath, /^\/trust\/[A-Za-z0-9_-]{32}$/);
  assert.match(result.badgePath, /\/badge\.svg$/);
});

test('public resolution verifies and returns curated projection', async () => {
  const { service } = buildService();
  const projection = await service.resolvePublic('abcdefghijklmnopqrstuvwxyzABCDEF');
  assert.equal(projection.organization.name, 'Example GmbH');
  assert.equal(projection.screening.modules[0], 'security');
  assert.equal(Object.prototype.hasOwnProperty.call(projection, 'findings'), false);
});

test('revoked public publication returns 410', async () => {
  const { service } = buildService({ publicStatus: 'revoked' });
  await assert.rejects(
    () => service.resolvePublic('abcdefghijklmnopqrstuvwxyzABCDEF'),
    (error) => error.code === 'TRUST_PUBLICATION_REVOKED' && error.statusCode === 410,
  );
});
