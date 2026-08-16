const crypto = require('node:crypto');
const { HttpError } = require('../lib/httpError');

function normalizeOrganizationName(value) {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Organization name is required.', 'ORGANIZATION_NAME_REQUIRED');
  }

  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 160) {
    throw new HttpError(
      400,
      'Organization name must contain 1 to 160 characters.',
      'INVALID_ORGANIZATION_NAME',
    );
  }

  return name;
}

function slugBaseFromName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
}

function createOrganizationSlug(name, randomBytes = crypto.randomBytes) {
  const base = slugBaseFromName(name);
  const safeBase = base.length >= 2 ? base : 'org';
  const suffix = randomBytes(4).toString('hex');
  return `${safeBase}-${suffix}`.slice(0, 64).replace(/-+$/g, '');
}

module.exports = {
  createOrganizationSlug,
  normalizeOrganizationName,
  slugBaseFromName,
};