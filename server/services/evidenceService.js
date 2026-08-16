const { HttpError } = require('../lib/httpError');

function createEvidenceService({ evidenceRepository, organizationAuthorization }) {
  if (!evidenceRepository) {
    throw new TypeError('Evidence service requires an Evidence repository.');
  }
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Evidence service requires organization authorization.');
  }

  async function list({
    organizationId,
    userId,
    targetId,
    scanId,
    detectorId,
    type,
    limit,
    cursor,
  }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return evidenceRepository.listEvidence({
      organizationId,
      targetId: targetId || null,
      scanId: scanId || null,
      detectorId: detectorId || null,
      type: type || null,
      limit,
      cursor,
    });
  }

  async function get({ organizationId, userId, evidenceId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const evidence = await evidenceRepository.getEvidence(organizationId, evidenceId);
    if (!evidence) {
      throw new HttpError(404, 'Evidence was not found in this organization.', 'EVIDENCE_NOT_FOUND');
    }
    return evidence;
  }

  return { get, list };
}

module.exports = { createEvidenceService };
