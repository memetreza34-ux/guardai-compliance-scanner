const { HttpError } = require('../lib/httpError');

const TARGET_MODULES = Object.freeze({
  website: Object.freeze(['security', 'privacy', 'accessibility', 'ai-governance']),
  repository: Object.freeze(['repository']),
  asset: Object.freeze(['asset']),
});

function allowedModulesForTarget(targetType) {
  return TARGET_MODULES[targetType] || [];
}

function assertTargetSupportsModules(targetType, requestedModules) {
  const allowed = allowedModulesForTarget(targetType);
  if (allowed.length === 0) {
    throw new HttpError(422, 'Target type is not supported by GuardAI.', 'UNSUPPORTED_TARGET_TYPE');
  }

  const unsupported = requestedModules.filter((moduleId) => !allowed.includes(moduleId));
  if (unsupported.length > 0) {
    throw new HttpError(
      400,
      'Requested scan modules are not compatible with the target type.',
      'SCAN_MODULE_TARGET_MISMATCH',
      {
        targetType,
        unsupported,
        allowed,
      },
    );
  }
}

module.exports = {
  allowedModulesForTarget,
  assertTargetSupportsModules,
  TARGET_MODULES,
};
