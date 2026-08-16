const { HttpError } = require('../lib/httpError');

const ORGANIZATION_ROLES = Object.freeze(['owner', 'admin', 'member', 'viewer']);
const ROLE_RANK = Object.freeze({
  viewer: 10,
  member: 20,
  admin: 30,
  owner: 40,
});

function isOrganizationRole(value) {
  return typeof value === 'string' && ORGANIZATION_ROLES.includes(value);
}

function roleAtLeast(role, minimumRole) {
  if (!isOrganizationRole(role) || !isOrganizationRole(minimumRole)) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimumRole];
}

function assertOrganizationRole(role, minimumRole) {
  if (!roleAtLeast(role, minimumRole)) {
    throw new HttpError(403, `Organization role ${minimumRole} or higher is required.`);
  }
}

module.exports = {
  assertOrganizationRole,
  isOrganizationRole,
  ORGANIZATION_ROLES,
  roleAtLeast,
};
