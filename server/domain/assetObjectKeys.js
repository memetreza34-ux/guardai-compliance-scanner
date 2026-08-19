const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value, label) {
  if (!UUID_RE.test(String(value || ''))) {
    throw new TypeError(`${label} must be a valid UUID.`);
  }
  return value;
}

function buildAssetObjectKeys(organizationId, uploadId) {
  assertUuid(organizationId, 'Organization ID');
  assertUuid(uploadId, 'Asset upload ID');
  return Object.freeze({
    quarantineObjectKey: `quarantine/${organizationId}/${uploadId}`,
    cleanObjectKey: `assets/${organizationId}/${uploadId}`,
  });
}

module.exports = {
  buildAssetObjectKeys,
  UUID_RE,
};
