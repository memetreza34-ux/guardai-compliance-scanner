const { HttpError } = require('../lib/httpError');
const { assertOrganizationRole, isOrganizationRole } = require('../auth/roles');

function assertRepository(repository) {
  if (!repository || typeof repository.getMembership !== 'function') {
    throw new TypeError('Organization authorization requires a membership repository.');
  }
}

function createOrganizationAuthorizationService(repository) {
  assertRepository(repository);

  async function getMembershipOrThrow(organizationId, userId) {
    if (!organizationId || !userId) {
      throw new HttpError(400, 'Organization and authenticated user are required.');
    }

    const membership = await repository.getMembership(organizationId, userId);
    if (!membership) {
      throw new HttpError(403, 'You do not have access to this organization.');
    }

    if (!isOrganizationRole(membership.role)) {
      throw new HttpError(500, 'Organization membership contains an invalid role.');
    }

    return membership;
  }

  async function requireRole(organizationId, userId, minimumRole = 'viewer') {
    const membership = await getMembershipOrThrow(organizationId, userId);
    assertOrganizationRole(membership.role, minimumRole);
    return membership;
  }

  return {
    getMembershipOrThrow,
    requireRole,
  };
}

module.exports = { createOrganizationAuthorizationService };
