const { HttpError } = require('../lib/httpError');

const REQUESTABLE_SCAN_MODULES = Object.freeze([
  'security',
  'privacy',
  'accessibility',
  'ai-governance',
  'repository',
  'asset',
]);

// This list is intentionally narrower than the known module registry. A module only
// becomes externally requestable after its worker, persistence semantics and tests exist.
const ENABLED_PERSISTENT_SCAN_MODULES = Object.freeze([
  'security',
]);

function normalizeRequestedModules(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, 'At least one scan module is required.', 'SCAN_MODULES_REQUIRED');
  }

  const modules = [...new Set(value)];
  const invalid = modules.filter(
    (moduleId) => typeof moduleId !== 'string' || !REQUESTABLE_SCAN_MODULES.includes(moduleId),
  );

  if (invalid.length > 0) {
    throw new HttpError(
      400,
      'One or more requested scan modules are invalid.',
      'INVALID_SCAN_MODULE',
      { invalid },
    );
  }

  const unavailable = modules.filter(
    (moduleId) => !ENABLED_PERSISTENT_SCAN_MODULES.includes(moduleId),
  );
  if (unavailable.length > 0) {
    throw new HttpError(
      422,
      'One or more requested scan modules are not available in the persistent GuardAI pipeline yet.',
      'SCAN_MODULE_NOT_AVAILABLE',
      {
        unavailable,
        enabled: [...ENABLED_PERSISTENT_SCAN_MODULES],
      },
    );
  }

  return modules;
}

function normalizeIdempotencyKey(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Idempotency key must be a string.', 'INVALID_IDEMPOTENCY_KEY');
  }

  const key = value.trim();
  if (key.length < 8 || key.length > 200) {
    throw new HttpError(
      400,
      'Idempotency key must contain 8 to 200 characters.',
      'INVALID_IDEMPOTENCY_KEY',
    );
  }

  return key;
}

function createScanSubmissionService({
  organizationAuthorization,
  scanRepository,
  scannerVersion,
  contractVersion,
}) {
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Scan submission requires organization authorization.');
  }
  if (!scanRepository || typeof scanRepository.createQueuedScanWithJobs !== 'function') {
    throw new TypeError('Scan submission requires a scan repository.');
  }
  if (!scannerVersion || !contractVersion) {
    throw new TypeError('Scan submission requires scanner and contract versions.');
  }

  async function submit({
    organizationId,
    targetId,
    requestedBy,
    requestedModules,
    idempotencyKey = null,
  }) {
    if (!organizationId || !targetId || !requestedBy) {
      throw new HttpError(400, 'Organization, target and requester are required.', 'INVALID_SCAN_REQUEST');
    }

    await organizationAuthorization.requireRole(organizationId, requestedBy, 'member');

    const modules = normalizeRequestedModules(requestedModules);
    const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);

    return scanRepository.createQueuedScanWithJobs({
      organizationId,
      targetId,
      requestedBy,
      requestedModules: modules,
      scannerVersion,
      contractVersion,
      idempotencyKey: normalizedIdempotencyKey,
    });
  }

  return { submit };
}

module.exports = {
  createScanSubmissionService,
  ENABLED_PERSISTENT_SCAN_MODULES,
  normalizeIdempotencyKey,
  normalizeRequestedModules,
  REQUESTABLE_SCAN_MODULES,
};
