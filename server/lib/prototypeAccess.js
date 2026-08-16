const { HttpError } = require('./httpError');
const { readBooleanFlag } = require('./scanAccess');

function createPrototypeAccessPolicy(env = process.env) {
  const enabled = readBooleanFlag(env.ALLOW_PROTOTYPE_SCAN_ENDPOINTS);

  return {
    enabled,
    assertEnabled() {
      if (enabled) return;
      throw new HttpError(
        404,
        'Prototype scan endpoints are disabled. Use the authenticated persistent GuardAI scan flow.',
        'PROTOTYPE_SCAN_DISABLED',
      );
    },
  };
}

module.exports = { createPrototypeAccessPolicy };
