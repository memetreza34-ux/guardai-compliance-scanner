const { HttpError } = require('../lib/httpError');

const MODULE_CAPABILITIES = Object.freeze({
  security: null,
  privacy: 'ai_screening',
  'ai-governance': 'ai_screening',
  accessibility: 'browser_scan',
  repository: 'repository_scan',
  asset: 'ai_document_screening',
});

function capabilityForModule(moduleId) {
  if (!Object.prototype.hasOwnProperty.call(MODULE_CAPABILITIES, moduleId)) {
    throw new HttpError(400, 'Unknown scan module.', 'INVALID_SCAN_MODULE');
  }
  return MODULE_CAPABILITIES[moduleId];
}

function requiredCapabilitiesForModules(moduleIds) {
  if (!Array.isArray(moduleIds)) {
    throw new TypeError('moduleIds must be an array.');
  }

  return [...new Set(
    moduleIds
      .map(capabilityForModule)
      .filter((capability) => capability !== null),
  )];
}

function assertCapabilityEntitled(entitlement, capability, usage) {
  if (!entitlement || entitlement.capability !== capability || entitlement.enabled !== true) {
    throw new HttpError(
      403,
      'The organization plan does not include this scanner capability.',
      'CAPABILITY_NOT_ENTITLED',
      { capability },
    );
  }

  if (entitlement.monthlyLimit === null) return;

  const usedUnits = Number.isInteger(usage?.usedUnits) ? usage.usedUnits : 0;
  const reservedUnits = Number.isInteger(usage?.reservedUnits) ? usage.reservedUnits : 0;
  if (usedUnits + reservedUnits >= entitlement.monthlyLimit) {
    throw new HttpError(
      429,
      'The organization has reached its monthly scanner capability limit.',
      'CAPABILITY_MONTHLY_LIMIT_REACHED',
      {
        capability,
        monthlyLimit: entitlement.monthlyLimit,
      },
    );
  }
}

module.exports = {
  assertCapabilityEntitled,
  capabilityForModule,
  MODULE_CAPABILITIES,
  requiredCapabilitiesForModules,
};