const { HttpError } = require('./httpError');

function readBooleanFlag(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

function createScanAccessPolicy(env = process.env) {
  const allowUnauthenticatedAiScans = readBooleanFlag(env.ALLOW_UNAUTHENTICATED_AI_SCANS);

  return {
    allowUnauthenticatedAiScans,

    getWebAiBlockNotice() {
      if (allowUnauthenticatedAiScans) return null;

      return 'AI-assisted Privacy/AI-Governance screening is disabled until GuardAI has real authentication, entitlements and usage quotas.';
    },

    assertFileAiAllowed() {
      if (allowUnauthenticatedAiScans) return;

      throw new HttpError(
        403,
        'AI-assisted file screening is disabled until GuardAI has real authentication, entitlements and usage quotas.',
      );
    },
  };
}

module.exports = {
  createScanAccessPolicy,
  readBooleanFlag,
};
