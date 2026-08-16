const crypto = require('node:crypto');

function stableSerialize(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashEvidence(normalizedData) {
  return sha256Hex(stableSerialize(normalizedData));
}

function createFindingFingerprint({ targetId, detectorId, findingId }) {
  if (!targetId || !detectorId || !findingId) {
    throw new TypeError('Finding fingerprint requires targetId, detectorId and findingId.');
  }

  return sha256Hex(`${targetId}\u001f${detectorId}\u001f${findingId}`);
}

module.exports = {
  createFindingFingerprint,
  hashEvidence,
  sha256Hex,
  stableSerialize,
};