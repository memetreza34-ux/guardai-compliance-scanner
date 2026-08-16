const { assertReportSnapshotIntegrity } = require('../domain/reportSnapshot');
const {
  assertPublicTrustSlug,
  buildPublicTrustProjection,
  createPublicTrustSlug,
} = require('../domain/publicTrust');
const { HttpError } = require('../lib/httpError');

function createTrustPublicationService({
  organizationAuthorization,
  reportService,
  trustPublicationRepository,
}) {
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Trust publication service requires Organization authorization.');
  }
  if (!reportService || typeof reportService.get !== 'function') {
    throw new TypeError('Trust publication service requires Report service.');
  }
  if (!trustPublicationRepository) {
    throw new TypeError('Trust publication service requires Trust publication repository.');
  }

  async function publish({ organizationId, userId, reportId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    const report = await reportService.get({ organizationId, userId, reportId });
    const targetId = report.snapshot?.target?.id;
    if (typeof targetId !== 'string') {
      throw new HttpError(500, 'Report has no publishable Target provenance.', 'REPORT_PROVENANCE_INCOMPLETE');
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const publicSlug = createPublicTrustSlug();
      const result = await trustPublicationRepository.createPublication({
        organizationId,
        targetId,
        reportSnapshotId: report.id,
        publicSlug,
        createdBy: userId,
      });
      if (result.publication) {
        return {
          ...result,
          publicPath: `/trust/${result.publication.publicSlug}`,
          badgePath: `/api/v1/public/trust/${result.publication.publicSlug}/badge.svg`,
        };
      }
      if (!result.slugCollision) break;
    }

    throw new HttpError(
      503,
      'GuardAI could not allocate a public Trust identifier.',
      'TRUST_SLUG_ALLOCATION_FAILED',
    );
  }

  async function list({ organizationId, userId, limit, cursor }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return trustPublicationRepository.listPublications({ organizationId, limit, cursor });
  }

  async function revoke({ organizationId, userId, publicationId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    const publication = await trustPublicationRepository.revokePublication(organizationId, publicationId);
    if (!publication) {
      throw new HttpError(404, 'Trust publication was not found in this organization.', 'TRUST_PUBLICATION_NOT_FOUND');
    }
    return publication;
  }

  async function resolvePublic(publicSlug) {
    const slug = assertPublicTrustSlug(publicSlug);
    const result = await trustPublicationRepository.getByPublicSlug(slug);
    if (!result) {
      throw new HttpError(404, 'Public Trust publication was not found.', 'TRUST_PUBLICATION_NOT_FOUND');
    }
    if (result.publication.status !== 'published') {
      throw new HttpError(410, 'This public Trust publication has been revoked.', 'TRUST_PUBLICATION_REVOKED');
    }

    assertReportSnapshotIntegrity(result.report);
    return buildPublicTrustProjection(result.publication, result.report);
  }

  return {
    list,
    publish,
    resolvePublic,
    revoke,
  };
}

module.exports = { createTrustPublicationService };
