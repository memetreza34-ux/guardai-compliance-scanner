const { HttpError } = require('../lib/httpError');
const {
  normalizeFindingStatus,
  normalizeFindingTransition,
} = require('../domain/findingLifecycle');

function createFindingLifecycleService({ findingRepository, organizationAuthorization }) {
  if (!findingRepository) {
    throw new TypeError('Finding lifecycle service requires a Finding repository.');
  }
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Finding lifecycle service requires organization authorization.');
  }

  async function authorizeViewer(organizationId, userId) {
    return organizationAuthorization.requireRole(organizationId, userId, 'viewer');
  }

  async function loadAuthorizedFinding(organizationId, userId, findingId) {
    await authorizeViewer(organizationId, userId);
    const finding = await findingRepository.getFinding(organizationId, findingId);
    if (!finding) {
      throw new HttpError(404, 'Finding was not found in this organization.', 'FINDING_NOT_FOUND');
    }
    return finding;
  }

  async function list({ organizationId, userId, status, targetId, limit, cursor }) {
    await authorizeViewer(organizationId, userId);
    return findingRepository.listFindings({
      organizationId,
      status: status ? normalizeFindingStatus(status) : null,
      targetId: targetId || null,
      limit,
      cursor,
    });
  }

  async function get({ organizationId, userId, findingId }) {
    return loadAuthorizedFinding(organizationId, userId, findingId);
  }

  async function updateStatus({ organizationId, userId, findingId, status, reason }) {
    const current = await loadAuthorizedFinding(organizationId, userId, findingId);
    const transition = normalizeFindingTransition({
      currentStatus: current.status,
      nextStatus: status,
      reason,
    });
    const requiredRole = transition.minimumRole === 'viewer' ? 'member' : transition.minimumRole;
    await organizationAuthorization.requireRole(organizationId, userId, requiredRole);

    return findingRepository.transitionStatus({
      organizationId,
      findingId,
      expectedCurrentStatus: current.status,
      nextStatus: transition.nextStatus,
      reason: transition.reason,
      actorId: userId,
    });
  }

  async function history({ organizationId, userId, findingId, limit, cursor }) {
    await loadAuthorizedFinding(organizationId, userId, findingId);
    return findingRepository.listStatusHistory({
      organizationId,
      findingId,
      limit,
      cursor,
    });
  }

  return {
    get,
    history,
    list,
    updateStatus,
  };
}

module.exports = { createFindingLifecycleService };
