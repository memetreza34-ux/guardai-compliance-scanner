const { HttpError } = require('../lib/httpError');
const { normalizeHttpUrl } = require('../lib/targetSafety');
const { extractVerifiableHostname } = require('./targetVerification');

function normalizeTargetDisplayName(value, hostname) {
  if (value === null || value === undefined || value === '') return hostname;
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Target display name is invalid.', 'INVALID_TARGET_DISPLAY_NAME');
  }

  const displayName = value.trim().replace(/\s+/g, ' ');
  if (displayName.length < 1 || displayName.length > 200) {
    throw new HttpError(
      400,
      'Target display name must contain 1 to 200 characters.',
      'INVALID_TARGET_DISPLAY_NAME',
    );
  }

  return displayName;
}

function normalizeWebsiteTargetInput({ url, displayName }) {
  if (typeof url !== 'string' || url.trim().length === 0 || url.length > 2048) {
    throw new HttpError(400, 'Website URL is required.', 'TARGET_URL_REQUIRED');
  }

  const parsed = normalizeHttpUrl(url.trim());
  const hostname = extractVerifiableHostname(parsed.toString());

  parsed.hash = '';
  parsed.search = '';

  return {
    type: 'website',
    canonicalUrl: parsed.toString(),
    displayName: normalizeTargetDisplayName(displayName, hostname),
    hostname,
  };
}

module.exports = {
  normalizeTargetDisplayName,
  normalizeWebsiteTargetInput,
};