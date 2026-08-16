const { HttpError } = require('../lib/httpError');
const { normalizeWebsiteTargetInput } = require('../domain/websiteTarget');

function createTargetService({ organizationAuthorization, targetRepository }) {
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Target service requires organization authorization.');
  }
  if (!targetRepository) {
    throw new TypeError('Target service requires a target repository.');
  }

  async function createWebsite({ organizationId, userId, url, displayName }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    const normalized = normalizeWebsiteTargetInput({ url, displayName });

    return targetRepository.createWebsiteTarget({
      organizationId,
      userId,
      displayName: normalized.displayName,
      canonicalUrl: normalized.canonicalUrl,
    });
  }

  async function list({ organizationId, userId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return targetRepository.listTargets(organizationId);
  }

  async function get({ organizationId, targetId, userId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const target = await targetRepository.getTarget(organizationId, targetId);
    if (!target) {
      throw new HttpError(404, 'Target was not found in this organization.', 'TARGET_NOT_FOUND');
    }
    return target;
  }

  return {
    createWebsite,
    get,
    list,
  };
}

module.exports = { createTargetService };
