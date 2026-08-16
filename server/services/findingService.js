const { HttpError } = require('../lib/httpError');
const {
  normalizeFindingStatus,
  normalizeFindingTransition,
} = require('../domain/findingLifecycle');

function createFindingService({ findingRepository, organizationAuthorization }) {
  if (!findingRepository) {
    throw new TypeError('Finding service requires a Finding repository.');
  }
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Finding service requires organization authorization.');
  }

  async function list({ organizationId, userId, status, targetId, limit, cursor }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const normalizedStatus = status ? normalizeFindingStatus(status) : null;
    return findingRepository.listFindings({
      organizationId,
      status: normalizedStatus,
      targetId: targetId || null,
      limit,
      cursor,
    });
  }

  async function get({ organizationId, userId, findingId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const finding = await findingRepository.getFinding(organizationId, findingId);
    if (!finding) {
      throw new HttpError(404, 'Finding was not found in this organization.', 'FINDING_NOT_FOUND');
    }
    return finding;
  }

  async function updateStatus({ organizationId, userId, findingId, status, reason }) {
    const current = await findingRepository.getFinding(organizationId, findingId);
    if (!current) {
      // Still authorize the tenant before revealing whether a Finding exists.
      await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
      throw new HttpError(404, 'Finding was not found in this organization.', 'FINDING_NOT_FOUND');
    }

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
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const finding = await findingRepository.getFinding(organizationId, findingId);
    if (!finding) {
      throw new HttpError(404, 'Finding was not found in this organization.', 'FINDING_NOT_FOUND');
    }
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

module.exports = { createFindingService };
