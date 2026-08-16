const { createOrganizationSlug, normalizeOrganizationName } = require('../domain/organization');
const { HttpError } = require('../lib/httpError');

const MAX_SLUG_ATTEMPTS = 3;

function createOrganizationService({ organizationRepository }) {
  if (!organizationRepository) {
    throw new TypeError('Organization service requires a repository.');
  }

  async function create({ userId, name }) {
    if (!userId) {
      throw new HttpError(401, 'Authentication is required.', 'UNAUTHORIZED');
    }

    const normalizedName = normalizeOrganizationName(name);
    let lastError = null;

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
      try {
        return await organizationRepository.createOrganizationWithOwner({
          name: normalizedName,
          slug: createOrganizationSlug(normalizedName),
          userId,
        });
      } catch (error) {
        if (error?.code !== 'ORGANIZATION_SLUG_COLLISION') throw error;
        lastError = error;
      }
    }

    throw lastError || new HttpError(
      409,
      'Organization could not be created because a unique identifier could not be allocated.',
      'ORGANIZATION_CREATE_CONFLICT',
    );
  }

  async function listForUser(userId) {
    if (!userId) {
      throw new HttpError(401, 'Authentication is required.', 'UNAUTHORIZED');
    }
    return organizationRepository.listOrganizationsForUser(userId);
  }

  return {
    create,
    listForUser,
  };
}

module.exports = { createOrganizationService, MAX_SLUG_ATTEMPTS };
